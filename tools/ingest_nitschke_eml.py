#!/usr/bin/env python3
"""
Ingest 96 .eml files from jfzangrilli@gmail-nitschke/ into evidence_hub.db.
Reads individual .eml files with email.message_from_file().
Deduplicates by Message-ID (canonical_id).
"""

import email
import email.utils
import sqlite3
import json
import hashlib
import os
import glob
import sys
from datetime import datetime, timezone

EML_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/USE_MBOX_INDEX/JZ_ACTIONS_TAKEN/jfzangrilli@gmail-nitschke"
DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_hub.db"
LOG_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/_analysis_outputs/nitschke_eml_ingest_log.txt"

def parse_date(date_str):
    """Parse email date to ISO8601."""
    if not date_str:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(date_str)
        return parsed.isoformat()
    except Exception:
        return date_str

def extract_text(msg):
    """Extract plain text body, fallback to HTML stripping."""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == 'text/plain':
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or 'utf-8'
                    try:
                        return payload.decode(charset, errors='replace')
                    except Exception:
                        return payload.decode('utf-8', errors='replace')
        # Fallback to first text/html
        for part in msg.walk():
            if part.get_content_type() == 'text/html':
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or 'utf-8'
                    try:
                        return payload.decode(charset, errors='replace')
                    except Exception:
                        return payload.decode('utf-8', errors='replace')
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or 'utf-8'
            try:
                return payload.decode(charset, errors='replace')
            except Exception:
                return payload.decode('utf-8', errors='replace')
    return ""

def extract_attachments(msg):
    """Extract attachment metadata."""
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            disp = part.get('Content-Disposition', '')
            if 'attachment' in disp or 'inline' in disp:
                filename = part.get_filename()
                ct = part.get_content_type()
                payload = part.get_payload(decode=True)
                size = len(payload) if payload else 0
                attachments.append({
                    "filename": filename,
                    "content_type": ct,
                    "size": size,
                    "sha256": hashlib.sha256(payload).hexdigest() if payload else None
                })
    return attachments

def main():
    # Gather .eml files
    eml_files = sorted(glob.glob(os.path.join(EML_DIR, "*.eml")))
    print(f"Found {len(eml_files)} .eml files")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    inserted = 0
    skipped = 0
    failed = 0
    failures = []

    log_lines = []
    log_lines.append(f"=== Nitschke EML Ingestion Log ===\n")
    log_lines.append(f"EML directory: {EML_DIR}")
    log_lines.append(f"Files found: {len(eml_files)}\n")

    for eml_path in eml_files:
        filename = os.path.basename(eml_path)
        try:
            with open(eml_path, 'rb') as f:
                msg = email.message_from_binary_file(f)
        except Exception as e:
            print(f"FAILED to parse {filename}: {e}")
            failed += 1
            failures.append((filename, str(e)))
            continue

        message_id = msg.get('Message-ID', '').strip()
        if not message_id:
            print(f"WARNING: {filename} has no Message-ID, skipping")
            skipped += 1
            log_lines.append(f"SKIP (no Message-ID): {filename}")
            continue

        # Dedup check
        cur = conn.execute("SELECT id FROM evidence WHERE canonical_id = ?", (message_id,))
        if cur.fetchone():
            print(f"SKIP (duplicate): {message_id} from {filename}")
            skipped += 1
            log_lines.append(f"SKIP (duplicate): {filename} -> {message_id}")
            continue

        subject = msg.get('Subject', '(no subject)')
        from_addr = msg.get('From', '')
        to_addr = msg.get('To', '')
        cc_addr = msg.get('Cc', '')
        date_str = msg.get('Date', '')
        iso_date = parse_date(date_str)

        # Extract body
        body = extract_text(msg)
        summary = body[:200].strip() if body else ""
        body_snippet = body[:4000] if body else ""

        # Extract attachments
        attachments = extract_attachments(msg)

        # Build primary_ids
        primary_ids = {
            "from": from_addr,
            "to": to_addr,
            "cc": cc_addr,
            "message_id": message_id,
        }

        # Build tags
        tags = [
            "jfzangrilli@gmail.com",
            "nitschke",
            "zangrilli-v-nextel",
            "litigation",
            "legal-filing",
        ]

        # Build extra
        extra = {
            "mailbox_source": "jfzangrilli@gmail-nitschke",
            "eml_file": filename,
            "attachments": attachments,
            "content_type": msg.get_content_type(),
            "in_reply_to": msg.get('In-Reply-To', ''),
            "references": msg.get('References', ''),
            "received_headers": msg.get_all('Received', [])[:3],
        }

        try:
            conn.execute("""
                INSERT INTO evidence (
                    canonical_id, case_id, client_id, source_type,
                    title, summary, body_snippet,
                    start_timestamp, tags, primary_ids, extra
                ) VALUES (?, 'RC-2026', 'rowboat-creative', 'email',
                          ?, ?, ?, ?, ?, ?, ?)
            """, (
                message_id,
                subject,
                summary,
                body_snippet,
                iso_date,
                json.dumps(tags),
                json.dumps(primary_ids),
                json.dumps(extra),
            ))
            inserted += 1
            print(f"INSERTED [{inserted}]: {filename}")
            print(f"  Subject: {subject}")
            print(f"  Date: {iso_date}")
            print(f"  From: {from_addr}")
            print(f"  Attachments: {len(attachments)}")
            log_lines.append(f"INSERTED: {filename} -> {message_id}")
        except Exception as e:
            print(f"FAILED insert {filename}: {e}")
            failed += 1
            failures.append((filename, str(e)))
            continue

    conn.commit()

    # Verify
    total = conn.execute("SELECT COUNT(*) FROM evidence").fetchone()[0]
    fts_total = conn.execute("SELECT COUNT(*) FROM evidence_fts").fetchone()[0]
    nitschke_count = conn.execute(
        "SELECT COUNT(*) FROM evidence WHERE extra LIKE '%jfzangrilli@gmail-nitschke%'"
    ).fetchone()[0]

    summary = f"""
--- INGESTION SUMMARY ---
EML files found: {len(eml_files)}
Inserted: {inserted}
Skipped (duplicate/no-id): {skipped}
Failed: {failed}
Total evidence records: {total}
Total FTS records: {fts_total}
Nitschke records in DB: {nitschke_count}
"""
    print(summary)
    log_lines.append(summary)

    if failures:
        log_lines.append("\n--- FAILURES ---")
        for fname, err in failures:
            log_lines.append(f"  {fname}: {err}")

    # Write log
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, 'w') as lf:
        lf.write('\n'.join(log_lines))
    print(f"\nLog written to {LOG_PATH}")

    conn.close()

if __name__ == "__main__":
    main()
