import os
import json
import re
from pathlib import Path
from email import policy
from email.parser import BytesParser
import html2text

BASE = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/EMAIL_THREAD_PUBLISH_LOCKER")
RAW_DIR = BASE / "eml/raw"
JSON_OUT_DIR = BASE / "processed/json"
INDEX_PATH = JSON_OUT_DIR / "threads_index.json"

SIG_START_PATTERNS = [
    re.compile(r'^_{5,}'),
    re.compile(r'^-{2,}\s*$'),
    re.compile(r'^Sent from my (iPhone|iPad|Mac)'),
    re.compile(r'^Get Outlook for'),
]

QUOTE_START_PATTERNS = [
    re.compile(r'^>?\s*On .+wrote:\s*$'),
    re.compile(r'^-{3,}\s*Original Message\s*-{3,}', re.I),
    re.compile(r'^From:\s+.+@.+', re.I),
    re.compile(r'^Begin forwarded message', re.I),
]

DISCLAIMER_PHRASES = [
    "WIRE FRAUD WARNING",
    "wire transfer fraud is on the rise",
    "Gramm-Leach-Bliley",
    "This e-mail, and any attachments thereto, is intended only",
    "This communication may contain nonpublic personal information",
    "CONFIDENTIALITY NOTICE",
    "This message is intended only for the use of",
    "PLEASE NOTE:  Wire Fraud is rampant",
]

KNOWN_SIG_NAMES = [
    "Lucas Guariglia",
    "Amber Letteer",
    "Sarah Tate",
    "Suzanne Ronayne",
    "Jody Jessup",
    "Mike Loeffler",
    "Michael Loeffler",
    "Dejana Veseli",
    "Amy Laughinghouse",
]

SIG_HINT_PHRASES = [
    "associate & senior property manager",
    "rowboat creative",
    "fulton grace realty",
    "sales | rentals | property management",
    "office:",
    "cell:",
    "p:",
    "f:",
    "www.fultongrace.com",
    "www.rowboatcreative.com",
]

def looks_like_signature_block(lines: list[str], idx: int) -> bool:
    """
    Heuristic: a signature block often has a name-ish line followed by
    a few short lines with role/company/contact/URL.
    """
    name_line = lines[idx].strip()
    lower_block = " ".join(l.strip().lower() for l in lines[idx:idx+6])
    if len(name_line.split()) < 2:
        return False
    # If any of our signature hint phrases appear in the next few lines,
    # treat this as the start of a signature block.
    return any(p in lower_block for p in SIG_HINT_PHRASES)

def clean_text(text: str) -> str:
    if not text:
        return ""
    lines = text.splitlines()
    cut_at = len(lines)

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # 1) Quoted history: be more aggressive
        #    Handle "On ... wrote:" patterns even if HTML2Text adds markup.
        if stripped.lower().startswith("on ") and " wrote:" in stripped.lower():
            cut_at = min(cut_at, i)
            break

        for pat in QUOTE_START_PATTERNS:
            if pat.search(stripped):
                cut_at = min(cut_at, i)
                break

        for pat in SIG_START_PATTERNS:
            if pat.search(stripped):
                cut_at = min(cut_at, i)
                break

        for phrase in DISCLAIMER_PHRASES:
            if phrase.lower() in stripped.lower():
                cut_at = min(cut_at, i)
                break

        # 2) Known signature names with polite closers (your existing rule)
        if i >= 1 and stripped in KNOWN_SIG_NAMES:
            prev = lines[i - 1].strip().lower()
            if not prev or any(prev.startswith(p) for p in ["thank", "best", "regards", "sincerely"]):
                if prev:
                    cut_at = min(cut_at, i - 1)
                else:
                    cut_at = min(cut_at, i)
                break

        # 3) Generic signature block heuristic
        if looks_like_signature_block(lines, i):
            # If the previous line is a polite closer, trim from there; otherwise from this line
            if i > 0 and lines[i - 1].strip().lower().startswith(("thanks", "thank you", "best", "regards")):
                cut_at = min(cut_at, i - 1)
            else:
                cut_at = min(cut_at, i)
            break

        if cut_at <= i:
            break

    cleaned_lines = lines[:cut_at]
    while cleaned_lines and not cleaned_lines[-1].strip():
        cleaned_lines.pop()

    return "\n".join(cleaned_lines)

def ensure_dirs():
    JSON_OUT_DIR.mkdir(parents=True, exist_ok=True)

def parse_eml(path: Path):
    with path.open("rb") as fp:
        msg = BytesParser(policy=policy.default).parse(fp)

    subject = msg["subject"] or ""
    from_ = msg["from"] or ""
    to = msg.get_all("to", [])
    cc = msg.get_all("cc", [])
    bcc = msg.get_all("bcc", [])

    message_id = (msg.get("Message-ID") or "").strip()
    in_reply_to = (msg.get("In-Reply-To") or "").strip()
    references_raw = msg.get_all("References", [])
    # Flatten and split on whitespace – each token is typically a Message-ID
    references: list[str] = []
    for r in references_raw or []:
        references.extend(r.split())

    def join_list(v):
        if v is None:
            return []
        if isinstance(v, str):
            return [v]
        return [str(x) for x in v]

    to_list = join_list(to)
    cc_list = join_list(cc)
    bcc_list = join_list(bcc)

    # Body (prefer text/plain, fall back to text/html)
    text_body = ""
    html_body = ""

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == "text/plain":
                text_body += part.get_content()
            elif ctype == "text/html":
                html_body += part.get_content()
    else:
        ctype = msg.get_content_type()
        if ctype == "text/plain":
            text_body = msg.get_content()
        elif ctype == "text/html":
            html_body = msg.get_content()

    if not text_body and html_body:
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.body_width = 0
        text_body = h.handle(html_body)

    cleaned = clean_text(text_body or "")

    # Attachments: basic info only
    attachments = []
    for part in msg.walk():
        if part.is_multipart():
            continue
        filename = part.get_filename()
        if not filename:
            continue
        content_type = part.get_content_type()
        size = len(part.get_payload(decode=True) or b"")
        attachments.append(
            {
                "filename": filename,
                "content_type": content_type,
                "size_bytes": size,
            }
        )

    return {
        "id": str(path.name),
        "subject": subject,
        "from": from_,
        "to": to_list,
        "cc": cc_list,
        "bcc": bcc_list,
        "message_id": message_id,
        "in_reply_to": in_reply_to,
        "references": references,
        "body_clean": cleaned,
        "attachments": attachments,
    }

def normalize_subject(subject: str) -> str:
    s = subject or ""
    s = re.sub(r"^(re:|fw:|fwd:)\s*", "", s, flags=re.IGNORECASE)
    s = " ".join(s.split())
    return s or "(no subject)"

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:80] or "no-subject"

def main():
    ensure_dirs()

    threads = {}
    for path in RAW_DIR.glob("*.eml"):
        try:
            msg_json = parse_eml(path)
        except Exception as e:
            print(f"Error parsing {path}: {e}")
            continue

        key = normalize_subject(msg_json["subject"])
        threads.setdefault(key, []).append(msg_json)

    index_entries = []
    for key, msgs in threads.items():
        msgs.sort(key=lambda m: m["id"])
        thread_slug = slugify(key)
        out_path = JSON_OUT_DIR / f"thread_{thread_slug}.json"

        out = {
            "thread_subject": key,
            "message_count": len(msgs),
            "messages": msgs,
        }

        with out_path.open("w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)

        print(f"Wrote {out_path}")

        index_entries.append(
            {
                "thread_subject": key,
                "slug": thread_slug,
                "json_file": out_path.name,
                "message_count": len(msgs),
            }
        )

    index_entries.sort(key=lambda x: x["thread_subject"].lower())

    with INDEX_PATH.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "thread_count": len(index_entries),
                "threads": index_entries,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"Index written to {INDEX_PATH} (threads: {len(index_entries)})")
    print("Done.")

if __name__ == "__main__":
    main()
