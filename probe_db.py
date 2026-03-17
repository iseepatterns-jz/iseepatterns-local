import sqlite3
import os

DB_PATH = "data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/gmail_master_index.db"

def probe():
    if not os.path.exists(DB_PATH):
        print(f"DB not found: {DB_PATH}")
        return
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, message_id, subject FROM emails LIMIT 5")
    for row in cur.fetchall():
        print(f"ID: {row[0]} | MSG_ID: {row[1]} | SUBJ: {row[2]}")
    conn.close()

if __name__ == "__main__":
    probe()
