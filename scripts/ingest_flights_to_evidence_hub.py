#!/usr/bin/env python3
import sqlite3
import csv
import json
import re
from pathlib import Path
from datetime import datetime

# Paths
BASE_DIR = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data")
CSV_PATH = BASE_DIR / "FLIGHTS_LOCKER/LG flights - zDataStorage - Flights 0404.csv"
HUB_DB = BASE_DIR / "evidence_hub.db"

def normalize_identifier(identifier):
    if not identifier: return "unknown"
    clean = identifier.lower().strip()
    return clean

def get_or_create_participant(cursor, identifier):
    norm = normalize_identifier(identifier)
    cursor.execute("SELECT id FROM participants WHERE normalized_identifier = ?", (norm,))
    row = cursor.fetchone()
    if row: return row[0]
    cursor.execute("INSERT INTO participants (identifier, normalized_identifier) VALUES (?, ?)", (identifier, norm))
    return cursor.lastrowid

def parse_date(date_str):
    # Formats: "Fri Jul 01 2022 00:00:00 GMT+0000 (Coordinated Universal Time)" or "07/01/2022"
    if not date_str: return None
    try:
        # Try GMT format
        if "GMT" in date_str:
            clean_date = re.sub(r' GMT.*', '', date_str)
            dt = datetime.strptime(clean_date, '%a %b %d %Y %H:%M:%S')
            return dt.isoformat()
        # Try MM/DD/YYYY
        dt = datetime.strptime(date_str, '%m/%d/%Y')
        return dt.isoformat()
    except:
        return date_str

def ingest():
    conn_hub = sqlite3.connect(HUB_DB)
    cursor_hub = conn_hub.cursor()
    
    print(f"[*] Parsing {CSV_PATH}...")
    count = 0
    with open(CSV_PATH, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        
        for i, row in enumerate(reader):
            notes = row.get('Notes', '') or ''
            desc = row.get('Description', '') or ''
            amt = row.get('Amount', '') or ''
            user = row.get('User', '') or row.get('Responsible', '') or 'unknown'
            date_raw = row.get('Pdate', '') or row.get('Pdate 2', '') or ''
            passengers_str = row.get('Passengers', '') or ''
            conf = row.get('Confirmation #', '') or ''
            objective = row.get('Objective', '') or ''
            
            if not desc and not notes: continue

            # Determine Travelers
            travelers = set()
            # Common names in this dataset
            if row.get('Lg', '') == '1' or 'Lucas' in passengers_str or 'LG' in passengers_str:
                travelers.add("Lucas Guariglia")
            if row.get('Sg', '') == '1' or 'Suzanne' in passengers_str or 'SG' in passengers_str:
                travelers.add("Suzanne Ronayne/Guariglia")
            
            # Explicit passenger names if any
            if passengers_str and passengers_str not in ['1', '2']:
                for p in passengers_str.split(','):
                    travelers.add(p.strip())

            # Specific known family
            if "sister" in notes.lower() or "Adrienne" in notes:
                travelers.add("Adrienne Guariglia (LG Sister)")

            # Tags
            tags = ["travel", "financial"]
            if "not approved" in notes.lower() or "unauthorized" in notes.lower() or "personal" in notes.lower():
                tags.append("misappropriation")
                tags.append("disputed")
            
            if objective:
                tags.append(f"objective:{objective.lower()}")

            # Title & Summary
            title = f"Travel: {desc}"
            if travelers:
                title = f"Travel ({', '.join(travelers)})"
            
            summary = f"{desc}. {amt}. {notes}"
            if objective: summary = f"[{objective}] " + summary

            iso_ts = parse_date(date_raw)
            can_id = f"flight_v2:{date_raw}:{amt}:{desc}:{i}"

            try:
                cursor_hub.execute("""
                INSERT OR REPLACE INTO evidence (canonical_id, source_type, title, summary, body_snippet, start_timestamp, tags, primary_ids)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (can_id, 'financial', title, summary, notes, iso_ts, json.dumps(tags), json.dumps({"confirmation": conf})))
                
                ev_id = cursor_hub.lastrowid
                if not ev_id:
                    cursor_hub.execute("SELECT id FROM evidence WHERE canonical_id = ?", (can_id,))
                    ev_id = cursor_hub.fetchone()[0]
                
                # Participants
                # 1. User
                p_id = get_or_create_participant(cursor_hub, user)
                cursor_hub.execute("INSERT OR IGNORE INTO evidence_participants (evidence_id, participant_id, role) VALUES (?, ?, ?)", (ev_id, p_id, 'purchaser'))
                
                # 2. Travelers
                for t in travelers:
                    t_id = get_or_create_participant(cursor_hub, t)
                    cursor_hub.execute("INSERT OR IGNORE INTO evidence_participants (evidence_id, participant_id, role) VALUES (?, ?, ?)", (ev_id, t_id, 'traveler'))
                
                # Origins
                cursor_hub.execute("INSERT OR IGNORE INTO evidence_origins (evidence_id, origin_system, source_file) VALUES (?, ?, ?)", (ev_id, 'FLIGHT_MASTER_CSV', str(CSV_PATH)))
                
                count += 1
            except Exception as e:
                print(f"Error row {i}: {e}")

    conn_hub.commit()
    conn_hub.close()
    print(f"[*] Ingested {count} high-fidelity travel records.")

if __name__ == "__main__":
    ingest()
