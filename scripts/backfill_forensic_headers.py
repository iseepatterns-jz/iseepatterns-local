import sqlite3
import email
from pathlib import Path
import zipfile
import time

PROJECT_ROOT = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
DB_PATH = PROJECT_ROOT / "data" / "MBOX_LOCKER" / "mbox_metadata.db"

LOCKER_ZIPS = {
    "ALL": PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2024-06-22_GMAIL_MBOX_ALL_LOCKER" / "2024-06-22_GMAIL_ALL_MBOX_ZIPPED",
    "LEGAL": PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2023-06-08_GMAIL_MBOX_LEGAL_LOCKER" / "2023-06-08_GMAIL_LEGAL_MBOX_ZIPPED",
    "SG": PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2023-06-08_GMAIL_MBOX_SG_LOCKER" / "2023-06-08_GMAIL_MBOX_SG_ZIPPED",
}

def stream_mbox(f):
    buffer = []
    for line in f:
        if line.startswith(b'From '):
            if buffer:
                try:
                    yield email.message_from_bytes(b''.join(buffer))
                except Exception:
                    pass
                buffer = []
        buffer.append(line)
    if buffer:
        try:
            yield email.message_from_bytes(b''.join(buffer))
        except Exception:
            pass

def backfill():
    conn = sqlite3.connect(str(DB_PATH))
    # Get all IDs that are missing forensic headers but have a body (or just all for safety)
    print("Loading message cache...")
    cache = {}
    for row in conn.execute("SELECT id, rfc822_id FROM emails WHERE in_reply_to IS NULL"):
        rid = row[1].strip().strip('<>')
        if rid not in cache: cache[rid] = []
        cache[rid].append(row[0])
    
    print(f"Targeting {len(cache):,} unique messages for header backfill.")

    for locker, zip_dir in LOCKER_ZIPS.items():
        if not zip_dir.exists(): continue
        zips = sorted(zip_dir.glob("*.zip"))
        for zip_path in zips:
            print(f"📦 Processing {zip_path.name}")
            with zipfile.ZipFile(str(zip_path), 'r') as zf:
                mbox_names = [n for n in zf.namelist() if n.endswith('.mbox')]
                for mbox_name in mbox_names:
                    print(f"  📄 {mbox_name}")
                    with zf.open(mbox_name) as mbox_file:
                        count = 0
                        updated = 0
                        for msg in stream_mbox(mbox_file):
                            count += 1
                            msg_id = (msg.get('Message-ID') or '').strip().strip('<>')
                            if msg_id in cache:
                                in_reply_to = (msg.get('In-Reply-To') or '').strip()
                                refs = (msg.get('References') or '').strip()
                                for rid in cache[msg_id]:
                                    conn.execute("UPDATE emails SET in_reply_to = ?, refs = ? WHERE id = ?", (in_reply_to, refs, rid))
                                    updated += 1
                                del cache[msg_id]
                            
                            if count % 5000 == 0:
                                conn.commit()
                                print(f"    - {count:,} messages parsed, {updated:,} updated")
                                if not cache: break
                        conn.commit()
                        if not cache: break
                if not cache: break
        if not cache: break
    
    conn.commit()
    conn.close()
    print("Backfill complete.")

if __name__ == "__main__":
    backfill()
