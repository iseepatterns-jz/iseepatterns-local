
import sqlite3
import os
import re
import html

SOURCE_DB = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db'
TARGET_DB = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/accountant_correspondence.db'

# Accountants from user request
TARGET_EMAILS = {
    'jdj0818@gmail.com', 'george.g@rudderservices.com',
    'ehershik@supportingstrategies.com', 'stephanie@sparkbusinessconsulting.com',
    'shighland@pkfmueller.com', 'shaun.b@rudderservices.com',
    'eric.l@rudderservices.com', 'rbc@chi.myworkplace.co',
    'jackie@sparkbusinessconsulting.com', 'kristin@sparkbusinessconsulting.com',
    'kasey@sparkbusinessconsulting.com'
}

# Source accounts to filter from
SOURCE_ACCOUNTS = ['joe@rowboatcreative.com', 'lucas@rowboatcreative.com']

def extract_body_single(full_text):
    """Truncate before quoted replies and signatures (ISEEPATTERNS Standard)."""
    if not full_text:
        return ""
    all_patterns = [
        r'-+original message-+',
        r'from:.*sent:.*to:.*subject:.*',
        r'on .* wrote:',
        r'begin forwarded message:',
        r'--- On .* wrote: ---',
        r'^--\s*$',
        r'^_______________________________+$',
        r'^Sent from my (?:iPhone|Android|mobile|Handheld)',
        r'^(?:Best|Regards|Sincerely|Thank you|Thanks|Cheers|Kind regards),\s*$',
    ]
    lines = full_text.splitlines()
    msg_lines = []
    for line in lines:
        stripped = line.strip()
        is_break = False
        for p in all_patterns:
            if re.search(p, stripped, re.IGNORECASE):
                is_break = True
                break
        if is_break:
            break
        msg_lines.append(line)
    return "\n".join(msg_lines).strip()

def clean_body_text(text):
    """Clean HTML and normalize whitespace (Simple approach from mbox_body_extract.py)."""
    if not text:
        return ""
    # Strip script/style
    text = re.sub(r'(?i)<(script|style)[^>]*>.*?</\1>', '', text, flags=re.DOTALL)
    text = html.unescape(text)
    # Simple HTML stripping
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</(p|div|li|tr|h[1-6])>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    # Normalize newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def setup_target_db():
    if os.path.exists(TARGET_DB):
        os.remove(TARGET_DB)
        print(f"Removed existing analysis DB: {TARGET_DB}")
        
    conn = sqlite3.connect(TARGET_DB)
    cursor = conn.cursor()
    
    # Unified schema following lawmodel1 conventions
    cursor.execute("""
    CREATE TABLE accountant_emails (
        id INTEGER PRIMARY KEY,
        rfc822_id TEXT,
        account TEXT,
        from_addr TEXT,
        to_addr TEXT,
        cc_addr TEXT,
        bcc_addr TEXT,
        subject TEXT,
        date_sent TEXT,
        raw_body TEXT,
        cleaned_body TEXT,
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
    
    print(f"Extracting interactions from {SOURCE_ACCOUNTS} with specified accountants...")
    
    # Construct query to search for any accountant in main address fields
    # and restrict to the two source accounts.
    placeholders = ' OR '.join([
        "from_addr LIKE ?", "to_addr LIKE ?", "cc_addr LIKE ?", "bcc_addr LIKE ?"
    ])
    
    total_found = 0
    for acc in TARGET_EMAILS:
        pattern = f"%{acc}%"
        # Filter by account specifically now
        source_cursor.execute(f"""
            SELECT rfc822_id, account, from_addr, to_addr, cc_addr, bcc_addr, subject, date_sent, body, mbox_source
            FROM emails
            WHERE ({placeholders})
            AND account IN (?, ?)
        """, (pattern, pattern, pattern, pattern, SOURCE_ACCOUNTS[0], SOURCE_ACCOUNTS[1]))
        
        rows = source_cursor.fetchall()
        print(f"Found {len(rows)} emails for accountant: {acc}")
        
        for row in rows:
            rfc822_id, account, from_addr, to_addr, cc_addr, bcc_addr, subject, date_sent, body, mbox_source = row
            
            # Check for Lucas and Joe in participants for pattern analysis
            all_recips = f"{from_addr or ''} {to_addr or ''} {cc_addr or ''} {bcc_addr or ''}".lower()
            has_lucas = 1 if 'lucas@rowboatcreative.com' in all_recips else 0
            has_joe = 1 if 'joe@rowboatcreative.com' in all_recips else 0
            
            # Clean the body
            cleaned_body = clean_body_text(body)
            cleaned_message = extract_body_single(cleaned_body)
            
            target_cursor.execute("""
                INSERT OR IGNORE INTO accountant_emails 
                (rfc822_id, account, from_addr, to_addr, cc_addr, bcc_addr, subject, date_sent, raw_body, cleaned_body, source_mbox, has_lucas, has_joe, accountant_found)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (rfc822_id, account, from_addr, to_addr, cc_addr, bcc_addr, subject, date_sent, body, cleaned_message, mbox_source, has_lucas, has_joe, acc))
            total_found += 1
            
        target_conn.commit()
        
    print(f"Finished. Total unique emails extracted: {total_found}")
    
    source_conn.close()
    target_conn.close()

if __name__ == "__main__":
    setup_target_db()
    extract_emails()
