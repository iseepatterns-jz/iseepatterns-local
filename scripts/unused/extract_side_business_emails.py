import sqlite3
import mailbox
import os
import re
from datetime import datetime
from email.utils import parsedate_to_datetime

DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/side_business_correspondence.db"
MBOX_SUZANNE = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2023-06-08_GMAIL_MBOX_SG_LOCKER/2023-06-08_GMAIL_MBOX_SG_ZIPPED/sggmail--suzanne@rowboatcreative.com-YtFVqI.mbox"
EXISTING_DB = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/emails_LG_SM_SH_JZ.db"

DOMAINS = ["mosaic.com", "cbrands.com", "legacymarketing.com", "engageresonate.com"]
SPECIFIC_EMAILS = ["suzanne_ronayne@yahoo.com", "suzanne@rowboatcreative.com"]

def setup_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    tables = {
        "mosaic_emails": "mosaic.com",
        "cbrands_emails": "cbrands.com",
        "legacy_emails": "legacymarketing.com",
        "resonate_emails": "engageresonate.com",
        "suzanne_personal_emails": "suzanne_ronayne@yahoo.com",
        "suzanne_unauthorized_rbc_emails": "suzanne@rowboatcreative.com"
    }
    
    for table_name in tables:
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT,
                from_addr TEXT,
                to_addr TEXT,
                cc_addr TEXT,
                subject TEXT,
                body TEXT,
                source TEXT,
                message_id TEXT UNIQUE
            )
        """)
    conn.commit()
    return conn

def get_table_for_email(email):
    if email is None:
        return None
    email_str = str(email).lower()
    if "suzanne_ronayne@yahoo.com" in email_str:
        return "suzanne_personal_emails"
    if "suzanne@rowboatcreative.com" in email_str:
        return "suzanne_unauthorized_rbc_emails"
    for domain in DOMAINS:
        if domain in email_str:
            if domain == "mosaic.com": return "mosaic_emails"
            if domain == "cbrands.com": return "cbrands_emails"
            if domain == "legacymarketing.com": return "legacy_emails"
            if domain == "engageresonate.com": return "resonate_emails"
    return None

def extract_from_mbox(mbox_path, conn):
    print(f"Processing MBOX: {mbox_path}")
    mb = mailbox.mbox(mbox_path)
    cursor = conn.cursor()
    count = 0
    for message in mb:
        msg_from = str(message.get('From', ''))
        msg_to = str(message.get('To', ''))
        msg_cc = str(message.get('Cc', ''))
        msg_date = str(message.get('Date', ''))
        msg_subject = str(message.get('Subject', ''))
        msg_id = str(message.get('Message-ID', ''))
        
        # Determine target table
        targets = set()
        for field in [msg_from, msg_to, msg_cc]:
            if field:
                t = get_table_for_email(field)
                if t: targets.add(t)
        
        if not targets:
            continue
            
        body = ""
        if message.is_multipart():
            for part in message.walk():
                content_type = part.get_content_type()
                if content_type == 'text/plain':
                    try:
                        body += part.get_payload(decode=True).decode('utf-8', errors='replace')
                    except:
                        pass
        else:
            try:
                body = message.get_payload(decode=True).decode('utf-8', errors='replace')
            except:
                pass
        
        for table in targets:
            cursor.execute(f"INSERT OR IGNORE INTO {table} (date, from_addr, to_addr, cc_addr, subject, body, source, message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                           (msg_date, msg_from, msg_to, msg_cc, msg_subject, body, mbox_path, msg_id))
        count += 1
        if count % 100 == 0:
            print(f"Inserted {count} from mbox...")
    conn.commit()
    print(f"Finished MBOX: {count} relevant records found.")

def extract_from_existing_db(db_path, conn):
    print(f"Processing Existing DB: {db_path}")
    source_conn = sqlite3.connect(db_path)
    source_cursor = source_conn.cursor()
    cursor = conn.cursor()
    
    # Map domains to our tables
    mapping = {
        "mosaic.com": "mosaic_emails",
        "cbrands.com": "cbrands_emails",
        "legacymarketing.com": "legacy_emails",
        "engageresonate.com": "resonate_emails",
        "suzanne_ronayne@yahoo.com": "suzanne_personal_emails",
        "suzanne@rowboatcreative.com": "suzanne_unauthorized_rbc_emails"
    }
    
    total_count = 0
    for term, target_table in mapping.items():
        print(f"Migrating {term} records...")
        source_cursor.execute(f"SELECT date, from_addr, to_addr, cc_addr, subject, body, mbox_source, message_id FROM emails WHERE from_addr LIKE ? OR to_addr LIKE ? OR cc_addr LIKE ?", (f'%{term}%', f'%{term}%', f'%{term}%'))
        rows = source_cursor.fetchall()
        for row in rows:
            cursor.execute(f"INSERT OR IGNORE INTO {target_table} (date, from_addr, to_addr, cc_addr, subject, body, source, message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", row)
        total_count += len(rows)
    
    conn.commit()
    source_conn.close()
    print(f"Finished DB Migration: {total_count} records migrated.")

if __name__ == "__main__":
    conn = setup_db()
    extract_from_existing_db(EXISTING_DB, conn)
    extract_from_mbox(MBOX_SUZANNE, conn)
    conn.close()
