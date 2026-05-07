import sqlite3
import json
import os
from pathlib import Path

# Paths
PROJECT_ROOT = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
DB_PATH = PROJECT_ROOT / "data" / "evidence_hub.db"
CARDS_DIR = PROJECT_ROOT / "data" / "evidence_cards"

def ingest_tax_cards():
    if not DB_PATH.exists():
        print(f"❌ Database not found: {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode = WAL")
    
    print(f"📁 Scanning for Evidence Cards in {CARDS_DIR}...")
    
    # Get all tax JSON files
    files = list(CARDS_DIR.glob("tax_*.json"))
    print(f"   Found {len(files)} potential tax cards.")

    count = 0
    for fpath in files:
        try:
            with open(fpath, 'r') as f:
                card = json.load(f)
            
            # Prepare data
            canonical_id = fpath.stem # use filename as canonical ID for easy dedup
            source_type = "tax"
            title = card.get('title', 'Unknown Tax Record')
            summary = card.get('summary', '')
            body_snippet = card.get('body_snippet', '')
            start_ts = card.get('start_timestamp')
            end_ts = card.get('end_timestamp')
            tags = json.dumps(card.get('tags', []))
            primary_ids = json.dumps(card.get('primary_ids', {}))
            
            # Put the reconciled info in extra
            extra_data = card.get('extra', {})
            # We don't want to bloat the DB with the full transaction list if it's huge, 
            # but we need the summary and count.
            # The cards already have the summary in 'bullets'.
            extra = json.dumps(extra_data)

            # Insert or Update
            cur = conn.execute("""
                INSERT INTO evidence (
                    canonical_id, source_type, title, summary, body_snippet, 
                    start_timestamp, end_timestamp, tags, primary_ids, extra, card_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(canonical_id) DO UPDATE SET
                    title = excluded.title,
                    summary = excluded.summary,
                    body_snippet = excluded.body_snippet,
                    extra = excluded.extra,
                    updated_at = datetime('now')
            """, (
                canonical_id, source_type, title, summary, body_snippet,
                start_ts, end_ts, tags, primary_ids, extra, card.get('id')
            ))
            
            if cur.rowcount > 0:
                evidence_id = conn.execute("SELECT id FROM evidence WHERE canonical_id = ?", (canonical_id,)).fetchone()[0]
                
                # Ingest provenance
                conn.execute("""
                    INSERT OR IGNORE INTO evidence_origins (
                        evidence_id, origin_system, source_file, card_file
                    ) VALUES (?, 'TAX_LOCKER', ?, ?)
                """, (evidence_id, card.get('file_path', 'unknown'), str(fpath)))
                
                # Ingest participants
                for p_id_str in card.get('participants', []):
                    # We need to map to participants table
                    cur_p = conn.execute(
                        "INSERT OR IGNORE INTO participants (identifier, normalized_identifier) VALUES (?, ?)",
                        (p_id_str, p_id_str.lower())
                    )
                    
                    row = conn.execute(
                        "SELECT id FROM participants WHERE normalized_identifier = ?", (p_id_str.lower(),)
                    ).fetchone()
                    if row:
                        conn.execute(
                            "INSERT OR IGNORE INTO evidence_participants (evidence_id, participant_id, role) VALUES (?, ?, 'entity')",
                            (evidence_id, row[0])
                        )
                
                count += 1
        except Exception as e:
            print(f"   ❌ Error ingesting {fpath.name}: {e}")

    conn.commit()
    conn.close()
    print(f"✅ Successfully indexed {count} tax evidence records.")

if __name__ == "__main__":
    ingest_tax_cards()
