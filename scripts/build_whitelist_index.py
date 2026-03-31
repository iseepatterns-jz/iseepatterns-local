#!/usr/bin/env python3
"""
Whitelist DB Index Builder
==========================
Scans all per-contact extracted databases in the WHITELIST_DB_EXPORT_LOCKER
and builds a master index database (whitelist_index.db) with:

  1. contacts table — one row per extracted DB with metadata
  2. messages table — every message across all DBs with readable timestamps
  3. attachments table — all attachment records with readable timestamps

This gives lawmodel1 a single queryable index across all 38+ contact DBs.

TERMINAL COMMAND:
  python /Volumes/batdrivetb5/AI_TRAINING/lawmodel1/scripts/build_whitelist_index.py
"""

import sqlite3
import os
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

EXPORT_DIR = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/IMESSAGE_LOCKER/WHITELIST_DB_EXPORT_LOCKER"
INDEX_DB = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/IMESSAGE_LOCKER/WHITELIST_DB_EXPORT_LOCKER/whitelist_index.db"

APPLE_EPOCH_OFFSET = 978307200  # seconds between Unix epoch and Apple epoch (2001-01-01)


# ─────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────

def apple_ns_to_readable(ts):
    """Convert Apple nanosecond timestamp to readable local datetime string."""
    if not ts or ts == 0:
        return None
    try:
        unix_ts = (ts / 1_000_000_000) + APPLE_EPOCH_OFFSET
        return datetime.fromtimestamp(unix_ts).strftime("%Y-%m-%d %H:%M:%S")
    except:
        return None


def sha256_file(filepath):
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    export_dir = Path(EXPORT_DIR)
    index_path = Path(INDEX_DB)

    # Find all jz_*_imessage.db files
    db_files = sorted(export_dir.glob("jz_*_imessage.db"))
    if not db_files:
        print("[ERROR] No jz_*_imessage.db files found in", export_dir)
        return

    print("=" * 75)
    print("  Whitelist Index Builder")
    print(f"  Source: {export_dir}")
    print(f"  Index:  {index_path}")
    print(f"  Found:  {len(db_files)} contact databases")
    print("=" * 75)
    print()

    # Remove old index if exists
    if index_path.exists():
        index_path.unlink()
        print("  Removed previous index.")

    # Create index database
    idx = sqlite3.connect(str(index_path))
    idx.execute("PRAGMA journal_mode=WAL")

    # ── contacts table ──
    idx.execute("""
        CREATE TABLE contacts (
            contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT,
            nickname TEXT,
            role TEXT,
            company TEXT,
            handles TEXT,
            source_device TEXT,
            db_filename TEXT,
            db_path TEXT,
            sha256 TEXT,
            size_bytes INTEGER,
            total_messages INTEGER,
            incoming_messages INTEGER,
            outgoing_messages INTEGER,
            earliest_message TEXT,
            latest_message TEXT,
            total_attachments INTEGER,
            indexed_at TEXT
        )
    """)

    # ── messages table (the big one) ──
    idx.execute("""
        CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER,
            contact_name TEXT,
            original_rowid INTEGER,
            date_readable TEXT,
            date_raw INTEGER,
            sender TEXT,
            direction TEXT,
            text TEXT,
            handle TEXT,
            service TEXT,
            date_read_readable TEXT,
            date_delivered_readable TEXT,
            is_from_me INTEGER,
            has_attachments INTEGER,
            FOREIGN KEY (contact_id) REFERENCES contacts(contact_id)
        )
    """)

    # ── attachments table ──
    idx.execute("""
        CREATE TABLE attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER,
            contact_name TEXT,
            original_rowid INTEGER,
            filename TEXT,
            mime_type TEXT,
            transfer_name TEXT,
            total_bytes INTEGER,
            created_date_readable TEXT,
            created_date_raw INTEGER,
            FOREIGN KEY (contact_id) REFERENCES contacts(contact_id)
        )
    """)

    # ── index metadata ──
    idx.execute("""
        CREATE TABLE _index_metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    now = datetime.now(timezone.utc).isoformat()
    total_messages = 0
    total_attachments = 0

    print("[1/2] Indexing contact databases...")
    print()

    for i, db_file in enumerate(db_files, 1):
        db_name = db_file.name
        print(f"  [{i}/{len(db_files)}] {db_name}...", end=" ", flush=True)

        try:
            conn = sqlite3.connect(f"file:{db_file}?mode=ro", uri=True)
        except Exception as e:
            print(f"ERROR: {e}")
            continue

        # Read extraction metadata
        meta = {}
        try:
            for key, value in conn.execute("SELECT key, value FROM _extraction_metadata").fetchall():
                meta[key] = value
        except:
            pass

        full_name = meta.get("contact_full_name", db_name)
        nickname = meta.get("contact_nickname", "")
        role = meta.get("contact_role", "")
        company = meta.get("contact_company", "")
        handles = meta.get("contact_handles", "[]")
        source_device = meta.get("source_device", "unknown")

        # Counts
        msg_count = conn.execute("SELECT COUNT(*) FROM message").fetchone()[0]
        incoming = conn.execute("SELECT COUNT(*) FROM message WHERE is_from_me = 0").fetchone()[0]
        outgoing = conn.execute("SELECT COUNT(*) FROM message WHERE is_from_me = 1").fetchone()[0]

        att_count = 0
        try:
            att_count = conn.execute("SELECT COUNT(*) FROM attachment").fetchone()[0]
        except:
            pass

        # Date range (readable)
        date_range = conn.execute("""
            SELECT MIN(date), MAX(date) FROM message WHERE date > 0
        """).fetchone()
        earliest = apple_ns_to_readable(date_range[0]) if date_range and date_range[0] else None
        latest = apple_ns_to_readable(date_range[1]) if date_range and date_range[1] else None

        # File hash and size
        file_hash = sha256_file(db_file)
        file_size = db_file.stat().st_size

        # Insert contact record
        cursor = idx.execute("""
            INSERT INTO contacts (
                full_name, nickname, role, company, handles, source_device,
                db_filename, db_path, sha256, size_bytes,
                total_messages, incoming_messages, outgoing_messages,
                earliest_message, latest_message, total_attachments, indexed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            full_name, nickname, role, company, handles, source_device,
            db_name, str(db_file), file_hash, file_size,
            msg_count, incoming, outgoing,
            earliest, latest, att_count, now
        ))
        contact_id = cursor.lastrowid

        # ── Index all messages ──
        rows = conn.execute("""
            SELECT
                m.ROWID,
                m.date,
                m.is_from_me,
                m.text,
                h.id AS handle,
                h.service,
                m.date_read,
                m.date_delivered,
                m.cache_has_attachments
            FROM message m
            LEFT JOIN handle h ON m.handle_id = h.ROWID
            ORDER BY m.date
        """).fetchall()

        batch = []
        for row in rows:
            rowid, date_raw, is_from_me, text, handle, service, date_read, date_delivered, has_att = row
            date_readable = apple_ns_to_readable(date_raw)
            sender = "JZ (outgoing)" if is_from_me else (handle or "unknown")
            direction = "Outgoing" if is_from_me else "Incoming"
            date_read_r = apple_ns_to_readable(date_read)
            date_delivered_r = apple_ns_to_readable(date_delivered)

            batch.append((
                contact_id, full_name, rowid,
                date_readable, date_raw,
                sender, direction, text,
                handle, service,
                date_read_r, date_delivered_r,
                is_from_me, has_att
            ))

        if batch:
            idx.executemany("""
                INSERT INTO messages (
                    contact_id, contact_name, original_rowid,
                    date_readable, date_raw,
                    sender, direction, text,
                    handle, service,
                    date_read_readable, date_delivered_readable,
                    is_from_me, has_attachments
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, batch)

        total_messages += len(batch)

        # ── Index attachments ──
        try:
            att_rows = conn.execute("""
                SELECT
                    ROWID, filename, mime_type, transfer_name,
                    total_bytes, created_date
                FROM attachment
            """).fetchall()

            att_batch = []
            for att in att_rows:
                att_rowid, fname, mime, transfer, total_bytes, created_raw = att
                created_readable = apple_ns_to_readable(created_raw)
                att_batch.append((
                    contact_id, full_name, att_rowid,
                    fname, mime, transfer, total_bytes,
                    created_readable, created_raw
                ))

            if att_batch:
                idx.executemany("""
                    INSERT INTO attachments (
                        contact_id, contact_name, original_rowid,
                        filename, mime_type, transfer_name, total_bytes,
                        created_date_readable, created_date_raw
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, att_batch)

            total_attachments += len(att_batch)
        except:
            pass

        conn.close()
        print(f"{msg_count:,} msgs, {att_count} attachments")

    # ── Create indexes for fast lookups ──
    print()
    print("[2/2] Creating indexes...")

    idx.execute("CREATE INDEX idx_messages_contact_id ON messages(contact_id)")
    idx.execute("CREATE INDEX idx_messages_contact_name ON messages(contact_name)")
    idx.execute("CREATE INDEX idx_messages_date ON messages(date_readable)")
    idx.execute("CREATE INDEX idx_messages_date_raw ON messages(date_raw)")
    idx.execute("CREATE INDEX idx_messages_direction ON messages(direction)")
    idx.execute("CREATE INDEX idx_messages_handle ON messages(handle)")
    idx.execute("CREATE INDEX idx_messages_text ON messages(text) WHERE text IS NOT NULL")
    idx.execute("CREATE INDEX idx_attachments_contact_id ON attachments(contact_id)")
    idx.execute("CREATE INDEX idx_contacts_name ON contacts(full_name)")

    # ── Convenience views ──
    idx.execute("""
        CREATE VIEW daily_volume AS
        SELECT
            contact_name,
            SUBSTR(date_readable, 1, 10) AS date,
            COUNT(*) AS total,
            SUM(CASE WHEN direction = 'Incoming' THEN 1 ELSE 0 END) AS incoming,
            SUM(CASE WHEN direction = 'Outgoing' THEN 1 ELSE 0 END) AS outgoing
        FROM messages
        WHERE date_readable IS NOT NULL
        GROUP BY contact_name, SUBSTR(date_readable, 1, 10)
        ORDER BY date
    """)

    idx.execute("""
        CREATE VIEW contact_summary AS
        SELECT
            c.contact_id,
            c.full_name,
            c.nickname,
            c.role,
            c.company,
            c.handles,
            c.source_device,
            c.total_messages,
            c.incoming_messages,
            c.outgoing_messages,
            c.earliest_message,
            c.latest_message,
            c.total_attachments,
            c.db_filename
        FROM contacts c
        ORDER BY c.total_messages DESC
    """)

    # Store metadata
    idx.executemany("INSERT INTO _index_metadata (key, value) VALUES (?, ?)", [
        ("created_at", now),
        ("tool", "build_whitelist_index.py"),
        ("case_id", "rbc_v_lg"),
        ("total_contacts", str(len(db_files))),
        ("total_messages", str(total_messages)),
        ("total_attachments", str(total_attachments)),
        ("source_directory", str(export_dir)),
    ])

    idx.commit()

    # Final size
    idx.close()
    index_size = index_path.stat().st_size
    index_hash = sha256_file(index_path)

    print()
    print("=" * 75)
    print("  INDEX COMPLETE")
    print(f"  Contacts indexed:   {len(db_files)}")
    print(f"  Messages indexed:   {total_messages:,}")
    print(f"  Attachments indexed:{total_attachments:,}")
    print(f"  Index size:         {index_size:,} bytes ({index_size / 1_048_576:.1f} MB)")
    print(f"  Index SHA-256:      {index_hash[:32]}...")
    print(f"  Index path:         {index_path}")
    print()
    print("  USAGE EXAMPLES:")
    print("    -- All messages from LG in March 2020:")
    print("    SELECT date_readable, sender, direction, text")
    print("    FROM messages")
    print("    WHERE contact_name = 'Lucas Guariglia'")
    print("      AND date_readable LIKE '2020-03%'")
    print("    ORDER BY date_readable;")
    print()
    print("    -- Contact overview:")
    print("    SELECT * FROM contact_summary;")
    print()
    print("    -- Daily message volume:")
    print("    SELECT * FROM daily_volume WHERE contact_name = 'Lucas Guariglia';")
    print()
    print("    -- Full-text search:")
    print("    SELECT date_readable, contact_name, sender, text")
    print("    FROM messages")
    print("    WHERE text LIKE '%invoice%'")
    print("    ORDER BY date_readable;")
    print("=" * 75)


if __name__ == "__main__":
    main()
