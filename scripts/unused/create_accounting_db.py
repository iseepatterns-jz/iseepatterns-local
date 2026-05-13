import os
import zipfile
import email
import sqlite3
import email.utils
from email.header import decode_header
import io
import re
import html
from bs4 import BeautifulSoup

# CONFIGURATION
ZIP_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-4.zip'
MBOX_NAME = '2024-06-22-all--accounting@rowboatcreative.com-trQeA-.mbox'
DB_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/accounting_all.db'

def setup_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    conn.commit()
    return conn

def decode_mime_header(s):
    if not s: return ""
    try:
        parts = decode_header(s)
        decoded = ""
        for part, charset in parts:
            if isinstance(part, bytes):
                decoded += part.decode(charset or 'utf-8', errors='replace')
            else:
                decoded += part
        return decoded
    except Exception:
        return str(s)

def extract_body_single(full_text):
    if not full_text: return ""
    thread_patterns = [
        r'-+original message-+',
        r'from:.*sent:.*to:.*subject:.*',
        r'on .* wrote:',
        r'begin forwarded message:',
        r'--- On .* wrote: ---'
    ]
    sig_patterns = [
        r'^--\s*$',
        r'^_______________________________+$',
        r'^Sent from my (?:iPhone|Android|mobile|Handheld)',
        r'^(?:Best|Regards|Sincerely|Thank you|Thanks|Cheers|Kind regards),\s*$',
    ]
    all_patterns = thread_patterns + sig_patterns
    lines = full_text.splitlines()
    msg_lines = []
    for line in lines:
        stripped = line.strip()
        is_break = False
        for p in all_patterns:
            if re.search(p, stripped, re.IGNORECASE):
                is_break = True
                break
        if is_break: break
        msg_lines.append(line)
    return "\n".join(msg_lines).strip()

def get_body(msg):
    def parse_part(part):
        content_type = part.get_content_type()
        content_disposition = str(part.get("Content-Disposition"))
        if "attachment" in content_disposition: return None
        payload = part.get_payload(decode=True)
        if not payload: return None
        text = payload.decode(errors='replace')
        if content_type == "text/html":
            text = re.sub(r'(?i)<(script|style)[^>]*>.*?</\1>', '', text, flags=re.DOTALL)
            text = html.unescape(text)
            soup = BeautifulSoup(text, 'html.parser')
            for tag in soup.find_all(['p', 'br', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
                tag.insert_after('\n')
            text = soup.get_text()
        else:
            text = html.unescape(text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    try:
        if msg.is_multipart():
            plain_text = None
            html_text = None
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == "text/plain":
                    pt = parse_part(part)
                    if pt: plain_text = pt
                elif ctype == "text/html":
                    ht = parse_part(part)
                    if ht: html_text = ht
            return plain_text if plain_text else (html_text if html_text else "")
        else:
            return parse_part(msg) or ""
    except Exception:
        return ""

def stream_mbox(f):
    buffer = []
    for line in f:
        if line.startswith(b'From '):
            if buffer:
                yield email.message_from_bytes(b''.join(buffer))
                buffer = []
        buffer.append(line)
    if buffer:
        yield email.message_from_bytes(b''.join(buffer))

def main():
    print(f"Opening ZIP: {ZIP_PATH}")
    conn = setup_db()
    cursor = conn.cursor()
    count = 0
    
    with zipfile.ZipFile(ZIP_PATH, 'r') as z:
        with z.open(MBOX_NAME) as mbox_file:
            print(f"Ingesting MBOX: {MBOX_NAME}")
            for msg in stream_mbox(mbox_file):
                msg_id = msg.get('Message-ID', '')
                date = msg.get('Date', '')
                from_addr = msg.get('From', '')
                to_addr = msg.get('To', '')
                cc_addr = msg.get('Cc', '')
                subject = decode_mime_header(msg.get('Subject', 'No Subject'))
                body = get_body(msg)
                body_single = extract_body_single(body)
                
                # Simple thread_id heuristic: use References or In-Reply-To if available, 
                # otherwise use Message-ID or Subject-based grouping if we were more advanced.
                # For this task, we'll just store them and filter later.
                thread_id = msg.get('Thread-Index', '') # Some clients use this
                if not thread_id:
                    refs = msg.get('References', '')
                    if refs:
                        thread_id = refs.split()[0]
                    else:
                        thread_id = msg.get('In-Reply-To', '')
                
                cursor.execute('''
                    INSERT INTO emails (message_id, date, from_addr, to_addr, cc_addr, subject, body, body_single, thread_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (msg_id, date, from_addr, to_addr, cc_addr, subject, body, body_single, thread_id))
                
                count += 1
                if count % 100 == 0:
                    conn.commit()
                    print(f"  Ingested {count} emails...")
    
    conn.commit()
    conn.close()
    print(f"Done. Ingested {count} emails into {DB_PATH}")

if __name__ == "__main__":
    main()
