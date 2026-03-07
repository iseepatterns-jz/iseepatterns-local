#!/usr/bin/env python3
"""
Legal Research RAG Assistant v2.0
─────────────────────────────────
Hybrid search (BM25 + Vector) with reranking, optimized for Apple M4 Max 64GB.
Supports business & criminal law document collections with category filtering.
"""

import os
import sys
import json
import pickle
import argparse
import textwrap
from typing import List, Dict, Optional, Tuple

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document
from rank_bm25 import BM25Okapi

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

BASE_DIR = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1"
CHROMA_DB_PATH = os.path.join(BASE_DIR, "chroma_db")
BM25_INDEX_PATH = os.path.join(BASE_DIR, "bm25_index.pkl")
DOCS_BUSINESS_DIR = os.path.join(BASE_DIR, "legal_docs_business")
DOCS_CRIMINAL_DIR = os.path.join(BASE_DIR, "legal_docs_criminal")
CARDS_DIR = os.path.join(BASE_DIR, "data", "evidence_cards")

# Models — optimized for M4 Max 64GB
EMBEDDING_MODEL = "nomic-embed-text"        # 8192-token context, reliable with LangChain
LLM_MODEL = "qwen2.5-32b-forensic"         # Dedicated forensic model

# Chunking — legal arguments span paragraphs; 1500 chars ≈ 400-500 tokens
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 300

# Retrieval
VECTOR_TOP_K = 15          # candidates from vector search
BM25_TOP_K = 15            # candidates from BM25 search
RERANK_TOP_N = 8           # final results after reranking
RRF_K = 60                 # RRF constant (standard value)

# ─────────────────────────────────────────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a legal research assistant specialized in business law and criminal law.

INSTRUCTIONS:
- Answer the question using ONLY the provided context documents.
- Cite specific documents by their source filename when referencing information.
- Distinguish clearly between business-law and criminal-law issues when both might apply.
- If the answer is not supported by the context, say "I don't have enough information in the indexed documents to answer that."
- Avoid jurisdiction-specific conclusions unless the materials explicitly identify a jurisdiction.
- Do NOT provide legal advice, strategies, or recommendations — only general information and education.
- Structure your response with clear paragraphs and, when helpful, bullet points.

CONTEXT DOCUMENTS:
{context}

QUESTION: {question}

ANSWER:"""

DISCLAIMER = (
    "\n\033[2m─── Disclaimer: This information is for general educational purposes only "
    "and is not legal advice. It does not replace advice from a licensed attorney, "
    "especially in criminal matters where liberty interests are at stake. ───\033[0m"
)

# Category display names
CATEGORY_LABELS = {
    "01_complaints_and_exhibits": "Complaints & Exhibits",
    "02_motions_and_filings": "Motions & Filings",
    "03_receiver_reports": "Receiver Reports",
    "04_orders": "Court Orders",
    "05_appearances": "Appearances",
    "06_service_notifications": "Service Notifications",
    "07_business_taxes": "Business Taxes",
    "08_court_transcripts": "Court Transcripts",
    "general": "General / Uncategorized",
}


# ─────────────────────────────────────────────────────────────────────────────
# Document Loading
# ─────────────────────────────────────────────────────────────────────────────

def walk_docs(base_dir: str, domain: str) -> List[Document]:
    """Recursively find and load all PDFs and TXT files, tagging with domain and category."""
    documents = []
    if not os.path.exists(base_dir):
        return documents

    for root, _, files in os.walk(base_dir):
        for filename in sorted(files):
            path = os.path.join(root, filename)
            rel = os.path.relpath(root, base_dir)
            category = rel if rel != "." else "general"
            ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

            try:
                if ext == "pdf":
                    loader = PyPDFLoader(path)
                    docs = loader.load()
                    for doc in docs:
                        doc.metadata["domain"] = domain
                        doc.metadata["category"] = category
                        doc.metadata["source_file"] = filename
                    documents.extend(docs)
                    print(f"  ✓ {filename} ({len(docs)} pages) [{CATEGORY_LABELS.get(category, category)}]")
                elif ext == "txt":
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                    doc = Document(
                        page_content=text,
                        metadata={
                            "domain": domain,
                            "category": category,
                            "source_file": filename,
                            "page": 1,
                        },
                    )
                    documents.append(doc)
                    print(f"  ✓ {filename} (txt, {len(text):,} chars) [{CATEGORY_LABELS.get(category, category)}]")
                else:
                    continue
            except Exception as e:
                print(f"  ✗ {filename}: {e}")

    return documents


def load_evidence_cards() -> List[Document]:
    """Load EvidenceCards from JSON files and convert to RAG documents."""
    print(f"\n📂 Scanning EvidenceCards from {CARDS_DIR}...")
    documents = []
    if not os.path.exists(CARDS_DIR):
        print(f"  ⚠️  Cards directory not found: {CARDS_DIR}")
        return documents

    card_files = [f for f in os.listdir(CARDS_DIR) if f.lower().endswith(".json")]
    print(f"   Found {len(card_files)} card files.")
    print(f"   Processing all cards for full index...")
    
    for filename in card_files:
        path = os.path.join(CARDS_DIR, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                card = json.load(f)
            
            # Construct a rich text body from the card
            # We include summary, bullets, and body_snippet
            content_parts = []
            if card.get("title"): content_parts.append(f"Title: {card['title']}")
            if card.get("summary"): content_parts.append(f"Summary: {card['summary']}")
            if card.get("bullets"):
                content_parts.append("Key Facts:")
                for b in card["bullets"]:
                    content_parts.append(f"- {b}")
            if card.get("body_snippet"):
                content_parts.append("Details:")
                content_parts.append(card["body_snippet"])
            
            full_text = "\n".join(content_parts)
            
            # Metadata for filtering
            metadata = {
                "source_type": card.get("source_type", "unknown"),
                "origin_system": card.get("origin_system", "unknown"),
                "domain": "business",  # default for evidence
                "category": "evidence",
                "source_file": filename,
                "card_id": card.get("id"),
                "date_start": card.get("start_timestamp"),
                "date_end": card.get("end_timestamp")
            }
            
            doc = Document(page_content=full_text, metadata=metadata)
            documents.append(doc)
        except Exception as e:
            print(f"  ✗ {filename}: {e}")
            
    print(f"  ✓ Loaded {len(documents)} EvidenceCards")
    return documents


def load_and_process_docs() -> Optional[List[Document]]:
    """Load PDFs, TXT, and EvidenceCards and chunk them."""
    print("\n📂 Scanning business law documents...")
    documents = walk_docs(DOCS_BUSINESS_DIR, "business")

    print("\n📂 Scanning criminal law documents...")
    documents.extend(walk_docs(DOCS_CRIMINAL_DIR, "criminal"))
    
    # ── Load EvidenceCards ──
    documents.extend(load_evidence_cards())

    if not documents:
        print("\n⚠️  No PDF documents found in the source directories.")
        return None

    print(f"\n📄 Total pages loaded: {len(documents)}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    print(f"🔪 Total chunks created: {len(chunks)} (size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})")
    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# BM25 Index
# ─────────────────────────────────────────────────────────────────────────────

def build_bm25_index(chunks: List[Document]) -> None:
    """Build and persist BM25 index alongside chunk metadata."""
    print("\n🔍 Building BM25 keyword index...")
    tokenized = [chunk.page_content.lower().split() for chunk in chunks]
    bm25 = BM25Okapi(tokenized)

    # Store BM25 model + chunk contents/metadata for retrieval
    data = {
        "bm25": bm25,
        "contents": [c.page_content for c in chunks],
        "metadatas": [c.metadata for c in chunks],
    }
    with open(BM25_INDEX_PATH, "wb") as f:
        pickle.dump(data, f)
    print(f"   Saved BM25 index to {BM25_INDEX_PATH}")


def load_bm25_index() -> Optional[Dict]:
    """Load persisted BM25 index."""
    if not os.path.exists(BM25_INDEX_PATH):
        return None
    with open(BM25_INDEX_PATH, "rb") as f:
        return pickle.load(f)


# ─────────────────────────────────────────────────────────────────────────────
# Hybrid Search with Reciprocal Rank Fusion
# ─────────────────────────────────────────────────────────────────────────────

def reciprocal_rank_fusion(
    result_lists: List[List[Tuple[str, dict]]],
    k: int = RRF_K,
) -> List[Tuple[str, dict, float]]:
    """
    Merge multiple ranked result lists using Reciprocal Rank Fusion.
    Each result is (content, metadata). Returns (content, metadata, score).
    """
    scores = {}
    for result_list in result_lists:
        for rank, (content, metadata) in enumerate(result_list):
            key = content[:200]  # use first 200 chars as dedup key
            if key not in scores:
                scores[key] = {"content": content, "metadata": metadata, "score": 0.0}
            scores[key]["score"] += 1.0 / (k + rank + 1)

    merged = sorted(scores.values(), key=lambda x: x["score"], reverse=True)
    return [(r["content"], r["metadata"], r["score"]) for r in merged]


def hybrid_search(
    query: str,
    vectorstore: Chroma,
    bm25_data: Dict,
    domain_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    vector_k: int = VECTOR_TOP_K,
    bm25_k: int = BM25_TOP_K,
) -> List[Tuple[str, dict, float]]:
    """
    Perform hybrid search combining vector similarity and BM25 keyword matching.
    """
    # ── Vector search ──
    search_kwargs = {"k": vector_k}
    chroma_filter = {}
    if domain_filter and domain_filter in ("business", "criminal"):
        chroma_filter["domain"] = domain_filter
    if category_filter:
        chroma_filter["category"] = category_filter
    if chroma_filter:
        if len(chroma_filter) == 1:
            search_kwargs["filter"] = chroma_filter
        else:
            search_kwargs["filter"] = {"$and": [{k: v} for k, v in chroma_filter.items()]}

    vector_results = vectorstore.similarity_search(query, **search_kwargs)
    vector_ranked = [(doc.page_content, doc.metadata) for doc in vector_results]

    # ── BM25 search ──
    tokenized_query = query.lower().split()
    bm25: BM25Okapi = bm25_data["bm25"]
    scores = bm25.get_scores(tokenized_query)

    # Apply domain/category filtering to BM25 results
    scored_indices = []
    for idx, score in enumerate(scores):
        meta = bm25_data["metadatas"][idx]
        if domain_filter and domain_filter in ("business", "criminal"):
            if meta.get("domain") != domain_filter:
                continue
        if category_filter and meta.get("category") != category_filter:
            continue
        scored_indices.append((idx, score))

    scored_indices.sort(key=lambda x: x[1], reverse=True)
    bm25_ranked = [
        (bm25_data["contents"][idx], bm25_data["metadatas"][idx])
        for idx, _ in scored_indices[:bm25_k]
    ]

    # ── Reciprocal Rank Fusion ──
    fused = reciprocal_rank_fusion([vector_ranked, bm25_ranked])
    return fused


# ─────────────────────────────────────────────────────────────────────────────
# Reranking
# ─────────────────────────────────────────────────────────────────────────────

_reranker = None

def get_reranker():
    """Lazy-load the FlashRank reranker."""
    global _reranker
    if _reranker is None:
        try:
            from flashrank import Ranker, RerankRequest
            print("  Loading reranker model...")
            _reranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir=os.path.join(BASE_DIR, ".cache"))
            print("  ✓ Reranker ready")
        except Exception as e:
            print(f"  ⚠️  Reranker unavailable ({e}), using RRF ranking only")
            _reranker = "unavailable"
    return _reranker


def rerank_results(
    query: str,
    results: List[Tuple[str, dict, float]],
    top_n: int = RERANK_TOP_N,
) -> List[Tuple[str, dict, float]]:
    """Rerank results using a cross-encoder model."""
    reranker = get_reranker()
    if reranker == "unavailable" or not results:
        return results[:top_n]

    try:
        from flashrank import RerankRequest
        passages = [{"id": i, "text": content, "meta": meta} for i, (content, meta, _) in enumerate(results)]
        request = RerankRequest(query=query, passages=passages)
        reranked = reranker.rerank(request)
        return [
            (r["text"], results[r["id"]][1], r["score"])
            for r in reranked[:top_n]
        ]
    except Exception as e:
        print(f"  ⚠️  Reranking failed ({e}), using RRF ranking")
        return results[:top_n]


# ─────────────────────────────────────────────────────────────────────────────
# Domain Inference
# ─────────────────────────────────────────────────────────────────────────────

def infer_domain(query: str) -> str:
    """Infer the law domain from the query."""
    business_kw = [
        "merger", "contract", "corporate", "employment", "securities", "agreement",
        "stock", "tax", "partnership", "llc", "operating agreement", "breach",
        "fiduciary", "shareholder", "receiver", "receivership", "embezzlement",
        "rowboat", "guariglia", "zangrilli",
    ]
    criminal_kw = [
        "miranda", "arrest", "statute", "procedure", "search", "warrant",
        "felony", "misdemeanor", "trial", "defense", "indictment", "plea",
    ]

    q = query.lower()
    biz_score = sum(1 for kw in business_kw if kw in q)
    crim_score = sum(1 for kw in criminal_kw if kw in q)

    if biz_score > crim_score:
        return "business"
    elif crim_score > biz_score:
        return "criminal"
    return "all"


# ─────────────────────────────────────────────────────────────────────────────
# Answer Generation
# ─────────────────────────────────────────────────────────────────────────────

def format_context(results: List[Tuple[str, dict, float]]) -> str:
    """Format retrieved chunks as numbered context with source attribution."""
    parts = []
    for i, (content, meta, score) in enumerate(results, 1):
        source = meta.get("source_file", "unknown")
        page = meta.get("page", "?")
        category = CATEGORY_LABELS.get(meta.get("category", ""), meta.get("category", ""))
        parts.append(
            f"[Document {i}] Source: {source} | Page: {page} | Category: {category}\n{content}"
        )
    return "\n\n---\n\n".join(parts)


def generate_answer(query: str, context: str, llm: Ollama) -> str:
    """Generate an answer using the LLM with prompt template."""
    prompt = PromptTemplate(template=SYSTEM_PROMPT, input_variables=["context", "question"])
    formatted = prompt.format(context=context, question=query)
    return llm.invoke(formatted)


# ─────────────────────────────────────────────────────────────────────────────
# Interactive CLI
# ─────────────────────────────────────────────────────────────────────────────

def print_banner():
    """Print the startup banner."""
    print("\n" + "═" * 60)
    print("  ⚖️   Legal Research Assistant v2.0")
    print("  ─── Hybrid Search + Reranking ───")
    print(f"  LLM: {LLM_MODEL}")
    print(f"  Embeddings: {EMBEDDING_MODEL}")
    print("═" * 60)


def get_available_categories(vectorstore: Chroma) -> List[str]:
    """Discover which categories exist in the indexed data."""
    try:
        collection = vectorstore._collection
        results = collection.get(include=["metadatas"], limit=1)
        # Get all unique categories
        all_results = collection.get(include=["metadatas"])
        categories = set()
        for meta in all_results["metadatas"]:
            if "category" in meta:
                categories.add(meta["category"])
        return sorted(categories)
    except Exception:
        return []


def print_category_menu(categories: List[str]):
    """Print the category selection menu."""
    print("\n  📁 Document Categories:")
    print("   [0] All categories")
    for i, cat in enumerate(categories, 1):
        label = CATEGORY_LABELS.get(cat, cat)
        print(f"   [{i}] {label}")
    print()


def print_sources(results: List[Tuple[str, dict, float]]):
    """Print source attribution for the answer."""
    print("\n  📑 Sources:")
    seen = set()
    for content, meta, score in results:
        source = meta.get("source_file", "unknown")
        page = meta.get("page", "?")
        key = f"{source}:p{page}"
        if key not in seen:
            seen.add(key)
            category = CATEGORY_LABELS.get(meta.get("category", ""), "")
            print(f"   • {source} (p.{page}) [{category}]")


def interactive_loop(vectorstore: Chroma, bm25_data: Dict, llm: Ollama):
    """Main interactive Q&A loop."""
    categories = get_available_categories(vectorstore)
    
    # Pre-load reranker
    get_reranker()

    print_banner()
    print("\n  Type 'exit' or 'quit' to stop.")
    print("  Type 'help' for commands.\n")

    while True:
        try:
            # ── Category selection ──
            print_category_menu(categories)
            cat_input = input("  Category [0]: ").strip() or "0"
            
            if cat_input.lower() in ("exit", "quit"):
                break

            try:
                cat_idx = int(cat_input)
            except ValueError:
                cat_idx = 0

            category_filter = None
            if 1 <= cat_idx <= len(categories):
                category_filter = categories[cat_idx - 1]
                cat_label = CATEGORY_LABELS.get(category_filter, category_filter)
                print(f"  → Searching: {cat_label}")
            else:
                print("  → Searching: All categories")

            # ── Query ──
            query = input("\n  🔎 Question: ").strip()

            if query.lower() in ("exit", "quit"):
                break
            if query.lower() == "help":
                print("\n  Commands: 'exit'/'quit' to stop, 'help' for this message")
                continue
            if not query:
                continue

            # ── Domain inference ──
            domain = infer_domain(query)
            domain_filter = domain if domain != "all" else None
            if domain_filter:
                print(f"  📌 Inferred domain: {domain}")

            # ── Hybrid search ──
            print("\n  🔄 Searching (BM25 + Vector)...")
            raw_results = hybrid_search(
                query=query,
                vectorstore=vectorstore,
                bm25_data=bm25_data,
                domain_filter=domain_filter,
                category_filter=category_filter,
            )
            print(f"     Found {len(raw_results)} candidate chunks")

            if not raw_results:
                print("\n  ⚠️  No relevant documents found. Try broadening your search.")
                continue

            # ── Rerank ──
            print("  🏆 Reranking results...")
            final_results = rerank_results(query, raw_results)
            print(f"     Using top {len(final_results)} chunks")

            # ── Generate answer ──
            context = format_context(final_results)
            print(f"\n  🧠 Generating answer with {LLM_MODEL}...\n")

            answer = generate_answer(query, context, llm)

            # ── Display ──
            print("─" * 60)
            print()
            for line in answer.strip().split("\n"):
                print(f"  {line}")
            print()
            print_sources(final_results)
            print(DISCLAIMER)
            print("\n" + "─" * 60)

        except KeyboardInterrupt:
            print("\n")
            break
        except Exception as e:
            print(f"\n  ❌ Error: {e}\n")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Legal Research RAG Assistant v2.0 — Hybrid Search + Reranking"
    )
    parser.add_argument("--index", action="store_true", help="Index documents into ChromaDB + BM25")
    parser.add_argument("--reindex", action="store_true", help="Clear existing index and rebuild from scratch")
    parser.add_argument("--stats", action="store_true", help="Show index statistics")
    parser.add_argument("--query", type=str, help="Run a single query and exit")
    args = parser.parse_args()

    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

    # ── Stats ──
    if args.stats:
        if os.path.exists(CHROMA_DB_PATH):
            vs = Chroma(persist_directory=CHROMA_DB_PATH, embedding_function=embeddings)
            count = vs._collection.count()
            print(f"\n📊 ChromaDB: {count} chunks indexed")
        else:
            print("\n📊 ChromaDB: not yet created")

        if os.path.exists(BM25_INDEX_PATH):
            bm25_data = load_bm25_index()
            print(f"📊 BM25: {len(bm25_data['contents'])} chunks indexed")
        else:
            print("📊 BM25: not yet created")

        # Count PDFs
        for label, d in [("Business", DOCS_BUSINESS_DIR), ("Criminal", DOCS_CRIMINAL_DIR)]:
            count = 0
            if os.path.exists(d):
                for root, _, files in os.walk(d):
                    count += sum(1 for f in files if f.lower().endswith(".pdf"))
            print(f"📊 {label} PDFs: {count}")
        return

    # ── Re-index (clear + index) ──
    if args.reindex:
        print("🗑️  Clearing existing indexes...")
        if os.path.exists(CHROMA_DB_PATH):
            import shutil
            shutil.rmtree(CHROMA_DB_PATH)
            print(f"   Removed {CHROMA_DB_PATH}")
        if os.path.exists(BM25_INDEX_PATH):
            os.remove(BM25_INDEX_PATH)
            print(f"   Removed {BM25_INDEX_PATH}")
        args.index = True

    # ── Index ──
    if args.index:
        print("\n📚 Indexing documents...\n")
        chunks = load_and_process_docs()
        if not chunks:
            print("Indexing skipped — no documents found.")
            return

        # Build ChromaDB vector index
        print("\n🧲 Building vector index with", EMBEDDING_MODEL, "...")
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=CHROMA_DB_PATH,
        )
        try:
            vectorstore.persist()
        except Exception:
            pass  # newer Chroma auto-persists
        print(f"   ✓ Indexed {len(chunks)} chunks into {CHROMA_DB_PATH}")

        # Build BM25 index
        build_bm25_index(chunks)

        print("✅ Indexing complete!")
        return

    # ── One-off Query ──
    if args.query:
        # Load indexes
        if not os.path.exists(CHROMA_DB_PATH) or not os.path.exists(BM25_INDEX_PATH):
            print("❌ Index not found. Please run with --index first.")
            return

        vectorstore = Chroma(persist_directory=CHROMA_DB_PATH, embedding_function=embeddings)
        bm25_data = load_bm25_index()
        llm = Ollama(model=LLM_MODEL)

        print(f"\n🔍 Running one-off query: {args.query}")
        # Call the forensic search loop logic (slightly modified to run once)
        try:
            # We can just call a modified version of the inner loop
            # For simplicity, I'll just copy the core logic here or call a function
            # But since it's a one-off, let's just do it directly.
            raw_results = hybrid_search(args.query, vectorstore, bm25_data)
            final_results = rerank_results(args.query, raw_results)
            context = format_context(final_results)
            answer = generate_answer(args.query, context, llm)
            
            print("\n" + "─" * 60)
            for line in answer.strip().split("\n"):
                print(f"  {line}")
            print()
            print_sources(final_results)
            print("\n" + "─" * 60)
        except Exception as e:
            print(f"❌ Error: {e}")
        return

    # ── Interactive Loop ──
    print(f"\n✨ Legal RAG Assistant v2.0 Ready ({LLM_MODEL})")
    if not os.path.exists(CHROMA_DB_PATH):
        print(f"\n⚠️  ChromaDB not found at {CHROMA_DB_PATH}")
        print("   Run with --index first:  python3 rag_law_assistant.py --index\n")
        return

    bm25_data = load_bm25_index()
    if not bm25_data:
        print(f"\n⚠️  BM25 index not found at {BM25_INDEX_PATH}")
        print("   Run with --reindex to rebuild:  python3 rag_law_assistant.py --reindex\n")
        return

    vectorstore = Chroma(persist_directory=CHROMA_DB_PATH, embedding_function=embeddings)
    llm = Ollama(model=LLM_MODEL)

    interactive_loop(vectorstore, bm25_data, llm)
    print("\n  👋 Goodbye!\n")


if __name__ == "__main__":
    main()
