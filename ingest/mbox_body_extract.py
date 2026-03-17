"""
MBOX Body Extraction — Phase 2.

Streams zip → mbox → message bodies and matches them to mbox_metadata.db
by Message-ID header.

Usage:
    python3 -m ingest.mbox_body_extract                    # Extract all
    python3 -m ingest.mbox_body_extract --locker ALL       # Only ALL locker
    python3 -m ingest.mbox_body_extract --locker SG        # Only SG locker
    python3 -m ingest.mbox_body_extract --zip-num 9        # Only zip #9 (smallest)
    python3 -m ingest.mbox_body_extract --dry-run          # Count only
"""

import argparse
import email
import email.utils
import html
import re
import sqlite3
import time
import zipfile
from email.header import decode_header
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────

PROJECT_ROOT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
DB_PATH = PROJECT_ROOT / "data" / "MBOX_LOCKER" / "mbox_metadata.db"

LOCKER_ZIPS = {
    "ALL": PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2024-06-22_GMAIL_MBOX_ALL_LOCKER" / "2024-06-22_GMAIL_ALL_MBOX_ZIPPED",
    "LEGAL": PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2023-06-08_GMAIL_MBOX_LEGAL_LOCKER" / "2023-06-08_GMAIL_LEGAL_MBOX_ZIPPED",
    "SG": PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2023-06-08_GMAIL_MBOX_SG_LOCKER" / "2023-06-08_GMAIL_MBOX_SG_ZIPPED",
}

# SG has both a zip and a raw .mbox file
SG_RAW_MBOX = PROJECT_ROOT / "data" / "MBOX_LOCKER" / "2023-06-08_GMAIL_MBOX_SG_LOCKER" / "2023-06-08_GMAIL_MBOX_SG_ZIPPED" / "sggmail--suzanne@rowboatcreative.com-YtFVqI.mbox"


# ── Body parsing (from existing search_mbox_zips.py) ───────────────────

def decode_mime_header(s):
    if not s:
        return ""
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
    """Truncate before quoted replies and signatures."""
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


def parse_part(part):
    content_type = part.get_content_type()
    disp = str(part.get("Content-Disposition", ""))
    if "attachment" in disp:
        return None
    payload = part.get_payload(decode=True)
    if not payload:
        return None
    text = payload.decode(errors='replace')
    if content_type == "text/html":
        text = re.sub(r'(?i)<(script|style)[^>]*>.*?</\1>', '', text, flags=re.DOTALL)
        text = html.unescape(text)
        # Simple HTML stripping without BeautifulSoup (faster)
        text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</(p|div|li|tr|h[1-6])>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)
    else:
        text = html.unescape(text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def get_body(msg):
    try:
        plain_text = None
        html_text = None
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == "text/plain":
                    pt = parse_part(part)
                    if pt:
                        plain_text = pt
                elif ctype == "text/html":
                    ht = parse_part(part)
                    if ht:
                        html_text = ht
            return plain_text if plain_text else (html_text or "")
        else:
            return parse_part(msg) or ""
    except Exception:
        return ""


def stream_mbox(f):
    """Yield email message objects from an MBOX stream."""
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


# ── Core Extractor ─────────────────────────────────────────────────────

class BodyExtractor:
    def __init__(self, db_path: Path, dry_run: bool = False):
        self.db_path = db_path
        self.dry_run = dry_run
        self.conn = None
        self._id_cache = {}  # rfc822_id → set of db row ids
        self.stats = {
            'messages_parsed': 0, 'matched': 0, 'updated': 0,
            'no_match': 0, 'no_body': 0, 'errors': 0,
        }

    def open(self):
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.execute("PRAGMA journal_mode = WAL")
        self.conn.execute("PRAGMA synchronous = NORMAL")
        self.conn.execute("PRAGMA cache_size = -64000")
        # Pre-load rfc822_id → row id mapping for emails without bodies
        print("   Loading ID cache...")
        start = time.time()
        for row in self.conn.execute("SELECT id, rfc822_id FROM emails WHERE has_body = 0"):
            rid = row[1].strip().strip('<>')
            if rid not in self._id_cache:
                self._id_cache[rid] = []
            self._id_cache[rid].append(row[0])
        # Also index with angle brackets since mbox Message-ID often has them
        elapsed = time.time() - start
        print(f"   Loaded {len(self._id_cache):,} unique IDs in {elapsed:.1f}s")

    def close(self):
        if self.conn:
            self.conn.commit()
            self.conn.close()

    def _match_and_update(self, msg_id: str, body: str, body_single: str, zip_name: str, mbox_name: str, in_reply_to: str = None, refs: str = None):
        """Match a parsed message to the metadata DB and update body and forensic headers."""
        # Normalize message ID
        clean_id = msg_id.strip().strip('<>')
        if not clean_id:
            return False

        row_ids = self._id_cache.get(clean_id)
        if not row_ids:
            self.stats['no_match'] += 1
            return False

        self.stats['matched'] += 1
        if self.dry_run:
            return True

        for rid in row_ids:
            try:
                self.conn.execute(
                    """UPDATE emails SET body = ?, body_single = ?, has_body = 1,
                       zip_source = ?, mbox_source = ?, in_reply_to = ?, refs = ?
                       WHERE id = ?""",
                    (body[:50000], body_single[:10000], zip_name, mbox_name, in_reply_to, refs, rid)
                )
                self.stats['updated'] += 1
            except Exception:
                self.stats['errors'] += 1

        # Remove from cache so we don't re-update
        del self._id_cache[clean_id]
        return True

    def extract_from_zip(self, zip_path: Path, locker_name: str):
        """Process all .mbox files inside a zip."""
        if not zip_path.exists():
            print(f"   ❌ Not found: {zip_path}")
            return

        zip_name = zip_path.name
        print(f"\n📦 Processing: {zip_name}")

        try:
            with zipfile.ZipFile(str(zip_path), 'r') as zf:
                mbox_names = [n for n in zf.namelist() if n.endswith('.mbox')]
                print(f"   Contains {len(mbox_names)} mbox files")

                for mbox_name in mbox_names:
                    self._extract_mbox_stream(zf, mbox_name, zip_name)
        except Exception as e:
            print(f"   ❌ Zip error: {e}")
            self.stats['errors'] += 1

    def _extract_mbox_stream(self, zf, mbox_name: str, zip_name: str):
        """Stream a single mbox file from inside a zip."""
        print(f"   📄 {mbox_name}")
        start = time.time()
        count = 0

        with zf.open(mbox_name) as mbox_file:
            for msg in stream_mbox(mbox_file):
                self.stats['messages_parsed'] += 1
                count += 1

                msg_id = msg.get('Message-ID', '')
                if not msg_id:
                    self.stats['no_match'] += 1
                    continue

                body = get_body(msg)
                if not body:
                    self.stats['no_body'] += 1
                    continue

                body_single = extract_body_single(body)
                in_reply_to = (msg.get('In-Reply-To') or '').strip()
                references = (msg.get('References') or '').strip()
                self._match_and_update(msg_id, body, body_single, zip_name, mbox_name, in_reply_to, references)

                if count % 5000 == 0:
                    self.conn.commit()
                    elapsed = time.time() - start
                    rate = count / elapsed if elapsed > 0 else 0
                    remaining = len(self._id_cache)
                    print(f"      {count:,} parsed, {self.stats['updated']:,} updated "
                          f"({rate:.0f}/sec, {remaining:,} remaining)")

        self.conn.commit()
        elapsed = time.time() - start
        print(f"      Done: {count:,} messages in {elapsed:.1f}s")

    def extract_from_raw_mbox(self, mbox_path: Path, locker_name: str):
        """Process a raw .mbox file (not inside a zip)."""
        if not mbox_path.exists():
            print(f"   ❌ Not found: {mbox_path}")
            return

        mbox_name = mbox_path.name
        print(f"\n📄 Processing raw mbox: {mbox_name}")
        start = time.time()
        count = 0

        with open(mbox_path, 'rb') as f:
            for msg in stream_mbox(f):
                self.stats['messages_parsed'] += 1
                count += 1

                msg_id = msg.get('Message-ID', '')
                if not msg_id:
                    self.stats['no_match'] += 1
                    continue

                body = get_body(msg)
                if not body:
                    self.stats['no_body'] += 1
                    continue

                body_single = extract_body_single(body)
                in_reply_to = (msg.get('In-Reply-To') or '').strip()
                references = (msg.get('References') or '').strip()
                self._match_and_update(msg_id, body, body_single, "raw", mbox_name, in_reply_to, references)

                if count % 1000 == 0:
                    self.conn.commit()

        self.conn.commit()
        elapsed = time.time() - start
        print(f"   Done: {count:,} messages in {elapsed:.1f}s")

    def print_summary(self, elapsed: float):
        s = self.stats
        remaining = self.conn.execute("SELECT count(*) FROM emails WHERE has_body = 0").fetchone()[0]
        total = self.conn.execute("SELECT count(*) FROM emails").fetchone()[0]
        print(f"\n{'='*60}")
        print(f"📊 Body Extraction {'(DRY RUN) ' if self.dry_run else ''}Summary")
        print(f"{'='*60}")
        print(f"   Messages parsed:  {s['messages_parsed']:,}")
        print(f"   Matched to DB:    {s['matched']:,}")
        print(f"   Bodies updated:   {s['updated']:,}")
        print(f"   No match (ID):    {s['no_match']:,}")
        print(f"   No body content:  {s['no_body']:,}")
        print(f"   Errors:           {s['errors']:,}")
        print(f"   DB coverage:      {total - remaining:,} / {total:,} "
              f"({(total-remaining)/total*100:.1f}%)")
        print(f"   Still missing:    {remaining:,}")
        print(f"   Total time:       {elapsed:.1f}s")
        print(f"{'='*60}")


# ── CLI ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MBOX Body Extraction — Phase 2")
    parser.add_argument("--locker", type=str, help="Only process this locker (ALL/LEGAL/SG)")
    parser.add_argument("--zip-num", type=int, help="Only process zip #N (for testing)")
    parser.add_argument("--dry-run", action="store_true", help="Count matches, no writes")
    parser.add_argument("--db", type=str, default=str(DB_PATH))
    args = parser.parse_args()

    db = Path(args.db)
    if not db.exists():
        print(f"❌ DB not found: {db}")
        print("   Run Phase 1 first: python3 -m ingest.mbox_metadata_ingest --reset")
        return

    extractor = BodyExtractor(db_path=db, dry_run=args.dry_run)
    extractor.open()
    start = time.time()

    lockers_to_process = [args.locker.upper()] if args.locker else ["ALL", "LEGAL", "SG"]

    for locker in lockers_to_process:
        zip_dir = LOCKER_ZIPS.get(locker)
        if not zip_dir or not zip_dir.exists():
            print(f"⚠️  Locker dir not found: {locker}")
            continue

        # Find zip files
        zips = sorted(zip_dir.glob("*.zip"))

        if args.zip_num is not None:
            # Filter to specific zip number
            target = f"-{args.zip_num}.zip"
            zips = [z for z in zips if z.name.endswith(target)]
            if not zips:
                print(f"⚠️  No zip found ending with {target}")
                continue

        print(f"\n{'='*60}")
        print(f"🗂️  Locker: {locker} ({len(zips)} zip files)")
        print(f"{'='*60}")

        for zip_path in zips:
            extractor.extract_from_zip(zip_path, locker)

        # Handle raw .mbox files (SG has one)
        if locker == "SG" and SG_RAW_MBOX.exists():
            extractor.extract_from_raw_mbox(SG_RAW_MBOX, locker)

    extractor.print_summary(time.time() - start)
    extractor.close()


if __name__ == "__main__":
    main()
