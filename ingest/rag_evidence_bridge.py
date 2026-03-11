import sqlite3
import argparse
import time
import json
import os
import urllib.request
import urllib.parse
from pathlib import Path
from typing import List, Dict
from datetime import datetime
import chromadb
from chromadb.config import Settings

# ── Configuration ──────────────────────────────────────────────────────
PROJECT_ROOT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
DB_PATH = PROJECT_ROOT / "data" / "evidence_hub.db"
CHROMA_PATH = "http://localhost:8000"
COLLECTION_NAME = "legal_docs" # Matching app/lib/rag.ts
EMBEDDING_MODEL = "nomic-embed-text"
OLLAMA_URL = "http://localhost:11434/api/embeddings"

import urllib.request
import urllib.parse

class RagBridge:
    def __init__(self, db_path: Path, batch_size: int = 100):
        self.db_path = db_path
        self.batch_size = batch_size
        self.conn = sqlite3.connect(str(db_path))
        self.conn.row_factory = sqlite3.Row
        
        # Initialize ChromaDB persistent client
        self.chroma = chromadb.PersistentClient(path=str(PROJECT_ROOT / "chroma_db"))
        self.collection = self.chroma.get_or_create_collection(name=COLLECTION_NAME)
        
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        for text in texts:
            data = json.dumps({"model": EMBEDDING_MODEL, "prompt": text}).encode('utf-8')
            req = urllib.request.Request(OLLAMA_URL, data=data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as response:
                res = json.loads(response.read().decode('utf-8'))
                embeddings.append(res["embedding"])
        return embeddings

    def chunk_text(self, text: str, max_chars: int = 1500) -> List[str]:
        if not text: return []
        if len(text) <= max_chars:
            return [text]
        
        chunks = []
        while text:
            if len(text) <= max_chars:
                chunks.append(text)
                break
            # Try to break on a sentence or newline
            cut = text[:max_chars].rfind('\n\n')
            if cut == -1: cut = text[:max_chars].rfind('. ')
            if cut == -1: cut = max_chars
            
            chunks.append(text[:cut].strip())
            text = text[cut:].strip()
        return chunks

    def process_all(self, limit: int = None, offset: int = 0, source: str = None):
        where_clause = "WHERE body_snippet IS NOT NULL AND body_snippet != ''"
        params = []
        if source:
            where_clause += " AND source_type = ?"
            params.append(source)
            
        query = f"""
            SELECT id, canonical_id, source_type, start_timestamp as timestamp, body_snippet, tags, primary_ids
            FROM evidence
            {where_clause}
            LIMIT ? OFFSET ?
        """
        
        processed = 0
        total = self.conn.execute(f"SELECT count(*) FROM evidence {where_clause}", params).fetchone()[0]
        if limit: total = min(total, limit)
        
        print(f"🚀 Found {total:,} records to index (Source: {source or 'All'}). Batch size: {self.batch_size}")
        
        while processed < total:
            current_batch_size = min(self.batch_size, total - processed)
            rows = self.conn.execute(query, (*params, current_batch_size, offset + processed)).fetchall()
            if not rows: break
            
            ids = []
            embeddings = []
            metadatas = []
            documents = []
            
            for row in rows:
                body = row['body_snippet']
                chunks = self.chunk_text(body)
                
                for i, chunk in enumerate(chunks):
                    chunk_id = f"ev-{row['id']}-{i}"
                    ids.append(chunk_id)
                    documents.append(chunk)
                    
                    # Store metadata as strings for Chroma compatibility
                    meta = {
                        "evidence_id": str(row['id']),
                        "canonical_id": row['canonical_id'],
                        "source": row['source_type'],
                        "timestamp": row['timestamp'] or "",
                        "tags": row['tags'] or "[]",
                        "sync_at": datetime.now().isoformat()
                    }
                    metadatas.append(meta)
            
            # Embed the batch
            if documents:
                try:
                    batch_embeddings = self.get_embeddings(documents)
                    self.collection.upsert(
                        ids=ids,
                        embeddings=batch_embeddings,
                        metadatas=metadatas,
                        documents=documents
                    )
                    processed += len(rows)
                    print(f"✅ Indexed {processed:,}/{total:,} records...")
                except Exception as e:
                    print(f"❌ Batch error: {e}")
                    time.sleep(1) # Simple backoff
                    
            if processed % 1000 == 0 and processed > 0:
                print(f"--- Hard checkpoint at {processed:,} ---")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=50)
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--source", type=str, default=None)
    args = parser.parse_args()
    
    bridge = RagBridge(DB_PATH, batch_size=args.batch)
    bridge.process_all(limit=args.limit, offset=args.offset, source=args.source)
