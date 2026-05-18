#!/usr/bin/env python3
"""
Ingest jfzangrilli@gmail-nitschke MBOX into evidence_hub.db.
Single-email MBOX from Kathy Tallon (ekclawfirm.com) to JZ + Nitschke et al.
Subject: Zangrilli v. Nextel Retail Stores, dated 2023-08-30.
"""

import mailbox
import sqlite3
import json
import sys
import hashlib
import email.utils
from datetime import datetime, timezone

MBOX_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/JFZANGRILLI@GMAIL_MBOX_LOCKER/jfzangrilli@gmail-nitschke/jfzangrilli-gmail-nitschke.mbox"
DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_hub.db"

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
    mbox = mailbox.mbox(MBOX_PATH)
    messages = list(mbox)
    print(f"MBOX contains {len(messages)} message(s)")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    inserted = 0
    skipped = 0

    for msg in messages:
        message_id = msg.get('Message-ID', '').strip()
        if not message_id:
            print("WARNING: message has no Message-ID, skipping")
            skipped += 1
            continue

        # Dedup check
        cur = conn.execute("SELECT id FROM evidence WHERE canonical_id = ?", (message_id,))
        if cur.fetchone():
            print(f"SKIP: {message_id} already exists")
            skipped += 1
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
            "mailbox_file": "jfzangrilli-gmail-nitschke.mbox",
            "attachments": attachments,
            "content_type": msg.get_content_type(),
            "in_reply_to": msg.get('In-Reply-To', ''),
            "references": msg.get('References', ''),
            "received_headers": msg.get_all('Received', [])[:3],  # first 3 received headers
        }

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
        print(f"INSERTED: {message_id}")
        print(f"  Subject: {subject}")
        print(f"  Date: {iso_date}")
        print(f"  From: {from_addr}")
        print(f"  To: {to_addr}")
        print(f"  Attachments: {len(attachments)}")

    conn.commit()

    # Verify
    total = conn.execute("SELECT COUNT(*) FROM evidence").fetchone()[0]
    fts_total = conn.execute("SELECT COUNT(*) FROM evidence_fts").fetchone()[0]

    print(f"\n--- INGESTION SUMMARY ---")
    print(f"Inserted: {inserted}")
    print(f"Skipped (duplicate): {skipped}")
    print(f"Total evidence records: {total}")
    print(f"Total FTS records: {fts_total}")

    conn.close()

if __name__ == "__main__":
    main()
