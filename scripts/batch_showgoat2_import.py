#!/usr/bin/env python3
"""
SHOWGOAT2 RSMF Import — Multi-Player Batch Processor
Imports JZ's conversations with 6 third parties into workbench SQLite DB.
Creates per-player unified text extractions.
"""

import os
import re
import sqlite3
import sys
from pathlib import Path
from datetime import datetime

BASE_DIR = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/exports/SHOWGOAT2_RSMF_LOCKER")
DB_PATH = "/tmp/lawmodel1-app/data/IMESSAGE_LOCKER/Messages/chat_case_only.db"
OUTPUT_DIR = BASE_DIR / "_UNIFIED_EXTRACTS"

# Known sender patterns — match any case
SENDER_PATTERN = re.compile(r'^(.+?)(?:\s*\(\d+\))?\s*$')

def parse_mime_text(filepath):
    """Extract text/plain body from RSMF MIME multipart file."""
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # Find boundary
    boundary_match = re.search(r'boundary="([^"]+)"', content)
    if not boundary_match:
        return None, None
    
    boundary = boundary_match.group(1)
    
    # Extract event count from header
    ec_match = re.search(r'X-RSMF-EventCount:\s*(\d+)', content)
    event_count = int(ec_match.group(1)) if ec_match else 0
    
    # Split by boundary and find text/plain section
    parts = content.split(f'--{boundary}')
    
    for part in parts:
        if 'Content-Type: text/plain' in part:
            # Find body (after headers + blank line)
            header_end = part.find('\n\n')
            if header_end == -1:
                header_end = part.find('\r\n\r\n')
            if header_end != -1:
                body = part[header_end:].strip()
                return body, event_count
    
    return None, event_count

def parse_messages(text_body):
    """Parse message blocks from text/plain body.
    Format: Sender\nISO_timestamp\nBody (repeating)
    Senders showgoat (with optional suffix), other party names.
    """
    lines = text_body.split('\n')
    messages = []
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        
        # Check if this line is a sender name
        # Sender lines are names followed by a timestamp on the next non-empty line
        if i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            # Check if next line looks like ISO timestamp
            if re.match(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', next_line):
                sender = SENDER_PATTERN.match(line)
                if sender:
                    sender_name = sender.group(1)
                else:
                    sender_name = line
                
                timestamp = next_line
                i += 2
                
                # Collect body lines until next sender+timestamp pattern or end
                body_lines = []
                while i < len(lines):
                    if i + 1 < len(lines):
                        next_line_check = lines[i + 1].strip() if i + 1 < len(lines) else ""
                        if re.match(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', next_line_check):
                            # Check if current line looks like a sender name
                            curr = lines[i].strip()
                            if curr and i + 1 < len(lines):
                                break
                    body_lines.append(lines[i])
                    i += 1
                
                body = '\n'.join(body_lines).strip()
                if body:
                    messages.append({
                        'sender': sender_name,
                        'timestamp_utc': timestamp,
                        'body': body
                    })
                continue
        i += 1
    
    return messages

def get_conversation_name(relpath):
    """Extract conversation name from directory path and filename."""
    # relpath format: PLAYER/SUBJECT_DIR/filename.rsmf or PLAYER/filename.rsmf
    filename = os.path.basename(relpath)
    # "Messages - Ryan Hayes - 2024-03-01.rsmf" -> "Ryan Hayes"
    # "Messages - Lucas Guariglia & Leonard Mayerski - 2020-04-07.rsmf" -> "Lucas Guariglia & Leonard Mayerski"
    match = re.match(r'Messages - (.+?) - \d{4}-\d{2}-\d{2}\.rsmf', filename)
    if match:
        return match.group(1)
    return filename.replace('.rsmf', '')

def main():
    print(f"SHOWGOAT2 Import — {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Find all RSMF files
    rsmf_files = sorted(BASE_DIR.rglob('*.rsmf'))
    # Filter out .DS_Store, etc.
    rsmf_files = [f for f in rsmf_files if f.suffix == '.rsmf']
    
    print(f"\nFound {len(rsmf_files)} RSMF files")
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Connect to DB
    db_path = Path(DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Create table (without dropping existing messages table — use conversation_id to separate)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages_showgoat2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            timestamp_utc TEXT,
            body TEXT,
            source_file TEXT,
            conversation TEXT,
            line_number INTEGER,
            UNIQUE(source_file, line_number)
        )
    """)
    cursor.execute("DELETE FROM messages_showgoat2")
    conn.commit()
    
    # Per-conversation tracking
    conversation_data = {}  # conv_name -> {'messages': [], 'files': count, 'date_range': (min, max)}
    total_messages = 0
    total_db = 0
    errors = 0
    
    for idx, filepath in enumerate(rsmf_files, 1):
        relpath = str(filepath.relative_to(BASE_DIR))
        conv_name = get_conversation_name(relpath)
        
        # Parse
        body, event_count = parse_mime_text(filepath)
        if body is None:
            errors += 1
            continue
        
        messages = parse_messages(body)
        
        if conv_name not in conversation_data:
            conversation_data[conv_name] = {
                'messages': [],
                'files': 0,
                'date_min': None,
                'date_max': None
            }
        
        cd = conversation_data[conv_name]
        cd['files'] += 1
        
        # Insert into DB
        for line_num, msg in enumerate(messages, 1):
            cursor.execute("""
                INSERT OR IGNORE INTO messages_showgoat2 
                (sender, timestamp_utc, body, source_file, conversation, line_number)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (msg['sender'], msg['timestamp_utc'], msg['body'], 
                  relpath, conv_name, line_num))
            total_db += 1
            
            # Track date range
            ts = msg['timestamp_utc'][:10]
            if cd['date_min'] is None or ts < cd['date_min']:
                cd['date_min'] = ts
            if cd['date_max'] is None or ts > cd['date_max']:
                cd['date_max'] = ts
        
        total_messages += len(messages)
        
        # Progress
        if idx % 10 == 0 or idx == len(rsmf_files):
            print(f"  [{idx}/{len(rsmf_files)}] {relpath[-60:]} — {len(messages)} msgs (total: {total_messages})")
    
    conn.commit()
    
    # Generate per-conversation unified extractions
    print("\n============================================================")
    print("GENERATING PER-CONVERSATION EXTRACTIONS")
    print("============================================================")
    
    for conv_name, cd in sorted(conversation_data.items()):
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', conv_name)
        txt_path = OUTPUT_DIR / f"{safe_name}_unified_export.txt"
        
        cursor.execute("""
            SELECT sender, timestamp_utc, body
            FROM messages_showgoat2
            WHERE conversation = ?
            ORDER BY timestamp_utc, id
        """, (conv_name,))
        
        rows = cursor.fetchall()
        
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(f"# Rowboat Creative — Joseph Zangrilli ⇄ {conv_name} iMessage Export\n")
            f.write(f"# Source: iMazing RSMF exports (SHOWGOAT2 device)\n")
            f.write(f"# Files processed: {cd['files']}\n")
            f.write(f"# Messages: {len(rows)}\n")
            f.write(f"# Date range: {cd['date_min']} → {cd['date_max']}\n")
            f.write(f"# Generated: {datetime.now().isoformat()}\n")
            f.write("\n")
            
            current_date = None
            for sender, ts, body in rows:
                date = ts[:10]
                if date != current_date:
                    current_date = date
                    f.write(f"\n# {date}\n")
                    f.write("=" * 60 + "\n")
                f.write(f"[{sender}] {ts}\n{body}\n\n")
        
        print(f"  {conv_name}: {len(rows)} msgs, {cd['date_min']} → {cd['date_max']}")
    
    conn.close()
    
    print("\n============================================================")
    print("IMPORT COMPLETE")
    print("============================================================")
    print(f"  Files processed: {len(rsmf_files)}")
    print(f"  Total messages:  {total_messages}")
    print(f"  DB rows:         {total_db}")
    print(f"  Errors:          {errors}")
    print(f"  Conversations:   {len(conversation_data)}")
    print(f"  Output dir:      {OUTPUT_DIR}")
    print(f"  DB table:        messages_showgoat2")

if __name__ == '__main__':
    main()
