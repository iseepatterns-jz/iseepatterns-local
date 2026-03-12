import sqlite3
import os
import shutil

M1_DB = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_targeted_investigation_pruned.db"
IMAC_DB = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/2025-06-01_targeted_investigation_pruned.db"
CONSOLIDATED_DB = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/consolidated_investigation_m1_imac.db"

def get_columns(cursor, table_name, db_prefix=None):
    pragma = f"PRAGMA {db_prefix}.table_info({table_name})" if db_prefix else f"PRAGMA table_info({table_name})"
    cursor.execute(pragma)
    cols = {row[1] for row in cursor.fetchall()}
    return cols

def consolidate():
    print(f"Initializing consolidated database from: {M1_DB}")
    if os.path.exists(CONSOLIDATED_DB):
        os.remove(CONSOLIDATED_DB)
    
    # 1. Copy M1 DB as base
    shutil.copy2(M1_DB, CONSOLIDATED_DB)
    print("M1 baseline imported via file copy.")

    conn = sqlite3.connect(CONSOLIDATED_DB)
    cursor = conn.cursor()
    cursor.execute(f"ATTACH DATABASE '{IMAC_DB}' AS imac")

    # Tables to merge
    # Note: attachment is important for re-linking
    tables = ['handle', 'chat', 'message', 'attachment']

    for table in tables:
        print(f"Merging {table}...")
        
        main_cols = get_columns(cursor, table, 'main')
        imac_cols = get_columns(cursor, table, 'imac')
        
        if not main_cols or not imac_cols:
            print(f"  Warning: Skipping {table} - missing in one of the sources.")
            continue
            
        common_cols = list(main_cols.intersection(imac_cols))
        print(f"  Main cols: {len(main_cols)}, IMAC cols: {len(imac_cols)}, Intersection: {len(common_cols)}")
        
        # Exclude ROWID
        common_cols = [c for c in common_cols if c.lower() != 'rowid']
        
        if not common_cols:
            print(f"  Warning: No common columns found for table {table}. Skipping.")
            continue
            
        cols_str = ", ".join(common_cols)
        
        # Perform merge
        sql = f"INSERT OR IGNORE INTO {table} ({cols_str}) SELECT {cols_str} FROM imac.{table}"
        print(f"  Executing merge for {table}...")
        cursor.execute(sql)

    print("Re-linking Join Tables...")
    
    # Re-link chat_message_join using GUIDs
    print("  Mapping chat_message_join...")
    cursor.execute("""
        INSERT OR IGNORE INTO chat_message_join (chat_id, message_id, message_date)
        SELECT 
            (SELECT ROWID FROM chat WHERE guid = c.guid),
            (SELECT ROWID FROM message WHERE guid = m.guid),
            cmj.message_date
        FROM imac.chat_message_join cmj
        JOIN imac.chat c ON cmj.chat_id = c.ROWID
        JOIN imac.message m ON cmj.message_id = m.ROWID
        WHERE (SELECT ROWID FROM chat WHERE guid = c.guid) IS NOT NULL
          AND (SELECT ROWID FROM message WHERE guid = m.guid) IS NOT NULL
    """)

    # Re-link chat_handle_join
    print("  Mapping chat_handle_join...")
    cursor.execute("""
        INSERT OR IGNORE INTO chat_handle_join (chat_id, handle_id)
        SELECT 
            (SELECT ROWID FROM chat WHERE guid = c.guid),
            (SELECT ROWID FROM handle WHERE id = h.id)
        FROM imac.chat_handle_join chj
        JOIN imac.chat c ON chj.chat_id = c.ROWID
        JOIN imac.handle h ON chj.handle_id = h.ROWID
        WHERE (SELECT ROWID FROM chat WHERE guid = c.guid) IS NOT NULL
          AND (SELECT ROWID FROM handle WHERE id = h.id) IS NOT NULL
    """)
    
    # Re-link message_attachment_join
    print("  Mapping message_attachment_join...")
    cursor.execute("""
        INSERT OR IGNORE INTO message_attachment_join (message_id, attachment_id)
        SELECT 
            (SELECT ROWID FROM message WHERE guid = m.guid),
            (SELECT ROWID FROM attachment WHERE guid = a.guid)
        FROM imac.message_attachment_join maj
        JOIN imac.message m ON maj.message_id = m.ROWID
        JOIN imac.attachment a ON maj.attachment_id = a.ROWID
        WHERE (SELECT ROWID FROM message WHERE guid = m.guid) IS NOT NULL
          AND (SELECT ROWID FROM attachment WHERE guid = a.guid) IS NOT NULL
    """)

    print("Finalizing...")
    conn.commit()
    cursor.execute("DETACH DATABASE imac")
    cursor.execute("VACUUM")
    conn.close()
    
    # Final count report
    conn = sqlite3.connect(CONSOLIDATED_DB)
    count = conn.execute("SELECT count(*) FROM message").fetchone()[0]
    print(f"Consolidation complete. Total messages: {count}")
    conn.close()

if __name__ == "__main__":
    consolidate()
