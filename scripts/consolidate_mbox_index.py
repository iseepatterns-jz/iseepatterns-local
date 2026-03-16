import sqlite3
import csv
from pathlib import Path
import time

# ── Paths ──────────────────────────────────────────────────────────────

CENTRAL_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED")
DB_PATH = CENTRAL_DIR / "gmail_master_index.db"

# Sources to ingest: (source_label, metadata_csv, zip_file_name)
SOURCES = [
    ("LG", CENTRAL_DIR / "2024-06-30_lg-metadata.csv", "2024-06-30_lg-1.zip"),
    ("SG", CENTRAL_DIR / "sggmail-metadata.csv", "sggmail-1.zip"),
    ("LEGAL", CENTRAL_DIR / "leggmail-metadata.csv", "leggmail-1.zip"),
]

def ingest_source(conn, source_label, csv_path, zip_name):
    if not csv_path.exists():
        print(f"❌ Source not found: {csv_path}")
        return 0

    print(f"\n📧 Ingesting {source_label}: {csv_path.name}")
    
    # Get existing message_ids to avoid duplicates
    print("   🔍 Loading existing message IDs...")
    cursor = conn.cursor()
    cursor.execute("SELECT message_id FROM emails")
    existing_ids = {row[0] for row in cursor.fetchall() if row[0]}
    print(f"   ✅ Loaded {len(existing_ids):,} IDs.")

    inserted = 0
    skipped = 0
    start = time.time()

    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        batch = []
        for row in reader:
            msg_id = (row.get('Rfc822MessageId') or '').strip()
            
            if not msg_id or msg_id in existing_ids:
                skipped += 1
                continue

            # Mapping
            # zip_file, mbox_name, email_account, message_id, date, from_addr, to_addr, cc_addr, subject, body_snippet, thread_id, labels
            batch.append((
                zip_name,                    # zip_file
                (row.get('FileName') or ''), # mbox_name
                (row.get('Account') or ''),  # email_account
                msg_id,                      # message_id
                (row.get('DateSent') or row.get('DateReceived') or ''), # date
                (row.get('From') or ''),     # from_addr
                (row.get('To') or ''),       # to_addr
                (row.get('CC') or ''),       # cc_addr
                (row.get('Subject') or ''),  # subject
                '',                          # body_snippet (unknown at ingest)
                '',                          # thread_id (takeout has GmailId but not the long thread_id usually)
                (row.get('Labels') or '')    # labels
            ))
            
            existing_ids.add(msg_id)

            if len(batch) >= 1000:
                conn.executemany("""
                    INSERT INTO emails 
                    (zip_file, mbox_name, email_account, message_id, date, from_addr, to_addr, cc_addr, subject, body_snippet, thread_id, labels)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                conn.commit()
                inserted += len(batch)
                batch = []
                print(f"   📦 Processed {inserted + skipped:,} rows... ({inserted:,} inserted)")

        if batch:
            conn.executemany("""
                INSERT INTO emails 
                (zip_file, mbox_name, email_account, message_id, date, from_addr, to_addr, cc_addr, subject, body_snippet, thread_id, labels)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, batch)
            conn.commit()
            inserted += len(batch)

    print(f"   ✅ Finished {source_label}: {inserted:,} newly inserted, {skipped:,} skipped/duplicates.")
    return inserted

def main():
    if not DB_PATH.exists():
        print(f"❌ Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    total_added = 0
    
    for label, csv_path, zip_name in SOURCES:
        total_added += ingest_source(conn, label, csv_path, zip_name)
    
    print(f"\n✨ DONE. Total new records added: {total_added:,}")
    
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM emails")
    final_count = cursor.fetchone()[0]
    print(f"📊 Final Master Count: {final_count:,}")
    
    conn.close()

if __name__ == "__main__":
    main()
