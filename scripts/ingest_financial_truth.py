#!/usr/bin/env python3
import os
import csv
import sqlite3
import json
from pathlib import Path

# Configuration
BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data")
FINANCIAL_DIR = BASE_DIR / "FINANCIAL_LOCKER" / "ROWBOAT_CREATIVE_ROSETTASTONE"
DB_PATH = BASE_DIR / "rowboat-creative" / "RC-2026" / "db" / "workbench.db"

# CSV Files
FILES = {
    "printavo_invoices": "rbc-crm-printavo-exportsOrdersJob_export20240220.csv",
    "printavo_pos": "rbc-crm-printavo-purchase-order-data.csv",
    "printavo_txns": "rbc-crm-exportsTransactionsJob_export20240220.csv",
    "printavo_payments": "rbc-crm-printavo-paymentsExpensesExport-20240220.csv",
    "master_statements": "rbc-rosettastone-statement-transactions-master-sheet-full.csv"
}

def setup_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Financial Master (Cleaned)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS financial_master (
        master_row_id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER,
        date TEXT,
        amount REAL,
        description TEXT,
        transaction_type TEXT,
        account TEXT,
        bank TEXT,
        responsible TEXT,
        category TEXT,
        order_id TEXT,
        po_number TEXT,
        raw_json TEXT
    )""")
    
    # Printavo Invoices
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS printavo_invoices (
        invoice_number TEXT PRIMARY KEY,
        created_date TEXT,
        customer_name TEXT,
        customer_id TEXT,
        status TEXT,
        total REAL,
        invoice_url TEXT,
        owner TEXT,
        raw_json TEXT
    )""")
    
    # Printavo POs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS printavo_purchase_orders (
        po_number TEXT PRIMARY KEY,
        invoice_number TEXT,
        vendor_name TEXT,
        cost REAL,
        raw_json TEXT
    )""")
    
    conn.commit()
    return conn

def ingest_master_statements(conn):
    log("Ingesting Master Statements...")
    cursor = conn.cursor()
    file_path = FINANCIAL_DIR / FILES["master_statements"]
    if not file_path.exists(): return
    
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                cursor.execute("""
                INSERT INTO financial_master (year, date, amount, description, transaction_type, account, bank, responsible, category, order_id, po_number, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    row.get('Year'), row.get('Date'), row.get('Amount'), row.get('Description'),
                    row.get('Transaction Type'), row.get('Account'), row.get('Bank'),
                    row.get('Responsible'), row.get('Category'), row.get('Order ID') or row.get('Invoice #'),
                    row.get('PO Number'), json.dumps(row)
                ))
            except Exception as e:
                print(f"Error row: {e}")
    conn.commit()

def ingest_printavo_invoices(conn):
    log("Ingesting Printavo Invoices...")
    cursor = conn.cursor()
    file_path = FINANCIAL_DIR / FILES["printavo_invoices"]
    if not file_path.exists(): return
    
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                cursor.execute("""
                INSERT OR REPLACE INTO printavo_invoices (invoice_number, created_date, customer_name, customer_id, status, total, invoice_url, owner, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    row.get('Invoice #'), row.get('Created Date'), row.get('Customer Full Name'),
                    row.get('Customer Id'), row.get('Invoice Status'), row.get('Total'),
                    row.get('Invoice URL'), row.get('Owner'), json.dumps(row)
                ))
            except Exception as e:
                print(f"Error row: {e}")
    conn.commit()

def log(m): print(f"[*] {m}")

def main():
    log("Starting ingest_financial_truth.py...")
    conn = setup_db()
    ingest_master_statements(conn)
    ingest_printavo_invoices(conn)
    log("Ingestion complete.")
    conn.close()

if __name__ == "__main__":
    main()
