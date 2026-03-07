import os
import sqlite3
import pandas as pd
import json
from pathlib import Path

DATA_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data")
FINANCIAL_DIR = DATA_DIR / "financial"
QUICKBOOKS_DIR = FINANCIAL_DIR / "quickbooks"

FINANCIAL_HUB_DB = FINANCIAL_DIR / "financial_hub.db"
QUICKBOOKS_HUB_DB = FINANCIAL_DIR / "quickbooks_hub.db"

def clean_column_name(name):
    return name.strip().lower().replace(" ", "_").replace("#", "num").replace("-", "_").replace(".", "_").replace("/", "_").replace("__", "_")

def ingest_csv_to_sqlite(csv_path, db_path, table_name):
    print(f"📥 Loading {csv_path.name} into {db_path.name} table {table_name}...")
    
    try:
        # Check for metadata rows (QuickBooks report exports often have these)
        skip_rows = 0
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                first_line = f.readline()
                if "Company name" in first_line or "Company ID" in first_line:
                    # It's a report with metadata. Skip until we find the real header.
                    # Usually 10-15 lines. We'll look for the first empty line followed by a header.
                    f.seek(0)
                    for i, line in enumerate(f):
                        if i > 20: break # Safety
                        # Look for common header start or skip until empty line + 1
                        if "Date,Transaction Type" in line or '"",Debit,Credit' in line:
                            skip_rows = i
                            break
        except:
             pass

        # Load CSV. Handle common encoding issues
        try:
            df = pd.read_csv(csv_path, on_bad_lines='skip', skiprows=skip_rows)
        except UnicodeDecodeError:
            df = pd.read_csv(csv_path, encoding='latin1', on_bad_lines='skip', skiprows=skip_rows)
            
        # Clean column names
        df.columns = [clean_column_name(c) for c in df.columns]
        
        # Add raw_json column
        df['raw_json'] = df.apply(lambda x: x.to_json(), axis=1)
        
        # Connect and save
        conn = sqlite3.connect(db_path)
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        conn.close()
        
        print(f"   ✅ Loaded {len(df)} rows.")
        return len(df)
    except Exception as e:
        print(f"   ❌ Error loading {csv_path.name}: {e}")
        return 0

def run_ingestion():
    # 1. Financial Hub
    print("🏦 Building Financial Hub...")
    hub_files = {
        "rbc-crm-printavo-exportsOrdersJob_export20240220.csv": "printavo_orders",
        "rbc-crm-printavo-paymentsExpensesExport-20240220.csv": "printavo_payments",
        "rbc-crm-printavo-purchase-order-data.csv": "printavo_purchase_orders",
        "rbc-statement-transactions-master-sheet-full.csv": "master_transactions"
    }
    
    for filename, table in hub_files.items():
        csv_path = FINANCIAL_DIR / filename
        if csv_path.exists():
            ingest_csv_to_sqlite(csv_path, FINANCIAL_HUB_DB, table)
        else:
            print(f"   ⚠️ Skipping {filename}, file not found.")

    # 2. QuickBooks Hub
    print("\n🧾 Building QuickBooks Hub...")
    if QUICKBOOKS_DIR.exists():
        for csv_path in QUICKBOOKS_DIR.glob("*.csv"):
            table_name = csv_path.stem.lower()
            ingest_csv_to_sqlite(csv_path, QUICKBOOKS_HUB_DB, table_name)
    else:
        print("   ⚠️ QuickBooks directory not found.")

if __name__ == "__main__":
    run_ingestion()
