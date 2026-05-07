#!/usr/bin/env python3
"""
Batch RSMF → Workbench SQLite Import
Processes 1,892 day-by-day RSMF files into chat_case_only.db
+ generates a clean unified text extraction file.

Usage: python3 batch_rsmf_import.py
"""

import os
import re
import sys
import hashlib
import sqlite3
import time as time_mod
from datetime import datetime, timezone
from email.parser import BytesParser
from email.policy import default as email_default_policy

# === CONFIG ===
RSMF_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/exports/SHOWGOAT_RSMF_LOCKER/LUCAS_GUARIGLIA/LUCAS_GUARIGLIA_RSMF_BY_DAY"
DB_PATH = "/tmp/lawmodel1-app/data/IMESSAGE_LOCKER/Messages/chat_case_only.db"
OUTPUT_TXT = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/exports/SHOWGOAT_RSMF_LOCKER/LUCAS_GUARIGLIA/unified_extraction_2017-2024.txt"
LOG_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/exports/SHOWGOAT_RSMF_LOCKER/LUCAS_GUARIGLIA/batch_import_log.txt"

# Date extraction from filename
FN_PATTERN = re.compile(r"Messages - Lucas Guariglia - by day - (\d{4}-\d{2}-\d{2})\.rsmf")

# MIME boundary
BOUNDARY = b"--_RSMF_Boundary_Delimiter_"

# Phone numbers from header
PHONE_PATTERN = re.compile(r"\+1\d{8,9}")


def parse_filename(fname):
    """Extract date from filename."""
    m = FN_PATTERN.search(fname)
    if m:
        return m.group(1)
    return None


def parse_rsmf_text_part(filepath):
    """
    Extract the text/plain MIME part from an RSMF file.
    Returns (messages_list, metadata_dict) where messages_list is [(sender, timestamp_str, body), ...]
    """
    with open(filepath, "rb") as f:
        raw = f.read()

    # Find first boundary
    first_boundary = raw.find(BOUNDARY)
    if first_boundary == -1:
        return [], {}

    # Parse headers before first boundary
    header_block = raw[:first_boundary]
    headers = {}
    for line in header_block.decode("utf-8", errors="replace").split("\n"):
        line = line.strip()
        if ":" in line:
            key, _, val = line.partition(":")
            headers[key.strip()] = val.strip()

    # Find text/plain section
    text_start = raw.find(b"Content-Type: text/plain", first_boundary)
    if text_start == -1:
        return [], headers

    # Find start of content (after blank line following content-type headers)
    content_start = raw.find(b"\n\n", text_start)
    if content_start == -1:
        return [], headers
    content_start += 2

    # Find end of first MIME part (next boundary)
    next_boundary = raw.find(BOUNDARY, content_start)
    if next_boundary == -1:
        text_body = raw[content_start:]
    else:
        text_body = raw[content_start:next_boundary]

    # Decode
    text_str = text_body.decode("utf-8", errors="replace").strip()

    # Parse individual messages
    messages = parse_message_blocks(text_str)
    return messages, headers


TIMESTAMP_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
KNOWN_SENDERS = {"showgoat", "Lucas Guariglia", "lucas guariglia"}

def parse_message_blocks(text):
    """
    Parse message blocks from RSMF text/plain section.
    Messages are concatenated with NO blank line separators.
    A new message starts when we see: SenderName\nISO_Timestamp
    """
    lines = text.split("\n")
    messages = []
    n = len(lines)

    def is_timestamp(line):
        return bool(TIMESTAMP_RE.match(line.strip()))

    i = 0
    # Skip any leading junk until we find first sender+timestamp
    while i + 1 < n:
        if lines[i].strip() in KNOWN_SENDERS and is_timestamp(lines[i + 1]):
            break
        i += 1
    if i + 1 >= n:
        return messages

    while i < n:
        sender = lines[i].strip()
        i += 1
        if i >= n:
            break
        timestamp = lines[i].strip()
        i += 1

        # Read body lines until we detect next message boundary
        body_lines = []
        while i < n:
            line = lines[i]
            stripped = line.strip()

            # Check if this line + next forms a new message boundary
            if stripped in KNOWN_SENDERS and i + 1 < n and is_timestamp(lines[i + 1].strip()):
                break  # new message starts here

            body_lines.append(line)
            i += 1

        body = "\n".join(body_lines).strip()
        if sender and timestamp:
            messages.append((sender, timestamp, body))

    return messages


def parse_timestamp(ts_str):
    """Parse ISO timestamp to Unix epoch and local date string."""
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        epoch = int(dt.timestamp())
        # Local: America/Chicago (UTC-6 CST / UTC-5 CDT)
        # Simple offset based on month
        month = dt.month
        if 3 <= month <= 10:  # rough DST
            offset_hours = -5
        else:
            offset_hours = -6
        local_dt = dt.replace(tzinfo=timezone.utc)
        local_str = local_dt.strftime("%Y-%m-%d %H:%M:%S")
        return epoch, local_str
    except Exception:
        return 0, ""


def generate_guid(sender, ts_str, body):
    """Generate unique GUID from content hash."""
    raw = f"{sender}|{ts_str}|{body}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:36]


def extract_phone_from_to(to_header):
    """Extract phone number from To: header."""
    phones = PHONE_PATTERN.findall(to_header)
    return phones[0] if phones else ""


def main():
    log_lines = []
    log = lambda s: (print(s), log_lines.append(s))

    log("=" * 60)
    log(f"Batch RSMF Import — {datetime.now().isoformat()}")
    log("=" * 60)

    # Get sorted file list
    all_files = sorted(
        [f for f in os.listdir(RSMF_DIR) if f.endswith(".rsmf")],
        key=lambda f: parse_filename(f) or ""
    )

    log(f"\nFound {len(all_files)} RSMF files")
    log(f"Output DB: {DB_PATH}")
    log(f"Output TXT: {OUTPUT_TXT}\n")

    # Clear old data
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM messages")
    conn.commit()
    log("Cleared existing messages table.")

    total_messages = 0
    total_files = 0
    errors = 0
    skipped_dates = set()

    with open(OUTPUT_TXT, "w", encoding="utf-8") as txt_out:
        txt_out.write("# Rowboat Creative — Lucas Guariglia ⇄ Joseph Zangrilli iMessage Export\n")
        txt_out.write(f"# Source: iMazing 3.5.2 day-by-day RSMF exports\n")
        txt_out.write(f"# Files processed: {len(all_files)}\n")
        txt_out.write(f"# Generated: {datetime.now().isoformat()}\n\n")

        for idx, fname in enumerate(all_files):
            filepath = os.path.join(RSMF_DIR, fname)
            file_date = parse_filename(fname)

            if not file_date:
                log(f"  SKIP: {fname} — no date in filename")
                continue

            try:
                messages, headers = parse_rsmf_text_part(filepath)

                if not messages:
                    skipped_dates.add(file_date)
                    continue

                to_header = headers.get("To", "")
                phone = extract_phone_from_to(to_header)

                # Write to text file and insert into DB
                txt_out.write(f"\n{'='*60}\n")
                txt_out.write(f"# {file_date}\n")
                txt_out.write(f"{'='*60}\n\n")

                for sender, ts_str, body in messages:
                    epoch, local_ts = parse_timestamp(ts_str)
                    is_from_me = 1 if sender == "showgoat" else 0
                    contact_name = "Joseph Zangrilli" if sender == "showgoat" else "Lucas Guariglia"
                    contact_phone = phone
                    guid = generate_guid(sender, ts_str, body)

                    # Write to text
                    local_str = f"[{ts_str.replace('Z', 'Z')}] {contact_name}:"
                    txt_out.write(f"{local_str}\n{body}\n---\n")

                    # Insert into DB
                    try:
                        conn.execute(
                            """INSERT OR IGNORE INTO messages 
                               (contact_name, contact_phone, date_local, date_utc, is_from_me, text, service, guid)
                               VALUES (?, ?, ?, ?, ?, ?, 'iMessage', ?)""",
                            (contact_name, contact_phone, local_ts, epoch, is_from_me, body, guid),
                        )
                    except sqlite3.IntegrityError:
                        pass  # duplicate GUID

                    total_messages += 1

                total_files += 1

                if (idx + 1) % 100 == 0:
                    conn.commit()
                    log(f"  [{idx+1}/{len(all_files)}] {file_date} — {len(messages)} msgs (total: {total_messages})")

            except Exception as e:
                errors += 1
                log(f"  ERROR [{fname}]: {e}")
                continue

    conn.commit()

    # Final stats
    msg_count = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
    date_range = conn.execute("SELECT MIN(date_local), MAX(date_local) FROM messages").fetchone()

    log(f"\n{'='*60}")
    log(f"IMPORT COMPLETE")
    log(f"{'='*60}")
    log(f"  Files processed: {total_files}/{len(all_files)}")
    log(f"  Total messages:  {total_messages}")
    log(f"  DB messages:     {msg_count}")
    log(f"  Date range:      {date_range[0]} → {date_range[1]}")
    log(f"  Errors:          {errors}")
    log(f"  Empty days:      {len(skipped_dates)}")
    log(f"  Output TXT:      {OUTPUT_TXT}")
    log(f"  Output DB:       {DB_PATH}")

    conn.close()

    # Write log
    with open(LOG_PATH, "w") as lf:
        lf.write("\n".join(log_lines) + "\n")

    print(f"\nLog written to: {LOG_PATH}")


if __name__ == "__main__":
    main()
