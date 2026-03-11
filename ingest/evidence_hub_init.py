"""
Create (or re-initialize) data/evidence_hub.db from schemas/evidence_hub.sql.

Usage:
    python -m ingest.evidence_hub_init          # create if not exists
    python -m ingest.evidence_hub_init --reset  # drop and recreate
"""

import argparse
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "evidence_hub.sql"
DB_PATH = PROJECT_ROOT / "data" / "evidence_hub.db"


def init_db(reset: bool = False):
    if reset and DB_PATH.exists():
        print(f"🗑️  Removing existing {DB_PATH.name}...")
        DB_PATH.unlink()
        # Also remove WAL/SHM files if present
        for suffix in ["-wal", "-shm"]:
            wal = DB_PATH.with_suffix(DB_PATH.suffix + suffix)
            if wal.exists():
                wal.unlink()

    if not SCHEMA_PATH.exists():
        print(f"❌ Schema file not found: {SCHEMA_PATH}")
        return

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(DB_PATH))
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema_sql)
    conn.close()

    print(f"✅ Evidence Hub DB ready: {DB_PATH}")
    print(f"   Schema applied from: {SCHEMA_PATH}")

    # Verify tables
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cur.fetchall()]
    conn.close()
    print(f"   Tables: {', '.join(tables)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize Evidence Hub DB")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate DB")
    args = parser.parse_args()
    init_db(reset=args.reset)
