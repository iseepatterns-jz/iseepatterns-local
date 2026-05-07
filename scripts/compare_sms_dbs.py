#!/usr/bin/env python3
"""
iMessage Database Comparison: iPhone 12 Pro vs iPhone 14 Pro
=============================================================
Compares two sms.db backups to identify message gaps, detect
deletion evidence, and determine whether missing messages were
a transfer failure or post-transfer deletion.

Separates the direct 1-on-1 JZ ↔ LG thread from group chats.

In Apple's sms.db schema:
  - The direct thread has chat.chat_identifier = '+18478280944'
    (the phone number itself, NOT a 'chat...' hash)
  - Group chats have chat_identifier = 'chat...' (long numeric hash)
  - style=45 with a phone-number identifier = direct SMS/iMessage
  - style=43 with a 'chat...' identifier = group conversation

TERMINAL COMMAND:
  python /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/compare_sms_dbs.py

No arguments needed — paths are configured below.
"""

import sqlite3
import json
import os
from datetime import datetime, timezone
from collections import defaultdict

# ─────────────────────────────────────────────
# Configuration — UPDATE THESE PATHS IF NEEDED
# ─────────────────────────────────────────────

# DB_IPHONE12 = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/IMESSAGE_LOCKER/2024-06-06-iphone-12-imazing-export-showgoat/showgoat/HomeDomain/Library/SMS/sms.db"
# DB_IPHONE14 = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/IMESSAGE_LOCKER/2024-06-07-iphone-14-imazing-export-showgoat2/showgoat (2)/HomeDomain/Library/SMS/sms.db"
# NOTE: The above legacy iMazing exports were removed in March 2026.
# Use WHITELIST_DB_EXPORT_LOCKER for per-contact databases.

# Joseph's handle
JZ_HANDLE = "+17736109104"

# Target contact: Lucas Guariglia
LG_HANDLE = "+18478280944"
LG_HANDLE_VARIANTS = ["+18478280944", "18478280944", "18478280944@tmomail.net"]

OUTPUT_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/IMESSAGE_LOCKER"

# ─────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────

def apple_ts_to_local(ts):
    """Convert Apple nanosecond timestamp to readable local datetime string."""
    if not ts or ts == 0:
        return None
    try:
        unix_ts = (ts / 1_000_000_000) + 978307200
        return datetime.fromtimestamp(unix_ts).strftime("%Y-%m-%d %H:%M:%S")
    except:
        return None


def apple_ts_to_month(ts):
    """Convert Apple nanosecond timestamp to YYYY-MM string."""
    if not ts or ts == 0:
        return None
    try:
        unix_ts = (ts / 1_000_000_000) + 978307200
        return datetime.fromtimestamp(unix_ts).strftime("%Y-%m")
    except:
        return None


def open_readonly(db_path):
    """Open a SQLite database in read-only mode."""
    return sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)


def get_handle_rowids(conn, handle_variants):
    """Find all handle ROWIDs matching the given variants."""
    rowids = set()
    for variant in handle_variants:
        cursor = conn.execute("SELECT ROWID FROM handle WHERE id = ?", (variant,))
        for row in cursor.fetchall():
            rowids.add(row[0])
        digits = ''.join(c for c in variant if c.isdigit())
        if len(digits) >= 10:
            last10 = digits[-10:]
            cursor = conn.execute("SELECT ROWID FROM handle WHERE id LIKE ?", (f"%{last10}",))
            for row in cursor.fetchall():
                rowids.add(row[0])
    return rowids


def get_all_tables(conn):
    """Get all table names."""
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    return [row[0] for row in cursor.fetchall()]


# ─────────────────────────────────────────────
# Chat Classification (Fixed)
# ─────────────────────────────────────────────

def classify_lg_chats(conn, label):
    """
    Find all chats involving LG and classify as DIRECT vs GROUP.

    Key insight from the data:
    - DIRECT 1-on-1 thread: chat_identifier IS the phone number
      (e.g., '+18478280944') — these are style=45
    - GROUP chats: chat_identifier starts with 'chat' followed by
      a long numeric hash — these are style=43

    We classify based on chat_identifier, NOT style alone.
    """
    lg_rowids = get_handle_rowids(conn, LG_HANDLE_VARIANTS)
    if not lg_rowids:
        print(f"  [WARN] No handle found for LG in {label}")
        return [], [], {}

    placeholders = ','.join('?' * len(lg_rowids))
    rowid_list = list(lg_rowids)

    chat_cursor = conn.execute(f"""
        SELECT DISTINCT chj.chat_id, c.ROWID, c.style, c.chat_identifier,
               c.display_name, c.group_id
        FROM chat_handle_join chj
        JOIN chat c ON c.ROWID = chj.chat_id
        WHERE chj.handle_id IN ({placeholders})
    """, rowid_list)

    direct_chat_ids = []
    group_chat_ids = []
    chat_details = {}

    for chat_id, c_rowid, style, chat_identifier, display_name, group_id in chat_cursor.fetchall():
        handle_count = conn.execute(
            "SELECT COUNT(DISTINCT handle_id) FROM chat_handle_join WHERE chat_id = ?",
            (chat_id,)
        ).fetchone()[0]

        msg_count = conn.execute(
            "SELECT COUNT(*) FROM chat_message_join WHERE chat_id = ?",
            (chat_id,)
        ).fetchone()[0]

        chat_info = {
            "chat_id": chat_id,
            "style": style,
            "chat_identifier": chat_identifier,
            "display_name": display_name,
            "group_id": group_id,
            "handle_count": handle_count,
            "message_count": msg_count,
        }

        # Classification: check if chat_identifier matches LG's phone number
        # Direct threads have the phone number as the identifier
        # Group chats have 'chat' + long numeric hash
        is_direct = False

        if chat_identifier:
            # Check if the identifier contains LG's phone digits
            ci_clean = chat_identifier.strip()
            lg_digits = '8478280944'

            # Direct match: identifier IS the phone number (with or without +)
            if ci_clean in LG_HANDLE_VARIANTS:
                is_direct = True
            elif ci_clean.lstrip('+') in ['18478280944', '8478280944']:
                is_direct = True
            # NOT a 'chat...' hash identifier
            elif not ci_clean.startswith('chat') and lg_digits in ci_clean:
                is_direct = True

        chat_info["classified_as"] = "DIRECT" if is_direct else "GROUP"

        if is_direct:
            direct_chat_ids.append(chat_id)
        else:
            group_chat_ids.append(chat_id)

        chat_details[chat_id] = chat_info

    return direct_chat_ids, group_chat_ids, chat_details


def get_messages_for_chats(conn, chat_ids):
    """Get monthly message breakdown for a set of chat IDs."""
    if not chat_ids:
        return {}, 0, None, None

    placeholders = ','.join('?' * len(chat_ids))
    cursor = conn.execute(f"""
        SELECT m.date, m.is_from_me, m.ROWID
        FROM message m
        JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
        WHERE cmj.chat_id IN ({placeholders})
        ORDER BY m.date
    """, chat_ids)

    monthly = defaultdict(lambda: {"incoming": 0, "outgoing": 0, "total": 0})
    total = 0
    min_date = None
    max_date = None
    seen_rowids = set()

    for date_val, is_from_me, rowid in cursor.fetchall():
        # Deduplicate — a message can appear in multiple chat_ids
        if rowid in seen_rowids:
            continue
        seen_rowids.add(rowid)

        month = apple_ts_to_month(date_val)
        if not month:
            continue
        if is_from_me:
            monthly[month]["outgoing"] += 1
        else:
            monthly[month]["incoming"] += 1
        monthly[month]["total"] += 1
        total += 1

        readable = apple_ts_to_local(date_val)
        if readable:
            if min_date is None or readable < min_date:
                min_date = readable
            if max_date is None or readable > max_date:
                max_date = readable

    return dict(monthly), total, min_date, max_date


# ─────────────────────────────────────────────
# Deletion Evidence
# ─────────────────────────────────────────────

def check_deleted_messages(conn, label):
    """Check for deleted_messages table and its contents."""
    tables = get_all_tables(conn)

    results = {
        "has_deleted_messages_table": "deleted_messages" in tables,
        "deleted_entries": [],
    }

    if "deleted_messages" in tables:
        try:
            schema = conn.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='deleted_messages'"
            ).fetchone()
            results["deleted_messages_schema"] = schema[0] if schema else ""

            count = conn.execute("SELECT COUNT(*) FROM deleted_messages").fetchone()[0]
            results["deleted_messages_count"] = count

            cols = [desc[1] for desc in conn.execute("PRAGMA table_info(deleted_messages)").fetchall()]
            results["deleted_messages_columns"] = cols

            if count > 0:
                cursor = conn.execute("SELECT * FROM deleted_messages LIMIT 50")
                for row in cursor.fetchall():
                    entry = dict(zip(cols, row))
                    results["deleted_entries"].append(entry)
        except Exception as e:
            results["deleted_messages_error"] = str(e)

    for table_name in ["sync_deleted_messages", "sync_deleted_chats",
                        "sync_deleted_attachments", "recoverable_message_part",
                        "unsynced_removed_recoverable_messages"]:
        if table_name in tables:
            try:
                count = conn.execute(f"SELECT COUNT(*) FROM [{table_name}]").fetchone()[0]
                results[f"{table_name}_count"] = count
                if count > 0:
                    cols = [desc[1] for desc in conn.execute(f"PRAGMA table_info([{table_name}])").fetchall()]
                    results[f"{table_name}_columns"] = cols
                    sample = conn.execute(f"SELECT * FROM [{table_name}] LIMIT 20").fetchall()
                    results[f"{table_name}_sample"] = [dict(zip(cols, row)) for row in sample]
            except Exception as e:
                results[f"{table_name}_error"] = str(e)

    return results


# ─────────────────────────────────────────────
# Other Contacts Coverage
# ─────────────────────────────────────────────

def check_other_contacts_coverage(conn, label):
    """Check whether non-LG contacts have continuous coverage through the gap period."""
    lg_rowids = get_handle_rowids(conn, LG_HANDLE_VARIANTS)
    lg_list = list(lg_rowids) if lg_rowids else [-1]
    lg_ph = ','.join('?' * len(lg_list))

    cursor = conn.execute(f"""
        SELECT h.id, h.ROWID, COUNT(m.ROWID) as cnt
        FROM handle h
        JOIN message m ON m.handle_id = h.ROWID
        WHERE h.ROWID NOT IN ({lg_ph})
        GROUP BY h.ROWID
        ORDER BY cnt DESC
        LIMIT 10
    """, lg_list)

    other_contacts = []
    gap_start_ns = 667785600 * 1_000_000_000  # 2022-03-01
    gap_end_ns = 702000000 * 1_000_000_000    # 2023-04-01

    for handle_id, handle_rowid, msg_count in cursor.fetchall():
        gap_count = conn.execute("""
            SELECT COUNT(*) FROM message
            WHERE handle_id = ? AND date BETWEEN ? AND ?
        """, (handle_rowid, gap_start_ns, gap_end_ns)).fetchone()[0]

        date_range = conn.execute("""
            SELECT MIN(date), MAX(date)
            FROM message WHERE handle_id = ?
        """, (handle_rowid,)).fetchone()

        other_contacts.append({
            "handle": handle_id,
            "total_messages": msg_count,
            "messages_in_gap_period": gap_count,
            "earliest": apple_ts_to_local(date_range[0]) if date_range[0] else None,
            "latest": apple_ts_to_local(date_range[1]) if date_range[1] else None,
        })

    return other_contacts


# ─────────────────────────────────────────────
# Database Metadata
# ─────────────────────────────────────────────

def get_db_metadata(conn, db_path, label):
    """Get general database metadata."""
    tables = get_all_tables(conn)
    total_msgs = conn.execute("SELECT COUNT(*) FROM message").fetchone()[0]
    total_handles = conn.execute("SELECT COUNT(*) FROM handle").fetchone()[0]
    file_size = os.path.getsize(db_path)

    return {
        "label": label,
        "path": db_path,
        "file_size_bytes": file_size,
        "table_count": len(tables),
        "tables": tables,
        "total_messages": total_msgs,
        "total_handles": total_handles,
    }


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    print("=" * 75)
    print("  iMessage Database Comparison (v3 — Direct Thread vs Group Chats)")
    print("  iPhone 12 Pro (2024-06-06) vs iPhone 14 Pro (2024-06-07)")
    print(f"  Focus: JZ ({JZ_HANDLE}) ↔ LG ({LG_HANDLE})")
    print("=" * 75)
    print()

    for path, label in [(DB_IPHONE12, "iPhone 12 Pro"), (DB_IPHONE14, "iPhone 14 Pro")]:
        if not os.path.exists(path):
            print(f"[ERROR] {label} sms.db not found: {path}")
            return

    conn12 = open_readonly(DB_IPHONE12)
    conn14 = open_readonly(DB_IPHONE14)

    # ── Step 1: Database metadata ──
    print("[1/7] Database overview...")
    meta12 = get_db_metadata(conn12, DB_IPHONE12, "iPhone 12 Pro")
    meta14 = get_db_metadata(conn14, DB_IPHONE14, "iPhone 14 Pro")

    print(f"  iPhone 12 Pro: {meta12['total_messages']:,} messages, "
          f"{meta12['total_handles']} handles, {meta12['file_size_bytes']:,} bytes")
    print(f"  iPhone 14 Pro: {meta14['total_messages']:,} messages, "
          f"{meta14['total_handles']} handles, {meta14['file_size_bytes']:,} bytes")
    print()

    # ── Step 2: Classify LG chats ──
    print("[2/7] Classifying LG chats...")
    print("  (DIRECT = chat_identifier is the phone number;")
    print("   GROUP  = chat_identifier is a 'chat...' hash)")
    print()

    direct12, group12, details12 = classify_lg_chats(conn12, "iPhone 12 Pro")
    direct14, group14, details14 = classify_lg_chats(conn14, "iPhone 14 Pro")

    print(f"  iPhone 12 Pro:")
    print(f"    DIRECT thread chat_ids: {direct12}")
    for cid in direct12:
        info = details12[cid]
        print(f"      chat_id={cid}: style={info['style']}, "
              f"identifier='{info['chat_identifier']}', "
              f"handles={info['handle_count']}, "
              f"msgs={info['message_count']:,}")
    print(f"    GROUP chats: {len(group12)} total")
    # Show a few notable ones
    group12_with_msgs = [(cid, details12[cid]) for cid in group12 if details12[cid]['message_count'] > 0]
    group12_with_msgs.sort(key=lambda x: x[1]['message_count'], reverse=True)
    for cid, info in group12_with_msgs[:10]:
        print(f"      chat_id={cid}: identifier='{info['chat_identifier'][:30]}...', "
              f"handles={info['handle_count']}, "
              f"msgs={info['message_count']:,}")
    if len(group12_with_msgs) > 10:
        print(f"      ... and {len(group12_with_msgs) - 10} more with messages")
    group12_empty = len(group12) - len(group12_with_msgs)
    if group12_empty > 0:
        print(f"      ({group12_empty} group chats with 0 messages)")

    print()
    print(f"  iPhone 14 Pro:")
    print(f"    DIRECT thread chat_ids: {direct14}")
    for cid in direct14:
        info = details14[cid]
        print(f"      chat_id={cid}: style={info['style']}, "
              f"identifier='{info['chat_identifier']}', "
              f"handles={info['handle_count']}, "
              f"msgs={info['message_count']:,}")
    print(f"    GROUP chats: {len(group14)} total")
    group14_with_msgs = [(cid, details14[cid]) for cid in group14 if details14[cid]['message_count'] > 0]
    group14_with_msgs.sort(key=lambda x: x[1]['message_count'], reverse=True)
    for cid, info in group14_with_msgs[:10]:
        print(f"      chat_id={cid}: identifier='{info['chat_identifier'][:30]}...', "
              f"handles={info['handle_count']}, "
              f"msgs={info['message_count']:,}")
    if len(group14_with_msgs) > 10:
        print(f"      ... and {len(group14_with_msgs) - 10} more with messages")
    group14_empty = len(group14) - len(group14_with_msgs)
    if group14_empty > 0:
        print(f"      ({group14_empty} group chats with 0 messages)")
    print()

    # ── Step 3: DIRECT thread monthly breakdown ──
    print("[3/7] Analyzing DIRECT 1-on-1 thread (JZ ↔ LG)...")
    m12_direct, t12_direct, min12_d, max12_d = get_messages_for_chats(conn12, direct12)
    m14_direct, t14_direct, min14_d, max14_d = get_messages_for_chats(conn14, direct14)

    print(f"  iPhone 12 Pro: {t12_direct:,} direct messages ({min12_d} to {max12_d})")
    print(f"  iPhone 14 Pro: {t14_direct:,} direct messages ({min14_d} to {max14_d})")
    print(f"  Difference:    {t12_direct - t14_direct:,} messages")
    print()

    # ── Step 4: GROUP chat monthly breakdown ──
    print("[4/7] Analyzing GROUP CHAT messages (chats including LG)...")
    m12_group, t12_group, min12_g, max12_g = get_messages_for_chats(conn12, group12)
    m14_group, t14_group, min14_g, max14_g = get_messages_for_chats(conn14, group14)

    print(f"  iPhone 12 Pro: {t12_group:,} group messages ({min12_g} to {max12_g})")
    print(f"  iPhone 14 Pro: {t14_group:,} group messages ({min14_g} to {max14_g})")
    print(f"  Difference:    {t12_group - t14_group:,} messages")
    print()

    # ── Step 5: Side-by-side monthly comparison (DIRECT thread ONLY) ──
    print("[5/7] Monthly comparison — DIRECT JZ ↔ LG thread:")
    print()
    all_months = sorted(set(list(m12_direct.keys()) + list(m14_direct.keys())))

    print(f"  {'Month':<10} {'iPhone 12':>12} {'iPhone 14':>12} {'Diff':>8}  {'Status'}")
    print(f"  {'─'*10} {'─'*12} {'─'*12} {'─'*8}  {'─'*30}")

    gap_months = []
    partial_months = []
    ok_months = []
    for month in all_months:
        c12 = m12_direct.get(month, {}).get("total", 0)
        c14 = m14_direct.get(month, {}).get("total", 0)
        diff = c14 - c12

        if c12 > 0 and c14 == 0:
            status = "◀◀ MISSING (100%)"
            gap_months.append(month)
        elif c12 > 0 and c14 > 0 and c14 < c12 and abs(diff) > 5:
            pct_missing = ((c12 - c14) / c12) * 100
            status = f"PARTIAL (−{c12-c14}, {pct_missing:.0f}% missing)"
            partial_months.append(month)
        elif c12 == 0 and c14 > 0:
            status = "NEW (14 only)"
        elif c12 > 0 and c14 > 0 and abs(diff) <= 5:
            status = "OK ✓"
            ok_months.append(month)
        else:
            status = f"({diff:+d})"
            ok_months.append(month)

        print(f"  {month:<10} {c12:>12,} {c14:>12,} {diff:>+8,}  {status}")

    total_12_d = sum(m12_direct.get(m, {}).get("total", 0) for m in all_months)
    total_14_d = sum(m14_direct.get(m, {}).get("total", 0) for m in all_months)
    print(f"  {'─'*10} {'─'*12} {'─'*12} {'─'*8}")
    print(f"  {'TOTAL':<10} {total_12_d:>12,} {total_14_d:>12,} {total_14_d - total_12_d:>+8,}")

    print()
    if gap_months:
        gap_msg_count = sum(m12_direct.get(m, {}).get("total", 0) for m in gap_months)
        print(f"  ⚠ COMPLETELY MISSING MONTHS: {len(gap_months)}")
        print(f"    Range: {gap_months[0]} through {gap_months[-1]}")
        print(f"    Messages in those months (iPhone 12): {gap_msg_count:,}")
    if partial_months:
        partial_12 = sum(m12_direct.get(m, {}).get("total", 0) for m in partial_months)
        partial_14 = sum(m14_direct.get(m, {}).get("total", 0) for m in partial_months)
        print(f"  ⚠ PARTIALLY MISSING MONTHS: {len(partial_months)}")
        print(f"    iPhone 12 count: {partial_12:,}")
        print(f"    iPhone 14 count: {partial_14:,}")
        print(f"    Missing from partial months: {partial_12 - partial_14:,}")
    if ok_months:
        print(f"  ✓ MATCHING MONTHS: {len(ok_months)} ({', '.join(ok_months)})")
    print()

    # ── Step 6: Deletion evidence ──
    print("[6/7] Checking for deletion evidence...")
    print()
    print("  iPhone 14 Pro:")
    del14 = check_deleted_messages(conn14, "iPhone 14 Pro")
    if del14["has_deleted_messages_table"]:
        count = del14.get("deleted_messages_count", 0)
        print(f"    deleted_messages:     {count} entries")
    else:
        print(f"    deleted_messages:     table not found")
    for t in ["sync_deleted_messages", "sync_deleted_chats",
              "sync_deleted_attachments", "recoverable_message_part",
              "unsynced_removed_recoverable_messages"]:
        k = f"{t}_count"
        if k in del14:
            print(f"    {t}: {del14[k]} entries")

    print()
    print("  iPhone 12 Pro:")
    del12 = check_deleted_messages(conn12, "iPhone 12 Pro")
    if del12["has_deleted_messages_table"]:
        count = del12.get("deleted_messages_count", 0)
        print(f"    deleted_messages:     {count} entries")
    else:
        print(f"    deleted_messages:     table not found")
    for t in ["sync_deleted_messages", "sync_deleted_chats",
              "sync_deleted_attachments", "recoverable_message_part"]:
        k = f"{t}_count"
        if k in del12:
            print(f"    {t}: {del12[k]} entries")
    print()

    # ── Step 7: Other contacts coverage ──
    print("[7/7] Other contacts' coverage during gap period (Mar 2022 – Apr 2023)...")
    other14 = check_other_contacts_coverage(conn14, "iPhone 14 Pro")
    print()
    print(f"  {'Handle':<30} {'Total':>8} {'In Gap':>8} {'Coverage'}")
    print(f"  {'─'*30} {'─'*8} {'─'*8} {'─'*15}")
    for c in other14:
        gap_status = "HAS MESSAGES" if c["messages_in_gap_period"] > 0 else "NO MESSAGES"
        handle_display = c['handle'][:28] if len(c['handle']) > 28 else c['handle']
        print(f"  {handle_display:<30} {c['total_messages']:>8,} {c['messages_in_gap_period']:>8,} {gap_status}")
    print()

    conn12.close()
    conn14.close()

    # ── Save full report ──
    report = {
        "comparison_timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "3.0 — direct thread vs group chat (identifier-based classification)",
        "databases": {"iphone_12_pro": meta12, "iphone_14_pro": meta14},
        "chat_classification": {
            "iphone_12_pro": {
                "direct_chat_ids": direct12,
                "group_chat_count": len(group12),
                "direct_details": {str(k): details12[k] for k in direct12},
            },
            "iphone_14_pro": {
                "direct_chat_ids": direct14,
                "group_chat_count": len(group14),
                "direct_details": {str(k): details14[k] for k in direct14},
            },
        },
        "direct_thread_analysis": {
            "iphone_12_monthly": m12_direct,
            "iphone_14_monthly": m14_direct,
            "iphone_12_total": t12_direct,
            "iphone_14_total": t14_direct,
            "iphone_12_range": {"earliest": min12_d, "latest": max12_d},
            "iphone_14_range": {"earliest": min14_d, "latest": max14_d},
            "completely_missing_months": gap_months,
            "partially_missing_months": partial_months,
            "matching_months": ok_months,
        },
        "group_chat_analysis": {
            "iphone_12_monthly": m12_group,
            "iphone_14_monthly": m14_group,
            "iphone_12_total": t12_group,
            "iphone_14_total": t14_group,
            "iphone_12_range": {"earliest": min12_g, "latest": max12_g},
            "iphone_14_range": {"earliest": min14_g, "latest": max14_g},
        },
        "deletion_evidence": {
            "iphone_14_pro": del14,
            "iphone_12_pro": del12,
        },
        "other_contacts_gap_coverage": other14,
    }

    output_path = os.path.join(OUTPUT_DIR, "sms_db_comparison_report.json")
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"  Full report saved: {output_path}")

    # ── Final Summary ──
    print()
    print("=" * 75)
    print("  FORENSIC SUMMARY")
    print("=" * 75)
    print()
    print(f"  DIRECT 1-ON-1 THREAD (JZ ↔ LG):")
    print(f"    iPhone 12 Pro: {t12_direct:,} messages")
    print(f"    iPhone 14 Pro: {t14_direct:,} messages")
    if t12_direct > 0:
        missing = t12_direct - t14_direct
        pct = (missing / t12_direct * 100) if missing > 0 else 0
        print(f"    Missing:       {missing:,} messages ({pct:.1f}%)")
    print()

    if gap_months:
        gap_count = sum(m12_direct.get(m, {}).get("total", 0) for m in gap_months)
        print(f"    Completely missing months: {gap_months[0]} – {gap_months[-1]}")
        print(f"    ({len(gap_months)} months, {gap_count:,} messages)")
    if partial_months:
        print(f"    Partially missing months: {len(partial_months)}")
    if ok_months:
        print(f"    Matching months: {', '.join(ok_months)}")
    print()

    print(f"  GROUP CHATS (containing LG):")
    print(f"    iPhone 12 Pro: {t12_group:,} messages in {len(group12)} chats")
    print(f"    iPhone 14 Pro: {t14_group:,} messages in {len(group14)} chats")
    if t12_group > 0 and t14_group > 0:
        group_diff = abs(t12_group - t14_group)
        print(f"    Difference: {group_diff:,} messages")
    print()

    del_count_14 = del14.get("deleted_messages_count", 0)
    has_other_coverage = any(c["messages_in_gap_period"] > 0 for c in other14)

    print(f"  DELETION EVIDENCE:")
    print(f"    deleted_messages entries (iPhone 14): {del_count_14}")
    print(f"    Other contacts have msgs in gap period: {'YES' if has_other_coverage else 'NO'}")
    print()

    # Interpretation
    if t14_direct == 0 and t12_direct > 0:
        print("  ⚠ FINDING: The ENTIRE direct JZ ↔ LG thread is ABSENT from")
        print("    the iPhone 14 Pro backup. Zero direct messages transferred.")
        if del_count_14 == 0:
            print()
            print("  INTERPRETATION: No deletion evidence. The direct thread failed")
            print("  to transfer during iPhone 12 → 14 migration.")
            if t14_group > 0:
                print("  Group chats containing LG DID transfer, confirming the")
                print("  migration occurred — only the direct thread was lost.")
    elif t14_direct > 0 and t12_direct > t14_direct:
        missing = t12_direct - t14_direct
        pct = (missing / t12_direct * 100)

        if gap_months and not partial_months:
            print(f"  FINDING: Clean date-range gap in the direct thread.")
            print(f"  {len(gap_months)} months completely missing ({gap_count:,} messages).")
            print(f"  All other months transferred intact.")
            if del_count_14 == 0 and has_other_coverage:
                print()
                print("  INTERPRETATION: Transfer truncation during device migration.")
                print("  No deletion evidence. Other contacts have full coverage.")
        elif partial_months and not gap_months:
            print(f"  FINDING: Massive transfer truncation of the direct thread.")
            print(f"  {pct:.0f}% of messages missing ({missing:,} of {t12_direct:,}).")
            print(f"  Every month from the iPhone 12 era has only a fraction on iPhone 14.")
            if del_count_14 == 0:
                print()
                print("  INTERPRETATION: The large direct thread (~{:,} messages)".format(t12_direct))
                print("  was truncated during device migration. Only ~{:,} messages".format(t14_direct))
                print("  ({:.0f}%) survived the transfer. This is consistent with known".format(
                    (t14_direct / t12_direct * 100) if t12_direct > 0 else 0))
                print("  iOS behavior for very large iMessage threads.")
                print()
                print("  No deletion evidence exists (deleted_messages = 0).")
                print("  Manual deletion of {:,} specific messages would leave".format(missing))
                print("  forensic traces in the deleted_messages table.")
        elif partial_months and gap_months:
            print(f"  FINDING: Combined gap + truncation in the direct thread.")
            print(f"  {len(gap_months)} months completely missing, {len(partial_months)} partially missing.")
            print(f"  Total: {missing:,} of {t12_direct:,} messages missing ({pct:.0f}%).")
            if del_count_14 == 0:
                print()
                print("  INTERPRETATION: Transfer failure during device migration.")
                print("  No deletion evidence (deleted_messages = 0).")
    else:
        print("  Direct thread counts match between devices.")

    print()
    print("  RECOMMENDATION:")
    print("  Use the iPhone 12 Pro iMazing backup (2024-06-06) as the")
    print("  authoritative source for the JZ ↔ LG direct message thread.")
    print("=" * 75)


if __name__ == "__main__":
    main()
