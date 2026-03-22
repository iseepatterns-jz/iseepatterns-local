#!/usr/bin/env python3
"""
harvest_intelligence_tags.py
───────────────────────────
Consolidates findings from various iMessage analysis scripts into a single 
JSON mapping of {message_guid: ["tag1", "tag2"]}.
Used to enrich RSMF discovery exports with "Intelligence Tags".
"""

import sqlite3
import json
import os
from pathlib import Path

# --- Configuration ---
DATA_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data")
DBS = [
    DATA_DIR / "IMESSAGE_LOCKER" / "Messages" / "chat_case_only.db",
]

# Intelligence Categories / Keywords
INTELLIGENCE_MAP = {
    "Admissions": ["board", "take off", "landing", "touchdown", "flight", "wedding", "funeral", "Newark", "Chicago", "CLT", "ORD"],
    "Financial": ["bank", "wire", "transfer", "accountant", "ledger", "invoice", "payment", "IRS"],
    "Legal": ["lawyer", "attorney", "suit", "court", "deposition", "settlement", "privilege"]
}

def harvest():
    tags = {} # guid -> list of strings
    
    for db in DBS:
        if not db.exists(): continue
        conn = sqlite3.connect(db)
        cursor = conn.cursor()
        
        # Check for message table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='message'")
        if not cursor.fetchone(): 
            conn.close()
            continue
            
        for category, keywords in INTELLIGENCE_MAP.items():
            like_clauses = " OR ".join([f"text LIKE '%{k}%'" for k in keywords])
            query = f"SELECT guid FROM message WHERE {like_clauses}"
            
            try:
                cursor.execute(query)
                for (guid,) in cursor.fetchall():
                    if guid not in tags: tags[guid] = []
                    if category not in tags[guid]: tags[guid].append(category)
            except Exception as e:
                print(f"Error querying {db.name}: {e}")
                
        conn.close()
        
    # Write to temp file
    out_path = DATA_DIR / "intelligence_tags.json"
    with open(out_path, "w") as f:
        json.dump(tags, f, indent=2)
    
    print(f"✅ Harvested intelligence tags for {len(tags)} messages into {out_path}")
    return out_path

if __name__ == "__main__":
    harvest()
