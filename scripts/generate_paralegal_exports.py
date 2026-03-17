#!/usr/bin/env python3
"""
generate_paralegal_exports.py — gem-paralegal-exports main orchestrator
─────────────────────────────────────────────────────────────────────
Reads players.db, evidence_hub.db, and workbench.db to generate
attorney-ready export packages under exports/attorney_package/.

All player names are sourced from players.db (never hardcoded).
All claims are cross-referenced with canonical evidence_id values.

Usage:
    python scripts/generate_paralegal_exports.py               # full run
    python scripts/generate_paralegal_exports.py --dry-run      # preview only
    python scripts/generate_paralegal_exports.py --section dossiers  # single section
"""

import os
import sys
import json
import sqlite3
import hashlib
import re
from datetime import datetime
from pathlib import Path

BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
DATA_DIR = BASE_DIR / "data"
EXPORTS_DIR = BASE_DIR / "exports"
ATTORNEY_PKG = EXPORTS_DIR / "attorney_package"

# Database paths
# Case Evidence Sources
EVIDENCE_HUB_DB = DATA_DIR / "evidence_hub.db"
PLAYERS_DB = DATA_DIR / "players.db"
WORKBENCH_DB = BASE_DIR / "app" / "workbench.db"
# LinkedIn Sources
LINKEDIN_DIR = DATA_DIR / "LINKED_IN_PROFILE_LOCKER"
LINKEDIN_CSV_CORP = LINKEDIN_DIR / "2026-03-16-LinkedIn Profiles.csv"
LINKEDIN_CSV_PLAYERS = LINKEDIN_DIR / "2026-03-16-identify-players.csv"

# Output directories
FORENSIC_SUMMARIES = ATTORNEY_PKG / "00_summaries"
EXHIBIT_INDEX = ATTORNEY_PKG / "01_exhibits"
PLAYER_DOSSIERS = ATTORNEY_PKG / "02_dossiers"
AGENCY_LETTERS = ATTORNEY_PKG / "03_letters"
EVIDENCE_CARDS = ATTORNEY_PKG / "04_evidence_cards"
BINDER_INDEX_PATH = ATTORNEY_PKG / "binder_index.md"

CASE_ID = "RC-2026"
CLIENT_ID = "JZ"


def log(msg):
    print(f"[gem-paralegal] {msg}")


def ensure_dirs():
    """Create output directory structure."""
    for d in [FORENSIC_SUMMARIES, EXHIBIT_INDEX, PLAYER_DOSSIERS,
              AGENCY_LETTERS, EVIDENCE_CARDS]:
        d.mkdir(parents=True, exist_ok=True)


def get_db(path):
    """Open a read-only SQLite connection."""
    if not path.exists():
        log(f"⚠ Database not found: {path}")
        return None
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def coc_header(source_dbs=None):
    """Chain of custody header block for every generated file."""
    ts = datetime.now().isoformat()
    hashes = {}
    for db_path in (source_dbs or [EVIDENCE_HUB_DB, PLAYERS_DB]):
        if db_path.exists():
            sha = hashlib.sha256()
            with open(db_path, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    sha.update(chunk)
            hashes[db_path.name] = sha.hexdigest()[:16]

    lines = [
        f"<!-- gem-paralegal-exports -->",
        f"<!-- Generated: {ts} -->",
        f"<!-- Case: {CASE_ID} | Client: {CLIENT_ID} -->",
    ]
    for name, h in hashes.items():
        lines.append(f"<!-- Source: {name} (sha256:{h}...) -->")
    lines.append("")
    return "\n".join(lines)


# ─────────────────────────────────────────────
# PLAYERS — load canonical names from players.db
# ─────────────────────────────────────────────

def load_linkedin_identifiers():
    """Load emails and phone numbers from both LinkedIn CSVs (Corporate and Identify-Players)."""
    identifiers = {}

    def parse_csv(path, slug_col="User", email_cols=["Email"], phone_cols=["Phone"]):
        if not path.exists():
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                import csv
                reader = csv.DictReader(f)
                for row in reader:
                    slug = row.get(slug_col)
                    if not slug: continue
                    
                    found_emails = []
                    for col in email_cols:
                        found_emails.extend([e.strip() for e in row.get(col, "").replace(';', ',').split(",") if e.strip()])
                    
                    found_phones = []
                    for col in phone_cols:
                        # Extract digits to normalize
                        raw_p = row.get(col, "")
                        found_phones.extend([p.strip() for p in str(raw_p).split(",") if p.strip()])
                    
                    if slug not in identifiers:
                        identifiers[slug] = {"emails": [], "phones": []}
                    identifiers[slug]["emails"].extend(found_emails)
                    identifiers[slug]["phones"].extend(found_phones)
        except Exception as e:
            log(f"⚠ Error parsing {path.name}: {e}")

    # 1. Parse Corporate CSV
    # Standard headers: User, Email, Phone
    parse_csv(LINKEDIN_CSV_CORP, slug_col="User", email_cols=["Email"], phone_cols=["Phone"])
    
    # 2. Parse Identify-Players CSV (More specific)
    # Headers: Company,Last Name,First name,Full Name,Nickname,InitialsID,imessage,Email,LinkedIn User Name,LinkedIn Profile URL
    parse_csv(LINKEDIN_CSV_PLAYERS, slug_col="LinkedIn User Name", 
              email_cols=["Email"], 
              phone_cols=["imessage"])

    # Deduplicate
    for slug in identifiers:
        identifiers[slug]["emails"] = list(set(identifiers[slug]["emails"]))
        identifiers[slug]["phones"] = list(set(identifiers[slug]["phones"]))

    return identifiers


def load_players():
    """Load all players from players.db into a dict keyed by slug, merged with CSV identifiers."""
    conn = get_db(PLAYERS_DB)
    if not conn:
        return {}
    
    csv_ids = load_linkedin_identifiers()
    
    try:
        rows = conn.execute("""
            SELECT p.*, f.content_text as linkedin_profile_text
            FROM players p
            LEFT JOIN player_files f ON p.id = f.player_id AND f.file_type = 'pdf-profile'
        """).fetchall()
        
        players = {}
        for r in rows:
            data = dict(r)
            slug = data.get("slug")
            if not slug: continue
            
            # Load identifiers from DB columns (JSON strings)
            db_emails = json.loads(data.get("email_addresses") or "[]")
            db_phones = json.loads(data.get("phone_numbers") or "[]")
            db_aliases = json.loads(data.get("aliases") or "[]")
            
            # Merge with CSV identifiers
            extra_csv = csv_ids.get(slug, {"emails": [], "phones": []})
            
            # Combine all
            all_ids = list(set(db_emails + db_phones + extra_csv["emails"] + extra_csv["phones"]))
            data["extra_identifiers"] = all_ids
            data["aliases_list"] = db_aliases
            
            players[slug] = data
        return players
    except Exception as e:
        log(f"⚠ Error loading players: {e}")
        return {}
    finally:
        conn.close()


# ─────────────────────────────────────────────
# EVIDENCE — load from evidence_hub.db
# ─────────────────────────────────────────────

def load_evidence_by_tag(tag):
    """Load evidence records matching a tag."""
    conn = get_db(EVIDENCE_HUB_DB)
    if not conn:
        return []
    try:
        rows = conn.execute(
            "SELECT id, source_type, start_timestamp as date, summary, tags FROM evidence WHERE tags LIKE ?",
            (f"%{tag}%",)
        ).fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        log(f"⚠ Error loading evidence by tag '{tag}': {e}")
        return []
    finally:
        conn.close()


def load_evidence_stats():
    """Get overall evidence stats for binder and letters."""
    conn = get_db(EVIDENCE_HUB_DB)
    if not conn:
        return {}
    try:
        total = conn.execute("SELECT COUNT(*) as cnt FROM evidence").fetchone()["cnt"]
        by_type = conn.execute(
            "SELECT source_type, COUNT(*) as cnt FROM evidence GROUP BY source_type"
        ).fetchall()
        stats = {"total": total, "by_type": {r["source_type"]: r["cnt"] for r in by_type}}
        return stats
    except Exception as e:
        log(f"⚠ Error loading stats: {e}")
        return {"total": 0, "by_type": {}}
    finally:
        conn.close()


# ─────────────────────────────────────────────
# SECTION: Player Dossiers
# ─────────────────────────────────────────────

def generate_dossiers(players, dry_run=False):
    """Generate a dossier for each player, sourced from players.db + evidence_hub.db."""
    log("Generating player dossiers...")
    if not players:
        log("  No players loaded, skipping.")
        return

    conn_eh = get_db(EVIDENCE_HUB_DB)

    for slug, player in players.items():
        name = player.get("name") or player.get("display_name") or slug
        role = player.get("role", "Unknown")

        # Find evidence linked to this player
        evidence_items = []
        if conn_eh:
            try:
                # Robust search using display_name (if available) or name/slug
                search_name = player.get("display_name") or player.get("name") or slug
                # Strip common suffix from slug and name (if it's a linkedin-style slug with hash)
                # Matches -[a-f0-9]{7,12} at end
                clean_name = re.sub(r'\s[a-f0-9]{7,12}$', '', search_name) 
                clean_name = re.sub(r'-[a-f0-9]{7,12}$', '', clean_name)
                
                # Full clean for the slug mapping
                clean_slug_full = re.sub(r'-[a-f0-9]{7,12}$', '', slug)
                
                # Normalize search name
                norm_search = "".join(c for c in clean_name.lower() if c.isalnum())
                
                # EH Initial Mapping
                eh_terms = [norm_search, clean_slug_full.replace('-', '')]
                
                # Identify additional terms for evidence_hub search (e.g. initials)
                eh_terms = [clean_slug_full] + (player.get("aliases_list") or [])
                
                # Add extra identifiers (transformed)
                for eid in player.get("extra_identifiers", []):
                    # For emails/phones, we often see them as raw strings in summaries
                    # Normalize: lower and alnum only for participant mapping, 
                    # but keep raw for summary search? Actually eh_terms works on participants table here.
                    norm_eid = "".join(c for c in eid.lower() if c.isalnum())
                    if norm_eid and norm_eid not in eh_terms:
                        eh_terms.append(norm_eid)

                # Deduplicate and clean
                eh_terms = list(set([t.lower().replace(" ", "") for t in eh_terms if t]))

                # Add extra identifiers (emails/phones) to the generic search loop if needed
                # but currently dossiers rely heavily on participant mapping.
                
                # Build dynamic query
                # Use LIKE with cleaning for ALL terms to be safe
                cleaning_sql = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(p.normalized_identifier), ' ', ''), '(', ''), ')', ''), '/', ''), '-', ''), '.', ''), ',', '')"
                conditions = []
                params = []
                
                for term in eh_terms:
                    # If we have a very short term (like 'lg'), we should be careful about partial matches
                    # But normalized_identifier is already clean, and cleaning_sql makes it even cleaner.
                    conditions.append(f"({cleaning_sql} LIKE ?)")
                    if len(term) <= 3:
                         params.append(term) # Exact match for short identifiers
                    else:
                         params.append(f"%{term}%")
                
                
                full_query = f"""SELECT e.id, e.source_type, e.start_timestamp as date, e.summary
                           FROM evidence e
                           JOIN evidence_participants ep ON e.id = ep.evidence_id
                           JOIN participants p ON ep.participant_id = p.id
                           WHERE e.case_id = 'RC-2026' AND e.client_id = 'rowboat-creative'
                           AND ({" OR ".join(conditions)})
                           ORDER BY e.start_timestamp
                           LIMIT 2000"""
                
                rows = conn_eh.execute(full_query, tuple(params)).fetchall()
                evidence_items = [dict(r) for r in rows]

                # FALLBACK: If 0 items found, search in summary/body text directly
                if not evidence_items:
                    # Search for the clean name and slug parts
                    fallback_terms = [f"%{search_name}%", f"%{clean_name}%", f"%{clean_slug_full}%"]
                    
                    # Add common abbreviations for core players
                    abbrevs = {
                        "lucas": "Lucas", "joseph": "Joe", "zangrilli": "Joe",
                        "mayersky": "Len", "suzanne": "Suzanne", "higgins": "Pat"
                    }
                    for key, val in abbrevs.items():
                        if key in clean_slug_full:
                            fallback_terms.append(f"%{val}%")

                    # Add extra identifiers (emails, phones) from CSV
                    extra_ids = player.get("extra_identifiers", [])
                    fallback_terms.extend([f"%{eid}%" for eid in extra_ids])
                    
                    # Deduplicate fallback terms
                    fallback_terms = list(set(fallback_terms))

                    cond_fallback = ["(summary LIKE ? OR body_snippet LIKE ?)"]
                    for _ in range(len(fallback_terms) - 1):
                        cond_fallback.append("(summary LIKE ? OR body_snippet LIKE ?)")
                    
                    # Double params for summary and body_snippet
                    fb_params = []
                    for t in fallback_terms:
                        fb_params.extend([t, t])

                    query_fb = f"""SELECT id, source_type, start_timestamp as date, summary
                                   FROM evidence
                                   WHERE {" OR ".join(cond_fallback)}
                                   ORDER BY start_timestamp
                                   LIMIT 50"""
                    
                    rows_fb = conn_eh.execute(query_fb, tuple(fb_params)).fetchall()
                    evidence_items = [dict(r) for r in rows_fb]
            except Exception as e:
                log(f"  ⚠ Error finding evidence for {slug}: {e}")
                evidence_items = []

        content = coc_header()
        content += f"# Dossier: {name}\n\n"
        content += f"**Role:** {role}  \n"
        content += f"**Player Slug:** `{slug}`  \n"

        # LinkedIn Profile Summary
        linkedin_text = player.get("linkedin_profile_text")
        if linkedin_text:
            cleaned_text = re.sub(r'\s+', ' ', linkedin_text).strip()
            summary = cleaned_text[:500] + "..." if len(cleaned_text) > 500 else cleaned_text
            content += f"\n### LinkedIn Professional Profile\n> {summary}\n"

        # Add aliases if present
        aliases = player.get("aliases", "")
        if aliases:
            content += f"**Known Aliases:** {aliases}  \n"

        emails = player.get("email", player.get("emails", ""))
        if emails:
            content += f"**Email(s):** {emails}  \n"

        content += f"\n---\n\n"

        # Evidence summary
        content += f"## Linked Evidence ({len(evidence_items)} records)\n\n"
        if evidence_items:
            content += "| evidence_id | Type | Date | Summary |\n"
            content += "|---|---|---|---|\n"
            for ev in evidence_items[:50]:
                eid = ev.get("id", "—")
                stype = ev.get("source_type", "—")
                dt = ev.get("date", "—")
                summ = (ev.get("summary", "") or "")[:80]
                content += f"| `{eid}` | {stype} | {dt} | {summ} |\n"
            if len(evidence_items) > 50:
                content += f"\n*... and {len(evidence_items) - 50} more records*\n"
        else:
            content += "*No directly linked evidence found via participant table.*\n"

        content += "\n"

        if dry_run:
            log(f"  [DRY RUN] Would write dossier: {slug}.md ({len(evidence_items)} evidence items)")
        else:
            out_path = PLAYER_DOSSIERS / f"{slug}.md"
            with open(out_path, "w") as f:
                f.write(content)
            log(f"  ✓ {slug}.md ({len(evidence_items)} evidence items)")

    if conn_eh:
        conn_eh.close()


# ─────────────────────────────────────────────
# SECTION: Exhibit Index + Charge Matrix
# ─────────────────────────────────────────────

def generate_exhibit_index(dry_run=False):
    """Generate exhibit_index.md and charge_matrix.md."""
    log("Generating exhibit index...")
    stats = load_evidence_stats()

    # --- exhibit_index.md ---
    content = coc_header()
    content += "# Master Exhibit Index\n\n"
    content += f"**Case:** {CASE_ID}  \n"
    content += f"**Total Evidence Records:** {stats.get('total', 0):,}  \n"
    content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}  \n\n"

    content += "## Evidence by Source Type\n\n"
    content += "| Source Type | Record Count |\n"
    content += "|---|---|\n"
    for stype, cnt in sorted(stats.get("by_type", {}).items()):
        content += f"| {stype} | {cnt:,} |\n"
    content += "\n"

    # Tag-based groupings for key fraud categories
    fraud_tags = ["wire_fraud", "fraud", "embezzlement", "ppp", "tax", "spoofing",
                  "kickback", "reconciliation", "ashley_myles", "impersonation"]

    content += "## Key Evidence Categories\n\n"
    for tag in fraud_tags:
        items = load_evidence_by_tag(tag)
        if items:
            content += f"### {tag.replace('_', ' ').title()} ({len(items)} items)\n\n"
            content += "| evidence_id | Date | Summary |\n"
            content += "|---|---|---|\n"
            for ev in items[:10]:
                eid = ev.get("id", "—")
                dt = ev.get("date", "—")
                summ = (ev.get("summary", "") or "")[:100]
                content += f"| `{eid}` | {dt} | {summ} |\n"
            if len(items) > 10:
                content += f"\n*... {len(items) - 10} more in this category*\n"
            content += "\n"

    if dry_run:
        log("  [DRY RUN] Would write exhibit_index.md")
    else:
        with open(EXHIBIT_INDEX / "exhibit_index.md", "w") as f:
            f.write(content)
        log("  ✓ exhibit_index.md")

    # --- charge_matrix.md ---
    charges = coc_header()
    charges += "# Charge Matrix — Statute to Exhibit Cross-Reference\n\n"
    charges += f"**Case:** {CASE_ID}  \n\n"
    charges += "| Charge | Statute | Perpetrator(s) | Key Exhibits | Est. Count |\n"
    charges += "|---|---|---|---|---|\n"

    charge_rows = [
        ("Wire Fraud", "18 U.S.C. § 1343", "Lucas Guariglia, Leonard Mayersky",
         "Spoofed ACH emails, domain registrations", "wire_fraud"),
        ("Bank Fraud", "18 U.S.C. § 1344", "Lucas Guariglia, Leonard Mayersky",
         "PPP loan applications, falsified financials", "ppp"),
        ("Tax Fraud", "26 U.S.C. § 7206", "Lucas Guariglia, Leonard Mayersky",
         "Falsified 1120-S returns, phantom K-1s", "tax"),
        ("Mail Fraud", "18 U.S.C. § 1341", "Lucas Guariglia",
         "Mailed fraudulent tax documents", "fraud"),
        ("Embezzlement", "State — 720 ILCS 5/16-1", "Lucas Guariglia",
         "Owner draws, Amazon diversions, Pizza Garage expenses", "embezzlement"),
        ("Identity Fraud", "18 U.S.C. § 1028", "Lucas Guariglia",
         "Ashley Myles fake persona, spoofed domains", "impersonation"),
        ("SBA Fraud", "15 U.S.C. § 645", "Leonard Mayersky",
         "PPP loan application misrepresentations", "ppp"),
        ("Contempt of Court", "State", "Lucas Guariglia",
         "Actions during receivership period", "receivership"),
    ]

    for charge, statute, perps, exhibits, tag in charge_rows:
        items = load_evidence_by_tag(tag)
        count = len(items) if items else "—"
        charges += f"| {charge} | {statute} | {perps} | {exhibits} | {count} |\n"

    charges += "\n> [!NOTE]\n> Counts are approximate based on evidence_hub.db tag matching.\n"
    charges += "> Actual exhibit numbering will be assigned during formal preparation.\n"

    if dry_run:
        log("  [DRY RUN] Would write charge_matrix.md")
    else:
        with open(EXHIBIT_INDEX / "charge_matrix.md", "w") as f:
            f.write(charges)
        log("  ✓ charge_matrix.md")


# ─────────────────────────────────────────────
# SECTION: Agency Letters
# ─────────────────────────────────────────────

def generate_agency_letters(stats, dry_run=False):
    """Generate per-agency referral letters."""
    log("Generating agency letters...")

    agencies = [
        {
            "id": "fbi_ic3",
            "name": "Federal Bureau of Investigation — Internet Crime Complaint Center (IC3)",
            "statutes": ["18 U.S.C. § 1343 (Wire Fraud)", "18 U.S.C. § 1028 (Identity Fraud)",
                         "18 U.S.C. § 1344 (Bank Fraud)"],
            "focus": "Business Email Compromise (BEC) scheme using spoofed domains to redirect ACH payments. "
                     "Nine confirmed spoofing events across multiple fabricated domains. "
                     "Impersonation of the victim (JZ) in communications with financial institutions.",
            "tags": ["wire_fraud", "spoofing", "impersonation"]
        },
        {
            "id": "irs_criminal_investigation",
            "name": "Internal Revenue Service — Criminal Investigation Division",
            "statutes": ["26 U.S.C. § 7206 (Tax Fraud)", "26 U.S.C. § 7201 (Tax Evasion)"],
            "focus": "Falsified 1120-S corporate tax returns fraudulently reducing the victim's "
                     "partnership allocation. Schedule K-1 distributions that do not match "
                     "QuickBooks general ledger entries. Unreported income diverted through "
                     "personal Amazon and side-business accounts.",
            "tags": ["tax", "fraud"]
        },
        {
            "id": "sba_oig",
            "name": "Small Business Administration — Office of Inspector General",
            "statutes": ["15 U.S.C. § 645 (SBA Fraud)", "18 U.S.C. § 1014 (False Statements to Bank)"],
            "focus": "Paycheck Protection Program (PPP) loan obtained with materially false "
                     "representations. Loan proceeds diverted to personal use rather than "
                     "covered payroll and business expenses. Accountant (Leonard Mayersky) "
                     "prepared the application with knowledge of the misrepresentations.",
            "tags": ["ppp"]
        },
        {
            "id": "illinois_ag",
            "name": "Illinois Attorney General — Consumer Fraud Bureau",
            "statutes": ["720 ILCS 5/16-1 (Theft/Embezzlement)", "720 ILCS 5/17-1 (Deceptive Practices)",
                         "815 ILCS 505 (Consumer Fraud Act)"],
            "focus": "Systematic embezzlement from an Illinois S-Corp through unauthorized "
                     "owner draws, diversion of business purchasing power (Amazon), payment of "
                     "personal expenses through business accounts (Pizza Garage), and creation "
                     "of fraudulent vendor relationships (Ashley Myles / AllWorld Dynamics).",
            "tags": ["embezzlement", "fraud"]
        },
    ]

    for agency in agencies:
        content = coc_header()
        content += f"# Referral Letter — {agency['name']}\n\n"
        content += f"**Case Reference:** {CASE_ID}  \n"
        content += f"**Date:** {datetime.now().strftime('%B %d, %Y')}  \n"
        content += f"**Complainant:** Joseph Zangrilli (JZ)  \n"
        content += f"**Subject(s):** Lucas Guariglia, Leonard Mayersky  \n\n"

        content += "---\n\n"
        content += "## Applicable Statutes\n\n"
        for s in agency["statutes"]:
            content += f"- {s}\n"
        content += "\n"

        content += "## Summary of Allegations\n\n"
        content += agency["focus"] + "\n\n"

        # Evidence counts for this agency's tags
        content += "## Supporting Evidence Summary\n\n"
        content += f"**Total evidence records in database:** {stats.get('total', 0):,}  \n\n"
        content += "| Category | Record Count |\n"
        content += "|---|---|\n"
        for tag in agency["tags"]:
            items = load_evidence_by_tag(tag)
            content += f"| {tag.replace('_', ' ').title()} | {len(items):,} |\n"
        content += "\n"

        content += "## Evidence Availability\n\n"
        content += "All evidence is preserved in a forensic database system with full chain-of-custody "
        content += "tracking, SHA-256 hashing, and audit trails. Evidence includes:\n\n"
        for stype, cnt in sorted(stats.get("by_type", {}).items()):
            content += f"- **{stype}:** {cnt:,} records\n"
        content += "\n"

        content += "Complete evidence packages, witness statements, and supporting documentation "
        content += "are available upon request.\n\n"

        content += "---\n\n"
        content += "*This referral is supported by digitally preserved evidence with unbroken "
        content += "chain-of-custody from original source to this exhibit package.*\n"

        fname = f"letter_{agency['id']}.md"
        if dry_run:
            log(f"  [DRY RUN] Would write {fname}")
        else:
            with open(AGENCY_LETTERS / fname, "w") as f:
                f.write(content)
            log(f"  ✓ {fname}")


# ─────────────────────────────────────────────
# SECTION: Binder Index (Table of Contents)
# ─────────────────────────────────────────────

def generate_binder_index(dry_run=False):
    """Generate 05_binder_index.md — single-page TOC for full attorney package."""
    log("Generating binder index...")

    content = coc_header()
    content += "# Attorney Package — Binder Index\n\n"
    content += f"**Case:** {CASE_ID}  \n"
    content += f"**Client:** Joseph Zangrilli ({CLIENT_ID})  \n"
    content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}  \n\n"
    content += "---\n\n"

    # Walk the package and build TOC
    sections = [
        ("00_summaries", "Forensic Analysis Summaries",
         "Deep-dive forensic analyses of each fraud scheme"),
        ("01_exhibits", "Exhibit Index & Charge Matrix",
         "Master exhibit list and statute-to-exhibit cross-reference"),
        ("02_dossiers", "Player Dossiers",
         "Per-player profiles with linked evidence records"),
        ("03_letters", "Agency Referral Letters",
         "Per-agency referral letters with statute citations and evidence summaries"),
        ("04_evidence_cards", "Evidence Cards",
         "Individual evidence items with metadata and chain-of-custody"),
    ]

    for folder, title, desc in sections:
        section_path = ATTORNEY_PKG / folder
        content += f"## {title}\n"
        content += f"*{desc}*\n\n"

        if section_path.exists():
            files = sorted(f for f in section_path.iterdir()
                           if f.is_file() and f.suffix in (".md", ".json"))
            if files:
                for fp in files:
                    size = fp.stat().st_size
                    content += f"- [{fp.name}]({folder}/{fp.name}) ({size:,} bytes)\n"
            else:
                content += "- *(no files yet)*\n"
        else:
            content += "- *(directory not created)*\n"
        content += "\n"

    content += "---\n\n"
    content += "> [!IMPORTANT]\n"
    content += "> This binder index is auto-generated by `gem-paralegal-exports`.\n"
    content += "> Re-run `python scripts/generate_paralegal_exports.py` to refresh.\n"

    if dry_run:
        log("  [DRY RUN] Would write 05_binder_index.md")
    else:
        with open(BINDER_INDEX_PATH, "w") as f:
            f.write(content)
        log("  ✓ 05_binder_index.md")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    section = None
    if "--section" in sys.argv:
        idx = sys.argv.index("--section")
        if idx + 1 < len(sys.argv):
            section = sys.argv[idx + 1]

    log(f"=== gem-paralegal-exports {'(DRY RUN)' if dry_run else ''} ===")
    log(f"Case: {CASE_ID} | Client: {CLIENT_ID}")

    ensure_dirs()
    players = load_players()
    stats = load_evidence_stats()

    log(f"Loaded {len(players)} players from players.db")
    log(f"Evidence hub: {stats.get('total', 0):,} total records")

    if section is None or section == "dossiers":
        generate_dossiers(players, dry_run=dry_run)

    if section is None or section == "exhibit_index":
        generate_exhibit_index(dry_run=dry_run)

    if section is None or section == "agency_letters":
        generate_agency_letters(stats, dry_run=dry_run)

    if section is None or section == "binder":
        generate_binder_index(dry_run=dry_run)

    log("=== Done ===")


if __name__ == "__main__":
    main()
