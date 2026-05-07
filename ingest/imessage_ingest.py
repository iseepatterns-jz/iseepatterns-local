# ingest/imessage_ingest.py
import uuid
import sqlite3
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Set

from .evidence_card import EvidenceCard

WHITELIST_HANDLES = {
    # Joseph Zangrilli (Owner)
    "+17736109104", "joe@rowboatcreative.com",
    
    # Authoritative Players (from identify-players.csv)
    "+18478280944", "lucas@rowboatcreative.com", # Lucas Guariglia
    "+17043407505",  # Suzanne Guariglia
    "+17738529219",  # Leonard Mayersky
    "+17083075156",  # Pamela Visvardis
    "+17204540129",  # Thomas Nitschke
    "+18473801876",  # Michael Sanderson
    "+13127254069",  # Ryan Hayes
    "+18478040165",  # Henry Badani
    "+18473870518",  # Steven Farag
    "+13124203036", "george.g@rudderservices.com", # George Grigorakos
    "+16305311521",  # Elliot Hershik
    "+16307018110",  # Sheri Highland
    "+17736366744", "abel@rowboatcreative.com",  # Abel Rodriguez
    "patrick@rowboatcreative.com", # Patrick Houdek
    "+14847588413",  # Jeff Paolino
    "+17733549538", "jay@rowboatcreative.com",  # Jay Goebel
    "+12245670848", "stephanie@rowboatcreative.com", # Stephanie Cuccinella
    "+17737190088",  # Kevin Rotter
    "fiddes56@gmail.com", "+13093393391",  # Luke Fiddes
    "taylor@pendulum-creative.com", "+18043176988",  # Taylor Smith
    "+17738515303",  # John Azara
    "+17735161720",  # Wally Klejka
    "+13122753110",  # David Baum
    "+13128487283",  # Nicole Yalaz
    "+19135485577",  # Jon Duong
    "+14066721522",  # Carmel Halim
    "+17577495856",  # Sam Cobb
    "+15105026585",  # Sal Mohamed
    "+17735584454",  # Eric Montanez
    "+18572212405",  # Jimmy Bui
    "+17739722946",  # Manny Caston
    "+16309955836",  # Cameron Lowe
    "+17733019422",  # Jose Aburto
    "+16304325005",  # Amber Dys
    "+16302729916",  # Stevie Hopkins
    "+18474319455",  # Adrienne Guariglia
    "+13127201399",  # Marie Hale
    "+13125151010",  # James Johansen
    "+13125437354",  # Gregory Jordan
    "+17818711003",  # Jaclyn Torrey
    "+13123443801",  # Samuel Tanios
    "+17734433476",  # Oladipo Folami
    
    # User Explicit Corrections & Relevant Clients
    "+17734196004", "joe@vita-morte.com", "joe@joefreshgoods.com", # Joe FreshGoods (Joe Robinson)
    "+17085281818",  # Tom Labadie (Corrected)
}

DATA_DIR = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data")
CARDS_OUT = DATA_DIR / "evidence_cards"

# Default (you can still use this if you want a single-DB call)
CHAT_DB_PATH = Path(
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_decoded_body_all_chat_from_m1studio.db"
)


def _unix_to_iso8601(ts: int) -> str:
    # Temporarily disable conversion; keep raw value in extra.
    return None


def _detect_db_style(conn) -> Dict[str, Any]:
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(message)")
    cols = {row[1] for row in cur.fetchall()}  # row[1] is column name
    return {
        "has_decoded_body": "decodedBody" in cols,
        "has_thread_originator": "thread_originator_guid" in cols,
    }



def _choose_body(row, style):
    if style["has_decoded_body"]:
        return (row["decoded_body"] or row["message_text"] or "")
    else:
        return (row["message_text"] or "")


def _get_conn(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def _get_chat_participants(conn: sqlite3.Connection, chat_rowid: int) -> Set[str]:
    q = """
    SELECT h.id
    FROM chat_handle_join chj
    JOIN handle h ON chj.handle_id = h.ROWID
    WHERE chj.chat_id = ?
    """
    cur = conn.cursor()
    cur.execute(q, (chat_rowid,))
    return {row["id"] for row in cur.fetchall() if row["id"]}


def _iter_imessage_rows(conn: sqlite3.Connection, style: Dict[str, Any]):
    cur = conn.cursor()
    has_decoded = style.get("has_decoded_body", False)
    has_thread_originator = style.get("has_thread_originator", False)

    decoded_col = "m.decodedBody AS decoded_body" if has_decoded else "NULL AS decoded_body"
    thread_originator_col = (
        "m.thread_originator_guid AS thread_originator_guid"
        if has_thread_originator
        else "NULL AS thread_originator_guid"
    )

    q = f"""
    SELECT
        m.ROWID              AS message_rowid,
        m.guid               AS message_guid,
        m.text               AS message_text,
        {decoded_col},
        m.date               AS message_date,
        m.date_read          AS date_read,
        m.date_delivered     AS date_delivered,
        m.is_from_me         AS is_from_me,
        m.is_audio_message   AS is_audio_message,
        m.is_service_message AS is_service_message,
        m.is_system_message  AS is_system_message,
        m.is_spam            AS is_spam,
        m.is_corrupt         AS is_corrupt,
        m.associated_message_guid   AS associated_message_guid,
        {thread_originator_col},
        m.sort_id            AS sort_id,

        h.id                 AS handle_id,
        h.service            AS handle_service,

        c.ROWID              AS chat_rowid,
        c.guid               AS chat_guid,
        c.chat_identifier    AS chat_identifier,
        c.style              AS chat_style

    FROM message m
    LEFT JOIN handle h
      ON m.handle_id = h.ROWID
    LEFT JOIN chat_message_join cmj
      ON cmj.message_id = m.ROWID
    LEFT JOIN chat c
      ON c.ROWID = cmj.chat_id
    ORDER BY c.guid, m.date
    """

    for row in cur.execute(q):
        yield row


def _get_attachments_for_message(conn: sqlite3.Connection, message_rowid: int):
    q = """
    SELECT
        a.guid        AS attachment_guid,
        a.filename    AS filename,
        a.mime_type   AS mime_type,
        a.total_bytes AS total_bytes
    FROM message_attachment_join maj
    JOIN attachment a
      ON maj.attachment_id = a.ROWID
    WHERE maj.message_id = ?
    """
    cur = conn.cursor()
    cur.execute(q, (message_rowid,))
    return [dict(r) for r in cur.fetchall()]


def generate_imessage_cards_for_db(chat_db_path: Path, origin_system: str):
    """
    Generate one EvidenceCard per iMessage/SMS from the given chat DB.
    """
    print(f"💬 Generating EvidenceCards from iMessage chat DB: {chat_db_path}")

    if not chat_db_path.exists():
        print(f"   No chat DB at {chat_db_path}, skipping.")
        return

    CARDS_OUT.mkdir(parents=True, exist_ok=True)
    conn = _get_conn(chat_db_path)

    try:
        db_style = _detect_db_style(conn)

        for row in _iter_imessage_rows(conn, db_style):
            msg_rowid = row["message_rowid"]
            msg_guid = row["message_guid"]
            chat_rowid = row["chat_rowid"]
            chat_guid = row["chat_guid"]
            chat_identifier = row["chat_identifier"]
            chat_style = row["chat_style"]

            is_from_me = bool(row["is_from_me"] or 0)
            handle_id = row["handle_id"]
            handle_service = row["handle_service"]

            participants_set = set()
            if chat_rowid is not None:
                participants_set |= _get_chat_participants(conn, chat_rowid)
            if handle_id:
                participants_set.add(handle_id)
            participants = sorted(p for p in participants_set if p)

            # Filter: keep only if any participant is in the whitelist
            if WHITELIST_HANDLES and not (participants_set & WHITELIST_HANDLES):
                continue

            date_raw = row["message_date"]
            start_ts = None  # or str(date_raw) if you want a string copy

            attachments = _get_attachments_for_message(conn, msg_rowid)
            has_attachments = len(attachments) > 0
            attachment_guids = [a["attachment_guid"] for a in attachments]
            attachment_filenames = [a["filename"] for a in attachments if a["filename"]]
            attachment_mimes = [a["mime_type"] for a in attachments if a["mime_type"]]

            text = _choose_body(row, db_style)
            text = str(text)

            who = handle_id or "unknown"
            direction = "outgoing" if is_from_me else "incoming"
            title = f"iMessage {direction} in chat {chat_guid or chat_identifier or chat_rowid}"
            summary = f"{direction.capitalize()} message by {who} in chat {chat_guid or chat_identifier}."

            bullets = [
                f"Direction: {direction}",
                f"Participants: {', '.join(participants[:5])}",
                f"Chat style: {chat_style}",
                f"Has attachments: {has_attachments}",
            ]

            primary_ids: Dict[str, str] = {}
            if msg_rowid is not None:
                primary_ids["message_rowid"] = str(msg_rowid)
            if msg_guid:
                primary_ids["message_guid"] = str(msg_guid)
            if chat_guid:
                primary_ids["chat_guid"] = str(chat_guid)
            if chat_identifier:
                primary_ids["chat_identifier"] = str(chat_identifier)
            if attachment_guids:
                primary_ids["attachment_guids"] = ",".join(attachment_guids)

            extra: Dict[str, Any] = {
                "source_db_path": str(chat_db_path),
                "origin_system": origin_system,
                "chat_rowid": chat_rowid,
                "chat_style": chat_style,
                "chat_identifier": chat_identifier,
                "handle_id": handle_id,
                "handle_service": handle_service,
                "message_date_raw": date_raw,
                "date_read_raw": row["date_read"],
                "date_delivered_raw": row["date_delivered"],
                "is_from_me": int(is_from_me),
                "is_audio_message": row["is_audio_message"],
                "is_service_message": row["is_service_message"],
                "is_system_message": row["is_system_message"],
                "is_spam": row["is_spam"],
                "is_corrupt": row["is_corrupt"],
                "associated_message_guid": row["associated_message_guid"],
                "thread_originator_guid": row["thread_originator_guid"],
                "sort_id": row["sort_id"],
                "attachment_guids": attachment_guids,
                "attachment_filenames": attachment_filenames,
                "attachment_mime_types": attachment_mimes,
                "has_decoded_body": db_style["has_decoded_body"],
            }

            card = EvidenceCard(
                id=str(uuid.uuid4()),
                source_type="imessage",
                file_path=str(chat_db_path),
                origin_system=origin_system,
                primary_ids=primary_ids,
                participants=participants,
                start_timestamp=start_ts,
                end_timestamp=start_ts,
                title=title,
                summary=summary,
                bullets=bullets,
                body_snippet=text[:4000],
                tags=["imessage", "chat"],
                extra=extra,
            )

            out_name = f"imsg_{origin_system}_{msg_rowid}.json"
            out_path = CARDS_OUT / out_name
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(card.to_json())

    finally:
        conn.close()

    print(f"✅ iMessage EvidenceCard generation complete for {chat_db_path}")


def generate_imessage_cards():
    """
    Backwards-compatible wrapper: generate cards for the default m1studio DB.
    """
    generate_imessage_cards_for_db(CHAT_DB_PATH, origin_system="CHAT_DB_M1STUDIO")
