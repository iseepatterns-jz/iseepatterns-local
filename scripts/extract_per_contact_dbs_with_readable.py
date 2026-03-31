#!/usr/bin/env python3
"""
Per-Contact iMessage Database Extractor
========================================
Extracts individual SQLite databases from the master sms.db,
one per whitelisted contact. Preserves Apple's full relational
schema (messages, handles, chats, attachments, joins).

Designed for RBC v. LG litigation — produces court-ready,
per-contact evidence databases with full chain-of-custody logging.

TERMINAL COMMAND:
  python /Volumes/batdrivetb5/AI_TRAINING/lawmodel1/scripts/extract_per_contact_dbs_with_readable.py \
      --sms-db /Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/IMESSAGE_LOCKER/showgoat/HomeDomain/Library/SMS/sms.db \
      --whitelist /Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/LINKED_IN_PROFILE_LOCKER/contact-whitelist.xlsx \
      --output-dir /Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/IMESSAGE_LOCKER/WHITELIST_DB_EXPORT_LOCKER \
      --register-coc

Optional flags:
  --register-coc     Also register all outputs in lawmodel1 chain_of_custody table
  --coc-db PATH      Path to mbox_index.db (default: /Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/MBOX_LOCKER/mbox_index.db)
  --owner-handle NUM Your own phone number (default: +17736109104)

What it produces for each contact:
  1. A standalone SQLite DB: jz_<nickname>_<lastname>_imessage.db
  2. Contains: handle, message, chat, chat_handle_join, chat_message_join,
     attachment, message_attachment_join — all filtered to that contact's handles
  3. SHA-256 hash of each output DB
  4. An extraction manifest (JSON) documenting the exact queries used

Also produces:
  - extraction_manifest.json — full audit log of all extractions
  - extraction_report.md — human-readable summary report
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import openpyxl


# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

OWNER_DEFAULT_HANDLES = ["+17736109104", "17736109104", "joe@rowboatcreative.com"]


# ─────────────────────────────────────────────
# Utility Functions
# ─────────────────────────────────────────────

def sha256_file(filepath: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def sanitize_filename(name: str) -> str:
    """Create a safe filename from a contact name."""
    # Lowercase, replace spaces/special chars with underscore
    name = name.lower().strip()
    name = re.sub(r'[^a-z0-9]+', '_', name)
    name = name.strip('_')
    return name


def normalize_handle(raw: str) -> str:
    """
    Normalize a phone number or email handle to match sms.db format.
    Apple stores handles like: +18478280944 or email@domain.com
    """
    raw = raw.strip().lstrip('=')  # Excel sometimes prefixes with =
    # If it looks like a phone number (digits only, possibly with +)
    digits = re.sub(r'[^\d]', '', raw)
    if digits and len(digits) >= 10 and '@' not in raw:
        # Ensure + prefix and country code
        if len(digits) == 10:
            return f"+1{digits}"
        elif len(digits) == 11 and digits.startswith('1'):
            return f"+{digits}"
        else:
            return f"+{digits}"
    # Otherwise treat as email
    return raw.lower().strip()


def parse_whitelist(xlsx_path: Path) -> List[Dict[str, Any]]:
    """Parse the contact whitelist XLSX into a list of contact dicts."""
    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    ws = wb['Sheet1']
    contacts = []

    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
        if not row or not row[4]:  # Skip empty rows (check Full Name)
            continue

        company = str(row[0] or "").strip()
        role = str(row[1] or "").strip()
        last_name = str(row[2] or "").strip()
        first_name = str(row[3] or "").strip()
        full_name = str(row[4] or "").strip()
        nickname = str(row[5] or "").strip()
        imessage_raw = str(row[6] or "").strip()
        email = str(row[7] or "").strip()

        if not imessage_raw or imessage_raw == 'None':
            continue  # No iMessage handle, skip

        # Parse multiple handles
        raw_handles = [h.strip() for h in imessage_raw.replace(', ', ',').split(',')]
        normalized_handles = [normalize_handle(h) for h in raw_handles if h]

        contacts.append({
            "full_name": full_name,
            "first_name": first_name,
            "last_name": last_name,
            "nickname": nickname,
            "role": role,
            "company": company,
            "email": email,
            "raw_handles": raw_handles,
            "normalized_handles": normalized_handles,
        })

    wb.close()
    return contacts


# ─────────────────────────────────────────────
# Schema Discovery
# ─────────────────────────────────────────────

def get_table_schema(src_conn: sqlite3.Connection, table_name: str) -> str:
    """Get the CREATE TABLE statement for a table from the source DB."""
    cursor = src_conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,)
    )
    row = cursor.fetchone()
    if row and row[0]:
        return row[0]
    return ""


def get_all_tables(src_conn: sqlite3.Connection) -> List[str]:
    """Get all table names from the source DB."""
    cursor = src_conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    return [row[0] for row in cursor.fetchall()]


# ─────────────────────────────────────────────
# Core Extraction Logic
# ─────────────────────────────────────────────

def find_handle_rowids(src_conn: sqlite3.Connection, handles: List[str]) -> Set[int]:
    """
    Find all handle ROWIDs matching the given normalized handles.
    Tries exact match first, then fuzzy match on last 10 digits for phones.
    """
    handle_rowids = set()

    for handle in handles:
        # Exact match
        cursor = src_conn.execute(
            "SELECT ROWID FROM handle WHERE id = ?", (handle,)
        )
        for row in cursor.fetchall():
            handle_rowids.add(row[0])

        # Also try without + prefix
        if handle.startswith('+'):
            cursor = src_conn.execute(
                "SELECT ROWID FROM handle WHERE id = ?", (handle[1:],)
            )
            for row in cursor.fetchall():
                handle_rowids.add(row[0])

        # Fuzzy: match last 10 digits (handles area code variations)
        digits = re.sub(r'[^\d]', '', handle)
        if len(digits) >= 10:
            last10 = digits[-10:]
            cursor = src_conn.execute(
                "SELECT ROWID, id FROM handle WHERE id LIKE ?",
                (f"%{last10}",)
            )
            for row in cursor.fetchall():
                handle_rowids.add(row[0])

    return handle_rowids


def extract_contact_db(
    src_conn: sqlite3.Connection,
    contact: Dict[str, Any],
    owner_handles: List[str],
    output_dir: Path,
    source_tables: List[str],
) -> Optional[Dict[str, Any]]:
    """
    Extract all messages for a specific contact into a new SQLite database.
    Returns extraction metadata dict, or None if no messages found.
    """
    contact_handles = contact["normalized_handles"]
    safe_name = sanitize_filename(f"{contact['nickname']}_{contact['last_name']}")
    db_filename = f"jz_{safe_name}_imessage.db"
    db_path = output_dir / db_filename

    # Find handle ROWIDs for this contact
    contact_handle_rowids = find_handle_rowids(src_conn, contact_handles)

    if not contact_handle_rowids:
        return None  # Contact not found in sms.db

    # Find all messages involving these handles
    # Messages are linked to handles via handle_id (for incoming)
    # and via chat membership (for conversations)
    placeholders = ','.join('?' * len(contact_handle_rowids))
    rowid_list = list(contact_handle_rowids)

    # Get message ROWIDs: messages where handle_id matches the contact
    msg_cursor = src_conn.execute(f"""
        SELECT ROWID FROM message
        WHERE handle_id IN ({placeholders})
    """, rowid_list)
    message_rowids_from_handle = set(row[0] for row in msg_cursor.fetchall())

    # Also get messages from chats that include this contact
    # First, find chats containing these handles
    chat_cursor = src_conn.execute(f"""
        SELECT DISTINCT chat_id FROM chat_handle_join
        WHERE handle_id IN ({placeholders})
    """, rowid_list)
    chat_rowids = set(row[0] for row in chat_cursor.fetchall())

    # Then get all messages in those chats
    message_rowids_from_chat = set()
    if chat_rowids:
        chat_placeholders = ','.join('?' * len(chat_rowids))
        chat_msg_cursor = src_conn.execute(f"""
            SELECT DISTINCT message_id FROM chat_message_join
            WHERE chat_id IN ({chat_placeholders})
        """, list(chat_rowids))
        message_rowids_from_chat = set(row[0] for row in chat_msg_cursor.fetchall())

    # Union of both sets
    all_message_rowids = message_rowids_from_handle | message_rowids_from_chat

    if not all_message_rowids:
        return None  # No messages found

    # ── Create the output database ──
    if db_path.exists():
        db_path.unlink()  # Remove if exists from previous run

    dst_conn = sqlite3.connect(str(db_path))

    # Recreate the core tables with original Apple schema
    core_tables = ['handle', 'message', 'chat', 'attachment',
                   'chat_handle_join', 'chat_message_join', 'message_attachment_join']

    # Also include these if they exist
    optional_tables = ['deleted_messages', 'kvtable', 'sync_deleted_messages',
                       'sync_deleted_chats', 'sync_deleted_attachments',
                       'recoverable_message_part', 'unsynced_removed_recoverable_messages',
                       'message_processing_task']

    tables_created = []
    for table_name in core_tables + optional_tables:
        if table_name in source_tables:
            schema_sql = get_table_schema(src_conn, table_name)
            if schema_sql:
                try:
                    dst_conn.execute(schema_sql)
                    tables_created.append(table_name)
                except sqlite3.OperationalError:
                    pass  # Table might have syntax we can't replicate

    # ── Populate tables ──

    # 1. Handles: include the contact's handles AND owner handles (for context)
    owner_handle_rowids = find_handle_rowids(src_conn, owner_handles)
    all_handle_rowids = contact_handle_rowids | owner_handle_rowids

    # Actually, include ALL handles that appear in the relevant chats
    # This ensures group chat participants are preserved
    handles_in_chats = set()
    if chat_rowids:
        chat_ph = ','.join('?' * len(chat_rowids))
        h_cursor = src_conn.execute(f"""
            SELECT DISTINCT handle_id FROM chat_handle_join
            WHERE chat_id IN ({chat_ph})
        """, list(chat_rowids))
        handles_in_chats = set(row[0] for row in h_cursor.fetchall())

    all_handle_rowids = all_handle_rowids | handles_in_chats

    handle_ph = ','.join('?' * len(all_handle_rowids))
    if 'handle' in tables_created:
        cols = [desc[1] for desc in src_conn.execute("PRAGMA table_info(handle)").fetchall()]
        col_list = ', '.join(cols)
        rows = src_conn.execute(f"""
            SELECT ROWID, {col_list} FROM handle
            WHERE ROWID IN ({handle_ph})
        """, list(all_handle_rowids)).fetchall()
        if rows:
            placeholders_insert = ', '.join(['?'] * (len(cols) + 1))
            dst_conn.executemany(
                f"INSERT OR IGNORE INTO handle (ROWID, {col_list}) VALUES ({placeholders_insert})",
                rows
            )

    # 2. Messages
    msg_ph = ','.join('?' * len(all_message_rowids))
    msg_rowid_list = list(all_message_rowids)
    if 'message' in tables_created and all_message_rowids:
        cols = [desc[1] for desc in src_conn.execute("PRAGMA table_info(message)").fetchall()]
        col_list = ', '.join(cols)

        # Process in batches to avoid SQLite variable limit (999)
        batch_size = 500
        for batch_start in range(0, len(msg_rowid_list), batch_size):
            batch = msg_rowid_list[batch_start:batch_start + batch_size]
            batch_ph = ','.join('?' * len(batch))
            rows = src_conn.execute(f"""
                SELECT ROWID, {col_list} FROM message
                WHERE ROWID IN ({batch_ph})
            """, batch).fetchall()
            if rows:
                placeholders_insert = ', '.join(['?'] * (len(cols) + 1))
                dst_conn.executemany(
                    f"INSERT OR IGNORE INTO message (ROWID, {col_list}) VALUES ({placeholders_insert})",
                    rows
                )

    # 3. Chats
    if 'chat' in tables_created and chat_rowids:
        cols = [desc[1] for desc in src_conn.execute("PRAGMA table_info(chat)").fetchall()]
        col_list = ', '.join(cols)
        chat_ph = ','.join('?' * len(chat_rowids))
        rows = src_conn.execute(f"""
            SELECT ROWID, {col_list} FROM chat
            WHERE ROWID IN ({chat_ph})
        """, list(chat_rowids)).fetchall()
        if rows:
            placeholders_insert = ', '.join(['?'] * (len(cols) + 1))
            dst_conn.executemany(
                f"INSERT OR IGNORE INTO chat (ROWID, {col_list}) VALUES ({placeholders_insert})",
                rows
            )

    # 4. Chat-handle joins
    if 'chat_handle_join' in tables_created and chat_rowids:
        cols = [desc[1] for desc in src_conn.execute("PRAGMA table_info(chat_handle_join)").fetchall()]
        col_list = ', '.join(cols)
        chat_ph = ','.join('?' * len(chat_rowids))
        rows = src_conn.execute(f"""
            SELECT {col_list} FROM chat_handle_join
            WHERE chat_id IN ({chat_ph})
        """, list(chat_rowids)).fetchall()
        if rows:
            placeholders_insert = ', '.join(['?'] * len(cols))
            dst_conn.executemany(
                f"INSERT OR IGNORE INTO chat_handle_join ({col_list}) VALUES ({placeholders_insert})",
                rows
            )

    # 5. Chat-message joins
    if 'chat_message_join' in tables_created and chat_rowids:
        cols = [desc[1] for desc in src_conn.execute("PRAGMA table_info(chat_message_join)").fetchall()]
        col_list = ', '.join(cols)
        chat_ph = ','.join('?' * len(chat_rowids))
        rows = src_conn.execute(f"""
            SELECT {col_list} FROM chat_message_join
            WHERE chat_id IN ({chat_ph})
        """, list(chat_rowids)).fetchall()
        if rows:
            placeholders_insert = ', '.join(['?'] * len(cols))
            # Batch insert
            for batch_start in range(0, len(rows), batch_size):
                batch = rows[batch_start:batch_start + batch_size]
                dst_conn.executemany(
                    f"INSERT OR IGNORE INTO chat_message_join ({col_list}) VALUES ({placeholders_insert})",
                    batch
                )

    # 6. Attachments (linked to extracted messages)
    if 'attachment' in tables_created and 'message_attachment_join' in tables_created and all_message_rowids:
        # First find attachment IDs linked to our messages
        attachment_rowids = set()
        for batch_start in range(0, len(msg_rowid_list), batch_size):
            batch = msg_rowid_list[batch_start:batch_start + batch_size]
            batch_ph = ','.join('?' * len(batch))
            att_cursor = src_conn.execute(f"""
                SELECT DISTINCT attachment_id FROM message_attachment_join
                WHERE message_id IN ({batch_ph})
            """, batch)
            for row in att_cursor.fetchall():
                attachment_rowids.add(row[0])

        # Insert attachment records
        if attachment_rowids:
            cols = [desc[1] for desc in src_conn.execute("PRAGMA table_info(attachment)").fetchall()]
            col_list = ', '.join(cols)
            att_list = list(attachment_rowids)
            for batch_start in range(0, len(att_list), batch_size):
                batch = att_list[batch_start:batch_start + batch_size]
                batch_ph = ','.join('?' * len(batch))
                rows = src_conn.execute(f"""
                    SELECT ROWID, {col_list} FROM attachment
                    WHERE ROWID IN ({batch_ph})
                """, batch).fetchall()
                if rows:
                    placeholders_insert = ', '.join(['?'] * (len(cols) + 1))
                    dst_conn.executemany(
                        f"INSERT OR IGNORE INTO attachment (ROWID, {col_list}) VALUES ({placeholders_insert})",
                        rows
                    )

        # Insert message-attachment joins
        maj_cols = [desc[1] for desc in src_conn.execute("PRAGMA table_info(message_attachment_join)").fetchall()]
        maj_col_list = ', '.join(maj_cols)
        for batch_start in range(0, len(msg_rowid_list), batch_size):
            batch = msg_rowid_list[batch_start:batch_start + batch_size]
            batch_ph = ','.join('?' * len(batch))
            rows = src_conn.execute(f"""
                SELECT {maj_col_list} FROM message_attachment_join
                WHERE message_id IN ({batch_ph})
            """, batch).fetchall()
            if rows:
                placeholders_insert = ', '.join(['?'] * len(maj_cols))
                dst_conn.executemany(
                    f"INSERT OR IGNORE INTO message_attachment_join ({maj_col_list}) VALUES ({placeholders_insert})",
                    rows
                )

    # ── Create human-readable convenience views ──
    dst_conn.execute("""
        CREATE VIEW IF NOT EXISTS messages_readable AS
        SELECT
            m.ROWID AS message_id,
            datetime(m.date/1000000000 + 978307200, 'unixepoch', 'localtime') AS date_local,
            CASE WHEN m.is_from_me = 1 THEN 'JZ (outgoing)' ELSE h.id END AS sender,
            CASE WHEN m.is_from_me = 1 THEN 'Outgoing' ELSE 'Incoming' END AS direction,
            m.text,
            h.id AS handle,
            h.service,
            datetime(m.date_read/1000000000 + 978307200, 'unixepoch', 'localtime') AS date_read_local,
            datetime(m.date_delivered/1000000000 + 978307200, 'unixepoch', 'localtime') AS date_delivered_local,
            m.is_from_me,
            m.cache_has_attachments,
            m.handle_id,
            m.date AS date_raw
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        ORDER BY m.date
    """)

    dst_conn.execute("""
        CREATE VIEW IF NOT EXISTS conversation_summary AS
        SELECT
            h.id AS contact_handle,
            h.service,
            COUNT(*) AS total_messages,
            SUM(CASE WHEN m.is_from_me = 0 THEN 1 ELSE 0 END) AS incoming,
            SUM(CASE WHEN m.is_from_me = 1 THEN 1 ELSE 0 END) AS outgoing,
            datetime(MIN(m.date)/1000000000 + 978307200, 'unixepoch', 'localtime') AS earliest,
            datetime(MAX(m.date)/1000000000 + 978307200, 'unixepoch', 'localtime') AS latest,
            SUM(m.cache_has_attachments) AS attachments
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        GROUP BY h.id, h.service
    """)

    # ── Add extraction metadata table ──
    dst_conn.execute("""
        CREATE TABLE IF NOT EXISTS _extraction_metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    now = datetime.now(timezone.utc).isoformat()
    metadata_entries = [
        ("extraction_tool", "extract_per_contact_dbs.py"),
        ("extraction_timestamp", now),
        ("contact_full_name", contact["full_name"]),
        ("contact_nickname", contact["nickname"]),
        ("contact_role", contact["role"]),
        ("contact_company", contact["company"]),
        ("contact_handles", json.dumps(contact["normalized_handles"])),
        ("contact_raw_handles", json.dumps(contact["raw_handles"])),
        ("source_db", "sms.db (Apple iMessage/SMS database)"),
        ("owner_name", "Joseph Zangrilli"),
        ("owner_handles", json.dumps(OWNER_DEFAULT_HANDLES)),
        ("case_id", "rbc_v_lg"),
        ("total_messages_extracted", str(len(all_message_rowids))),
        ("total_handles_included", str(len(all_handle_rowids))),
        ("total_chats_included", str(len(chat_rowids))),
    ]
    dst_conn.executemany(
        "INSERT OR REPLACE INTO _extraction_metadata (key, value) VALUES (?, ?)",
        metadata_entries
    )

    dst_conn.commit()

    # Get counts for reporting
    msg_count = dst_conn.execute("SELECT COUNT(*) FROM message").fetchone()[0]
    handle_count = dst_conn.execute("SELECT COUNT(*) FROM handle").fetchone()[0]

    # Date range
    date_range = dst_conn.execute("""
        SELECT
            MIN(datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime')),
            MAX(datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime'))
        FROM message WHERE date > 0
    """).fetchone()

    # Direction counts
    incoming = dst_conn.execute("SELECT COUNT(*) FROM message WHERE is_from_me = 0").fetchone()[0]
    outgoing = dst_conn.execute("SELECT COUNT(*) FROM message WHERE is_from_me = 1").fetchone()[0]

    attachment_count = 0
    try:
        attachment_count = dst_conn.execute("SELECT COUNT(*) FROM attachment").fetchone()[0]
    except:
        pass

    dst_conn.close()

    # Hash the output DB
    output_hash = sha256_file(db_path)
    output_size = db_path.stat().st_size

    return {
        "contact_name": contact["full_name"],
        "contact_nickname": contact["nickname"],
        "contact_role": contact["role"],
        "contact_company": contact["company"],
        "contact_handles": contact["normalized_handles"],
        "db_filename": db_filename,
        "db_path": str(db_path),
        "sha256": output_hash,
        "size_bytes": output_size,
        "message_count": msg_count,
        "incoming_count": incoming,
        "outgoing_count": outgoing,
        "handle_count": handle_count,
        "chat_count": len(chat_rowids),
        "attachment_count": attachment_count,
        "earliest_date": date_range[0] if date_range else None,
        "latest_date": date_range[1] if date_range else None,
        "tables_created": tables_created + ["_extraction_metadata"],
        "extraction_timestamp": now,
    }


# ─────────────────────────────────────────────
# Chain of Custody Registration
# ─────────────────────────────────────────────

def register_in_coc(coc_db_path: str, source_hash: str, source_path: str, extractions: List[Dict]) -> int:
    """Register source and all extracted DBs in chain_of_custody."""
    conn = sqlite3.connect(coc_db_path)
    cursor = conn.cursor()

    cursor.execute("""
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
    """)

    now = datetime.now(timezone.utc).isoformat()
    inserted = 0

    for ext in extractions:
        cursor.execute(
            "SELECT id FROM chain_of_custody WHERE source_path = ? AND sha256 = ?",
            (ext["db_path"], ext["sha256"])
        )
        if cursor.fetchone():
            continue

        notes = (f"Extracted from sms.db for {ext['contact_name']} ({ext['contact_role']}, "
                 f"{ext['contact_company']}). {ext['message_count']:,} messages, "
                 f"{ext['earliest_date']} to {ext['latest_date']}. "
                 f"Source sms.db SHA-256: {source_hash}")

        cursor.execute(
            """INSERT INTO chain_of_custody
               (source_path, source_type, sha256, size_bytes, case_id, notes, ingested_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                ext["db_path"],
                "imessage_per_contact_extract",
                ext["sha256"],
                ext["size_bytes"],
                "rbc_v_lg",
                notes,
                now,
            )
        )
        inserted += 1

    conn.commit()
    conn.close()
    return inserted


# ─────────────────────────────────────────────
# Report Generation
# ─────────────────────────────────────────────

def generate_reports(
    source_path: str,
    source_hash: str,
    source_size: int,
    extractions: List[Dict],
    skipped: List[Dict],
    output_dir: Path,
):
    """Generate extraction manifest (JSON) and human-readable report (Markdown)."""
    now = datetime.now(timezone.utc)

    # ── JSON Manifest ──
    manifest = {
        "extraction_tool": "extract_per_contact_dbs.py",
        "extraction_timestamp": now.isoformat(),
        "case_id": "rbc_v_lg",
        "source": {
            "path": source_path,
            "sha256": source_hash,
            "size_bytes": source_size,
            "description": "Apple iMessage/SMS database (sms.db) from iMazing raw export",
        },
        "owner": {
            "name": "Joseph Zangrilli",
            "handles": OWNER_DEFAULT_HANDLES,
        },
        "extractions": extractions,
        "skipped_contacts": skipped,
        "summary": {
            "total_contacts_processed": len(extractions) + len(skipped),
            "contacts_with_messages": len(extractions),
            "contacts_without_messages": len(skipped),
            "total_messages_extracted": sum(e["message_count"] for e in extractions),
            "total_databases_created": len(extractions),
        },
    }

    manifest_path = output_dir / f"extraction_manifest_{now.strftime('%Y%m%d_%H%M%S')}.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")

    # ── Markdown Report ──
    lines = []
    def line(s=""):
        lines.append(s)

    line("# Per-Contact iMessage Extraction Report")
    line(f"**Generated:** {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    line(f"**Case:** RBC v. LG")
    line(f"**Tool:** extract_per_contact_dbs.py")
    line()

    line("---")
    line()
    line("## Source Database")
    line()
    line(f"- **Path:** `{source_path}`")
    line(f"- **SHA-256:** `{source_hash}`")
    line(f"- **Size:** {source_size:,} bytes")
    line(f"- **Description:** Apple-generated iMessage/SMS database from iMazing raw export of iPhone 12 (\"showgoat\")")
    line()

    line("---")
    line()
    line("## Extracted Databases")
    line()
    line(f"**{len(extractions)} databases** created from **{len(extractions) + len(skipped)}** whitelisted contacts.")
    line()

    line("| # | Contact | Role | Company | Messages | Date Range | DB File | SHA-256 (short) |")
    line("|:--|:--------|:-----|:--------|:---------|:-----------|:--------|:----------------|")
    for i, ext in enumerate(sorted(extractions, key=lambda x: x["message_count"], reverse=True), 1):
        date_range = f"{ext['earliest_date'][:10] if ext['earliest_date'] else '?'} – {ext['latest_date'][:10] if ext['latest_date'] else '?'}"
        line(f"| {i} | {ext['contact_name']} | {ext['contact_role']} | {ext['contact_company']} | "
             f"{ext['message_count']:,} | {date_range} | `{ext['db_filename']}` | `{ext['sha256'][:16]}…` |")
    line()

    total_msgs = sum(e["message_count"] for e in extractions)
    line(f"**Total messages across all extractions:** {total_msgs:,}")
    line()

    if skipped:
        line("---")
        line()
        line("## Contacts With No iMessages Found")
        line()
        line("These contacts had iMessage handles in the whitelist but no matching messages in sms.db.")
        line("This may mean they communicated via other channels (email, phone calls) or their handle")
        line("format in the database differs from what was listed.")
        line()
        for s in skipped:
            handles = ', '.join(s['handles'])
            line(f"- {s['name']} ({s['role']}, {s['company']}) — handles: {handles}")
        line()

    line("---")
    line()
    line("## Chain of Custody Notes")
    line()
    line("Each extracted database:")
    line("1. Was created by reading the source sms.db in **read-only mode** (no modifications to source)")
    line("2. Contains only messages associated with the specific contact's handle(s)")
    line("3. Preserves Apple's original database schema and ROWID values")
    line("4. Includes an `_extraction_metadata` table documenting the extraction parameters")
    line("5. Was hashed with SHA-256 immediately after creation")
    line()
    line("The source sms.db was **not modified** during this process. Its hash can be independently")
    line("verified against the forensic audit report generated by `imazing_forensic_audit.py`.")
    line()

    line("---")
    line()
    line("## Full Hash Table")
    line()
    line("| File | SHA-256 | Size (bytes) |")
    line("|:-----|:--------|:-------------|")
    line(f"| **SOURCE: sms.db** | `{source_hash}` | {source_size:,} |")
    for ext in sorted(extractions, key=lambda x: x["contact_name"]):
        line(f"| {ext['db_filename']} | `{ext['sha256']}` | {ext['size_bytes']:,} |")
    line()

    report_path = output_dir / f"extraction_report_{now.strftime('%Y%m%d_%H%M%S')}.md"
    report_path.write_text("\n".join(lines), encoding="utf-8")

    return manifest_path, report_path


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Extract per-contact iMessage databases from sms.db"
    )
    parser.add_argument(
        "--sms-db",
        required=True,
        help="Path to the source sms.db from iMazing raw export",
    )
    parser.add_argument(
        "--whitelist",
        required=True,
        help="Path to contact-whitelist.xlsx",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory to write per-contact databases",
    )
    parser.add_argument(
        "--owner-handle",
        default="+17736109104",
        help="Your phone number (default: +17736109104)",
    )
    parser.add_argument(
        "--register-coc",
        action="store_true",
        help="Register outputs in lawmodel1 chain_of_custody",
    )
    parser.add_argument(
        "--coc-db",
        default="/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/MBOX_LOCKER/mbox_index.db",
        help="Path to mbox_index.db for CoC registration",
    )

    args = parser.parse_args()

    sms_db_path = Path(args.sms_db).resolve()
    whitelist_path = Path(args.whitelist).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not sms_db_path.exists():
        print(f"[ERROR] sms.db not found: {sms_db_path}")
        sys.exit(1)
    if not whitelist_path.exists():
        print(f"[ERROR] Whitelist not found: {whitelist_path}")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("  Per-Contact iMessage Database Extractor")
    print(f"  Source:    {sms_db_path}")
    print(f"  Whitelist: {whitelist_path}")
    print(f"  Output:    {output_dir}")
    print("=" * 70)
    print()

    # Hash the source first
    print("[1/5] Hashing source sms.db (this may take a moment for large files)...")
    source_hash = sha256_file(sms_db_path)
    source_size = sms_db_path.stat().st_size
    print(f"  SHA-256: {source_hash}")
    print(f"  Size:    {source_size:,} bytes")
    print()

    # Parse whitelist
    print("[2/5] Parsing contact whitelist...")
    contacts = parse_whitelist(whitelist_path)
    # Exclude self (Joseph Zangrilli)
    contacts = [c for c in contacts if c["last_name"].lower() != "zangrilli"]
    print(f"  {len(contacts)} contacts loaded (excluding self)")
    print()

    # Open source DB read-only
    print("[3/5] Opening source database (read-only)...")
    src_conn = sqlite3.connect(f"file:{sms_db_path}?mode=ro", uri=True)
    source_tables = get_all_tables(src_conn)
    print(f"  Tables in source: {len(source_tables)}")

    # Quick stats on source
    total_msgs = src_conn.execute("SELECT COUNT(*) FROM message").fetchone()[0]
    total_handles = src_conn.execute("SELECT COUNT(*) FROM handle").fetchone()[0]
    print(f"  Total messages: {total_msgs:,}")
    print(f"  Total handles:  {total_handles}")
    print()

    # Owner handles
    owner_handles = [args.owner_handle] + OWNER_DEFAULT_HANDLES
    owner_handles = list(set(normalize_handle(h) for h in owner_handles))

    # Extract per contact
    print("[4/5] Extracting per-contact databases...")
    print()
    extractions = []
    skipped = []

    for i, contact in enumerate(contacts, 1):
        prefix = f"  [{i}/{len(contacts)}]"
        print(f"{prefix} {contact['full_name']} ({contact['role']}, {contact['company']})...")
        handles_str = ', '.join(contact['normalized_handles'])
        print(f"         Handles: {handles_str}")

        result = extract_contact_db(
            src_conn=src_conn,
            contact=contact,
            owner_handles=owner_handles,
            output_dir=output_dir,
            source_tables=source_tables,
        )

        if result:
            extractions.append(result)
            print(f"         ✓ {result['message_count']:,} messages "
                  f"({result['incoming_count']:,} in / {result['outgoing_count']:,} out)")
            print(f"         ✓ {result['earliest_date']} to {result['latest_date']}")
            print(f"         ✓ {result['db_filename']} ({result['size_bytes']:,} bytes)")
            print(f"         ✓ SHA-256: {result['sha256'][:32]}...")
        else:
            skipped.append({
                "name": contact["full_name"],
                "role": contact["role"],
                "company": contact["company"],
                "handles": contact["normalized_handles"],
            })
            print(f"         — No messages found (skipped)")
        print()

    src_conn.close()

    # Generate reports
    print("[5/5] Generating extraction reports...")
    manifest_path, report_path = generate_reports(
        source_path=str(sms_db_path),
        source_hash=source_hash,
        source_size=source_size,
        extractions=extractions,
        skipped=skipped,
        output_dir=output_dir,
    )
    print(f"  ✓ Manifest: {manifest_path}")
    print(f"  ✓ Report:   {report_path}")
    print()

    # Optional CoC registration
    if args.register_coc:
        print("[CoC] Registering in chain_of_custody...")
        inserted = register_in_coc(args.coc_db, source_hash, str(sms_db_path), extractions)
        print(f"  ✓ {inserted} new records inserted")
        print()

    # Summary
    total_extracted = sum(e["message_count"] for e in extractions)
    print("=" * 70)
    print("  EXTRACTION COMPLETE")
    print(f"  Databases created:     {len(extractions)}")
    print(f"  Contacts skipped:      {len(skipped)}")
    print(f"  Total messages:        {total_extracted:,}")
    print(f"  Source sms.db hash:    {source_hash[:32]}...")
    print(f"  Report:                {report_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()
