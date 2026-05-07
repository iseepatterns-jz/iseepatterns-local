"""
MBOX Metadata Ingest — Phase 1.

Indexes ALL Gmail metadata from CSV files + drive-links into mbox_metadata.db.
No zip extraction needed — this uses the metadata CSVs that Google Takeout provides.

Usage:
    python3 -m ingest.mbox_metadata_ingest           # Index all lockers
    python3 -m ingest.mbox_metadata_ingest --reset    # Wipe and re-index
    python3 -m ingest.mbox_metadata_ingest --dry-run  # Count only
"""

import argparse
import csv
import sqlite3
import time
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────

PROJECT_ROOT = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "mbox_metadata.sql"
DB_PATH = PROJECT_ROOT / "data" / "MBOX_LOCKER" / "mbox_metadata.db"

# Locker definitions: (locker_name, metadata_csv, drive_links_csv_or_None)
LOCKERS = [
    (
        "ALL",
        PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2024-06-22_GMAIL_MBOX_ALL_LOCKER" / "2024-06-22_GMAIL_ALL_MBOX_ZIPPED" / "2024-06-22-all-metadata.csv",
        PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2024-06-22_GMAIL_MBOX_ALL_LOCKER" / "2024-06-22_GMAIL_ALL_MBOX_ZIPPED" / "2024-06-22-all-drive-links.csv",
    ),
    (
        "LEGAL",
        PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2023-06-08_GMAIL_MBOX_LEGAL_LOCKER" / "2023-06-08_GMAIL_LEGAL_MBOX_ZIPPED" / "leggmail-metadata.csv",
        None,
    ),
    (
        "SG",
        PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2023-06-08_GMAIL_MBOX_SG_LOCKER" / "2023-06-08_GMAIL_MBOX_SG_ZIPPED" / "sggmail-metadata.csv",
        None,
    ),
]

# ── Label → Category mapping ──────────────────────────────────────────

def derive_category(labels_raw: str) -> str:
    """Derive email category from Gmail labels. Priority order matters."""
    if not labels_raw:
        return "archived"
    upper = labels_raw.upper()
    if "^SPAM" in upper:
        return "spam"
    if "^DRAFT" in upper:
        return "draft"
    if "^TRASH" in upper:
        return "trash"
    if "^DELETED" in upper:
        return "deleted"
    if "^SENT" in upper:
        return "sent"
    if "^INBOX" in upper:
        return "inbox"
    return "archived"


# ── DB Setup ───────────────────────────────────────────────────────────

def init_db(reset: bool = False) -> sqlite3.Connection:
    if reset and DB_PATH.exists():
        DB_PATH.unlink()
        print(f"🗑️  Removed existing {DB_PATH.name}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript(SCHEMA_PATH.read_text())
    print(f"✅ DB ready: {DB_PATH}")
    return conn


# ── CSV Ingest ─────────────────────────────────────────────────────────

def ingest_metadata(conn: sqlite3.Connection, locker_name: str, csv_path: Path, dry_run: bool = False):
    """Ingest a metadata CSV into the emails table."""
    if not csv_path.exists():
        print(f"❌ Not found: {csv_path}")
        return 0

    print(f"\n📧 Ingesting metadata: {locker_name} → {csv_path.name}")

    inserted = 0
    skipped = 0
    errors = 0
    start = time.time()

    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)

        if dry_run:
            count = sum(1 for _ in reader)
            print(f"   DRY RUN: {count:,} rows")
            return count

        batch = []
        for i, row in enumerate(reader):
            rfc822_id = (row.get('Rfc822MessageId') or '').strip()
            if not rfc822_id:
                skipped += 1
                continue

            account = (row.get('Account') or '').strip()
            if not account:
                skipped += 1
                continue

            labels = (row.get('Labels') or '').strip()
            category = derive_category(labels)
            thread_count = 0
            tc = row.get('ThreadedMessageCount', '')
            if tc and tc.strip().isdigit():
                thread_count = int(tc.strip())

            batch.append((
                rfc822_id,
                (row.get('GmailMessageId') or '').strip(),
                (row.get('FileName') or '').strip(),
                account,
                labels,
                category,
                (row.get('From') or '').strip(),
                (row.get('Subject') or '').strip(),
                (row.get('To') or '').strip(),
                (row.get('CC') or '').strip(),
                (row.get('BCC') or '').strip(),
                (row.get('DateSent') or '').strip(),
                (row.get('DateReceived') or '').strip(),
                thread_count,
                locker_name,
                1 if category == 'spam' else 0,
                1 if category == 'draft' else 0,
                1 if category == 'trash' else 0,
            ))

            if len(batch) >= 5000:
                try:
                    conn.executemany("""
                        INSERT OR IGNORE INTO emails
                        (rfc822_id, gmail_id, filename, account, labels_raw, category,
                         from_addr, subject, to_addr, cc_addr, bcc_addr,
                         date_sent, date_received, thread_count, locker_source,
                         is_spam, is_draft, is_trash)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, batch)
                    inserted += len(batch)
                    conn.commit()
                except Exception as e:
                    errors += 1
                    if errors <= 3:
                        print(f"   ⚠️  Batch error: {e}")
                batch = []

                elapsed = time.time() - start
                rate = (inserted + skipped) / elapsed if elapsed > 0 else 0
                print(f"   📦 {inserted + skipped:,} processed ({rate:.0f}/sec)")

        # Final batch
        if batch:
            try:
                conn.executemany("""
                    INSERT OR IGNORE INTO emails
                    (rfc822_id, gmail_id, filename, account, labels_raw, category,
                     from_addr, subject, to_addr, cc_addr, bcc_addr,
                     date_sent, date_received, thread_count, locker_source,
                     is_spam, is_draft, is_trash)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, batch)
                inserted += len(batch)
                conn.commit()
            except Exception as e:
                errors += 1
                print(f"   ⚠️  Final batch error: {e}")

    elapsed = time.time() - start
    print(f"   ✅ {locker_name}: {inserted:,} inserted, {skipped:,} skipped, "
          f"{errors} errors in {elapsed:.1f}s")
    return inserted


def ingest_drive_links(conn: sqlite3.Connection, csv_path: Path, dry_run: bool = False):
    """Ingest drive-links CSV into drive_links table."""
    if not csv_path or not csv_path.exists():
        return 0

    print(f"\n🔗 Ingesting drive links: {csv_path.name}")

    inserted = 0
    start = time.time()

    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)

        if dry_run:
            count = sum(1 for _ in reader)
            print(f"   DRY RUN: {count:,} rows")
            return count

        batch = []
        for row in reader:
            rfc822_id = (row.get('Rfc822MessageId') or '').strip()
            if not rfc822_id:
                continue

            batch.append((
                rfc822_id,
                (row.get('Account') or '').strip(),
                (row.get('GmailMessageId') or '').strip(),
                (row.get('DriveUrl') or '').strip(),
                (row.get('DriveItemId') or '').strip(),
            ))

            if len(batch) >= 5000:
                conn.executemany("""
                    INSERT INTO drive_links (rfc822_id, account, gmail_id, drive_url, drive_item_id)
                    VALUES (?,?,?,?,?)
                """, batch)
                inserted += len(batch)
                conn.commit()
                batch = []

        if batch:
            conn.executemany("""
                INSERT INTO drive_links (rfc822_id, account, gmail_id, drive_url, drive_item_id)
                VALUES (?,?,?,?,?)
            """, batch)
            inserted += len(batch)
            conn.commit()

    elapsed = time.time() - start
    print(f"   ✅ Drive links: {inserted:,} in {elapsed:.1f}s")
    return inserted


# ── Summary ────────────────────────────────────────────────────────────

def print_summary(conn: sqlite3.Connection):
    print(f"\n{'='*60}")
    print(f"📊 MBOX Metadata Index Summary")
    print(f"{'='*60}")

    total = conn.execute("SELECT count(*) FROM emails").fetchone()[0]
    print(f"   Total emails: {total:,}")

    print(f"\n   By locker:")
    for row in conn.execute("SELECT locker_source, count(*) FROM emails GROUP BY locker_source ORDER BY count(*) DESC"):
        print(f"     {row[0]}: {row[1]:,}")

    print(f"\n   By category:")
    for row in conn.execute("SELECT category, count(*) FROM emails GROUP BY category ORDER BY count(*) DESC"):
        print(f"     {row[0]}: {row[1]:,}")

    print(f"\n   By account (top 10):")
    for row in conn.execute("SELECT account, count(*) FROM emails GROUP BY account ORDER BY count(*) DESC LIMIT 10"):
        print(f"     {row[0]}: {row[1]:,}")

    spam = conn.execute("SELECT count(*) FROM emails WHERE is_spam = 1").fetchone()[0]
    draft = conn.execute("SELECT count(*) FROM emails WHERE is_draft = 1").fetchone()[0]
    trash = conn.execute("SELECT count(*) FROM emails WHERE is_trash = 1").fetchone()[0]
    print(f"\n   Spam: {spam:,}  |  Drafts: {draft:,}  |  Trash: {trash:,}")

    dl = conn.execute("SELECT count(*) FROM drive_links").fetchone()[0]
    print(f"   Drive links: {dl:,}")

    print(f"{'='*60}")


# ── CLI ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MBOX Metadata Ingest — Phase 1")
    parser.add_argument("--reset", action="store_true", help="Wipe and re-create DB")
    parser.add_argument("--dry-run", action="store_true", help="Count only, no writes")
    args = parser.parse_args()

    conn = init_db(reset=args.reset)
    start = time.time()

    for locker_name, meta_csv, drive_csv in LOCKERS:
        ingest_metadata(conn, locker_name, meta_csv, dry_run=args.dry_run)
        if drive_csv:
            ingest_drive_links(conn, drive_csv, dry_run=args.dry_run)

    if not args.dry_run:
        print_summary(conn)

    conn.close()
    print(f"\n⏱️  Total time: {time.time() - start:.1f}s")


if __name__ == "__main__":
    main()
