import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data/evidence_hub.db"

def debug():
    if not DB_PATH.exists():
        print(f"DB not found: {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print(f"Participants count: {cursor.execute('SELECT COUNT(*) FROM participants').fetchone()[0]}")
    print(f"Evidence Participants count: {cursor.execute('SELECT COUNT(*) FROM evidence_participants').fetchone()[0]}")

    print("\n--- Sample Participants ---")
    for row in cursor.execute("SELECT * FROM participants LIMIT 10"):
        print(dict(row))

    print("\n--- Sample Evidence Participants ---")
    for row in cursor.execute("SELECT * FROM evidence_participants LIMIT 10"):
        print(dict(row))
        
    # Check for specific players
    names = ["lucasguariglia", "leonardmayersky", "ashleymyles", "zangrilli"]
    print("\n--- Searching for Key Players ---")
    for n in names:
        row = cursor.execute("SELECT * FROM participants WHERE normalized_identifier LIKE ?", (f"%{n}%",)).fetchone()
        if row:
            print(f"Found {n}: {dict(row)}")
            # Count linked evidence
            count = cursor.execute("SELECT COUNT(*) FROM evidence_participants WHERE participant_id = ?", (row['id'],)).fetchone()[0]
            print(f"  Linked evidence items: {count}")
        else:
            print(f"Not found: {n}")

    conn.close()

if __name__ == "__main__":
    debug()
