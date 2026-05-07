"""
Evidence Hub Ingestion — Direct DB-to-DB.

Reads directly from raw source databases:
  - iMessage chat.db (iMAC + M1STUDIO) with whitelist filter
  - emails_LG_SM_SH_JZ.db (legacy 402k filtered subset)
  - mbox_metadata.db (full 814k index with labels, categories, drive-links)

Usage:
    python3 -m ingest.evidence_hub_ingest --all              # iMessage + full email
    python3 -m ingest.evidence_hub_ingest --imessage          # iMessage only
    python3 -m ingest.evidence_hub_ingest --email             # Legacy 402k subset
    python3 -m ingest.evidence_hub_ingest --email-full        # Full 814k index
    python3 -m ingest.evidence_hub_ingest --email-full --include-spam
    python3 -m ingest.evidence_hub_ingest --dry-run --all
"""

import argparse
import json
import re
import sqlite3
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Optional

# ── Paths ──────────────────────────────────────────────────────────────

PROJECT_ROOT = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
DB_PATH = PROJECT_ROOT / "data" / "evidence_hub.db"

CHAT_MASTER_DB = PROJECT_ROOT / "data" / "IMESSAGE_DATA_LOCKER" / "chat_case_only.db"
EMAIL_DB = PROJECT_ROOT / "data" / "MBOX_LOCKER" / "emails_LG_SM_SH_JZ.db"
MBOX_METADATA_DB = PROJECT_ROOT / "data" / "MBOX_LOCKER" / "mbox_metadata.db"

# ── iMessage whitelist ─────────────────────────────────────────────────

WHITELIST_HANDLES = {
    # Abel Rodriguez
    "+17736170803", "abel@rowboatcreative.com",
    # Adrienne Guariglia
    "+18474319455",
    # Amber Dys
    "+16304325005",
    # Cameron Lowe
    "+16309955836",
    # Carmel Halim
    "+14066721522",
    # David Baum
    "+13122753110",
    # Elliot Hershik
    "+16305311521",
    # Eric Montanez
    "+17735584454",
    # George Grigorakos
    "+13124203036", "george.g@rudderservices.com",
    # Gregory Jordan
    "+13125437354",
    # Henry Badani
    "+18478040165",
    # Jaclyn Torrey
    "+17818711003",
    # James Johansen
    "+13125151010",
    # Jay Goebel
    "+17733549538", "jay@rowboatcreative.com",
    # Jeff Paolino
    "+14847588413",
    # Jimmy Bui
    "+18572212405",
    # Joe Chay
    "+16143270700",
    # John Azara
    "+17738515303",
    # Jon Duong
    "+19135485577",
    # Jose Aburto
    "+17733019422",
    # Joseph Zangrilli
    "+17736109104", "joe@rowboatcreative.com",
    # Kevin Lampe
    "+13126177280",
    # Kevin Rotter
    "+17737190088",
    # Leonard Mayersky
    "+17738529219",
    # Lucas Guariglia
    "+18478280944", "18478280944@tmomail.net", "lucas@rowboatcreative.com",
    # Luke Fiddes
    "+13093393391", "fiddes56@gmail.com",
    # Manny Caston
    "+17739722946",
    # Marie Hale
    "+13127201399",
    # Michael Sanderson
    "+18473801876",
    # Nicole Yalaz
    "+13128487283",
    # Oladipo Folami
    "+17734433476",
    # Pamela Visvardis
    "+17083075156",
    # Patrick Houdek
    "+17736366744", "patrick@rowboatcreative.com",
    # Ryan Hayes
    "+13127254069",
    # Sal Mohamed
    "+15105026585",
    # Sam Cobb
    "+17577495856",
    # Samuel Tanios
    "+17732516776",
    # Shankar Anant
    "+18475021465",
    # Sheri Highland
    "+16307018110",
    # Stephanie Cuccinella
    "+12245670848", "stephanie@rowboatcreative.com",
    # Stephanie Morin
    "+13392017464",
    # Steven Farag
    "+18473870518",
    # Stevie Hopkins
    "+16302729916",
    # Suzanne Guariglia
    "+17043407505",
    # Taylor Smith
    "+18043176988", "taylor@pendulum-creative.com",
    # Thomas Nitschke
    "+17204540129",
    # Wally Klejka
    "+17735161720",
}

# ── Helpers ────────────────────────────────────────────────────────────

_PHONE_RE = re.compile(r'[^\d+]')
APPLE_EPOCH_OFFSET = 978307200  # 2001-01-01 in Unix time


def apple_ts_to_iso(apple_date: int) -> Optional[str]:
    """Convert Apple Core Data timestamp (nanoseconds since 2001-01-01) to ISO8601."""
    if not apple_date:
        return None
    try:
        unix_ts = (apple_date / 1_000_000_000) + APPLE_EPOCH_OFFSET
        return datetime.fromtimestamp(unix_ts, tz=timezone.utc).isoformat()
    except (OSError, ValueError, OverflowError):
        return None


def normalize_identifier(raw: str) -> str:
    """Normalize an email or phone for dedup matching."""
    raw = raw.strip()
    if not raw:
        return ""
    if "@" in raw:
        return raw.lower()
    cleaned = _PHONE_RE.sub('', raw)
    if cleaned.startswith('+'):
        return cleaned
    if len(cleaned) == 10:
        return f"+1{cleaned}"
    if len(cleaned) == 11 and cleaned.startswith('1'):
        return f"+{cleaned}"
    return cleaned


def parse_email_addr(full_addr: str) -> list:
    """Extract email addresses from 'Name <email>' format. Returns list of emails."""
    if not full_addr:
        return []
    results = []
    for part in re.split(r'[,;]\s*', full_addr):
        part = part.strip()
        match = re.search(r'<([^>]+)>', part)
        if match:
            results.append(match.group(1).strip())
        elif '@' in part:
            results.append(part.strip())
    return results


# ── Core Ingestor ──────────────────────────────────────────────────────

class EvidenceHubIngestor:
    def __init__(self, db_path: Path, dry_run: bool = False):
        self.db_path = db_path
        self.dry_run = dry_run
        self.hub_conn: Optional[sqlite3.Connection] = None
        self._participant_cache: Dict[str, int] = {}

        # Stats
        self.stats = {
            'imessage_scanned': 0, 'imessage_inserted': 0, 'imessage_deduped': 0,
            'email_scanned': 0, 'email_inserted': 0, 'email_deduped': 0,
            'email_spam_skipped': 0,
            'origins_added': 0, 'participants_added': 0, 'links_added': 0, 'errors': 0,
        }

    def open(self):
        if self.dry_run:
            return
        self.hub_conn = sqlite3.connect(str(self.db_path))
        self.hub_conn.execute("PRAGMA journal_mode = WAL")
        self.hub_conn.execute("PRAGMA foreign_keys = ON")
        self.hub_conn.execute("PRAGMA cache_size = -64000")
        self.hub_conn.execute("PRAGMA synchronous = NORMAL")
        # Pre-load participant cache
        for row in self.hub_conn.execute("SELECT normalized_identifier, id FROM participants"):
            self._participant_cache[row[0]] = row[1]

    def close(self):
        if self.hub_conn:
            self.hub_conn.commit()
            self.hub_conn.close()

    def _get_or_create_participant(self, raw_id: str) -> Optional[int]:
        norm = normalize_identifier(raw_id)
        if not norm:
            return None
        if norm in self._participant_cache:
            return self._participant_cache[norm]
        try:
            cur = self.hub_conn.execute(
                "INSERT OR IGNORE INTO participants (identifier, normalized_identifier) VALUES (?, ?)",
                (raw_id.strip(), norm)
            )
            if cur.lastrowid and cur.lastrowid > 0:
                self._participant_cache[norm] = cur.lastrowid
                self.stats['participants_added'] += 1
                return cur.lastrowid
            row = self.hub_conn.execute(
                "SELECT id FROM participants WHERE normalized_identifier = ?", (norm,)
            ).fetchone()
            if row:
                self._participant_cache[norm] = row[0]
                return row[0]
        except Exception:
            pass
        return None

    def _link_participant(self, evidence_id: int, raw_id: str, role: str = 'participant'):
        p_id = self._get_or_create_participant(raw_id)
        if p_id:
            try:
                self.hub_conn.execute(
                    "INSERT OR IGNORE INTO evidence_participants (evidence_id, participant_id, role) VALUES (?, ?, ?)",
                    (evidence_id, p_id, role)
                )
                self.stats['links_added'] += 1
            except Exception:
                pass

    # ── iMessage Ingestion ─────────────────────────────────────────────

    def ingest_imessage(self, chat_db_path: Path, origin_name: str):
        """Ingest iMessages directly from a chat.db file."""
        if not chat_db_path.exists():
            print(f"❌ chat.db not found: {chat_db_path}")
            return

        print(f"\n📱 Ingesting iMessages from {origin_name}...")
        print(f"   DB: {chat_db_path}")

        src = sqlite3.connect(f"file:{chat_db_path}?mode=ro", uri=True)
        src.row_factory = sqlite3.Row

        # Build whitelist placeholders
        wl = list(WHITELIST_HANDLES)
        placeholders = ','.join(['?' for _ in wl])

        # Check if decodedBody column exists (M1STUDIO has it, iMAC doesn't)
        cols = [row[1] for row in src.execute("PRAGMA table_info(message)")]
        has_decoded = 'decodedBody' in cols
        body_col = 'COALESCE(m.decodedBody, m.text)' if has_decoded else 'm.text'

        query = f"""
            SELECT
                m.ROWID           AS rowid,
                m.guid            AS guid,
                {body_col}        AS body,
                m.date            AS apple_date,
                m.is_from_me      AS is_from_me,
                h.id              AS handle_id,
                c.chat_identifier AS chat_id
            FROM message m
            JOIN handle h ON m.handle_id = h.ROWID
            LEFT JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
            LEFT JOIN chat c ON cmj.chat_id = c.ROWID
            WHERE h.id IN ({placeholders})
        """
        
        # Get attachment info separately or via JSON group in SQLite (not supported in older sqlite)
        # We will fetch attachment mappings for the whitelisted messages
        msg_attachment_query = """
            SELECT maj.message_id, a.guid, a.filename, a.mime_type, a.total_bytes
            FROM message_attachment_join maj
            JOIN attachment a ON maj.attachment_id = a.ROWID
        """
        attachments_map = {}
        for row in src.execute(msg_attachment_query):
            mid = row[0]
            if mid not in attachments_map:
                attachments_map[mid] = []
            attachments_map[mid].append({
                'guid': row[1],
                'filename': row[2],
                'mime_type': row[3],
                'size': row[4]
            })

        rows = src.execute(query, wl).fetchall()
        total = len(rows)
        print(f"   Matched {total:,} messages (whitelist-filtered)")

        if self.dry_run:
            self.stats['imessage_scanned'] += total
            src.close()
            return

        batch_count = 0
        start = time.time()

        for i, row in enumerate(rows):
            self.stats['imessage_scanned'] += 1
            guid = row['guid']
            if not guid:
                continue

            canonical_id = f"imsg:{guid}"
            body = row['body'] or ''
            ts = apple_ts_to_iso(row['apple_date'])
            handle = row['handle_id'] or ''
            is_out = bool(row['is_from_me'])
            chat_id = row['chat_id'] or ''

            title = f"iMessage {'outgoing' if is_out else 'incoming'} in chat {chat_id}"

            # Prepare primary IDs with attachments
            att_info = attachments_map.get(row['rowid'], [])
            p_ids = {
                'message_guid': guid, 
                'message_rowid': str(row['rowid']),
                'chat_identifier': chat_id
            }
            if att_info:
                p_ids['attachments'] = att_info

            try:
                cur = self.hub_conn.execute(
                    """INSERT INTO evidence
                       (canonical_id, source_type, title, body_snippet, start_timestamp,
                        primary_ids, card_id)
                       VALUES (?, 'imessage', ?, ?, ?, ?, ?)
                       ON CONFLICT(canonical_id) DO UPDATE SET
                           primary_ids = excluded.primary_ids,
                           updated_at = datetime('now')
                    """,
                    (
                        canonical_id, title, body[:4000], ts,
                        json.dumps(p_ids, ensure_ascii=False),
                        None,
                    )
                )
                is_new = cur.rowcount > 0
                if is_new:
                    self.stats['imessage_inserted'] += 1
                    eid = cur.lastrowid
                else:
                    self.stats['imessage_deduped'] += 1
                    r = self.hub_conn.execute("SELECT id FROM evidence WHERE canonical_id = ?", (canonical_id,)).fetchone()
                    eid = r[0] if r else None
                    if not eid:
                        continue
            except Exception as e:
                self.stats['errors'] += 1
                if self.stats['errors'] <= 5:
                    print(f"   ⚠️  Insert error: {e}")
                continue

            # Provenance
            try:
                cur = self.hub_conn.execute(
                    """INSERT OR IGNORE INTO evidence_origins
                       (evidence_id, origin_system, source_file, source_rowid)
                       VALUES (?, ?, ?, ?)""",
                    (eid, origin_name, str(chat_db_path), str(row['rowid']))
                )
                if cur.rowcount > 0:
                    self.stats['origins_added'] += 1
            except Exception:
                pass

            # Participants (only on new insert)
            if is_new and handle:
                self._link_participant(eid, handle, 'sender' if not is_out else 'recipient')

            batch_count += 1
            if batch_count % 5000 == 0:
                self.hub_conn.commit()
                elapsed = time.time() - start
                rate = batch_count / elapsed if elapsed > 0 else 0
                print(f"   📦 {batch_count:,}/{total:,} ({rate:.0f}/sec)")

        self.hub_conn.commit()
        src.close()
        elapsed = time.time() - start
        print(f"   ✅ {origin_name}: {self.stats['imessage_inserted']:,} new, "
              f"{self.stats['imessage_deduped']:,} deduped in {elapsed:.1f}s")

    # ── Email Ingestion ────────────────────────────────────────────────

    def ingest_email(self, email_db_path: Path):
        """Ingest emails from the pre-indexed emails DB."""
        if not email_db_path.exists():
            print(f"❌ Email DB not found: {email_db_path}")
            return

        print(f"\n📧 Ingesting emails from {email_db_path.name}...")

        src = sqlite3.connect(f"file:{email_db_path}?mode=ro", uri=True)
        src.row_factory = sqlite3.Row

        rows = src.execute("""
            SELECT id, message_id, date, from_addr, to_addr, cc_addr,
                   subject, body, bodySingle, direction, mbox_source, labels
            FROM emails
            WHERE message_id IS NOT NULL AND message_id != ''
        """).fetchall()

        total = len(rows)
        print(f"   Found {total:,} emails with message_id")

        if self.dry_run:
            self.stats['email_scanned'] += total
            src.close()
            return

        batch_count = 0
        start = time.time()

        for i, row in enumerate(rows):
            self.stats['email_scanned'] += 1
            msg_id = row['message_id'].strip().strip('<>')
            if not msg_id:
                continue

            canonical_id = f"email:{msg_id}"
            subject = row['subject'] or ''
            body = row['body'] or row['bodySingle'] or ''
            date_str = row['date'] or ''
            from_addr = row['from_addr'] or ''
            to_addr = row['to_addr'] or ''
            cc_addr = row['cc_addr'] or ''
            direction = row['direction'] or ''
            labels = row['labels'] or ''

            title = f"Email: {subject[:100]}"
            summary = f"From: {from_addr} → To: {to_addr}"

            primary_ids = {
                'message_id': msg_id,
                'mbox_source': row['mbox_source'] or '',
            }

            tags = ['email']
            if labels:
                tags.extend(l.strip() for l in labels.split(',') if l.strip())

            # Insert evidence
            try:
                cur = self.hub_conn.execute(
                    """INSERT OR IGNORE INTO evidence
                       (canonical_id, source_type, title, summary, body_snippet,
                        start_timestamp, tags, primary_ids)
                       VALUES (?, 'email', ?, ?, ?, ?, ?, ?)""",
                    (
                        canonical_id, title, summary, body[:4000], date_str,
                        json.dumps(tags, ensure_ascii=False),
                        json.dumps(primary_ids, ensure_ascii=False),
                    )
                )
                is_new = cur.rowcount > 0
                if is_new:
                    self.stats['email_inserted'] += 1
                    eid = cur.lastrowid
                else:
                    self.stats['email_deduped'] += 1
                    continue  # emails DB is already UNIQUE on message_id
            except Exception as e:
                self.stats['errors'] += 1
                if self.stats['errors'] <= 5:
                    print(f"   ⚠️  Insert error: {e}")
                continue

            # Provenance
            try:
                self.hub_conn.execute(
                    """INSERT OR IGNORE INTO evidence_origins
                       (evidence_id, origin_system, source_file, source_rowid)
                       VALUES (?, 'GMAIL_MBOX', ?, ?)""",
                    (eid, str(email_db_path), str(row['id']))
                )
                self.stats['origins_added'] += 1
            except Exception:
                pass

            # Participants
            if is_new:
                for addr in parse_email_addr(from_addr):
                    self._link_participant(eid, addr, 'sender')
                for addr in parse_email_addr(to_addr):
                    self._link_participant(eid, addr, 'recipient')
                for addr in parse_email_addr(cc_addr):
                    self._link_participant(eid, addr, 'cc')

            batch_count += 1
            if batch_count % 10000 == 0:
                self.hub_conn.commit()
                elapsed = time.time() - start
                rate = batch_count / elapsed if elapsed > 0 else 0
                print(f"   📦 {batch_count:,}/{total:,} ({rate:.0f}/sec)")

        self.hub_conn.commit()
        src.close()
        elapsed = time.time() - start
        print(f"   ✅ Emails: {self.stats['email_inserted']:,} new, "
              f"{self.stats['email_deduped']:,} deduped in {elapsed:.1f}s")

    # ── Full Email Ingestion (mbox_metadata.db) ────────────────────────

    def ingest_email_full(self, mbox_db_path: Path, include_spam: bool = False):
        """Ingest emails from the full mbox_metadata.db index."""
        if not mbox_db_path.exists():
            print(f"❌ MBOX metadata DB not found: {mbox_db_path}")
            print("   Run: python3 -m ingest.mbox_metadata_ingest --reset")
            return

        print(f"\n📧 Ingesting emails from {mbox_db_path.name} (FULL INDEX)...")
        if not include_spam:
            print("   Filtering: spam excluded (use --include-spam to include)")

        src = sqlite3.connect(f"file:{mbox_db_path}?mode=ro", uri=True)
        src.row_factory = sqlite3.Row

        # Build query with optional spam filter
        where = "WHERE rfc822_id IS NOT NULL AND rfc822_id != ''"
        if not include_spam:
            where += " AND is_spam = 0"

        # Get count first for progress display
        total = src.execute(f"SELECT COUNT(*) FROM emails {where}").fetchone()[0]
        print(f"   Found {total:,} emails")

        # Pre-load drive links into a lookup
        drive_links = {}
        for dl in src.execute("SELECT rfc822_id, drive_url, drive_item_id FROM drive_links"):
            rid = dl[0]
            if rid not in drive_links:
                drive_links[rid] = []
            drive_links[rid].append({'url': dl[1], 'id': dl[2]})
        print(f"   Loaded {len(drive_links):,} emails with drive links")

        if self.dry_run:
            self.stats['email_scanned'] += total
            src.close()
            return

        # Stream rows instead of fetchall() for memory efficiency
        cursor = src.execute(f"""
            SELECT id, rfc822_id, gmail_id, account, labels_raw, category,
                   from_addr, subject, to_addr, cc_addr, bcc_addr,
                   date_sent, date_received, thread_count,
                   locker_source, body, body_single, is_spam, is_draft
            FROM emails
            {where}
        """)

        # Track unique rfc822_ids we've already inserted (collapse multi-account dupes)
        seen_canonical = set()
        batch_count = 0
        start = time.time()

        for row in cursor:
            self.stats['email_scanned'] += 1
            rfc822_id = row['rfc822_id'].strip().strip('<>')
            if not rfc822_id:
                continue

            canonical_id = f"email:{rfc822_id}"
            subject = row['subject'] or ''
            body = row['body'] or row['body_single'] or ''
            date_str = row['date_sent'] or row['date_received'] or ''
            from_addr = row['from_addr'] or ''
            to_addr = row['to_addr'] or ''
            cc_addr = row['cc_addr'] or ''
            bcc_addr = row['bcc_addr'] or ''
            category = row['category'] or 'archived'
            account = row['account'] or ''
            locker = row['locker_source'] or ''

            title = f"Email: {subject[:100]}"
            summary = f"From: {from_addr} → To: {to_addr}"

            # Build primary_ids with drive links if available
            primary_ids = {
                'message_id': rfc822_id,
                'gmail_id': row['gmail_id'] or '',
                'account': account,
                'locker': locker,
            }
            dlinks = drive_links.get(rfc822_id) or drive_links.get(row['rfc822_id'])
            if dlinks:
                primary_ids['drive_links'] = dlinks

            # Build tags from category + labels
            tags = ['email', category]
            labels = row['labels_raw'] or ''
            for lbl in labels.split(','):
                lbl = lbl.strip().strip('"')
                if lbl and not lbl.startswith('^'):
                    tags.append(lbl)
            if row['is_draft']:
                tags.append('draft')

            is_first_account = canonical_id not in seen_canonical

            # Insert evidence (only first account gets the insert)
            if is_first_account:
                try:
                    cur = self.hub_conn.execute(
                        """INSERT INTO evidence
                           (canonical_id, source_type, title, summary, body_snippet,
                            start_timestamp, tags, primary_ids)
                           VALUES (?, 'email', ?, ?, ?, ?, ?, ?)
                           ON CONFLICT(canonical_id) DO UPDATE SET
                               body_snippet = COALESCE(excluded.body_snippet, body_snippet),
                               summary = COALESCE(excluded.summary, summary),
                               updated_at = datetime('now')
                        """,
                        (
                            canonical_id, title, summary, body[:4000], date_str,
                            json.dumps(tags, ensure_ascii=False),
                            json.dumps(primary_ids, ensure_ascii=False),
                        )
                    )
                    is_new = cur.rowcount > 0
                    if is_new:
                        # rowcount > 0 means either INSERTed or UPDATEd
                        # We need to distinguish for stats, but simplified:
                        self.stats['email_inserted'] += 1
                        eid = cur.lastrowid
                        if not eid:
                            # If UPDATE, lastrowid might be 0 or current
                            r = self.hub_conn.execute("SELECT id FROM evidence WHERE canonical_id = ?", (canonical_id,)).fetchone()
                            eid = r[0] if r else None
                        seen_canonical.add(canonical_id)
                    else:
                        self.stats['email_deduped'] += 1
                        r = self.hub_conn.execute(
                            "SELECT id FROM evidence WHERE canonical_id = ?", (canonical_id,)
                        ).fetchone()
                        eid = r[0] if r else None
                        seen_canonical.add(canonical_id)
                        if not eid:
                            continue
                except Exception as e:
                    self.stats['errors'] += 1
                    if self.stats['errors'] <= 5:
                        print(f"   ⚠️  Insert error: {e}")
                    continue
            else:
                # Additional account — just add provenance
                r = self.hub_conn.execute(
                    "SELECT id FROM evidence WHERE canonical_id = ?", (canonical_id,)
                ).fetchone()
                eid = r[0] if r else None
                if not eid:
                    continue
                is_new = False

            # Provenance (per-account origin)
            try:
                origin_sys = f"GMAIL_MBOX_{locker}"
                self.hub_conn.execute(
                    """INSERT OR IGNORE INTO evidence_origins
                       (evidence_id, origin_system, source_file, source_rowid)
                       VALUES (?, ?, ?, ?)""",
                    (eid, origin_sys, f"{locker}:{account}", str(row['id']))
                )
                self.stats['origins_added'] += 1
            except Exception:
                pass

            # Participants (only on first insert)
            if is_new and is_first_account:
                for addr in parse_email_addr(from_addr):
                    self._link_participant(eid, addr, 'sender')
                for addr in parse_email_addr(to_addr):
                    self._link_participant(eid, addr, 'recipient')
                for addr in parse_email_addr(cc_addr):
                    self._link_participant(eid, addr, 'cc')
                for addr in parse_email_addr(bcc_addr):
                    self._link_participant(eid, addr, 'bcc')

            batch_count += 1
            if batch_count % 10000 == 0:
                self.hub_conn.commit()
                elapsed = time.time() - start
                rate = batch_count / elapsed if elapsed > 0 else 0
                print(f"   📦 {batch_count:,}/{total:,} ({rate:.0f}/sec)")

        self.hub_conn.commit()
        src.close()
        elapsed = time.time() - start
        print(f"   ✅ Full emails: {self.stats['email_inserted']:,} new, "
              f"{self.stats['email_deduped']:,} deduped, "
              f"{self.stats['email_spam_skipped']:,} spam skipped in {elapsed:.1f}s")

    # ── Summary ────────────────────────────────────────────────────────

    def print_summary(self, elapsed: float):
        s = self.stats
        print(f"\n{'='*60}")
        print(f"✅ Evidence Hub Ingestion {'(DRY RUN) ' if self.dry_run else ''}Complete")
        print(f"{'='*60}")
        print(f"   iMessage scanned:   {s['imessage_scanned']:,}")
        print(f"   iMessage inserted:  {s['imessage_inserted']:,}")
        print(f"   iMessage deduped:   {s['imessage_deduped']:,}")
        print(f"   Email scanned:      {s['email_scanned']:,}")
        print(f"   Email inserted:     {s['email_inserted']:,}")
        print(f"   Email deduped:      {s['email_deduped']:,}")
        print(f"   Email spam skipped: {s['email_spam_skipped']:,}")
        print(f"   Origins added:      {s['origins_added']:,}")
        print(f"   Participants added: {s['participants_added']:,}")
        print(f"   Links added:        {s['links_added']:,}")
        print(f"   Errors:             {s['errors']:,}")
        print(f"   Total time:         {elapsed:.1f}s")
        print(f"{'='*60}")


# ── CLI ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Evidence Hub — Direct DB Ingestion")
    parser.add_argument("--all", action="store_true", help="Ingest all sources (iMessage + full email)")
    parser.add_argument("--imessage", action="store_true", help="Ingest iMessage only")
    parser.add_argument("--email", action="store_true", help="Ingest legacy 402k email subset")
    parser.add_argument("--email-full", action="store_true", help="Ingest full 814k email index")
    parser.add_argument("--include-spam", action="store_true", help="Include spam emails (default: skip)")
    parser.add_argument("--dry-run", action="store_true", help="Count only, no writes")
    parser.add_argument("--db", type=str, default=str(DB_PATH), help="Path to evidence_hub.db")
    args = parser.parse_args()

    if not (args.all or args.imessage or args.email or args.email_full):
        parser.print_help()
        print("\n⚠️  Specify --all, --imessage, --email, or --email-full")
        return

    db = Path(args.db)
    if not db.exists() and not args.dry_run:
        print(f"❌ Database not found: {db}")
        print(f"   Run: python3 -m ingest.evidence_hub_init")
        return

    ingestor = EvidenceHubIngestor(db_path=db, dry_run=args.dry_run)
    ingestor.open()
    start = time.time()

    if args.all or args.imessage:
        ingestor.ingest_imessage(CHAT_MASTER_DB, "CHAT_DB_IMAC_2013")

    if args.email:
        ingestor.ingest_email(EMAIL_DB)
    elif args.all or args.email_full:
        ingestor.ingest_email_full(MBOX_METADATA_DB, include_spam=args.include_spam)

    ingestor.close()
    ingestor.print_summary(time.time() - start)


if __name__ == "__main__":
    main()
