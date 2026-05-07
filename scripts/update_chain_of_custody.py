#!/usr/bin/env python3
import sqlite3
import hashlib
import os
from datetime import datetime

# Point this at the DB where you created chain_of_custody
DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_index.db"
CASE_ID = "rbc_v_lg"

# List the key artifacts you want to register
EVIDENCE_FILES = [
    # Gmail exports (top-level zips or directories)
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-1.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-2.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-3.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-4.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-5.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-6.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-7.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-8.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-9.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-10.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-11.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-12.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-13.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-14.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-15.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-16.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-17.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-18.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-19.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-20.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-21.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-22.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-23.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-24.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-25.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-26.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-27.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-28.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-29.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-30.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-31.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-32.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-33.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-34.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-35.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-36.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-37.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-38.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-39.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-40.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-41.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-42.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-43.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-44.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2023-06-08_GMAIL_MBOX_SG_LOCKER/2023-06-08_GMAIL_MBOX_SG_ZIPPED/sggmail-1.zip",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2023-06-08_GMAIL_MBOX_LEGAL_LOCKER/2023-06-08_GMAIL_LEGAL_MBOX_ZIPPED/leggmail-1.zip",

    # iMessage chat DBs (if you want them in CoC)
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/2025-06-01_original_file_from_imac/chat.db",
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_decoded_body_all_chat_from_m1studio.db",
]

def sha256_file(path, block_size=65536):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(block_size), b""):
            h.update(chunk)
    return h.hexdigest()


def infer_source_type(path: str) -> str:
    p = path.lower()
    if p.endswith(".zip"):
        return "gmail_zip"
    if p.endswith(".db"):
        if "chatdb" in p or "chat.db" in p:
            return "chat_db"
        return "derived_sqlite"
    if p.endswith(".mbox"):
        return "mbox_file"
    return "other"


def ensure_table(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS chain_of_custody (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_path TEXT NOT NULL,
          source_type TEXT NOT NULL,
          sha256 TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          case_id TEXT,
          notes TEXT,
          ingested_at TEXT NOT NULL
        )
        """
    )
    conn.commit()


def upsert_evidence(conn: sqlite3.Connection, path: str):
    if not os.path.exists(path):
        print(f"⚠️  Skipping missing file: {path}")
        return

    size_bytes = os.path.getsize(path)
    sha = sha256_file(path)
    source_type = infer_source_type(path)
    ingested_at = datetime.utcnow().isoformat() + "Z"

    cur = conn.cursor()

    # Avoid duplicate rows for same path + sha256
    cur.execute(
        """
        SELECT id FROM chain_of_custody
        WHERE source_path = ? AND sha256 = ?
        """,
        (path, sha),
    )
    row = cur.fetchone()
    if row:
        print(f"✓ Already recorded: {path}")
        return

    cur.execute(
        """
        INSERT INTO chain_of_custody
          (source_path, source_type, sha256, size_bytes, case_id, notes, ingested_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            path,
            source_type,
            sha,
            size_bytes,
            CASE_ID,
            None,
            ingested_at,
        ),
    )
    conn.commit()
    print(f"✓ Recorded: {path} ({size_bytes} bytes)")


def main():
    conn = sqlite3.connect(DB_PATH)
    ensure_table(conn)

    for path in EVIDENCE_FILES:
        upsert_evidence(conn, path)

    conn.close()
    print("Done updating chain_of_custody.")


if __name__ == "__main__":
    main()
