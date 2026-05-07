import pandas as pd
import sqlite3
import os
from datetime import datetime

XLSX_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/CALENDARS/2023-12-17_lucas@rowboatcreative_calendar.xlsx"
DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/calendar_events.db"

def ingest_calendar():
    if not os.path.exists(XLSX_PATH):
        print(f"Error: {XLSX_PATH} not found.")
        return

    print(f"Reading {XLSX_PATH}...")
    df = pd.read_excel(XLSX_PATH)
    
    # Map columns to expected schema
    # Expected: summary, start_dt
    if 'Summary' in df.columns:
        df = df.rename(columns={'Summary': 'summary'})
    if 'Start' in df.columns:
        # Convert ms epoch to ISO string
        df['start_dt'] = pd.to_datetime(df['Start'], unit='ms').dt.strftime('%Y-%m-%dT%H:%M:%S')
    
    # Select only needed columns
    df = df[['summary', 'start_dt']]
    
    print(f"Ingesting {len(df)} events into {DB_PATH}...")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS calendar_events")
    cursor.execute("""
        CREATE TABLE calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            summary TEXT,
            start_dt TEXT
        )
    """)
    
    df.to_sql('calendar_events', conn, if_exists='append', index=False)
    
    cursor.execute("CREATE INDEX idx_cal_date ON calendar_events(start_dt)")
    
    conn.commit()
    conn.close()
    print("Ingestion complete.")

if __name__ == "__main__":
    ingest_calendar()
