import sqlite3
from pathlib import Path
import time

M1_STUDIO_DB = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_decoded_body_all_chat_from_m1studio.db"
IMAC_DB = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/2025-06-01_original_file_from_imac/chat.db"
OUT_DB = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/chat_master_consolidated.db"

def setup_target_db(src_db, target_db):
    print(f"🛠️ Setting up consolidated DB at {target_db}...")
    if Path(target_db).exists():
        Path(target_db).unlink()
    
    # We use M1 Studio as the schema template because it has decodedBody
    src = sqlite3.connect(src_db)
    dst = sqlite3.connect(target_db)
    
    # Copy schema (tables only, indexes will be re-created)
    tables = src.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()
    for name, sql in tables:
        dst.execute(sql)
    
    # Add unique constraint on message.guid if not already there
    # (Usually GUIDs are unique in iMessage, but we want to enforce it for MERGE)
    # We'll just rely on python logic to avoid duplicate GUIDs during insert.
    
    dst.commit()
    src.close()
    dst.close()

def consolidate():
    setup_target_db(M1_STUDIO_DB, OUT_DB)
    
    dst_conn = sqlite3.connect(OUT_DB)
    dst_conn.execute("PRAGMA journal_mode = WAL")
    dst_conn.execute("PRAGMA synchronous = OFF")
    
    # Track inserted GUIDs
    inserted_guids = set()
    
    sources = [
        {"name": "iMac", "path": IMAC_DB, "body_col": "text"},
        {"name": "M1 Studio", "path": M1_STUDIO_DB, "body_col": "COALESCE(decodedBody, text)"}
    ]
    
    for src_info in sources:
        print(f"📦 Processing {src_info['name']}...")
        src_conn = sqlite3.connect(src_info['path'])
        src_conn.row_factory = sqlite3.Row
        
        # Get counts
        total = src_conn.execute("SELECT COUNT(*) FROM message").fetchone()[0]
        print(f"   Total messages found: {total:,}")
        
        # We need to preserve handle, chat, and join tables too for the full experience
        # But primarily we want the message table deduplicated.
        # To avoid complex ID remapping for now, we will:
        # 1. Insert messages uniquely by GUID.
        # 2. Update existing messages if M1 Studio (modern) has more data? 
        # Actually, let's keep it simple: First one wins by GUID.
        
        # Let's copy reference tables if they are empty
        ref_tables = ["handle", "chat", "chat_handle_join", "chat_message_join", "attachment", "message_attachment_join"]
        for table in ref_tables:
            # Check destination columns
            dst_cols_info = dst_conn.execute(f"PRAGMA table_info({table})").fetchall()
            dst_cols_names = [c[1] for c in dst_cols_info]
            
            # Check source columns
            src_cols_info = src_conn.execute(f"PRAGMA table_info({table})").fetchall()
            src_cols_names = [c[1] for c in src_cols_info]
            
            common_cols = [c for c in src_cols_names if c in dst_cols_names]
            placeholders = ",".join(["?" for _ in common_cols])
            
            print(f"   ➕ Merging {table} from {src_info['name']} ({len(common_cols)} common columns)...")
            rows = src_conn.execute(f"SELECT {','.join(common_cols)} FROM {table}").fetchall()
            if rows:
                dst_conn.executemany(f"INSERT OR IGNORE INTO {table} ({','.join(common_cols)}) VALUES ({placeholders})", rows)
        
        # Now process messages
        cursor = src_conn.execute(f"SELECT *, {src_info['body_col']} as body_content FROM message")
        batch = []
        new_count = 0
        dup_count = 0
        
        # Get column names for message table
        msg_cols_info = src_conn.execute("PRAGMA table_info(message)").fetchall()
        msg_cols = [c[1] for c in msg_cols_info]
        # Ensure we don't try to insert into columns that don't exist in destination
        dst_cols_info = dst_conn.execute("PRAGMA table_info(message)").fetchall()
        dst_cols = {c[1] for c in dst_cols_info}
        
        # EXCLUDE ROWID from final_cols to avoid conflicts!
        final_cols = [c for c in msg_cols if c in dst_cols and c.lower() != 'rowid']
        placeholders = ",".join(["?" for _ in final_cols])
        
        for row in cursor:
            guid = row['guid']
            if guid in inserted_guids:
                dup_count += 1
                continue
            
            inserted_guids.add(guid)
            new_count += 1
            # Build values list
            vals = [row[c] for c in final_cols]
            batch.append(vals)
            
            if len(batch) >= 10000:
                dst_conn.executemany(f"INSERT INTO message ({','.join(final_cols)}) VALUES ({placeholders})", batch)
                batch = []
                dst_conn.commit()
                
        if batch:
            dst_conn.executemany(f"INSERT INTO message ({','.join(final_cols)}) VALUES ({placeholders})", batch)
            dst_conn.commit()
            
        print(f"   ✅ Finished {src_info['name']}: {new_count:,} new, {dup_count:,} duplicates skipped.")
        src_conn.close()

    dst_conn.commit()
    
    # Final verification
    final_count = dst_conn.execute("SELECT COUNT(*) FROM message").fetchone()[0]
    print(f"\n✨ Consolidation Complete!")
    print(f"   Final Unique Messages: {final_count:,}")
    dst_conn.close()

if __name__ == "__main__":
    start = time.time()
    consolidate()
    print(f"⏱️ Total time: {time.time() - start:.1f}s")
