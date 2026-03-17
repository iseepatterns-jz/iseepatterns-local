import sqlite3
import os

db_path = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE import_sessions ADD COLUMN error_message TEXT")
    conn.commit()
    print("Column error_message added successfully")
    conn.close()
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column already exists")
    else:
        print(f"FAILED to add column: {e}")
except Exception as e:
    print(f"UNEXPECTED ERROR: {e}")
