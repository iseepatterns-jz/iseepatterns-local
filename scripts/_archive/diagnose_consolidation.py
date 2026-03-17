import sqlite3
import os

CONSOLIDATED_DB = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/consolidated_investigation_m1_imac.db"
IMAC_DB = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/2025-06-01_targeted_investigation_pruned.db"

def diagnose():
    if not os.path.exists(CONSOLIDATED_DB):
        print("CONSOLIDATED_DB does not exist.")
        return

    conn = sqlite3.connect(CONSOLIDATED_DB)
    cursor = conn.cursor()
    
    print("Databases attached:")
    cursor.execute("PRAGMA database_list")
    for row in cursor.fetchall():
        print(row)
        
    cursor.execute(f"ATTACH DATABASE '{IMAC_DB}' AS imac")
    
    print("\nTables in [main]:")
    cursor.execute("SELECT name FROM main.sqlite_master WHERE type='table'")
    for row in cursor.fetchall():
        print(f"  {row[0]}")
        
    print("\nTables in [imac]:")
    cursor.execute("SELECT name FROM imac.sqlite_master WHERE type='table'")
    for row in cursor.fetchall():
        print(f"  {row[0]}")

    conn.close()

if __name__ == "__main__":
    diagnose()
