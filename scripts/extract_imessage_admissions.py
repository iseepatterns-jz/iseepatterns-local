#!/usr/bin/env python3
import sqlite3
from datetime import datetime, timedelta

# Apple Epoch: Jan 1, 2001
APPLE_EPOCH = datetime(2001, 1, 1)

DBS = [
    "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/2025-06-01_original_file_from_imac/chat.db",
    "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_decoded_body_all_chat_from_m1studio.db"
]

KEYWORDS = ["about to board", "about to take off", "landing", "landed", "touchdown", "flying", "flight", "wedding", "funeral", "Newark", "Chicago", "CLT", "ORD", "SLC", "Pittsburgh"]

def convert_apple_date(apple_date):
    if not apple_date: return "N/A"
    # Older versions used seconds, newer use nanoseconds (10^9)
    if apple_date > 10**12: # Nanoseconds
        seconds = apple_date / 10**9
    else:
        seconds = apple_date
    return (APPLE_EPOCH + timedelta(seconds=seconds)).strftime('%Y-%m-%d %H:%M:%S')

def search():
    print(f"| Source | Date | Text |")
    print(f"| :--- | :--- | :--- |")
    
    for db_path in DBS:
        db_name = Path(db_path).parent.parent.name if "decoded" in db_path else Path(db_path).parent.name
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        like_clauses = " OR ".join([f"text LIKE '%{k}%'" for k in KEYWORDS])
        query = f"SELECT text, date FROM message WHERE {like_clauses} ORDER BY date DESC"
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Filter for relevant years 2021-2023
        for text, date in rows:
            human_date = convert_apple_date(date)
            if "2021" in human_date or "2022" in human_date or "2023" in human_date:
                clean_text = text.replace("\n", " ").replace("|", "\\|")[:100]
                print(f"| {db_name} | {human_date} | {clean_text} |")
        
        conn.close()

if __name__ == "__main__":
    from pathlib import Path
    search()
