#!/usr/bin/env python3
"""
Per-Contact iMessage Database Extractor (Dual-Source)
=====================================================
Extracts individual SQLite databases from sms.db, one per whitelisted
contact. Uses TWO source databases:

  - iPhone 12 Pro (2024-06-06): Used ONLY for the LG direct thread
    (the 1-on-1 between JZ +17736109104 and LG +18478280944),
    because this thread was lost during the iPhone 12 → 14 migration.

  - iPhone 14 Pro (2024-06-07): Used for ALL other whitelist contacts,
    as this is the more current device with complete threads.

Preserves Apple's full relational schema (messages, handles, chats,
attachments, joins). Produces court-ready, per-contact evidence
databases with full chain-of-custody logging.

v3 (2026-04-01): Recovers hidden text from attributedBody BLOBs.
  ~10,700 messages have NULL text but contain readable text inside
  the NSAttributedString binary blob. This version extracts that text
  into a new `recovered_text` column on the message table, updates the
  messages_readable view to use COALESCE(m.text, m.recovered_text),
  and logs recovery statistics in _extraction_metadata.

TERMINAL COMMAND:
  python /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/extract_per_contact_dbs.py --register-coc

Optional flags:
  --register-coc     Register all outputs in lawmodel1 chain_of_custody table
  --coc-db PATH      Path to mbox_index.db (default: auto)
  --owner-handle NUM Your own phone number (default: +17736109104)
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
from typing import Any, Dict, List, Optional, Set

import openpyxl


# ─────────────────────────────────────────────
# Configuration — ALL PATHS HARDCODED
# ─────────────────────────────────────────────

DB_IPHONE12 = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/IMESSAGE_LOCKER/2024-06-06-iphone-12-imazing-export-showgoat/showgoat/HomeDomain/Library/SMS/sms.db"
DB_IPHONE14 = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/IMESSAGE_LOCKER/2025-12-09-iphone-14-imazing-export-showgoat2/showgoat2/HomeDomain/Library/SMS/sms.db"

WHITELIST_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/LINKED_IN_PROFILE_LOCKER/contact-whitelist.xlsx"
OUTPUT_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/IMESSAGE_LOCKER/WHITELIST_DB_EXPORT_LOCKER"
COC_DB_DEFAULT = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_index.db"

OWNER_DEFAULT_HANDLES = ["+17736109104", "17736109104", "joe@rowboatcreative.com"]

# LG handles — these get extracted from iPhone 12 Pro only
LG_HANDLES_NORMALIZED = ["+18478280944", "18478280944@tmomail.net", "lucas@rowboatcreative.com"]
LG_LAST_NAME = "guariglia"


# ─────────────────────────────────────────────
# attributedBody BLOB Text Recovery
# ─────────────────────────────────────────────

def extract_text_from_attributed_body(blob: bytes) -> Optional[str]:
    """
    Extract readable text from an NSAttributedString typedstream blob.

    iOS stores message text in TWO places:
      1. message.text (plaintext column)
      2. message.attributedBody (binary NSAttributedString / typedstream)

    When a message contains mixed content (text + attachment, rich text,
    special characters), iOS sometimes stores the text ONLY in the blob,
    leaving message.text as NULL.

    This function parses the typedstream format to recover that text.
    Returns None if no text can be recovered (e.g., empty blob shell).
    """
    if blob is None:
        return None

    try:
        raw = blob.decode('utf-8', errors='ignore')

        # Find text after the NSString header in the typedstream
        idx_start = raw.find('NSString')
        if idx_start < 0:
            return None

        chunk = raw[idx_start + 8:]

        # Strip typedstream header control bytes
        chunk = chunk.lstrip(
            '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d'
            '\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b'
            '\x1c\x1d\x1e\x1f\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89'
            '\x8a\x8b\x8c\x8d\x8e\x8f\x90\x91\x92\x93\x94\x95\x96\x97'
            '\x98\x99\x9a\x9b\x9c\x9d\x9e\x9f+'
        )

        # Find end of text — marked by NSDictionary or structural bytes
        end_markers = ['\x86\x84', 'NSDictionary']
        end_idx = len(chunk)
        for marker in end_markers:
            pos = chunk.find(marker)
            if 0 < pos < end_idx:
                end_idx = pos

        text = chunk[:end_idx]

        # Remove U+FFFC (Object Replacement Character — marks inline attachments)
        text = text.replace('\ufffc', '').replace('￼', '')

        # Remove remaining control characters (preserve newlines and tabs)
        text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)

        text = text.strip()

        if not text:
            return None

        return text

    except Exception:
        return None


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
    name = name.lower().strip()
    name = re.sub(r'[^a-z0-9]+', '_', name)
    name = name.strip('_')
    return name


def normalize_handle(raw: str) -> str:
    """Normalize a phone number or email handle to match sms.db format."""
    raw = raw.strip().lstrip('=')
    digits = re.sub(r'[^\d]', '', raw)
    if digits and len(digits) >= 10 and '@' not in raw:
        if len(digits) == 10:
            return f"+1{digits}"
        elif len(digits) == 11 and digits.startswith('1'):
            return f"+{digits}"
        else:
            return f"+{digits}"
    return raw.lower().strip()


def parse_whitelist(xlsx_path: Path) -> List[Dict[str, Any]]:
    """Parse the contact whitelist XLSX into a list of contact dicts."""
    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    ws = wb['Sheet1']
    contacts = []

    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
        if not row or not row[4]:
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
            continue

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
# Schema / DB Helpers
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


def find_handle_rowids(src_conn: sqlite3.Connection, handles: List[str]) -> Set[int]:
    """Find all handle ROWIDs matching the given normalized handles."""
    handle_rowids = set()

    for handle in handles:
        cursor = src_conn.execute(
            "SELECT ROWID FROM handle WHERE id = ?", (handle,)
        )
        for row in cursor.fetchall():
            handle_rowids.add(row[0])

        if handle.startswith('+'):
            cursor = src_conn.execute(
                "SELECT ROWID FROM handle WHERE id = ?", (handle[1:],)
            )
            for row in cursor.fetchall():
                handle_rowids.add(row[0])

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


# ─────────────────────────────────────────────
# attributedBody Recovery Pass
# ─────────────────────────────────────────────

def recover_blob_text(dst_conn: sqlite3.Connection) -> Dict[str, int]:
    """
    Post-extraction pass: add `recovered_text` column to the message table
    and populate it from attributedBody BLOBs where text IS NULL.

    Returns stats dict with counts.
    """
    stats = {
        "null_text_total": 0,
        "null_text_has_blob": 0,
        "recovered_ok": 0,
        "recovered_empty_blob": 0,
        "recovered_failed": 0,
    }

    # Add recovered_text column if not present
    try:
        dst_conn.execute("ALTER TABLE message ADD COLUMN recovered_text TEXT DEFAULT NULL")
    except sqlite3.OperationalError:
        # Column already exists (e.g., re-run)
        pass

    # Find messages where text is NULL but attributedBody exists
    rows = dst_conn.execute("""
        SELECT ROWID, attributedBody
        FROM message
        WHERE text IS NULL AND attributedBody IS NOT NULL
    """).fetchall()

    stats["null_text_has_blob"] = len(rows)

    # Also count total null text
    stats["null_text_total"] = dst_conn.execute(
        "SELECT COUNT(*) FROM message WHERE text IS NULL"
    ).fetchone()[0]

    updates = []
    for rowid, blob in rows:
        recovered = extract_text_from_attributed_body(blob)
        if recovered:
            updates.append((recovered, rowid))
            stats["recovered_ok"] += 1
        else:
            stats["recovered_empty_blob"] += 1

    if updates:
        dst_conn.executemany(
            "UPDATE message SET recovered_text = ? WHERE ROWID = ?",
            updates
        )

    dst_conn.commit()
    return stats


# ─────────────────────────────────────────────
# Core Extraction Logic
# ─────────────────────────────────────────────

def extract_contact_db(
    src_conn: sqlite3.Connection,
    contact: Dict[str, Any],
    owner_handles: List[str],
    output_dir: Path,
    source_tables: List[str],
    source_label: str,
    source_db_path: str,
) -> Optional[Dict[str, Any]]:
    """
    Extract all messages for a specific contact into a new SQLite database.
    Returns extraction metadata dict, or None if no messages found.
    """
    contact_handles = contact["normalized_handles"]
    safe_name = sanitize_filename(f"{contact['nickname']}_{contact['last_name']}")
    db_filename = f"jz_{safe_name}_imessage.db"
    db_path = output_dir / db_filename

    contact_handle_rowids = find_handle_rowids(src_conn, contact_handles)

    if not contact_handle_rowids:
        return None

    placeholders = ','.join('?' * len(contact_handle_rowids))
    rowid_list = list(contact_handle_rowids)

    msg_cursor = src_conn.execute(f"""
        SELECT ROWID FROM message
        WHERE handle_id IN ({placeholders})
    """, rowid_list)
    message_rowids_from_handle = set(row[0] for row in msg_cursor.fetchall())

    chat_cursor = src_conn.execute(f"""
        SELECT DISTINCT chat_id FROM chat_handle_join
        WHERE handle_id IN ({placeholders})
    """, rowid_list)
    chat_rowids = set(row[0] for row in chat_cursor.fetchall())

    message_rowids_from_chat = set()
    if chat_rowids:
        chat_placeholders = ','.join('?' * len(chat_rowids))
        chat_msg_cursor = src_conn.execute(f"""
            SELECT DISTINCT message_id FROM chat_message_join
            WHERE chat_id IN ({chat_placeholders})
        """, list(chat_rowids))
        message_rowids_from_chat = set(row[0] for row in chat_msg_cursor.fetchall())

    all_message_rowids = message_rowids_from_handle | message_rowids_from_chat

    if not all_message_rowids:
        return None

    if db_path.exists():
        db_path.unlink()

    dst_conn = sqlite3.connect(str(db_path))

    core_tables = ['handle', 'message', 'chat', 'attachment',
                   'chat_handle_join', 'chat_message_join', 'message_attachment_join']

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
                    pass

    # Populate tables
    batch_size = 500

    owner_handle_rowids = find_handle_rowids(src_conn, owner_handles)
    all_handle_rowids = contact_handle_rowids | owner_handle_rowids

    handles_in_chats = set()
    if chat_rowids:
        chat_ph = ','.join('?' * len(chat_rowids))
        h_cursor = src_conn.execute(f"""
            SELECT DISTINCT handle_id FROM chat_handle_join
            WHERE chat_id IN ({chat_ph})
        """, list(chat_rowids))
        handles_in_chats = set(row[0] for row in h_cursor.fetchall())

    all_handle_rowids = all_handle_rowids | handles_in_chats

    # 1. Handles
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
    msg_rowid_list = list(all_message_rowids)
    if 'message' in tables_created and all_message_rowids:
        cols = [desc[1] for desc in src_conn.execute("PRAGMA table_info(message)").fetchall()]
        col_list = ', '.join(cols)
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
            for batch_start in range(0, len(rows), batch_size):
                batch = rows[batch_start:batch_start + batch_size]
                dst_conn.executemany(
                    f"INSERT OR IGNORE INTO chat_message_join ({col_list}) VALUES ({placeholders_insert})",
                    batch
                )

    # 6. Attachments
    if 'attachment' in tables_created and 'message_attachment_join' in tables_created and all_message_rowids:
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

    # ── Recover hidden text from attributedBody BLOBs ──
    recovery_stats = recover_blob_text(dst_conn)

    # ── Readable views (v3: uses COALESCE to show recovered text) ──
    dst_conn.execute("""
        CREATE VIEW IF NOT EXISTS messages_readable AS
        SELECT
            m.ROWID AS message_id,
            datetime(m.date/1000000000 + 978307200, 'unixepoch', 'localtime') AS date_local,
            CASE WHEN m.is_from_me = 1 THEN 'JZ (outgoing)' ELSE h.id END AS sender,
            CASE WHEN m.is_from_me = 1 THEN 'Outgoing' ELSE 'Incoming' END AS direction,
            COALESCE(m.text, m.recovered_text) AS text,
            m.text AS text_original,
            m.recovered_text,
            h.id AS handle,
            h.service,
            datetime(m.date_read/1000000000 + 978307200, 'unixepoch', 'localtime') AS date_read_local,
            datetime(m.date_delivered/1000000000 + 978307200, 'unixepoch', 'localtime') AS date_delivered_local,
            m.is_from_me,
            m.cache_has_attachments,
            m.handle_id,
            m.date AS date_raw,
            CASE
                WHEN m.text IS NOT NULL THEN 'text_column'
                WHEN m.recovered_text IS NOT NULL THEN 'recovered_from_blob'
                WHEN m.attributedBody IS NOT NULL THEN 'blob_present_no_text'
                ELSE 'no_content'
            END AS text_source
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
            SUM(m.cache_has_attachments) AS attachments,
            SUM(CASE WHEN m.text IS NULL AND m.recovered_text IS NOT NULL THEN 1 ELSE 0 END) AS recovered_from_blob
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        GROUP BY h.id, h.service
    """)

    # ── Extraction metadata ──
    dst_conn.execute("""
        CREATE TABLE IF NOT EXISTS _extraction_metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    now = datetime.now(timezone.utc).isoformat()
    metadata_entries = [
        ("extraction_tool", "extract_per_contact_dbs.py (dual-source v3 — blob recovery)"),
        ("extraction_timestamp", now),
        ("contact_full_name", contact["full_name"]),
        ("contact_nickname", contact["nickname"]),
        ("contact_role", contact["role"]),
        ("contact_company", contact["company"]),
        ("contact_handles", json.dumps(contact["normalized_handles"])),
        ("contact_raw_handles", json.dumps(contact["raw_handles"])),
        ("source_db", source_db_path),
        ("source_device", source_label),
        ("owner_name", "Joseph Zangrilli"),
        ("owner_handles", json.dumps(OWNER_DEFAULT_HANDLES)),
        ("case_id", "rbc_v_lg"),
        ("total_messages_extracted", str(len(all_message_rowids))),
        ("total_handles_included", str(len(all_handle_rowids))),
        ("total_chats_included", str(len(chat_rowids))),
        # v3: blob recovery stats
        ("blob_recovery_null_text_total", str(recovery_stats["null_text_total"])),
        ("blob_recovery_null_text_has_blob", str(recovery_stats["null_text_has_blob"])),
        ("blob_recovery_text_recovered", str(recovery_stats["recovered_ok"])),
        ("blob_recovery_empty_blob", str(recovery_stats["recovered_empty_blob"])),
        ("blob_recovery_failed", str(recovery_stats["recovered_failed"])),
    ]
    dst_conn.executemany(
        "INSERT OR REPLACE INTO _extraction_metadata (key, value) VALUES (?, ?)",
        metadata_entries
    )

    dst_conn.commit()

    msg_count = dst_conn.execute("SELECT COUNT(*) FROM message").fetchone()[0]
    handle_count = dst_conn.execute("SELECT COUNT(*) FROM handle").fetchone()[0]

    date_range = dst_conn.execute("""
        SELECT
            MIN(datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime')),
            MAX(datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime'))
        FROM message WHERE date > 0
    """).fetchone()

    incoming = dst_conn.execute("SELECT COUNT(*) FROM message WHERE is_from_me = 0").fetchone()[0]
    outgoing = dst_conn.execute("SELECT COUNT(*) FROM message WHERE is_from_me = 1").fetchone()[0]

    attachment_count = 0
    try:
        attachment_count = dst_conn.execute("SELECT COUNT(*) FROM attachment").fetchone()[0]
    except:
        pass

    dst_conn.close()

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
        "source_device": source_label,
        "source_db_path": source_db_path,
        "blob_recovery_stats": recovery_stats,
    }


# ─────────────────────────────────────────────
# Chain of Custody Registration
# ─────────────────────────────────────────────

def register_in_coc(coc_db_path: str, extractions: List[Dict], source_hashes: Dict[str, str]) -> int:
    """Register all extracted DBs in chain_of_custody."""
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

        src_hash = source_hashes.get(ext["source_device"], "unknown")
        rs = ext.get("blob_recovery_stats", {})
        recovery_note = ""
        if rs.get("recovered_ok", 0) > 0:
            recovery_note = (f" Blob recovery: {rs['recovered_ok']} messages had text "
                           f"recovered from attributedBody (were invisible in text column).")

        notes = (f"Extracted from {ext['source_device']} sms.db for {ext['contact_name']} "
                 f"({ext['contact_role']}, {ext['contact_company']}). "
                 f"{ext['message_count']:,} messages, "
                 f"{ext['earliest_date']} to {ext['latest_date']}. "
                 f"Source sms.db SHA-256: {src_hash}.{recovery_note}")

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
    source_hashes: Dict[str, str],
    source_sizes: Dict[str, int],
    source_paths: Dict[str, str],
    extractions: List[Dict],
    skipped: List[Dict],
    output_dir: Path,
):
    """Generate extraction manifest (JSON) and human-readable report (Markdown)."""
    now = datetime.now(timezone.utc)

    # ── JSON Manifest ──
    manifest = {
        "extraction_tool": "extract_per_contact_dbs.py (dual-source v3 — blob recovery)",
        "extraction_timestamp": now.isoformat(),
        "case_id": "rbc_v_lg",
        "sources": {
            label: {
                "path": source_paths[label],
                "sha256": source_hashes[label],
                "size_bytes": source_sizes[label],
            }
            for label in source_hashes
        },
        "routing_logic": {
            "description": "LG (Lucas Guariglia) extracted from iPhone 12 Pro; all others from iPhone 14 Pro",
            "reason": "The JZ ↔ LG direct thread was lost during iPhone 12 → 14 migration (154,922 of 173,161 messages missing on iPhone 14). iPhone 12 Pro backup has the complete, unbroken thread.",
        },
        "owner": {
            "name": "Joseph Zangrilli",
            "handles": OWNER_DEFAULT_HANDLES,
        },
        "blob_recovery": {
            "description": "v3 extracts text from NSAttributedString BLOBs where message.text is NULL",
            "total_recovered": sum(e.get("blob_recovery_stats", {}).get("recovered_ok", 0) for e in extractions),
            "per_contact": {
                e["contact_name"]: e.get("blob_recovery_stats", {})
                for e in extractions
                if e.get("blob_recovery_stats", {}).get("recovered_ok", 0) > 0
            },
        },
        "extractions": extractions,
        "skipped_contacts": skipped,
        "summary": {
            "total_contacts_processed": len(extractions) + len(skipped),
            "contacts_with_messages": len(extractions),
            "contacts_without_messages": len(skipped),
            "total_messages_extracted": sum(e["message_count"] for e in extractions),
            "total_databases_created": len(extractions),
            "from_iphone_12": sum(1 for e in extractions if "iPhone 12" in e.get("source_device", "")),
            "from_iphone_14": sum(1 for e in extractions if "iPhone 14" in e.get("source_device", "")),
        },
    }

    manifest_path = output_dir / f"extraction_manifest_{now.strftime('%Y%m%d_%H%M%S')}.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")

    # ── Markdown Report ──
    lines = []
    def line(s=""):
        lines.append(s)

    line("# Per-Contact iMessage Extraction Report (Dual-Source, v3 — Blob Recovery)")
    line(f"**Generated:** {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    line(f"**Case:** RBC v. LG")
    line(f"**Tool:** extract_per_contact_dbs.py (dual-source v3 — blob recovery)")
    line()

    line("---")
    line()
    line("## Source Databases")
    line()
    line("This extraction uses **two source databases** to ensure complete coverage:")
    line()
    for label in sorted(source_hashes.keys()):
        line(f"### {label}")
        line(f"- **Path:** `{source_paths[label]}`")
        line(f"- **SHA-256:** `{source_hashes[label]}`")
        line(f"- **Size:** {source_sizes[label]:,} bytes")
        line()

    line("### Routing Logic")
    line()
    line("| Contact | Source Device | Reason |")
    line("|:--------|:-------------|:-------|")
    line("| Lucas Guariglia | iPhone 12 Pro | Direct JZ ↔ LG thread was lost during iPhone 12 → 14 migration (89.5% of messages missing on iPhone 14) |")
    line("| All other contacts | iPhone 14 Pro | More current device with complete threads |")
    line()

    line("---")
    line()
    line("## attributedBody Blob Recovery (v3)")
    line()
    line("iOS stores message text in two places: the `text` column (plaintext) and the")
    line("`attributedBody` column (binary NSAttributedString). For messages containing mixed")
    line("content (text + attachment, formatted text), iOS sometimes stores the text **only**")
    line("in the binary blob, leaving `text` as NULL. Previous versions of this script did")
    line("not recover that hidden text.")
    line()
    total_recovered = sum(e.get("blob_recovery_stats", {}).get("recovered_ok", 0) for e in extractions)
    line(f"**Total messages recovered from blobs across all contacts: {total_recovered:,}**")
    line()
    line("| Contact | Null Text | Has Blob | Recovered | Empty Shell |")
    line("|:--------|:----------|:---------|:----------|:------------|")
    for ext in sorted(extractions, key=lambda x: x.get("blob_recovery_stats", {}).get("recovered_ok", 0), reverse=True):
        rs = ext.get("blob_recovery_stats", {})
        if rs.get("null_text_has_blob", 0) > 0:
            line(f"| {ext['contact_name']} | {rs.get('null_text_total', 0):,} | "
                 f"{rs.get('null_text_has_blob', 0):,} | "
                 f"{rs.get('recovered_ok', 0):,} | "
                 f"{rs.get('recovered_empty_blob', 0):,} |")
    line()
    line("Recovered text is stored in the `recovered_text` column on the `message` table.")
    line("The `messages_readable` view uses `COALESCE(text, recovered_text)` so all text")
    line("appears in the `text` field automatically. A `text_source` column indicates whether")
    line("the text came from the original column or was recovered from the blob.")
    line()

    line("---")
    line()
    line("## Extracted Databases")
    line()
    line(f"**{len(extractions)} databases** created from **{len(extractions) + len(skipped)}** whitelisted contacts.")
    line()

    line("| # | Contact | Role | Company | Source | Messages | Recovered | Date Range | DB File | SHA-256 (short) |")
    line("|:--|:--------|:-----|:--------|:-------|:---------|:----------|:-----------|:--------|:----------------|")
    for i, ext in enumerate(sorted(extractions, key=lambda x: x["message_count"], reverse=True), 1):
        date_range = f"{ext['earliest_date'][:10] if ext['earliest_date'] else '?'} – {ext['latest_date'][:10] if ext['latest_date'] else '?'}"
        src_short = "iPhone 12" if "iPhone 12" in ext.get("source_device", "") else "iPhone 14"
        recovered = ext.get("blob_recovery_stats", {}).get("recovered_ok", 0)
        line(f"| {i} | {ext['contact_name']} | {ext['contact_role']} | {ext['contact_company']} | "
             f"{src_short} | {ext['message_count']:,} | {recovered:,} | {date_range} | `{ext['db_filename']}` | `{ext['sha256'][:16]}…` |")
    line()

    total_msgs = sum(e["message_count"] for e in extractions)
    line(f"**Total messages across all extractions:** {total_msgs:,}")
    line()

    if skipped:
        line("---")
        line()
        line("## Contacts With No iMessages Found")
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
    line("4. The original `text` and `attributedBody` columns are preserved unmodified")
    line("5. Recovered text is stored in a **new** `recovered_text` column (not overwriting Apple data)")
    line("6. Includes an `_extraction_metadata` table documenting extraction parameters, source device, and blob recovery stats")
    line("7. Was hashed with SHA-256 immediately after creation")
    line()

    line("---")
    line()
    line("## Full Hash Table")
    line()
    line("| File | SHA-256 | Size (bytes) |")
    line("|:-----|:--------|:-------------|")
    for label in sorted(source_hashes.keys()):
        line(f"| **SOURCE: {label} sms.db** | `{source_hashes[label]}` | {source_sizes[label]:,} |")
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
        description="Extract per-contact iMessage databases (dual-source, v3 — blob recovery)"
    )
    parser.add_argument("--owner-handle", default="+17736109104", help="Your phone number (default: +17736109104)")
    parser.add_argument("--register-coc", action="store_true", help="Register outputs in chain_of_custody")
    parser.add_argument("--coc-db", default=COC_DB_DEFAULT, help="Path to mbox_index.db for CoC registration")

    args = parser.parse_args()

    db12_path = Path(DB_IPHONE12)
    db14_path = Path(DB_IPHONE14)
    whitelist_path = Path(WHITELIST_PATH)
    output_dir = Path(OUTPUT_DIR)

    for path, label in [(db12_path, "iPhone 12 Pro sms.db"), (db14_path, "iPhone 14 Pro sms.db"), (whitelist_path, "Whitelist")]:
        if not path.exists():
            print(f"[ERROR] {label} not found: {path}")
            sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 75)
    print("  Per-Contact iMessage Extractor (Dual-Source, v3 — Blob Recovery)")
    print(f"  iPhone 12 Pro: {db12_path}")
    print(f"  iPhone 14 Pro: {db14_path}")
    print(f"  Whitelist:     {whitelist_path}")
    print(f"  Output:        {output_dir}")
    print()
    print("  Routing: LG → iPhone 12 Pro | All others → iPhone 14 Pro")
    print("  NEW: Recovers hidden text from attributedBody BLOBs")
    print("=" * 75)
    print()

    # Hash both sources
    print("[1/6] Hashing source databases...")
    hash12 = sha256_file(db12_path)
    size12 = db12_path.stat().st_size
    print(f"  iPhone 12 Pro: SHA-256 {hash12[:32]}... ({size12:,} bytes)")

    hash14 = sha256_file(db14_path)
    size14 = db14_path.stat().st_size
    print(f"  iPhone 14 Pro: SHA-256 {hash14[:32]}... ({size14:,} bytes)")
    print()

    source_hashes = {"iPhone 12 Pro": hash12, "iPhone 14 Pro": hash14}
    source_sizes = {"iPhone 12 Pro": size12, "iPhone 14 Pro": size14}
    source_paths = {"iPhone 12 Pro": str(db12_path), "iPhone 14 Pro": str(db14_path)}

    # Parse whitelist
    print("[2/6] Parsing contact whitelist...")
    contacts = parse_whitelist(whitelist_path)
    contacts = [c for c in contacts if c["last_name"].lower() != "zangrilli"]
    print(f"  {len(contacts)} contacts loaded (excluding self)")
    print()

    # Separate LG from everyone else
    lg_contacts = [c for c in contacts if c["last_name"].lower() == LG_LAST_NAME]
    other_contacts = [c for c in contacts if c["last_name"].lower() != LG_LAST_NAME]

    print(f"  LG contacts (→ iPhone 12 Pro): {len(lg_contacts)}")
    for c in lg_contacts:
        print(f"    {c['full_name']} — {', '.join(c['normalized_handles'])}")
    print(f"  Other contacts (→ iPhone 14 Pro): {len(other_contacts)}")
    print()

    # Open both source DBs read-only
    print("[3/6] Opening source databases (read-only)...")
    conn12 = sqlite3.connect(f"file:{db12_path}?mode=ro", uri=True)
    conn14 = sqlite3.connect(f"file:{db14_path}?mode=ro", uri=True)

    tables12 = get_all_tables(conn12)
    tables14 = get_all_tables(conn14)

    msgs12 = conn12.execute("SELECT COUNT(*) FROM message").fetchone()[0]
    msgs14 = conn14.execute("SELECT COUNT(*) FROM message").fetchone()[0]
    print(f"  iPhone 12 Pro: {msgs12:,} messages, {len(tables12)} tables")
    print(f"  iPhone 14 Pro: {msgs14:,} messages, {len(tables14)} tables")
    print()

    owner_handles = [args.owner_handle] + OWNER_DEFAULT_HANDLES
    owner_handles = list(set(normalize_handle(h) for h in owner_handles))

    # Track blob recovery totals
    total_blob_recovered = 0

    # Extract LG contacts from iPhone 12 Pro
    print("[4/6] Extracting LG contacts from iPhone 12 Pro...")
    print()
    extractions = []
    skipped = []

    for i, contact in enumerate(lg_contacts, 1):
        prefix = f"  [{i}/{len(lg_contacts)}]"
        print(f"{prefix} {contact['full_name']} ({contact['role']}, {contact['company']})...")
        handles_str = ', '.join(contact['normalized_handles'])
        print(f"         Handles: {handles_str}")
        print(f"         Source:  iPhone 12 Pro")

        result = extract_contact_db(
            src_conn=conn12,
            contact=contact,
            owner_handles=owner_handles,
            output_dir=output_dir,
            source_tables=tables12,
            source_label="iPhone 12 Pro (2024-06-06)",
            source_db_path=str(db12_path),
        )

        if result:
            extractions.append(result)
            rs = result.get("blob_recovery_stats", {})
            total_blob_recovered += rs.get("recovered_ok", 0)
            print(f"         ✓ {result['message_count']:,} messages "
                  f"({result['incoming_count']:,} in / {result['outgoing_count']:,} out)")
            print(f"         ✓ {result['earliest_date']} to {result['latest_date']}")
            if rs.get("recovered_ok", 0) > 0:
                print(f"         ✓ Blob recovery: {rs['recovered_ok']:,} messages recovered from attributedBody")
            print(f"         ✓ {result['db_filename']} ({result['size_bytes']:,} bytes)")
            print(f"         ✓ SHA-256: {result['sha256'][:32]}...")
        else:
            skipped.append({
                "name": contact["full_name"],
                "role": contact["role"],
                "company": contact["company"],
                "handles": contact["normalized_handles"],
                "source": "iPhone 12 Pro",
            })
            print(f"         — No messages found (skipped)")
        print()

    # Extract all other contacts from iPhone 14 Pro
    print("[5/6] Extracting other contacts from iPhone 14 Pro...")
    print()

    for i, contact in enumerate(other_contacts, 1):
        prefix = f"  [{i}/{len(other_contacts)}]"
        print(f"{prefix} {contact['full_name']} ({contact['role']}, {contact['company']})...")
        handles_str = ', '.join(contact['normalized_handles'])
        print(f"         Handles: {handles_str}")
        print(f"         Source:  iPhone 14 Pro")

        result = extract_contact_db(
            src_conn=conn14,
            contact=contact,
            owner_handles=owner_handles,
            output_dir=output_dir,
            source_tables=tables14,
            source_label="iPhone 14 Pro (2024-06-07)",
            source_db_path=str(db14_path),
        )

        if result:
            extractions.append(result)
            rs = result.get("blob_recovery_stats", {})
            total_blob_recovered += rs.get("recovered_ok", 0)
            print(f"         ✓ {result['message_count']:,} messages "
                  f"({result['incoming_count']:,} in / {result['outgoing_count']:,} out)")
            print(f"         ✓ {result['earliest_date']} to {result['latest_date']}")
            if rs.get("recovered_ok", 0) > 0:
                print(f"         ✓ Blob recovery: {rs['recovered_ok']:,} messages recovered from attributedBody")
            print(f"         ✓ {result['db_filename']} ({result['size_bytes']:,} bytes)")
            print(f"         ✓ SHA-256: {result['sha256'][:32]}...")
        else:
            skipped.append({
                "name": contact["full_name"],
                "role": contact["role"],
                "company": contact["company"],
                "handles": contact["normalized_handles"],
                "source": "iPhone 14 Pro",
            })
            print(f"         — No messages found (skipped)")
        print()

    conn12.close()
    conn14.close()

    # Generate reports
    print("[6/6] Generating extraction reports...")
    manifest_path, report_path = generate_reports(
        source_hashes=source_hashes,
        source_sizes=source_sizes,
        source_paths=source_paths,
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
        inserted = register_in_coc(args.coc_db, extractions, source_hashes)
        print(f"  ✓ {inserted} new records inserted")
        print()

    # Summary
    total_extracted = sum(e["message_count"] for e in extractions)
    from_12 = sum(1 for e in extractions if "iPhone 12" in e.get("source_device", ""))
    from_14 = sum(1 for e in extractions if "iPhone 14" in e.get("source_device", ""))

    print("=" * 75)
    print("  EXTRACTION COMPLETE (v3 — Blob Recovery)")
    print(f"  Databases created:     {len(extractions)} ({from_12} from iPhone 12, {from_14} from iPhone 14)")
    print(f"  Contacts skipped:      {len(skipped)}")
    print(f"  Total messages:        {total_extracted:,}")
    print(f"  Blob text recovered:   {total_blob_recovered:,}")
    print(f"  iPhone 12 Pro hash:    {hash12[:32]}...")
    print(f"  iPhone 14 Pro hash:    {hash14[:32]}...")
    print(f"  Report:                {report_path}")
    print("=" * 75)


if __name__ == "__main__":
    main()
