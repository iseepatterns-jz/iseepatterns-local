#!/usr/bin/env python3
import sqlite3
import json
from pathlib import Path

DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_decoded_body_all_chat_from_m1studio.db"

# Target Windows (Flight and Event dates)
WINDOWS = [
    ("2021-06-03", "2021-06-08", "Newark/Funeral"),
    ("2021-08-15", "2021-08-25", "Paige's Wedding"),
    ("2021-12-15", "2021-12-21", "Chicago Trip (Statement Highlighted)"),
    ("2022-03-08", "2022-03-16", "Chicago/SG Solo"),
    ("2022-04-12", "2022-04-18", "SLC Wedding"),
    ("2022-07-19", "2022-07-26", "Annie's Wedding"),
    ("2022-09-01", "2022-09-06", "Patrick's Wedding"),
    ("2023-08-01", "2023-08-10", "2023 Wedding Admission")
]

KEYWORDS = ["wedding", "funeral", "Newark", "Chicago", "ORD", "CLT", "Pittsburgh", "trip", "flying", "flight", "SLC", "Utah", "Wisconsin", "MSN", "Jersey"]

def search():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"| Date | From LG? | Message | Context Window |")
    print(f"| :--- | :--- | :--- | :--- |")
    
    for start, end, context in WINDOWS:
        query = f"""
        SELECT msg_time_local, is_from_me, COALESCE(decodedBody, text) as body
        FROM messages_jz_lg
        WHERE msg_time_local BETWEEN '{start}' AND '{end}'
        ORDER BY msg_time_local
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        
        if rows:
            print(f"\n### {context} ({start} to {end})")
            for dt, is_from_me, body in rows:
                lg_label = "LG" if is_from_me == 0 else "JZ"
                if not body: continue
                clean_body = body.replace("\n", " ").replace("|", "\\|")
                # Highlight keyword matches but show all
                is_match = any(k.lower() in clean_body.lower() for k in KEYWORDS)
                prefix = "**[MATCH]** " if is_match else ""
                print(f"| {dt} | {lg_label} | {prefix}{clean_body} |")

    conn.close()

if __name__ == "__main__":
    search()
