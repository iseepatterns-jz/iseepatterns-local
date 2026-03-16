import os
import zipfile
import sqlite3
import email
import email.utils
from email.header import decode_header
import re
import html
import io
import glob
from bs4 import BeautifulSoup

# CONFIGURATION
BASE_DIR = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/'
DB_PATH = os.path.join(BASE_DIR, 'gmail_master_index.db')
SNIPPET_LENGTH = 2000

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

def get_body_snippet(msg):
    def parse_part(part):
        content_type = part.get_content_type()
        if "attachment" in str(part.get("Content-Disposition", "")): return None
        payload = part.get_payload(decode=True)
        if not payload: return None
        
        try:
            text = payload.decode(errors='replace')
        except:
            return None

        if content_type == "text/html":
            text = re.sub(r'(?i)<(script|style)[^>]*>.*?</\1>', '', text, flags=re.DOTALL)
            text = html.unescape(text)
            soup = BeautifulSoup(text, 'html.parser')
            for tag in soup.find_all(['p', 'br', 'div', 'li', 'tr']):
                tag.insert_after('\n')
            text = soup.get_text()
        else:
            text = html.unescape(text)
        
        return text.strip()

    try:
        full_text = ""
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == "text/plain":
                    pt = parse_part(part)
                    if pt: 
                        full_text = pt
                        break # Prefer plain text
                elif ctype == "text/html" and not full_text:
                    full_text = parse_part(part) or ""
        else:
            full_text = parse_part(msg) or ""
        
        return full_text[:SNIPPET_LENGTH]
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

def extract_account(mbox_name):
    match = re.search(r'--([a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+)-', mbox_name)
    return match.group(1) if match else "unknown"

def main():
    zip_files = [os.path.join(BASE_DIR, '2024-06-22-all-44.zip')]
    
    print(f"Indexing recovery for: {zip_files}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('PRAGMA journal_mode=WAL')
    cursor.execute('PRAGMA synchronous=NORMAL')
    
    total_emails = 0
    
    for zip_path in zip_files:
        zip_name = os.path.basename(zip_path)
        print(f"Processing {zip_name}...")
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as z:
                mbox_files = [f for f in z.namelist() if f.endswith('.mbox')]
                for mbox_name in mbox_files:
                    account = extract_account(mbox_name)
                    print(f"  Ingesting account: {account} ({mbox_name})")
                    
                    with z.open(mbox_name) as f:
                        count = 0
                        for msg in stream_mbox(f):
                            msg_id = str(msg.get('Message-ID', ''))
                            date = str(msg.get('Date', ''))
                            from_addr = decode_mime_header(msg.get('From', ''))
                            to_addr = decode_mime_header(msg.get('To', ''))
                            cc_addr = decode_mime_header(msg.get('Cc', ''))
                            subject = decode_mime_header(msg.get('Subject', 'No Subject'))
                            snippet = get_body_snippet(msg)
                            
                            thread_id = str(msg.get('Thread-Index', ''))
                            if not thread_id:
                                refs = msg.get('References', '')
                                if refs:
                                    thread_id = str(refs).split()[0]
                                else:
                                    thread_id = str(msg.get('In-Reply-To', ''))
                            
                            cursor.execute('''
                                INSERT INTO emails (zip_file, mbox_name, email_account, message_id, date, from_addr, to_addr, cc_addr, subject, body_snippet, thread_id)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ''', (zip_name, mbox_name, account, msg_id, date, from_addr, to_addr, cc_addr, subject, snippet, thread_id))
                            
                            count += 1
                            total_emails += 1
                            if count % 1000 == 0:
                                conn.commit()
                                print(f"    Indexed {count} emails...")
                        
                        conn.commit()
                        print(f"  Finished {account}: {count} emails.")
                        
        except Exception as e:
            print(f"  ERROR processing {zip_name}: {str(e)}")
            
    conn.close()
    print(f"Recovery complete. Added {total_emails} emails.")

if __name__ == "__main__":
    main()
