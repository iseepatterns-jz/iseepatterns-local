#!/usr/bin/env python3
"""
resolve_attachment_paths.py
───────────────────────────
Links existing attachment records in chat_case_only.db to their physical files
on disk inside the IMESSAGE_LOCKER.  No new messages are imported; only the
existing attachment table rows receive resolved_path + origin_source values.

Path mapping:
  DB:   ~/Library/Messages/Attachments/21/01/{GUID}/file.ext
  Disk: chatdb_storage/<source>/Attachments/21/01/{GUID}/file.ext
"""

import sqlite3
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
CHAT_MASTER  = PROJECT_ROOT / "data" / "IMESSAGE_LOCKER" / "Messages" / "chat_case_only.db"

ATTACHMENT_ROOTS = {
    "imac":     PROJECT_ROOT / "data" / "IMESSAGE_LOCKER" / "Attachments",
}

PREFIX = "~/Library/Messages/Attachments/"


def ensure_columns(conn: sqlite3.Connection):
    """Add resolved_path and origin_source columns if they don't exist."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(attachment)")
    existing = {row[1] for row in cur.fetchall()}

    if "resolved_path" not in existing:
        cur.execute("ALTER TABLE attachment ADD COLUMN resolved_path TEXT")
        print("  ✅ Added column: resolved_path")

    if "origin_source" not in existing:
        cur.execute("ALTER TABLE attachment ADD COLUMN origin_source TEXT")
        print("  ✅ Added column: origin_source")

    conn.commit()


def resolve(conn: sqlite3.Connection):
    """Resolve each attachment filename to its physical path on disk."""
    cur = conn.cursor()
    cur.execute("""
        SELECT ROWID, filename
        FROM attachment
        WHERE filename IS NOT NULL
    """)
    rows = cur.fetchall()
    total = len(rows)
    print(f"\n📎 Resolving {total} attachment records...")

    stats = {"imac_found": 0, "missing": 0, "no_prefix": 0}

    for i, (rowid, filename) in enumerate(rows, 1):
        if not filename.startswith(PREFIX):
            stats["no_prefix"] += 1
            continue

        rel_path = filename[len(PREFIX):]  # e.g. "21/01/{GUID}/file.ext"

        found_in = {}
        for source_name, root in ATTACHMENT_ROOTS.items():
            candidate = root / rel_path
            if candidate.exists():
                found_in[source_name] = str(candidate)

        if not found_in:
            stats["missing"] += 1
            continue

        stats["imac_found"] += 1
        origin = "imac"
        resolved = found_in["imac"]

        cur.execute(
            "UPDATE attachment SET resolved_path = ?, origin_source = ? WHERE ROWID = ?",
            (resolved, origin, rowid),
        )

        if i % 5000 == 0:
            conn.commit()
            print(f"  … {i}/{total} processed")

    conn.commit()
    return stats


def main():
    if not CHAT_MASTER.exists():
        print(f"❌ chat_case_only.db not found at {CHAT_MASTER}")
        sys.exit(1)

    for name, root in ATTACHMENT_ROOTS.items():
        if not root.exists():
            print(f"❌ Attachment root not found: {root}")
            sys.exit(1)
        print(f"  📁 {name}: {root}")

    conn = sqlite3.connect(str(CHAT_MASTER))
    conn.execute("PRAGMA journal_mode = WAL")

    print("\n🔧 Ensuring columns exist...")
    ensure_columns(conn)

    stats = resolve(conn)

    # Final verification
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM attachment WHERE resolved_path IS NOT NULL")
    resolved_count = cur.fetchone()[0]

    cur.execute("SELECT origin_source, count(*) FROM attachment WHERE resolved_path IS NOT NULL GROUP BY origin_source")
    breakdown = cur.fetchall()

    conn.close()

    print("\n" + "=" * 60)
    print("📊 RESULTS")
    print("=" * 60)
    print(f"  Total resolved:    {resolved_count}")
    print(f"  iMac found:       {stats['imac_found']}")
    print(f"  Missing on disk:   {stats['missing']}")
    print(f"  No prefix match:   {stats['no_prefix']}")
    print()
    for origin, count in breakdown:
        print(f"  {origin}: {count}")
    print("=" * 60)
    print("✅ Done.")


if __name__ == "__main__":
    main()
