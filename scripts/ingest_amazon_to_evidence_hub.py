#!/usr/bin/env python3
import csv
import sqlite3
import json
import re
from pathlib import Path
from datetime import datetime

# Configuration
BASE_DIR = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data")
ROSETTA_CSV = BASE_DIR / "FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv"
HUB_DB = BASE_DIR / "rowboat-creative" / "RC-2026" / "db" / "workbench.db"

# Indices based on manual inspection
IDX_YEAR = 0
IDX_DATE = 1
IDX_AMOUNT = 2
IDX_DESC = 4
IDX_USER = 9
IDX_ORDER_ID = 24
IDX_TITLE = 31

def normalize_identifier(identifier):
    if not identifier: return "unknown"
    clean = re.sub(r'[^a-zA-Z0-9@.]', '', identifier.lower())
    return clean

def get_or_create_participant(cursor, identifier):
    norm = normalize_identifier(identifier)
    cursor.execute("SELECT id FROM participants WHERE normalized_identifier = ?", (norm,))
    row = cursor.fetchone()
    if row: return row[0]
    
    cursor.execute("INSERT INTO participants (identifier, normalized_identifier) VALUES (?, ?)", (identifier, norm))
    return cursor.lastrowid

def ingest():
    if not ROSETTA_CSV.exists():
        print(f"[!] File not found: {ROSETTA_CSV}")
        return

    conn = sqlite3.connect(HUB_DB)
    cursor = conn.cursor()
    
    print(f"[*] Reading {ROSETTA_CSV} using index-based parsing...")
    
    with open(ROSETTA_CSV, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.reader(f)
        header = next(reader)
        
        count = 0
        for i, row in enumerate(reader):
            if not row: continue
            
            # Safe access to columns
            def get_col(idx, default=''):
                return row[idx] if idx < len(row) else default

            desc = get_col(IDX_DESC)
            # Check if this is an Amazon transaction
            if not any(x in desc.upper() for x in ['AMAZON', 'AMZN']):
                continue
            
            date_str = get_col(IDX_DATE)
            amount = get_col(IDX_AMOUNT)
            order_id = get_col(IDX_ORDER_ID) or "Unknown ID"
            item_titles = get_col(IDX_TITLE) or "Amazon Purchase"
            user = get_col(IDX_USER) or "Unknown"
            
            # Create a unique canonical ID for dedup
            canonical_id = f"amazon:{date_str}:{amount}:{desc}:{order_id}"
            
            # Prepare summary and body
            summary = f"Amazon Order {order_id}: {item_titles[:100]}"
            body = f"Order ID: {order_id}\nItems: {item_titles}\nDescription: {desc}\nUser: {user}\nRow Index: {i+2}"
            
            # Start Timestamp normalization (assuming MM/DD/YYYY)
            try:
                dt = datetime.strptime(date_str, '%m/%d/%Y')
                iso_ts = dt.isoformat()
            except:
                iso_ts = date_str

            # Insert into evidence
            try:
                cursor.execute("""
                INSERT OR IGNORE INTO evidence (
                    canonical_id, source_type, title, summary, body_snippet, start_timestamp, tags, primary_ids
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    canonical_id, 'financial', f"Amazon Purchase ({order_id})", summary, body, iso_ts,
                    json.dumps(["amazon", "financial", "mapping", "rosettastone"]),
                    json.dumps({"order_id": order_id, "bank_desc": desc, "user": user})
                ))
                
                evidence_id = cursor.lastrowid
                if not evidence_id:
                    cursor.execute("SELECT id FROM evidence WHERE canonical_id = ?", (canonical_id,))
                    res = cursor.fetchone()
                    if res:
                        evidence_id = res[0]
                    else:
                        continue
                
                # Ingest provenance
                cursor.execute("""
                INSERT OR IGNORE INTO evidence_origins (evidence_id, origin_system, source_file, source_rowid)
                VALUES (?, ?, ?, ?)
                """, (evidence_id, 'FINANCIAL_LOCKER (Rosetta Stone)', str(ROSETTA_CSV), str(i+2)))
                
                # Link participant
                pid = get_or_create_participant(cursor, user)
                cursor.execute("""
                INSERT OR IGNORE INTO evidence_participants (evidence_id, participant_id, role)
                VALUES (?, ?, ?)
                """, (evidence_id, pid, 'purchaser'))
                
                count += 1
            except Exception as e:
                print(f"Error ingesting row {canonical_id}: {e}")

    conn.commit()
    conn.close()
    print(f"[*] Ingested {count} Amazon records.")

if __name__ == "__main__":
    ingest()
