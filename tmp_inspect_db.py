import sqlite3
import os
import json

db_path = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/chat_master.db'
if not os.path.exists(db_path):
    print(json.dumps({"error": f"File not found: {db_path}"}))
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    results = {}
    for table in tables:
        table_name = table[0][0] if isinstance(table[0], tuple) else table[0]
        # table[0] is already the name if fetchall returns tuples
        table_name = table[0]
        
        cursor.execute(f"PRAGMA table_info('{table_name}');")
        columns = cursor.fetchall()
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM '{table_name}';")
        count = cursor.fetchone()[0]
        
        results[table_name] = {
            "columns": [{"name": col[1], "type": col[2]} for col in columns],
            "row_count": count
        }

    print(json.dumps(results, indent=2))
    conn.close()
except Exception as e:
    import traceback
    print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
