#!/usr/bin/env python3
"""
prune_nonwhitelist_messages.py
──────────────────────────────
Removes messages from chat_master.db where no participant is on the
whitelist.  Creates a timestamped backup before any deletions.

Uses the same WHITELIST_HANDLES as ingest/imessage_ingest.py.
"""

import sqlite3
import shutil
import sys
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
CHAT_MASTER  = PROJECT_ROOT / "data" / "chat_master.db"

WHITELIST_HANDLES = {
    # NOTE: JZ's own identifiers (+17736109104, joe@rowboatcreative.com) are
    # intentionally EXCLUDED — they appear in every chat, so including them
    # would whitelist ALL conversations.  The whitelist defines which OTHER
    # parties are relevant to the dispute.
    #
    # Lucas Guariglia
    "+18478280944", "lucas@rowboatcreative.com",
    # Suzanne Guariglia
    "+17043407505",
    # Leonard Mayersky
    "+17738529219",
    # Pamela Visvardis
    "+17083075156",
    # Thomas Nitschke
    "+17204540129",
    # Michael Sanderson
    "+18473801876",
    # Ryan Hayes
    "+13127254069",
    # Henry Badani
    "+18478040165",
    # Steven Farag
    "+18473870518",
    # George Grigorakos
    "+13124203036", "george.g@rudderservices.com",
    # Elliot Hershik
    "+16305311521",
    # Sheri Highland
    "+16307018110",
    # Abel Rodriguez
    "+17736366744", "abel@rowboatcreative.com",
    # Patrick Houdek
    "patrick@rowboatcreative.com",
    # Jeff Paolino
    "+14847588413",
    # Jay Goebel
    "+17733549538", "jay@rowboatcreative.com",
    # Stephanie Cuccinella
    "+12245670848", "stephanie@rowboatcreative.com",
    # Kevin Rotter
    "+17737190088",
    # Luke Fiddes
    "fiddes56@gmail.com", "+13093393391",
    # Taylor Smith
    "taylor@pendulum-creative.com", "+18043176988",
    # John Azara
    "+17738515303",
    # Wally Klejka
    "+17735161720",
    # David Baum
    "+13122753110",
    # Nicole Yalaz
    "+13128487283",
    # Jon Duong
    "+19135485577",
    # Carmel Halim
    "+14066721522",
    # Sam Cobb
    "+17577495856",
    # Sal Mohamed
    "+15105026585",
    # Eric Montanez
    "+17735584454",
    # Jimmy Bui
    "+18572212405",
    # Manny Caston
    "+17739722946",
    # Cameron Lowe
    "+16309955836",
    # Jose Aburto
    "+17733019422",
    # Amber Dys
    "+16304325005",
    # Stevie Hopkins
    "+16302729916",
    # Adrienne Guariglia
    "+18474319455",
    # Marie Hale
    "+13127201399",
    # James Johansen
    "+13125151010",
    # Gregory Jordan
    "+13125437354",
    # Jaclyn Torrey
    "+17818711003",
    # Samuel Tanios
    "+13123443801",
    # Oladipo Folami
    "+17734433476",
    # Joe FreshGoods (Joe Robinson)
    "+17734196004", "joe@vita-morte.com", "joe@joefreshgoods.com",
    # Tom Labadie
    "+17085281818",
}


def main():
    if not CHAT_MASTER.exists():
        print(f"❌ chat_master.db not found at {CHAT_MASTER}")
        sys.exit(1)

    # ── Step 1: Backup ──
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = CHAT_MASTER.parent / f"chat_master_BACKUP_{ts}.db"
    print(f"📦 Creating backup: {backup_path}")
    shutil.copy2(str(CHAT_MASTER), str(backup_path))
    print(f"   ✅ Backup created ({backup_path.stat().st_size / 1024 / 1024:.0f} MB)")

    # ── Step 2: Connect and analyze ──
    conn = sqlite3.connect(str(CHAT_MASTER))
    conn.execute("PRAGMA journal_mode = WAL")
    cur = conn.cursor()

    total_before = cur.execute("SELECT count(*) FROM message").fetchone()[0]
    print(f"\n📊 Messages before prune: {total_before:,}")

    # Find whitelisted handle ROWIDs
    placeholders = ",".join(["?"] * len(WHITELIST_HANDLES))
    whitelisted_handle_ids = cur.execute(
        f"SELECT ROWID FROM handle WHERE id IN ({placeholders})",
        list(WHITELIST_HANDLES)
    ).fetchall()
    wl_rowids = {r[0] for r in whitelisted_handle_ids}
    print(f"   Whitelisted handles found in DB: {len(wl_rowids)}")

    if not wl_rowids:
        print("❌ No whitelisted handles found — aborting to prevent data loss")
        conn.close()
        sys.exit(1)

    # Find whitelisted chat_ids (chats containing at least one whitelisted handle)
    wl_placeholders = ",".join(["?"] * len(wl_rowids))
    whitelisted_chat_ids = cur.execute(
        f"""SELECT DISTINCT chat_id FROM chat_handle_join
            WHERE handle_id IN ({wl_placeholders})""",
        list(wl_rowids)
    ).fetchall()
    wl_chat_ids = {r[0] for r in whitelisted_chat_ids}
    print(f"   Whitelisted chats: {len(wl_chat_ids)}")

    # Find message ROWIDs that are in whitelisted chats
    chat_placeholders = ",".join(["?"] * len(wl_chat_ids))
    keep_msg_count = cur.execute(
        f"""SELECT count(*) FROM chat_message_join
            WHERE chat_id IN ({chat_placeholders})""",
        list(wl_chat_ids)
    ).fetchone()[0]
    print(f"   Messages to KEEP (in whitelisted chats): {keep_msg_count:,}")
    print(f"   Messages to DELETE: {total_before - keep_msg_count:,}")

    if keep_msg_count == 0:
        print("❌ Zero messages to keep — aborting to prevent data loss")
        conn.close()
        sys.exit(1)

    # ── Step 3: Delete non-whitelisted messages ──
    print("\n🗑️  Deleting non-whitelisted messages...")

    # Delete message_attachment_join for pruned messages
    cur.execute(f"""
        DELETE FROM message_attachment_join
        WHERE message_id NOT IN (
            SELECT message_id FROM chat_message_join
            WHERE chat_id IN ({chat_placeholders})
        )
    """, list(wl_chat_ids))
    pruned_maj = cur.rowcount
    print(f"   Pruned message_attachment_join: {pruned_maj:,}")

    # Delete chat_message_join for non-whitelisted chats
    cur.execute(f"""
        DELETE FROM chat_message_join
        WHERE chat_id NOT IN ({chat_placeholders})
    """, list(wl_chat_ids))
    pruned_cmj = cur.rowcount
    print(f"   Pruned chat_message_join: {pruned_cmj:,}")

    # Delete messages not referenced by any remaining chat_message_join
    cur.execute("""
        DELETE FROM message
        WHERE ROWID NOT IN (SELECT message_id FROM chat_message_join)
    """)
    pruned_msgs = cur.rowcount
    print(f"   Pruned messages: {pruned_msgs:,}")

    # Delete orphaned attachments
    cur.execute("""
        DELETE FROM attachment
        WHERE ROWID NOT IN (SELECT attachment_id FROM message_attachment_join)
    """)
    pruned_att = cur.rowcount
    print(f"   Pruned orphaned attachments: {pruned_att:,}")

    # Delete non-whitelisted chats
    cur.execute(f"""
        DELETE FROM chat
        WHERE ROWID NOT IN ({chat_placeholders})
    """, list(wl_chat_ids))
    pruned_chats = cur.rowcount
    print(f"   Pruned non-whitelisted chats: {pruned_chats:,}")

    # Delete chat_handle_join for pruned chats
    cur.execute(f"""
        DELETE FROM chat_handle_join
        WHERE chat_id NOT IN ({chat_placeholders})
    """, list(wl_chat_ids))
    pruned_chj = cur.rowcount
    print(f"   Pruned chat_handle_join: {pruned_chj:,}")

    # Delete orphaned handles (not in any remaining chat)
    cur.execute("""
        DELETE FROM handle
        WHERE ROWID NOT IN (SELECT handle_id FROM chat_handle_join)
          AND ROWID NOT IN (SELECT DISTINCT handle_id FROM message WHERE handle_id IS NOT NULL)
    """)
    pruned_handles = cur.rowcount
    print(f"   Pruned orphaned handles: {pruned_handles:,}")

    conn.commit()

    # ── Step 4: VACUUM and report ──
    print("\n🔧 Running VACUUM...")
    conn.execute("VACUUM")
    conn.close()

    # Final stats
    conn = sqlite3.connect(str(CHAT_MASTER))
    total_after = conn.execute("SELECT count(*) FROM message").fetchone()[0]
    att_after = conn.execute("SELECT count(*) FROM attachment").fetchone()[0]
    chats_after = conn.execute("SELECT count(*) FROM chat").fetchone()[0]
    handles_after = conn.execute("SELECT count(*) FROM handle").fetchone()[0]
    db_size = CHAT_MASTER.stat().st_size / 1024 / 1024
    conn.close()

    print("\n" + "=" * 60)
    print("📊 PRUNE RESULTS")
    print("=" * 60)
    print(f"  Messages:    {total_before:,} → {total_after:,}  (removed {total_before - total_after:,})")
    print(f"  Attachments: {att_after:,} remaining")
    print(f"  Chats:       {chats_after:,} remaining")
    print(f"  Handles:     {handles_after:,} remaining")
    print(f"  DB size:     {db_size:.0f} MB")
    print(f"  Backup:      {backup_path}")
    print("=" * 60)
    print("✅ Done.")


if __name__ == "__main__":
    main()
