import sqlite3
import os

# CONFIGURATION
ALL_DB_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/accounting_all.db'
ASHLEY_DB_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/accounting_ashley_myles.db'

def setup_ashley_db():
    if os.path.exists(ASHLEY_DB_PATH):
        os.remove(ASHLEY_DB_PATH)
    
    conn_ashley = sqlite3.connect(ASHLEY_DB_PATH)
    cursor_ashley = conn_ashley.cursor()
    
    # Mirror the schema of the source table
    cursor_ashley.execute('''
        CREATE TABLE emails (
            id INTEGER PRIMARY KEY,
            message_id TEXT,
            date TEXT,
            from_addr TEXT,
            to_addr TEXT,
            cc_addr TEXT,
            subject TEXT,
            body TEXT,
            body_single TEXT,
            thread_id TEXT
        )
    ''')
    conn_ashley.commit()
    return conn_ashley

def main():
    if not os.path.exists(ALL_DB_PATH):
        print(f"Error: {ALL_DB_PATH} not found.")
        return
        
    conn_all = sqlite3.connect(ALL_DB_PATH)
    cursor_all = conn_all.cursor()
    
    conn_ashley = setup_ashley_db()
    cursor_ashley = conn_ashley.cursor()
    
    print("Filtering for Ashley Myles persona...")
    
    # 1. Identify all thread_ids that contain "Ashley Myles" in the body (signature) or from_addr
    # We also check the body specifically for the signature format identified earlier
    cursor_all.execute('''
        SELECT DISTINCT thread_id FROM emails 
        WHERE (body LIKE '%Ashley Myles%' OR from_addr LIKE '%Ashley Myles%')
        AND thread_id IS NOT NULL AND thread_id != ''
    ''')
    
    ashley_thread_ids = [row[0] for row in cursor_all.fetchall()]
    
    print(f"Found {len(ashley_thread_ids)} threads involving Ashley Myles.")
    
    total_exported = 0
    for tid in ashley_thread_ids:
        # 2. Extract ALL emails belonging to these threads
        cursor_all.execute('SELECT * FROM emails WHERE thread_id = ?', (tid,))
        rows = cursor_all.fetchall()
        
        for row in rows:
            cursor_ashley.execute('''
                INSERT INTO emails (id, message_id, date, from_addr, to_addr, cc_addr, subject, body, body_single, thread_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', row)
            total_exported += 1
            
    conn_ashley.commit()
    
    # 3. Also include individual emails that might not have a thread_id but match the criteria
    print("Checking for individual emails without thread_id...")
    cursor_all.execute('''
        SELECT * FROM emails 
        WHERE (body LIKE '%Ashley Myles%' OR from_addr LIKE '%Ashley Myles%')
        AND (thread_id IS NULL OR thread_id = '')
    ''')
    rows = cursor_all.fetchall()
    for row in rows:
        # Check if already inserted by id (though unlikely if thread_id is null)
        cursor_ashley.execute('SELECT 1 FROM emails WHERE id = ?', (row[0],))
        if not cursor_ashley.fetchone():
            cursor_ashley.execute('''
                INSERT INTO emails (id, message_id, date, from_addr, to_addr, cc_addr, subject, body, body_single, thread_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', row)
            total_exported += 1
            
    conn_ashley.commit()
    conn_all.close()
    conn_ashley.close()
    
    print(f"Done. Exported {total_exported} emails to {ASHLEY_DB_PATH}")

if __name__ == "__main__":
    main()
