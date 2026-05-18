#!/usr/bin/env python3
"""
Query all nitschke email records, group by thread, produce consolidated brief.
"""

import sqlite3
import json
import re
import os

DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_hub.db"
BRIEF_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/_analysis_outputs/nitschke_eml_ingest_brief.md"

def strip_thread_prefix(subject):
    """Remove Re:, Fwd:, RE:, FWD: prefixes for thread grouping."""
    s = subject.strip()
    while True:
        m = re.match(r'^\s*(Re|Fwd|RE|FWD)\s*:\s*(.*)', s, re.IGNORECASE)
        if m:
            s = m.group(2).strip()
        else:
            break
    return s

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    rows = conn.execute("""
        SELECT title, start_timestamp, summary, body_snippet,
               primary_ids, extra
        FROM evidence
        WHERE json_extract(extra, '$.mailbox_source') = 'jfzangrilli@gmail-nitschke'
        ORDER BY start_timestamp
    """).fetchall()

    print(f"Retrieved {len(rows)} records")

    # Group by thread (stripped subject)
    threads = {}  # thread_key -> {subject, emails: [(title, date, summary, body_preview, from_addr, att_count)]}

    for row in rows:
        title = row['title']
        date = row['start_timestamp']
        summary = row['summary']
        body = row['body_snippet'] or ''
        body_preview = body[:300].strip()

        primary_ids = json.loads(row['primary_ids']) if row['primary_ids'] else {}
        extra = json.loads(row['extra']) if row['extra'] else {}
        from_addr = primary_ids.get('from', '')
        att_count = len(extra.get('attachments', []))

        thread_key = strip_thread_prefix(title)

        if thread_key not in threads:
            threads[thread_key] = {
                'subject': thread_key,
                'emails': []
            }

        threads[thread_key]['emails'].append({
            'title': title,
            'date': date,
            'summary': summary,
            'body_preview': body_preview,
            'from_addr': from_addr,
            'att_count': att_count
        })

    # Sort threads by count desc
    sorted_threads = sorted(threads.items(), key=lambda x: len(x[1]['emails']), reverse=True)

    # Build the brief
    lines = []
    lines.append("# Nitschke EML Ingestion Consolidated Brief\n")
    lines.append(f"**Date:** 2026-05-17")
    lines.append(f"**Total emails ingested:** 95 (1 duplicate skipped)")
    lines.append(f"**Total records in DB (Nitschke mailbox):** {len(rows)}")
    lines.append(f"**Source:** /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/USE_MBOX_INDEX/JZ_ACTIONS_TAKEN/jfzangrilli@gmail-nitschke/")
    lines.append(f"**Date range:** {rows[0]['start_timestamp']} to {rows[-1]['start_timestamp']}\n")

    # Thread breakdown
    lines.append("## Thread Groups\n")
    lines.append(f"Total unique threads: {len(threads)}\n")

    for thread_key, data in sorted_threads:
        emails = data['emails']
        count = len(emails)
        dates = [e['date'] for e in emails if e['date']]
        date_range = ""
        if dates:
            dates_sorted = sorted(dates)
            date_range = f"{dates_sorted[0][:10]} to {dates_sorted[-1][:10]}"

        lines.append(f"### {data['subject']}")
        lines.append(f"- **Count:** {count} email(s)")
        lines.append(f"- **Date range:** {date_range}")
        if count <= 3:
            for e in emails:
                lines.append(f"  - {e['date'][:10]} | {e['from_addr']}")
        else:
            participants = set(e['from_addr'] for e in emails)
            lines.append(f"- **Participants:** {', '.join(sorted(participants))}")
        lines.append("")

    # Top emails by body length (proxy for substantial content)
    # Sort all emails by body snippet length
    all_emails = []
    for thread_key, data in sorted_threads:
        for e in data['emails']:
            all_emails.append((thread_key, e))

    # For "top" emails, pick ones with substantial content AND attachments
    # (attachments often indicate significant documents/evidence being shared)
    ranked = sorted(all_emails, key=lambda x: (
        len(x[1]['body_preview']) + (x[1]['att_count'] * 200)
    ), reverse=True)

    lines.append("## Top Emails by Content Weight\n")
    lines.append("(Ranked by body length + attachment count weight)\n")
    for i, (thread_key, e) in enumerate(ranked[:20], 1):
        lines.append(f"### {i}. {e['title']}")
        lines.append(f"- **Date:** {e['date'][:10] if e['date'] else 'N/A'}")
        lines.append(f"- **From:** {e['from_addr']}")
        lines.append(f"- **Attachments:** {e['att_count']}")
        lines.append(f"- **Thread:** {thread_key}")
        lines.append(f"- **Preview:** {e['body_preview'][:200].replace(chr(10), ' ')}")
        lines.append("")

    # Full listing: subject, date, first 300 chars
    lines.append("## Full Email Listing\n")
    for i, row in enumerate(rows, 1):
        title = row['title']
        date = row['start_timestamp']
        body = row['body_snippet'] or ''
        preview = body[:300].strip().replace('\n', ' ').replace('\r', '')
        primary_ids = json.loads(row['primary_ids']) if row['primary_ids'] else {}
        from_addr = primary_ids.get('from', '')

        lines.append(f"### {i}. {title}")
        lines.append(f"- **Date:** {date[:10] if date else 'N/A'}")
        lines.append(f"- **From:** {from_addr}")
        lines.append(f"- **Preview:** {preview}")
        lines.append("")

    # Write brief
    os.makedirs(os.path.dirname(BRIEF_PATH), exist_ok=True)
    with open(BRIEF_PATH, 'w') as f:
        f.write('\n'.join(lines))

    print(f"\nBrief written to {BRIEF_PATH}")
    print(f"Threads: {len(threads)}")
    print(f"Emails: {len(rows)}")

    conn.close()

if __name__ == "__main__":
    main()
