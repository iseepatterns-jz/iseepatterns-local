import sqlite3
import os
import shutil
from pathlib import Path

BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
EVIDENCE_HUB_DB = BASE_DIR / "data" / "evidence_hub.db"
CHROMA_DB_PATH = BASE_DIR / "chroma_db"
BM25_INDEX_PATH = BASE_DIR / "data" / "bm25_index.pkl"

def reset_evidence():
    if not EVIDENCE_HUB_DB.exists():
        print(f"Error: Database not found at {EVIDENCE_HUB_DB}")
        return

    conn = sqlite3.connect(str(EVIDENCE_HUB_DB))
    cursor = conn.cursor()
    
    try:
        # 1. Identify IDs to delete
        # We keep 'financial' and any other core types (currently only financial is core)
        cursor.execute("SELECT id FROM evidence WHERE source_type NOT IN ('financial')")
        ids_to_delete = [row[0] for row in cursor.fetchall()]
        
        if not ids_to_delete:
            print("No non-financial evidence found to reset.")
        else:
            print(f"Purging {len(ids_to_delete)} evidence records...")
            
            # 2. Delete from evidence_participants
            id_placeholders = ",".join(["?"] * len(ids_to_delete))
            cursor.execute(f"DELETE FROM evidence_participants WHERE evidence_id IN ({id_placeholders})", ids_to_delete)
            
            # 3. Delete from evidence
            cursor.execute(f"DELETE FROM evidence WHERE id IN ({id_placeholders})", ids_to_delete)
            
            # 4. Clean up FTS (if using evidence_fts)
            # SQLite FTS tables usually handle this via triggers if set up, 
            # but we can try a manual cleanup if necessary or just let VACUUM happen.
            
            print("Database records cleared.")

        # 5. Clear RAG Indices
        if CHROMA_DB_PATH.exists():
            print(f"Clearing Chroma index at {CHROMA_DB_PATH}...")
            shutil.rmtree(CHROMA_DB_PATH)
        
        if BM25_INDEX_PATH.exists():
            print(f"Removing BM25 index at {BM25_INDEX_PATH}...")
            os.remove(BM25_INDEX_PATH)

        conn.commit()
        print("Reset complete. System is ready for high-fidelity re-ingestion.")
        
    except Exception as e:
        print(f"Error during reset: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    import sys
    force = "--force" in sys.argv
    if force:
        reset_evidence()
    else:
        confirm = input("Are you sure you want to PURGE all non-financial evidence? (y/N): ")
        if confirm.lower() == 'y':
            reset_evidence()
        else:
            print("Reset cancelled.")
