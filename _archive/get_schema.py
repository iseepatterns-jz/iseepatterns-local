import sqlite3
import os

DB_PATH = "data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/gmail_master_index.db"

def list_columns():
    if not os.path.exists(DB_PATH):
        print(f"Error: DB not found at {DB_PATH}")
        return
        
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.execute("PRAGMA table_info(emails)")
        cols = cur.fetchall()
        print("Columns in 'emails' table:")
        for col in cols:
            print(f" - {col[1]} ({col[2]})")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    list_columns()
