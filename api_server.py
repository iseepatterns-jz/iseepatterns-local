#!/usr/bin/env python3
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
import subprocess
from datetime import datetime

from pathlib import Path
import os
import sys

# Make sure the project root (lawmodel1) is on sys.path
ROOT = Path(__file__).resolve().parent  # because api_server.py is in lawmodel1 root
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Add scripts directory to sys.path
SCRIPTS_DIR = ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

# Import pieces from your existing code
from rag_law_assistant import (
    CHROMA_DB_PATH,
    BM25_INDEX_PATH,
    EMBEDDING_MODEL,
    LLM_MODEL,
    hybrid_search,
    rerank_results,
    format_context,
    generate_answer,
)
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama

import sys
sys.path.insert(0, str(Path(__file__).parent / "_archive"))
from brain_cli import snapshot_brain  # moved to _archive/ during cleanup

BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")

app = FastAPI(title="lawmodel1-local-api")

# Allow Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Models ----------

class RagQuery(BaseModel):
    question: str
    category: Optional[str] = None   # matches rag_law_assistant category
    domain: Optional[str] = None     # "business", "criminal", or None

class RagAnswer(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]

class BrainStatus(BaseModel):
    case_id: str
    summary: Optional[str]
    version: Optional[int]
    tasks: List[Dict[str, Any]]
    readybag_runs: List[Dict[str, Any]] = []

# ---------- Lazy globals ----------

_embeddings = None
_vectorstore = None
_bm25_data = None
_llm = None

def ensure_indexes_loaded():
    global _embeddings, _vectorstore, _bm25_data, _llm
    if _embeddings is None:
        _embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
    if _vectorstore is None:
        _vectorstore = Chroma(
            persist_directory=CHROMA_DB_PATH,
            embedding_function=_embeddings,
        )
    if _bm25_data is None:
        from rag_law_assistant import load_bm25_index
        _bm25_data = load_bm25_index()
        if not _bm25_data:
            raise RuntimeError("BM25 index not found; run rag_law_assistant.py --index first.")
    if _llm is None:
        _llm = Ollama(model=LLM_MODEL)

# ---------- Routes ----------

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/brain/{case_id}", response_model=BrainStatus)
def get_brain(case_id: str, session: Optional[str] = None):
    # If case_id is "latest" or "active", try to find the most recent brain session
    target_case = case_id
    if case_id in ("latest", "active", "rbc_v_lg"):
        # We still use rbc_v_lg as the case_id filter in the DB, 
        # but we want to point to the latest task.md
        pass
    
    snap = snapshot_brain(target_case, session_id=session)
    return BrainStatus(
        case_id=case_id,
        summary=snap.get("summary"),
        version=snap.get("version"),
        tasks=snap.get("tasks", []),
        readybag_runs=snap.get("readybag_runs", []),
        updated_at=snap.get("updated_at"),
    )


@app.post("/brain/readybag")
def run_readybag():
    """
    Trigger the ready bag pipeline via brain_cli.py.
    This is a thin wrapper around `python brain_cli.py readybag`.
    """
    # IMPORTANT: this assumes api_server.py is in the same dir as brain_cli.py
    try:
        subprocess.run(
            [sys.executable, str(BASE_DIR / "brain_cli.py"), "readybag"],
            check=True,
        )
        return {"status": "ok"}
    except subprocess.CalledProcessError as e:
        return {"status": "error", "detail": str(e)}


@app.post("/rag/answer", response_model=RagAnswer)
def rag_answer(req: RagQuery):
    ensure_indexes_loaded()

    # Domain/category filters
    domain_filter = req.domain if req.domain in ("business", "criminal") else None
    category_filter = req.category

    raw_results = hybrid_search(
        query=req.question,
        vectorstore=_vectorstore,
        bm25_data=_bm25_data,
        domain_filter=domain_filter,
        category_filter=category_filter,
    )
    final_results = rerank_results(req.question, raw_results)

    if not final_results:
        return RagAnswer(answer="No relevant documents found.", sources=[])

    context = format_context(final_results)
    answer_text = generate_answer(req.question, context, _llm)

    # Flatten sources for UI
    sources = []
    seen = set()
    for content, meta, score in final_results:
        src = meta.get("source_file", "unknown")
        page = meta.get("page", "?")
        key = f"{src}:{page}"
        if key in seen:
            continue
        seen.add(key)
        sources.append({
            "source_file": src,
            "page": page,
            "category": meta.get("category"),
            "score": score,
        })

    return RagAnswer(answer=answer_text, sources=sources)
