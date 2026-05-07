import sqlite3
import json
import os

HUB_DB = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_hub.db"
MAPPING_JSON = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/vault_mapping_full.json"

def update_hub_with_vault():
    if not os.path.exists(MAPPING_JSON):
        print(f"Error: {MAPPING_JSON} not found.")
        return
        
    with open(MAPPING_JSON, 'r') as f:
        mapping = json.load(f)
        
    conn = sqlite3.connect(HUB_DB)
    conn.execute("PRAGMA journal_mode = WAL")
    
    rows = conn.execute("SELECT id, primary_ids FROM evidence WHERE source_type = 'email'").fetchall()
    
    updates = []
    total_links_found = 0
    records_impacted = 0
    
    for row_id, p_ids_json in rows:
        if not p_ids_json:
            continue
        try:
            p_ids = json.loads(p_ids_json)
        except:
            continue
            
        if 'drive_links' not in p_ids:
            continue
            
        changed = False
        for link in p_ids['drive_links']:
            drive_id = link.get('id')
            if drive_id in mapping:
                link['local_vault_filename'] = mapping[drive_id]
                total_links_found += 1
                changed = True
        
        if changed:
            records_impacted += 1
            updates.append((json.dumps(p_ids, ensure_ascii=False), row_id))
            
    print(f"Impacted {records_impacted} records (linked {total_links_found} individual attachments).")
    if updates:
        conn.executemany("UPDATE evidence SET primary_ids = ?, updated_at = datetime('now') WHERE id = ?", updates)
        conn.commit()
    conn.close()
    print("Update complete.")

if __name__ == "__main__":
    update_hub_with_vault()
