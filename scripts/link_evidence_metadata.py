#!/usr/bin/env python3
import os
import json
import sqlite3
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# Paths
BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data")
EC_DIR = BASE_DIR / "evidence_cards"
DB_PATH = BASE_DIR / "financial" / "financial_hub.db"

# Regex patterns for IDs
RE_INVOICE = re.compile(r"(?:Invoice|Inv|Order|Job)\s*#?\s*(\d{5,7})", re.I)
RE_PO = re.compile(r"P\s*(\d{4,5})", re.I)

def get_db_maps():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Map Invoice Number -> Master Row ID
    cursor.execute("SELECT order_id, master_row_id FROM financial_master WHERE order_id IS NOT NULL")
    master_map = {row[0]: row[1] for row in cursor.fetchall() if row[0]}
    
    conn.close()
    return master_map

def process_card(args):
    file_path, master_map = args
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        updated = False
        text_to_scan = f"{data.get('title', '')} {data.get('summary', '')} {data.get('body_snippet', '')}"
        
        # 1. Invoice Number Extraction
        inv_match = RE_INVOICE.search(text_to_scan)
        if inv_match:
            inv_num = inv_match.group(1)
            if 'primary_ids' not in data: data['primary_ids'] = {}
            if data['primary_ids'].get('invoice_number') != inv_num:
                data['primary_ids']['invoice_number'] = inv_num
                updated = True
            
            # 2. Master Row Linkage
            if inv_num in master_map:
                m_id = master_map[inv_num]
                if data['primary_ids'].get('master_row_id') != m_id:
                    data['primary_ids']['master_row_id'] = m_id
                    updated = True

        # 3. PO Number Extraction
        po_match = RE_PO.search(text_to_scan)
        if po_match:
            po_num = po_match.group(1)
            if 'primary_ids' not in data: data['primary_ids'] = {}
            if data['primary_ids'].get('po_number') != f"P{po_num}":
                data['primary_ids']['po_number'] = f"P{po_num}"
                updated = True

        if updated:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f)
            return 1
        return 0
    except Exception as e:
        return 0

def main():
    print("[*] Loading DB maps...")
    master_map = get_db_maps()
    
    print("[*] Gathering files...")
    files = [EC_DIR / f for f in os.listdir(EC_DIR) if f.endswith(".json")]
    total = len(files)
    print(f"[*] Processing {total} EvidenceCards...")
    
    processed = 0
    updated_count = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = executor.map(process_card, [(f, master_map) for f in files])
        for res in results:
            updated_count += res
            processed += 1
            if processed % 5000 == 0:
                print(f"    Processed {processed}/{total} cards... (Updated: {updated_count})")

    print(f"[*] Finish. Total Updated: {updated_count}")

if __name__ == "__main__":
    main()
