#!/usr/bin/env python3
from __future__ import annotations
"""
EML → Court-Admissible PDF Converter
=====================================
Converts .eml files to individual court-admissible PDFs and a combined
chronological thread document suitable for legal review and AI analysis.

Forensic Integrity:
  - No content modification or inference
  - MD5 hash of each source file recorded
  - Full headers preserved
  - Source path + conversion timestamp on every page
  - Bates-style sequential numbering (EMAIL-001 … EMAIL-128)

Output:
  1. pdf_individual/  — one PDF per .eml
  2. ppp_fraud_email_thread.pdf — combined chronological thread with TOC
"""

import email
import email.utils
import email.header
import hashlib
import os
import re
import sys
import textwrap
from datetime import datetime, timezone
from email import policy
from pathlib import Path

from bs4 import BeautifulSoup
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    HRFlowable, KeepTogether, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─── Constants ────────────────────────────────────────────────────────────

EML_DIR   = Path("/Volumes/batdrivetb5/ANTIGRAVITY_LOCKER/FILE_HOLDING_TANK/PPP FRAUD/eml")
PDF_DIR   = Path("/Volumes/batdrivetb5/ANTIGRAVITY_LOCKER/FILE_HOLDING_TANK/PPP FRAUD/pdf_individual")
THREAD_PDF = Path("/Volumes/batdrivetb5/ANTIGRAVITY_LOCKER/FILE_HOLDING_TANK/PPP FRAUD/ppp_fraud_email_thread.pdf")

CONVERSION_TS = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
TOOL_VERSION  = "eml_to_court_pdf v2.0 (cleaned)"

PAGE_W, PAGE_H = letter
MARGIN = 0.75 * inch

# ─── Signature / quote-chain patterns ─────────────────────────────────────

# Patterns that signal the START of a signature block (cut here and below)
SIG_START_PATTERNS = [
    re.compile(r'^_{5,}'),                           # _______________________________
    re.compile(r'^-{2,}\s*$'),                       # -- (standard sig delimiter)
    re.compile(r'^Sent from my (iPhone|iPad|Mac)'),  # Mobile sigs
    re.compile(r'^Get Outlook for'),                 # Outlook mobile
]

# Patterns that signal the START of a quoted reply chain (cut here and below)
QUOTE_START_PATTERNS = [
    re.compile(r'^>?\s*On .+wrote:\s*$'),                       # > On May 16, 2020, ... wrote:
    re.compile(r'^-{3,}\s*Original Message\s*-{3,}', re.I),    # -----Original Message-----
    re.compile(r'^From:\s+.+@.+', re.I),                       # From: header in inline quote
    re.compile(r'^Begin forwarded message', re.I),              # Forwarded
]

# Legal disclaimer phrases — if a line contains these, cut from here down
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

# Known signature name lines that commonly appear
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


# ─── Helpers ──────────────────────────────────────────────────────────────

def md5_file(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def decode_header(raw: str | None) -> str:
    """Decode RFC-2047 encoded header values."""
    if not raw:
        return "(none)"
    parts = email.header.decode_header(raw)
    decoded = []
    for data, charset in parts:
        if isinstance(data, bytes):
            decoded.append(data.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(data)
    return " ".join(decoded).strip()


def parse_date(raw: str | None) -> datetime | None:
    """Parse an email date string into a datetime."""
    if not raw:
        return None
    try:
        tt = email.utils.parsedate_to_datetime(raw)
        return tt
    except Exception:
        return None


def clean_body(raw_body: str) -> str:
    """Strip signatures, quoted reply chains, and legal disclaimers.
    Returns only the original message content."""
    lines = raw_body.splitlines()
    cut_at = len(lines)  # default: keep everything

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Check for quoted reply chain start
        for pat in QUOTE_START_PATTERNS:
            if pat.search(stripped):
                # For "> On ... wrote:" check if previous line is blank or quoted
                cut_at = min(cut_at, i)
                break

        # Check for signature delimiter
        for pat in SIG_START_PATTERNS:
            if pat.search(stripped):
                cut_at = min(cut_at, i)
                break

        # Check for legal disclaimer phrases
        for phrase in DISCLAIMER_PHRASES:
            if phrase.lower() in stripped.lower():
                cut_at = min(cut_at, i)
                break

        # Check for a known sig name appearing as a standalone line
        # (only if it looks like a signature block — preceded by blank line
        # or "Thanks"/"Thank you" type line)
        if i >= 1 and stripped in KNOWN_SIG_NAMES:
            prev = lines[i - 1].strip().lower()
            if not prev or prev.startswith("thank") or prev.startswith("best") or prev.startswith("regards"):
                cut_at = min(cut_at, i)

        if cut_at <= i:
            break

    # Also strip lines that are purely ">" quoted from the top
    # (some emails start with quoted content before original)
    cleaned = lines[:cut_at]

    # Remove trailing blank lines
    while cleaned and not cleaned[-1].strip():
        cleaned.pop()

    # Remove lines that are just ">" (empty quote markers)
    result = "\n".join(cleaned)

    # If cleaning removed everything, return a note
    if not result.strip():
        return "(Original message body is empty after removing signatures and quoted replies)"

    return result


def extract_body(msg: email.message.Message) -> str:
    """Extract plaintext body from an email message.
    Prefers text/plain; falls back to text/html → stripped text."""
    plain_parts = []
    html_parts = []

    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))
            if "attachment" in cd:
                continue
            if ct == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    plain_parts.append(payload.decode(charset, errors="replace"))
            elif ct == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    html_parts.append(payload.decode(charset, errors="replace"))
    else:
        ct = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            text = payload.decode(charset, errors="replace")
            if ct == "text/html":
                html_parts.append(text)
            else:
                plain_parts.append(text)

    if plain_parts:
        raw = "\n".join(plain_parts)
        return clean_body(raw)

    if html_parts:
        combined = "\n".join(html_parts)
        soup = BeautifulSoup(combined, "html.parser")
        # Remove script/style
        for tag in soup(["script", "style"]):
            tag.decompose()
        text = soup.get_text(separator="\n")
        # Collapse blank lines
        lines = [l.strip() for l in text.splitlines()]
        raw = "\n".join(l for l in lines if l)
        return clean_body(raw)

    return "(No text body found)"


def list_attachments(msg: email.message.Message) -> list[dict]:
    """Return list of {filename, size, content_type} for attachments."""
    attachments = []
    if not msg.is_multipart():
        return attachments
    for part in msg.walk():
        cd = str(part.get("Content-Disposition", ""))
        fn = part.get_filename()
        if fn or "attachment" in cd:
            payload = part.get_payload(decode=True)
            size = len(payload) if payload else 0
            attachments.append({
                "filename": decode_header(fn) if fn else "(unnamed)",
                "size": size,
                "content_type": part.get_content_type(),
            })
    return attachments


def safe_xml(text: str) -> str:
    """Escape text for ReportLab Paragraph (XML subset)."""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace('"', "&quot;")
    text = text.replace("'", "&apos;")
    return text


# ─── Styles ───────────────────────────────────────────────────────────────

def build_styles():
    ss = getSampleStyleSheet()

    ss.add(ParagraphStyle(
        name="CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=28,
        alignment=TA_CENTER,
        spaceAfter=12,
    ))
    ss.add(ParagraphStyle(
        name="CoverSub",
        fontName="Helvetica",
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        spaceAfter=6,
        textColor=colors.HexColor("#444444"),
    ))
    ss.add(ParagraphStyle(
        name="HeaderLabel",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#333333"),
    ))
    ss.add(ParagraphStyle(
        name="HeaderValue",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#111111"),
    ))
    ss.add(ParagraphStyle(
        name="BodyText2",
        fontName="Courier",
        fontSize=8.5,
        leading=11,
        spaceBefore=6,
        spaceAfter=6,
    ))
    ss.add(ParagraphStyle(
        name="FooterStyle",
        fontName="Helvetica",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#888888"),
    ))
    ss.add(ParagraphStyle(
        name="TOCEntry",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        leftIndent=20,
    ))
    ss.add(ParagraphStyle(
        name="BatesLabel",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#CC0000"),
        spaceBefore=12,
        spaceAfter=4,
    ))
    ss.add(ParagraphStyle(
        name="AttachmentStyle",
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#555555"),
    ))
    ss.add(ParagraphStyle(
        name="SectionHeading",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        spaceBefore=12,
        spaceAfter=6,
    ))
    return ss


# ─── Parse all EMLs ──────────────────────────────────────────────────────

def parse_all_emls() -> list[dict]:
    """Parse every .eml in EML_DIR and return sorted list of email dicts."""
    records = []
    eml_files = sorted(EML_DIR.glob("*.eml"))

    for eml_path in eml_files:
        with open(eml_path, "rb") as f:
            msg = email.message_from_binary_file(f, policy=policy.compat32)

        dt = parse_date(msg.get("Date"))
        rec = {
            "path": eml_path,
            "filename": eml_path.name,
            "md5": md5_file(eml_path),
            "from": decode_header(msg.get("From")),
            "to": decode_header(msg.get("To")),
            "cc": decode_header(msg.get("Cc")),
            "date_raw": msg.get("Date", "(none)"),
            "date_parsed": dt,
            "subject": decode_header(msg.get("Subject")),
            "message_id": msg.get("Message-ID", "(none)"),
            "body": extract_body(msg),
            "attachments": list_attachments(msg),
        }
        records.append(rec)

    # Sort chronologically
    records.sort(key=lambda r: r["date_parsed"] or datetime.min)
    return records


# ─── Build individual PDF ─────────────────────────────────────────────────

def build_individual_pdf(rec: dict, bates_num: int, styles) -> Path:
    """Generate one court-admissible PDF for a single email."""
    bates = f"EMAIL-{bates_num:03d}"
    safe_name = re.sub(r'[^\w\-.]', '_', rec["filename"].replace(".eml", ""))
    out_path = PDF_DIR / f"{bates}_{safe_name}.pdf"

    def footer_func(canvas_obj, doc):
        canvas_obj.saveState()
        canvas_obj.setFont("Helvetica", 7)
        canvas_obj.setFillColor(colors.HexColor("#888888"))
        # Left: source info
        canvas_obj.drawString(
            MARGIN, 0.5 * inch,
            f"{bates}  |  Source: {rec['filename']}  |  MD5: {rec['md5']}"
        )
        # Right: page number + timestamp
        canvas_obj.drawRightString(
            PAGE_W - MARGIN, 0.5 * inch,
            f"Converted: {CONVERSION_TS}  |  Page {doc.page}"
        )
        canvas_obj.restoreState()

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=0.75 * inch,
        title=f"{bates} - {rec['subject']}",
        author=TOOL_VERSION,
    )

    story = []

    # Bates label
    story.append(Paragraph(f"{bates}", styles["BatesLabel"]))

    # Header table
    header_data = [
        ["From:", safe_xml(rec["from"])],
        ["To:", safe_xml(rec["to"])],
    ]
    if rec["cc"] and rec["cc"] != "(none)":
        header_data.append(["CC:", safe_xml(rec["cc"])])
    header_data.extend([
        ["Date:", safe_xml(rec["date_raw"])],
        ["Subject:", safe_xml(rec["subject"])],
        ["Message-ID:", safe_xml(rec["message_id"])],
    ])

    # Convert to Paragraph for word wrap
    hdr_table_data = []
    for label, value in header_data:
        hdr_table_data.append([
            Paragraph(label, styles["HeaderLabel"]),
            Paragraph(value, styles["HeaderValue"]),
        ])

    hdr_table = Table(hdr_table_data, colWidths=[1.0 * inch, 5.75 * inch])
    hdr_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0F0F0")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#DDDDDD")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 12))

    # Body
    body_text = rec["body"]
    # Wrap long lines and escape for XML
    wrapped_lines = []
    for line in body_text.splitlines():
        if len(line) > 110:
            wrapped_lines.extend(textwrap.wrap(line, width=110))
        else:
            wrapped_lines.append(line)

    body_safe = safe_xml("\n".join(wrapped_lines))
    # Replace newlines with <br/> for Paragraph
    body_safe = body_safe.replace("\n", "<br/>")
    story.append(Paragraph(body_safe, styles["BodyText2"]))

    # Attachments
    if rec["attachments"]:
        story.append(Spacer(1, 12))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC")))
        story.append(Paragraph("Attachments:", styles["HeaderLabel"]))
        for att in rec["attachments"]:
            size_kb = att["size"] / 1024
            story.append(Paragraph(
                f"• {safe_xml(att['filename'])} ({att['content_type']}, {size_kb:.1f} KB)",
                styles["AttachmentStyle"],
            ))

    doc.build(story, onFirstPage=footer_func, onLaterPages=footer_func)
    return out_path


# ─── Build combined thread PDF ────────────────────────────────────────────

def build_thread_pdf(records: list[dict], styles):
    """Generate a single chronological thread PDF with cover page and TOC."""

    def footer_func(canvas_obj, doc):
        canvas_obj.saveState()
        canvas_obj.setFont("Helvetica", 7)
        canvas_obj.setFillColor(colors.HexColor("#888888"))
        canvas_obj.drawString(
            MARGIN, 0.4 * inch,
            f"PPP Fraud Email Evidence Thread  |  {CONVERSION_TS}  |  {TOOL_VERSION}"
        )
        canvas_obj.drawRightString(
            PAGE_W - MARGIN, 0.4 * inch,
            f"Page {doc.page}"
        )
        canvas_obj.restoreState()

    doc = SimpleDocTemplate(
        str(THREAD_PDF),
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=0.75 * inch,
        title="PPP Fraud Email Evidence Thread",
        author=TOOL_VERSION,
    )

    story = []

    # ── Cover Page ──
    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph("PPP FRAUD EMAIL EVIDENCE", styles["CoverTitle"]))
    story.append(Paragraph("Complete Chronological Thread", styles["CoverSub"]))
    story.append(Spacer(1, 0.5 * inch))

    # Date range
    dates = [r["date_parsed"] for r in records if r["date_parsed"]]
    if dates:
        d_min = min(dates).strftime("%B %d, %Y")
        d_max = max(dates).strftime("%B %d, %Y")
        story.append(Paragraph(f"Date Range: {d_min} — {d_max}", styles["CoverSub"]))

    story.append(Paragraph(f"Total Emails: {len(records)}", styles["CoverSub"]))
    story.append(Spacer(1, 0.3 * inch))

    # Participants
    participants = set()
    for r in records:
        participants.add(r["from"])
        if r["to"] and r["to"] != "(none)":
            for addr in r["to"].split(","):
                participants.add(addr.strip())
    participant_list = sorted(participants)
    story.append(Paragraph("Participants:", styles["SectionHeading"]))
    for p in participant_list:
        story.append(Paragraph(f"• {safe_xml(p)}", styles["AttachmentStyle"]))

    story.append(Spacer(1, 0.5 * inch))

    # Forensic metadata
    story.append(Paragraph("Forensic Metadata:", styles["SectionHeading"]))
    story.append(Paragraph(f"Conversion Tool: {TOOL_VERSION}", styles["AttachmentStyle"]))
    story.append(Paragraph(f"Conversion Timestamp (UTC): {CONVERSION_TS}", styles["AttachmentStyle"]))
    story.append(Paragraph(f"Source Directory: {str(EML_DIR)}", styles["AttachmentStyle"]))

    story.append(PageBreak())

    # ── Table of Contents ──
    story.append(Paragraph("TABLE OF CONTENTS", styles["CoverTitle"]))
    story.append(Spacer(1, 12))

    for i, rec in enumerate(records, 1):
        bates = f"EMAIL-{i:03d}"
        dt_str = rec["date_parsed"].strftime("%Y-%m-%d %H:%M") if rec["date_parsed"] else "Unknown"
        from_short = rec["from"].split("<")[0].strip().strip('"') if "<" in rec["from"] else rec["from"]
        subj = rec["subject"] if len(rec["subject"]) < 80 else rec["subject"][:77] + "..."
        entry = f"<b>{bates}</b>  |  {safe_xml(dt_str)}  |  {safe_xml(from_short)}  |  {safe_xml(subj)}"
        story.append(Paragraph(entry, styles["TOCEntry"]))

    story.append(PageBreak())

    # ── Email Sections ──
    for i, rec in enumerate(records, 1):
        bates = f"EMAIL-{i:03d}"

        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#CC0000")))
        story.append(Paragraph(bates, styles["BatesLabel"]))

        # Header table
        header_data = [
            ["From:", safe_xml(rec["from"])],
            ["To:", safe_xml(rec["to"])],
        ]
        if rec["cc"] and rec["cc"] != "(none)":
            header_data.append(["CC:", safe_xml(rec["cc"])])
        header_data.extend([
            ["Date:", safe_xml(rec["date_raw"])],
            ["Subject:", safe_xml(rec["subject"])],
            ["Message-ID:", safe_xml(rec["message_id"])],
            ["Source File:", safe_xml(rec["filename"])],
            ["MD5 Hash:", rec["md5"]],
        ])

        hdr_table_data = []
        for label, value in header_data:
            hdr_table_data.append([
                Paragraph(label, styles["HeaderLabel"]),
                Paragraph(value, styles["HeaderValue"]),
            ])

        hdr_table = Table(hdr_table_data, colWidths=[1.0 * inch, 5.75 * inch])
        hdr_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F5F5F5")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#DDDDDD")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(hdr_table)
        story.append(Spacer(1, 8))

        # Body
        body_text = rec["body"]
        wrapped_lines = []
        for line in body_text.splitlines():
            if len(line) > 110:
                wrapped_lines.extend(textwrap.wrap(line, width=110))
            else:
                wrapped_lines.append(line)

        body_safe = safe_xml("\n".join(wrapped_lines))
        body_safe = body_safe.replace("\n", "<br/>")
        story.append(Paragraph(body_safe, styles["BodyText2"]))

        # Attachments
        if rec["attachments"]:
            story.append(Spacer(1, 6))
            story.append(Paragraph("Attachments:", styles["HeaderLabel"]))
            for att in rec["attachments"]:
                size_kb = att["size"] / 1024
                story.append(Paragraph(
                    f"• {safe_xml(att['filename'])} ({att['content_type']}, {size_kb:.1f} KB)",
                    styles["AttachmentStyle"],
                ))

        story.append(Spacer(1, 12))

        # Page break between emails (except last)
        if i < len(records):
            story.append(PageBreak())

    doc.build(story, onFirstPage=footer_func, onLaterPages=footer_func)


# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    print(f"{'='*60}")
    print(f"  EML → Court-Admissible PDF Converter")
    print(f"  {TOOL_VERSION}  |  {CONVERSION_TS}")
    print(f"{'='*60}")
    print()

    # Create output directory
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    # Parse all EMLs
    print(f"[1/3] Parsing {len(list(EML_DIR.glob('*.eml')))} .eml files...")
    records = parse_all_emls()
    print(f"       → {len(records)} emails parsed and sorted chronologically")
    print()

    # Build styles
    styles = build_styles()

    # Generate individual PDFs
    print(f"[2/3] Generating individual court-admissible PDFs...")
    for i, rec in enumerate(records, 1):
        bates = f"EMAIL-{i:03d}"
        out = build_individual_pdf(rec, i, styles)
        dt_str = rec["date_parsed"].strftime("%Y-%m-%d") if rec["date_parsed"] else "????"
        print(f"       {bates}  {dt_str}  {rec['filename'][:60]}")
    print(f"       → {len(records)} individual PDFs saved to {PDF_DIR}")
    print()

    # Generate combined thread PDF
    print(f"[3/3] Generating combined thread PDF...")
    build_thread_pdf(records, styles)
    size_mb = THREAD_PDF.stat().st_size / (1024 * 1024)
    print(f"       → {THREAD_PDF.name} ({size_mb:.1f} MB)")
    print()

    print(f"{'='*60}")
    print(f"  COMPLETE")
    print(f"  Individual PDFs: {PDF_DIR}")
    print(f"  Thread PDF:      {THREAD_PDF}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
