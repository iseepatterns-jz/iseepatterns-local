#!/usr/bin/env python3
"""
generate_rsmf_export.py
───────────────────────
Converts iMessage data into RSMF (Relativity Short Message Format).
Supports participants, attachments, reactions, and intelligence tags.
"""

import os
import sys
import json
import sqlite3
import hashlib
import zipfile
import shutil
from datetime import datetime, timedelta
from pathlib import Path

# --- Configuration ---
BASE_DIR = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
DATA_DIR = BASE_DIR / "data"
CHAT_MASTER_DB = DATA_DIR / "IMESSAGE_LOCKER" / "Messages" / "chat_case_only.db"
PLAYERS_DB = DATA_DIR / "players.db"
EXPORT_DIR = BASE_DIR / "exports" / "RSMF"

RSMF_VERSION = "2.0"
COCOA_EPOCH = datetime(2001, 1, 1)

def log(msg):
    print(f"[rsmf-export] {msg}")

def ensure_dirs():
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

def get_db(path):
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn

def normalize_identifier(val):
    if not val: return ""
    val = val.lower().strip()
    if "@" in val: return val
    return "".join(c for c in val if c.isdigit())

def convert_timestamp(cocoa_ns):
    if not cocoa_ns: return datetime.now().isoformat() + "Z"
    if cocoa_ns > 1e12: 
        seconds = cocoa_ns / 1e9
    else:
        seconds = cocoa_ns
    dt = COCOA_EPOCH + timedelta(seconds=seconds)
    return dt.isoformat() + "Z"

def get_reaction_label(msg_type):
    mapping = {
        2000: "Loved", 2001: "Liked", 2002: "Disliked",
        2003: "Laughed", 2004: "Emphasized", 2005: "Questioned"
    }
    return mapping.get(msg_type, f"Reaction({msg_type})")

def load_participants():
    players_conn = get_db(PLAYERS_DB)
    mapping = {}
    try:
        rows = players_conn.execute("SELECT display_name, email_addresses, phone_numbers, slug FROM players").fetchall()
        for r in rows:
            emails = json.loads(r['email_addresses'] or "[]")
            phones = json.loads(r['phone_numbers'] or "[]")
            p_info = {"name": r['display_name'], "display": r['display_name'] or r['slug'], "id": r['slug']}
            for e in emails: mapping[normalize_identifier(e)] = p_info
            for p in phones: mapping[normalize_identifier(p)] = p_info
    except Exception as e: log(f"⚠ Error loading participants: {e}")
    finally: players_conn.close()
    return mapping

def process_chat(chat_id, messages, participant_map, handles, tags=None):
    if not messages: return
    tags = tags or {}
    messages.sort(key=lambda x: x['date'] or 0)
    
    first_iso = convert_timestamp(messages[0]['date'])
    chat_guid = messages[0]['chat_guid']
    safe_guid = chat_guid.replace(";", "_").replace(":", "-").replace("/", "_")
    
    # Use a hash for the filename to avoid 'File name too long' errors
    guid_hash = hashlib.md5(safe_guid.encode()).hexdigest()
    file_name = f"{first_iso[:10]}_{guid_hash}.rsmf"
    
    manifest = {
        "version": RSMF_VERSION,
        "participants": [],
        "conversations": [{"id": chat_guid, "display": f"iMessage Chat: {chat_guid}", "events": []}]
    }
    
    p_seen = set()
    # Use a hash for the temp directory name to avoid 'File name too long' errors
    guid_hash = hashlib.md5(safe_guid.encode()).hexdigest()
    temp_dir = EXPORT_DIR / f"temp_{guid_hash}"
    temp_dir.mkdir(exist_ok=True)
    attach_dir = temp_dir / "attachments"
    attach_dir.mkdir(exist_ok=True)

    for msg in messages:
        h_id = str(msg['handle_id'])
        h_str = handles.get(h_id, "Unknown")
        p_info = participant_map.get(normalize_identifier(h_str), {"display": h_str, "id": h_str})
        
        if p_info['id'] not in p_seen:
            manifest['participants'].append({"id": p_info['id'], "display": p_info['display']})
            p_seen.add(p_info['id'])
            
        m_guid = msg['message_guid']
        event = {
            "id": m_guid,
            "type": "message",
            "timestamp": convert_timestamp(msg['date']),
            "participant": p_info['id'],
            "body": msg.get('body_content') or msg.get('text') or ""
        }
        
        if m_guid in tags:
            event['metadata'] = {"tags": tags[m_guid]}
            
        if msg.get('associated_message_guid'):
            event['type'] = "reaction"
            event['parent'] = msg['associated_message_guid']
            event['body'] = get_reaction_label(msg.get('associated_message_type', 0))
            if msg.get('associated_message_emoji'):
                event['body'] += f" ({msg['associated_message_emoji']})"
        elif msg['attachment_guid'] and msg['filename']:
            src = Path(msg['filename'])
            if src.exists():
                shutil.copy2(src, attach_dir / src.name)
                event['attachments'] = [{"id": msg['attachment_guid'], "display": src.name}]
        
        manifest['conversations'][0]['events'].append(event)

    with open(temp_dir / "rsmf_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
        
    target_zip = EXPORT_DIR / file_name
    with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(temp_dir / "rsmf_manifest.json", "rsmf_manifest.json")
        for f in attach_dir.glob("*"): z.write(f, f"attachments/{f.name}")
            
    shutil.rmtree(temp_dir)
    return target_zip

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=str, default=str(CHAT_MASTER_DB))
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--tags-file", type=str, help="JSON file mapping GUID to tags")
    args = parser.parse_args()

    ensure_dirs()
    p_map = load_participants()
    
    tags = {}
    if args.tags_file and Path(args.tags_file).exists():
        with open(args.tags_file, "r") as f: tags = json.load(f)

    db_path = Path(args.db)
    if not db_path.exists(): return
    
    conn = get_db(args.db)
    handles = {str(r['ROWID']): r['id'] for r in conn.execute("SELECT ROWID, id FROM handle").fetchall()}
    
    query = f"""
    SELECT m.guid AS message_guid, m.text AS body_content,
           m.handle_id, m.date, m.associated_message_guid, m.associated_message_type,
           m.associated_message_emoji, c.guid AS chat_guid, c.ROWID AS chat_row_id,
           a.filename, a.guid AS attachment_guid
    FROM message m
    JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    JOIN chat c ON cmj.chat_id = c.ROWID
    LEFT JOIN message_attachment_join maj ON m.ROWID = maj.message_id
    LEFT JOIN attachment a ON maj.attachment_id = a.ROWID
    ORDER BY c.ROWID, m.date
    {"LIMIT " + str(args.limit) if args.limit else ""}
    """
    
    chats = {}
    for r in conn.execute(query).fetchall():
        c_id = r['chat_row_id']
        if c_id not in chats: chats[c_id] = []
        chats[c_id].append(dict(r))
    
    log(f"Processing {len(chats)} chats from {db_path.name}...")
    for c_id, msgs in chats.items():
        process_chat(c_id, msgs, p_map, handles, tags=tags)
    conn.close()

if __name__ == "__main__":
    main()
