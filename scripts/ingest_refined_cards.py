import sqlite3
import json
import os

DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_hub.db"
JSON_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/refined_cards_draft.json"

def ingest():
    if not os.path.exists(JSON_PATH):
        print(f"Error: {JSON_PATH} not found.")
        return

    with open(JSON_PATH, 'r') as f:
        cards = json.load(f)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for card in cards:
        # Check if already exists
        cursor.execute("SELECT id FROM evidence WHERE canonical_id = ?", (card['canonical_id'],))
        exists = cursor.fetchone()
        
        if exists:
            print(f"Skipping {card['canonical_id']} (already exists)")
            continue

        cursor.execute("""
            INSERT INTO evidence (canonical_id, source_type, title, summary, body_snippet, start_timestamp, tags, primary_ids)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            card['canonical_id'],
            card['source_type'],
            card['title'],
            card['summary'],
            card['body_snippet'],
            card['start_timestamp'],
            card['tags'],
            card['primary_ids']
        ))
        print(f"Ingested {card['canonical_id']}: {card['title']}")

    conn.commit()
    conn.close()
    print("Ingestion complete.")

if __name__ == "__main__":
    ingest()
