#!/usr/bin/env python3
"""
Convert RSMF file to workbench-compatible SQLite messages database.

RSMF format: MIME multipart with Part 1 = text/plain messages, Part 2 = base64 zip.
Parses line-by-line (safe for 5+ GB). Uses 2-line lookahead for sender/body disambiguation.

Output schema matches what lawmodel1 workbench UI expects:
  messages(rowid, contact_name, contact_phone, date_local, date_utc,
           is_from_me, text, service, guid)

Usage:
    python3 rsmf_to_workbench.py INPUT.rsmf OUTPUT.db
"""

import sys
import re
import sqlite3
from datetime import datetime, timezone, timedelta

# ── Constants ──
RSMF_PATH = sys.argv[1] if len(sys.argv) > 1 else None
OUTPUT_DB = sys.argv[2] if len(sys.argv) > 2 else None

if not RSMF_PATH or not OUTPUT_DB:
    print("Usage: rsmf_to_workbench.py INPUT.rsmf OUTPUT.db")
    sys.exit(1)

# Sender mapping — the two participants in the Lucas Guariglia RSMF
SENDER_MAP = {
    "showgoat": {
        "contact_name": "Joseph Zangrilli",
        "contact_phone": "+177****9104",
        "is_from_me": 1,  # Joseph's device = outgoing
    },
    "Lucas Guariglia": {
        "contact_name": "Lucas Guariglia",
        "contact_phone": "+184****0944",
        "is_from_me": 0,  # Incoming from Lucas
    },
    "Lucas": {  # alternate short form
        "contact_name": "Lucas Guariglia",
        "contact_phone": "+184****0944",
        "is_from_me": 0,
    },
}

# Timezone: Chicago (matches both parties)
CHICAGO_TZ = timezone(timedelta(hours=-6))  # CST default (winter)
CHICAGO_DST = timezone(timedelta(hours=-5))  # CDT (summer Mar-Nov)

def local_datetime(utc_dt):
    """Convert UTC datetime to Chicago local string."""
    # Simple: if month is Mar-Nov, use CDT
    if 3 <= utc_dt.month <= 11:
        local = utc_dt.astimezone(CHICAGO_DST)
    else:
        local = utc_dt.astimezone(CHICAGO_TZ)
    return local.strftime("%Y-%m-%d %H:%M:%S")


def main():
    iso_re = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$')
    boundary = '--_RSMF_Boundary_Delimiter_'

    # Create output database
    conn = sqlite3.connect(OUTPUT_DB)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = OFF")
    conn.execute("PRAGMA cache_size = -64000")

    conn.execute("""
        CREATE TABLE messages (
            rowid INTEGER PRIMARY KEY,
            contact_name TEXT,
            contact_phone TEXT,
            date_local TEXT,
            date_utc INTEGER,
            is_from_me INTEGER,
            text TEXT,
            service TEXT,
            guid TEXT UNIQUE
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date_utc DESC)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_name)")

    in_body = False
    collecting = False

    current_sender_raw = None
    current_ts = None
    current_lines = []
    total = 0
    inserted = 0

    # 3-line sliding window: prev, current, next
    # On each iteration: prev = last sender/body line, cur = current line, nxt = lookahead
    prev_line = None
    cur_line = None
    nxt_line = None

    next_rowid = 1

    with open(RSMF_PATH, 'r', encoding='utf-8') as f:
        # Prime the window: read first two lines
        prev_line = f.readline()  # line 1
        cur_line = f.readline()   # line 2

        print("Parsing RSMF...")

        for nxt_line in f:  # reads lines 3 onward, one at a time
            nxt_line = nxt_line  # nxt_line assigned by for-loop

            if prev_line is None:
                prev_line = cur_line
                cur_line = nxt_line
                continue

            # Skip to body: wait for Content-Type: text/plain
            if not in_body:
                if prev_line.startswith('Content-Type: text/plain'):
                    in_body = True
                    # Consume the blank line after content-type + first sender
                    prev_line = f.readline()      # blank line
                    cur_line = f.readline()       # first sender name
                    nxt_line = f.readline()       # first timestamp
                    print("  Entered message body")
                    continue
                prev_line = cur_line
                cur_line = nxt_line
                continue

            # Stop at boundary or attachment MIME
            stripped = prev_line.strip()
            if stripped.startswith('Content-Type: application/zip'):
                print(f"  Hit attachment MIME")
                break
            if stripped.startswith('--_RSMF_Boundary_Delimiter_'):
                print(f"  Hit boundary delimiter")
                break

            # Lookahead: if cur_line is an ISO timestamp, prev_line is a sender name
            # nxt_line is the line after timestamp (start of body or next sender)
            cur_is_iso = bool(cur_line and iso_re.match(cur_line.strip()))
            nxt_is_iso = bool(nxt_line and iso_re.match(nxt_line.strip()))

            if cur_is_iso and prev_line:
                # Flush previous message if any
                if collecting and current_ts:
                    body_text = '\n'.join(current_lines)
                    sender_info = SENDER_MAP.get(current_sender_raw, {
                        "contact_name": current_sender_raw,
                        "contact_phone": "",
                        "is_from_me": 0,
                    })

                    conn.execute(
                        """INSERT INTO messages 
                           (rowid, contact_name, contact_phone, date_local, date_utc, 
                            is_from_me, text, service, guid)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            next_rowid,
                            sender_info["contact_name"],
                            sender_info["contact_phone"],
                            local_datetime(current_ts),
                            int(current_ts.timestamp()),
                            sender_info["is_from_me"],
                            body_text,
                            "iMessage",
                            f"rsmf:{next_rowid}:{current_ts.isoformat()}",
                        )
                    )
                    next_rowid += 1
                    inserted += 1

                # Start new message: prev_line = sender, cur_line = timestamp
                total += 1
                current_sender_raw = prev_line.strip()
                ts_str = cur_line.strip()
                current_ts = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                current_lines = []
                collecting = True

                # If nxt_line is also an ISO timestamp, this message has empty body
                # Shift: prev=timestamp, cur=nxt (which is next sender), continue
                if nxt_is_iso:
                    # Body is empty for this message
                    current_lines.append('')
                    prev_line = cur_line
                    cur_line = nxt_line
                    continue

                # Otherwise nxt_line is the first body line
                prev_line = nxt_line
                cur_line = f.readline()
                nxt_line = f.readline()
                continue

            # Body line: prev_line is body text
            if collecting:
                if prev_line:
                    current_lines.append(prev_line.rstrip('\n'))
                else:
                    current_lines.append('')

            # Shift window
            prev_line = cur_line
            cur_line = nxt_line

        # Final flush
        if collecting and current_ts:
            body_text = '\n'.join(current_lines)
            sender_info = SENDER_MAP.get(current_sender_raw, {
                "contact_name": current_sender_raw,
                "contact_phone": "",
                "is_from_me": 0,
            })
            conn.execute(
                """INSERT INTO messages 
                   (rowid, contact_name, contact_phone, date_local, date_utc, 
                    is_from_me, text, service, guid)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    next_rowid,
                    sender_info["contact_name"],
                    sender_info["contact_phone"],
                    local_datetime(current_ts),
                    int(current_ts.timestamp()),
                    sender_info["is_from_me"],
                    body_text,
                    "iMessage",
                    f"rsmf:{next_rowid}:{current_ts.isoformat()}",
                )
            )
            inserted += 1

    conn.commit()

    print(f"\nDone.")
    print(f"  Total messages parsed: {total}")
    print(f"  Inserted into DB: {inserted}")
    print(f"  Output: {OUTPUT_DB}")

    # Verify
    count = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
    print(f"  DB row count: {count}")

    conn.close()


if __name__ == '__main__':
    main()
