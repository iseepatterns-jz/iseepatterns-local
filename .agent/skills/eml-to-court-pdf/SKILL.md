---
name: eml-to-court-pdf
description: Convert .eml email files to court-admissible PDF documents with forensic integrity. Generates individual Bates-numbered PDFs and a single combined chronological thread PDF optimized for AI analysis. Strips signatures, quoted reply chains, and legal disclaimers to surface only original message content. Use when the user asks to "convert emails to PDF," "export eml to pdf," "create court exhibits from emails," "prepare email evidence," "Bates number emails," "email thread PDF," "forensic email export," or needs email evidence formatted for legal review or AI ingestion.
---

# EML → Court-Admissible PDF Converter

## Overview

Convert `.eml` files into two deliverables:
1. **Individual court-admissible PDFs** — one per email, Bates-numbered
2. **Combined chronological thread PDF** — all emails in one document for AI analysis

## When to Use

- Converting email evidence for legal proceedings
- Preparing exhibits with Bates numbering and forensic metadata
- Creating a single document from many emails for AI (Claude Opus, etc.) ingestion
- Any scenario requiring court-admissible email documentation

## Workflow

### 1. Identify the source directory

Locate the directory containing `.eml` files. Confirm the count.

### 2. Install dependencies

```bash
pip3 install reportlab html2text
```

Required Python libraries: `reportlab`, `pypdf`, `bs4` (BeautifulSoup), `html2text`, standard `email` module.

### 3. Run the conversion script

Copy and configure `scripts/eml_to_court_pdf.py`. Edit these three constants at the top:

```python
EML_DIR    = Path("/path/to/eml/files")
PDF_DIR    = Path("/path/to/output/pdf_individual")
THREAD_PDF = Path("/path/to/output/combined_thread.pdf")
```

Then run:

```bash
python3 scripts/eml_to_court_pdf.py
```

### 4. Verify output

```bash
# Count individual PDFs
ls /path/to/output/pdf_individual/*.pdf | wc -l

# Check combined PDF page count
python3 -c "from pypdf import PdfReader; r=PdfReader('combined_thread.pdf'); print(f'Pages: {len(r.pages)}')"
```

## What the Script Produces

### Individual PDFs

Each PDF contains:
- **Bates number** (EMAIL-001, EMAIL-002, ...) in red
- **Header block** (grey): From, To, CC, Date, Subject, Message-ID
- **Cleaned body** — original message only, no signatures or quoted chains
- **Attachment inventory** — filenames, types, sizes (attachments not embedded)
- **Footer** on every page: source filename, MD5 hash, conversion timestamp

### Combined Thread PDF

Single chronologically-sorted document with:
- **Cover page**: Title, date range, email count, participant list
- **Forensic metadata**: Tool version, UTC timestamp, source directory
- **Table of contents**: All emails with Bates #, date, sender, subject
- **Email sections**: Separated by red rules, full headers + cleaned body

## Body Cleaning Logic

The script strips noise to surface only original message content:

| Removed | Pattern |
|---|---|
| Signatures | `_______`, `--`, name/title/phone blocks |
| Quoted replies | `> On ... wrote:` chains |
| Original Message blocks | `-----Original Message-----` |
| Legal disclaimers | WIRE FRAUD WARNING, Gramm-Leach-Bliley, confidentiality notices |
| Mobile signatures | `Sent from my iPhone`, `Get Outlook for` |

To add case-specific signature names, edit the `KNOWN_SIG_NAMES` list in the script.

## Forensic Integrity

Per forensic-accounting standards:

| Requirement | Implementation |
|---|---|
| Authenticity | Original Message-ID, source filename on every page |
| Completeness | Full headers preserved; attachment inventory listed |
| Chain of custody | Source path, MD5 hash, conversion timestamp |
| No inference | Raw text only, no content modification |
| Bates numbering | Sequential EMAIL-001 through EMAIL-NNN |

## Customization Points

- **`KNOWN_SIG_NAMES`** — Add participant names for signature detection
- **`SIG_START_PATTERNS`** — Add regex patterns for signature delimiters
- **`QUOTE_START_PATTERNS`** — Add patterns for quoted reply chain markers
- **`DISCLAIMER_PHRASES`** — Add legal disclaimer phrases to strip
- **Fonts/colors** — Modify `build_styles()` function for custom typography
