
import sqlite3
import os

SOURCE_DB = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db'
TARGET_DB = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/accountant_correspondence.db'

ACCOUNTANTS = [
    'jdj0818@gmail.com', 'george.g@rudderservices.com',
    'ehershik@supportingstrategies.com', 'stephanie@sparkbusinessconsulting.com',
    'shighland@pkfmueller.com', 'shaun.b@rudderservices.com',
    'eric.l@rudderservices.com', 'RBC@chi.myworkplace.co',
    'Jackie@sparkbusinessconsulting.com', 'Kristin@sparkbusinessconsulting.com',
    'kasey@sparkbusinessconsulting.com'
]

def setup_target_db():
    conn = sqlite3.connect(TARGET_DB)
    cursor = conn.cursor()
    
    # Simple schema for analysis
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS accountant_emails (
        id INTEGER PRIMARY KEY,
        rfc822_id TEXT,
        account TEXT,
        from_addr TEXT,
        to_addr TEXT,
        cc_addr TEXT,
        bcc_addr TEXT,
        subject TEXT,
        date_sent TEXT,
        body_snippet TEXT,
        source_mbox TEXT,
        has_lucas INTEGER DEFAULT 0,
        has_joe INTEGER DEFAULT 0,
        accountant_found TEXT
    )
    """)
    conn.commit()
    conn.close()

def extract_emails():
    source_conn = sqlite3.connect(SOURCE_DB)
    target_conn = sqlite3.connect(TARGET_DB)
    
    source_cursor = source_conn.cursor()
    target_cursor = target_conn.cursor()
    
    print(f"Searching for emails involving {len(ACCOUNTANTS)} accountants...")
    
    # We'll search for each accountant in from, to, cc, bcc
    placeholders = ' OR '.join([
        "from_addr LIKE ?", "to_addr LIKE ?", "cc_addr LIKE ?", "bcc_addr LIKE ?"
    ])
    
    # We'll iterate through accountants to be more precise about which one matched
    total_found = 0
    for acc in ACCOUNTANTS:
        pattern = f"%{acc}%"
        source_cursor.execute(f"""
            SELECT rfc822_id, account, from_addr, to_addr, cc_addr, bcc_addr, subject, date_sent, body, mbox_source
            FROM emails
            WHERE {placeholders}
        """, (pattern, pattern, pattern, pattern))
        
        rows = source_cursor.fetchall()
        print(f"Found {len(rows)} for {acc}")
        
        for row in rows:
            rfc822_id, account, from_addr, to_addr, cc_addr, bcc_addr, subject, date_sent, body, mbox_source = row
            
            # Check for Lucas and Joe
            all_recips = f"{from_addr or ''} {to_addr or ''} {cc_addr or ''} {bcc_addr or ''}".lower()
            has_lucas = 1 if 'lucas@rowboatcreative.com' in all_recips else 0
            has_joe = 1 if 'joe@rowboatcreative.com' in all_recips else 0
            
            body_snippet = body[:500] if body else ""
            
            target_cursor.execute("""
                INSERT OR IGNORE INTO accountant_emails 
                (rfc822_id, account, from_addr, to_addr, cc_addr, bcc_addr, subject, date_sent, body_snippet, source_mbox, has_lucas, has_joe, accountant_found)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (rfc822_id, account, from_addr, to_addr, cc_addr, bcc_addr, subject, date_sent, body_snippet, mbox_source, has_lucas, has_joe, acc))
            total_found += 1
            
    target_conn.commit()
    print(f"Total entries processed: {total_found}")
    
    source_conn.close()
    target_conn.close()

if __name__ == "__main__":
    setup_target_db()
    extract_emails()
