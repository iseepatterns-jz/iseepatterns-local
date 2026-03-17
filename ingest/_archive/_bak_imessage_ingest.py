import os
import sqlite3
import uuid
import json
from typing import List, Dict
from datetime import datetime, timedelta, timezone
from .evidence_card import EvidenceCard

DATA_DIR = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data"
# Unified Chat DB location (centralized during consolidation)
# Use the pre-exported CSV for reliability
IMESSAGE_CSV_PATH = "/Volumes/batdrivetb5/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/messages_7736109104_8478280944.csv"
CARDS_OUT = os.path.join(DATA_DIR, "evidence_cards")
os.makedirs(CARDS_OUT, exist_ok=True)

def fetch_messages() -> List[Dict]:
    if not os.path.exists(IMESSAGE_CSV_PATH):
        print(f"❌ iMessage CSV not found at {IMESSAGE_CSV_PATH}")
        return []
    
    import pandas as pd
    print(f"   Reading {IMESSAGE_CSV_PATH}...")
    try:
        df = pd.read_csv(IMESSAGE_CSV_PATH)
        # Normalize columns to match the DB-based logic if possible
        # Expected: rowid, date (apple ts), text, handle_id, chat_identifier
        # The CSV has: RowID, Date (ISO?), Text, Handle_ID, etc.
        # Let's see the columns first.
        messages = []
        for _, row in df.iterrows():
            messages.append({
                "rowid": row.get("RowID") or row.get("rowid"),
                "date": row.get("Date") or row.get("date"),
                "text": row.get("Text") or row.get("text") or row.get("body"),
                "handle_id": row.get("Handle_ID") or row.get("handle_id") or row.get("sender"),
                "chat_identifier": row.get("Chat_Identifier") or row.get("chat_identifier") or "LG_JZ_Thread"
            })
        return messages
    except Exception as e:
        print(f"❌ Error reading iMessage CSV: {e}")
        return []

def group_into_threads(messages: List[Dict], max_msgs_per_card: int = 20, time_gap_seconds: int = 3600):
    threads = []
    current = []
    last_ts = None
    
    for msg in messages:
        ts = msg["date"]
        # Start new thread if gap > 1 hour or limit reached
        if current and (len(current) >= max_msgs_per_card or (last_ts and (ts - last_ts) > time_gap_seconds)):
            threads.append(current)
            current = [msg]
        else:
            current.append(msg)
        last_ts = ts
        
    if current:
        threads.append(current)
    return threads

def _apple_time_to_iso(ts):
    if isinstance(ts, str) and "-" in ts and "T" in ts:
        return ts # Already ISO
    # macOS iMessage timestamp: seconds since 2001-01-01
    if ts is None:
        return None
    try:
        # Apple timestamps are seconds since 2001-01-01 00:00:00 UTC
        # Convert to datetime object
        dt_object = datetime(2001, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=ts)
        # Format to ISO 8601 string
        return dt_object.isoformat(timespec='seconds')
    except (TypeError, ValueError):
        return None

def thread_to_card(thread: List[Dict]) -> EvidenceCard:
    chat_identifier = thread[0]["chat_identifier"] or "Unknown"
    timestamps = [_apple_time_to_iso(m["date"]) for m in thread if m["date"] is not None]
    timestamps = [t for t in timestamps if t]
    start_ts = min(timestamps) if timestamps else None
    end_ts = max(timestamps) if timestamps else None

    participants = sorted({m["handle_id"] for m in thread if m["handle_id"]})
    body_lines = []
    for m in thread:
        ts = _apple_time_to_iso(m["date"]) or ""
        text = m["text"] or "[Attachment/Empty]"
        sender = "LG/JZ" if m["handle_id"] == "+18478280944" else "JZ"
        body_lines.append(f"[{ts}] {sender}: {text}")
        
    body = "\n".join(body_lines)

    # Forensic summary
    summary = f"iMessage thread between {', '.join(participants)}. Includes {len(thread)} messages."
    bullets = [m["text"][:100] for m in thread if m["text"] and len(m["text"]) > 10][:5]

    card_id = str(uuid.uuid4())
    return EvidenceCard(
        id=card_id,
        source_type="imessage",
        file_path=IMESSAGE_CSV_PATH,
        origin_system="CHAT_DB",
        primary_ids={"chat_identifier": chat_identifier, "message_count": str(len(thread))},
        participants=participants,
        start_timestamp=start_ts,
        end_timestamp=end_ts,
        title=f"iMessage: {chat_identifier} ({start_ts[:10] if start_ts else 'Unknown Date'})",
        summary=summary,
        bullets=bullets,
        body_snippet=body,
        tags=["imessage", "forensic", "chat"],
        extra={"message_rowids": [m["rowid"] for m in thread]}
    )

def ingest_imessages():
    print("📱 Starting iMessage ingestion...")
    msgs = fetch_messages()
    print(f"   Found {len(msgs)} messages for target handle.")
    if not msgs:
        return
        
    threads = group_into_threads(msgs)
    print(f"   Grouped into {len(threads)} evidence cards.")
    
    for t in threads:
        card = thread_to_card(t)
        out_path = os.path.join(CARDS_OUT, f"{card.id}.json")
        with open(out_path, "w", encoding="utf-8") as fh:
            fh.write(card.to_json())
    print(f"   ✓ Generated {len(threads)} iMessage evidence cards in {CARDS_OUT}")

if __name__ == "__main__":
    ingest_imessages()
