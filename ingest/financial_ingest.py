import os
import sqlite3
import pandas as pd
import json
import uuid
from pathlib import Path

DATA_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data")
FINANCIAL_DIR = DATA_DIR / "FINANCIAL_LOCKER" / "ROWBOAT_CREATIVE_ROSETTASTONE"
SCHEMAS_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/schemas")

# Unified Workbench DB
WORKBENCH_DB = DATA_ROOT = DATA_DIR / "rowboat-creative" / "RC-2026" / "db" / "workbench.db"

def clean_column_name(name):
    return name.strip().lower().replace(" ", "_").replace("#", "num").replace("-", "_").replace(".", "_").replace("/", "_").replace("__", "_")

def init_workbench_schemas():
    print(f"🛠️  Initializing Workbench schemas...")
    conn = sqlite3.connect(WORKBENCH_DB)
    for schema_file in ["financials.sql", "tax_returns.sql"]:
        p = SCHEMAS_DIR / schema_file
        if p.exists():
            print(f"   Executing {schema_file}...")
            conn.executescript(p.read_text())
    conn.commit()
    conn.close()

def parse_amount(val):
    if pd.isna(val):
        return 0.0
    try:
        s = str(val).replace('$', '').replace(',', '').strip()
        if not s or s == '-':
            return 0.0
        return float(s)
    except:
        return 0.0

def ingest_master_to_workbench(csv_path):
    print(f"📥 Loading RBC Master into Workbench...")
    try:
        df = pd.read_csv(csv_path, on_bad_lines='skip', low_memory=False)
        df.columns = [clean_column_name(c) for c in df.columns]
        
        conn = sqlite3.connect(WORKBENCH_DB)
        
        txns = []
        for _, row in df.iterrows():
            date = str(row.get('date', ''))
            if not date or date == 'nan': continue
            
            amount = parse_amount(row.get('amount'))
            
            txns.append((
                str(uuid.uuid4()),
                str(row.get('account', 'RBC_DEFAULT')),
                date,
                amount,
                str(row.get('description', '')),
                str(row.get('client', row.get('company', ''))),
                'RBC',
                row.to_json()
            ))
        
        conn.executemany("""
            INSERT INTO transactions (transaction_id, account_id, date, amount, description, counterparty, source, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, txns)
        
        conn.commit()
        conn.close()
        print(f"   ✅ Loaded {len(txns)} RBC transactions.")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def ingest_printavo_to_workbench(csv_path):
    print(f"📥 Loading Printavo Orders into Workbench...")
    try:
        df = pd.read_csv(csv_path, on_bad_lines='skip', low_memory=False)
        df.columns = [clean_column_name(c) for c in df.columns]
        
        conn = sqlite3.connect(WORKBENCH_DB)
        
        txns = []
        for _, row in df.iterrows():
            inv = str(row.get('invoice_num', ''))
            date = str(row.get('invoice_date', row.get('created_date', '')))
            if not date or date == 'nan': continue
            
            amount = parse_amount(row.get('total'))
            
            txns.append((
                f"PRINTAVO_{inv}_{str(uuid.uuid4())[:8]}",
                'PRINTAVO_SALES',
                date,
                amount,
                str(row.get('nickname', '')),
                str(row.get('customer_full_name', '')),
                'PRINTAVO',
                row.to_json()
            ))
        
        conn.executemany("""
            INSERT INTO transactions (transaction_id, account_id, date, amount, description, counterparty, source, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, txns)
        
        conn.commit()
        conn.close()
        print(f"   ✅ Loaded {len(txns)} Printavo orders.")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def run_ingestion():
    if not WORKBENCH_DB.parent.exists():
        WORKBENCH_DB.parent.mkdir(parents=True, exist_ok=True)
    
    init_workbench_schemas()

    # 1. RBC Master Transactions
    master_csv = FINANCIAL_DIR / "rbc-rosettastone-statement-transactions-master-sheet-full.csv"
    if master_csv.exists():
        ingest_master_to_workbench(master_csv)
    
    # 2. Printavo Orders
    printavo_csv = FINANCIAL_DIR / "rbc-crm-printavo-exportsOrdersJob_export20240220.csv"
    if printavo_csv.exists():
        ingest_printavo_to_workbench(printavo_csv)

if __name__ == "__main__":
    run_ingestion()
