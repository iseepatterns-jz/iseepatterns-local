#!/usr/bin/env python3
"""
save_ready_bag.py — The "Save / Ready Bag" Orchestrator
──────────────────────────────────────────────────────
Synchronizes workspace state, ingests new evidence from inbox,
and regenerates attorney-ready export packages.
"""

import os
import sys
import shutil
import json
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path

# gem-notebooklm hook
NOTEBOOKLM_SCRIPT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/scripts/notebooklm_deepdive.py")

# Paths
BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
DATA_DIR = BASE_DIR / "data"
INBOX_DIR = DATA_DIR / "inbox"
EXPORTS_DIR = BASE_DIR / "exports"
ATTORNEY_PACKAGE = EXPORTS_DIR / "attorney_package"
LETTERS_DIR = EXPORTS_DIR / "letters"
DOSSIERS_DIR = EXPORTS_DIR / "dossiers"
PRESENTATION_LOCKER = Path("/Volumes/batdrivetb5/ATTORNEY_PRESENTATION_LOCKER/2026-02-24_ATTORNEY_PRESENTATION")

# Current Session Task File
EVIDENCE_CARDS_DIR = DATA_DIR / "evidence_cards"

def log(msg):
    print(f"[*] {msg}")

def ensure_dirs():
    dirs = [
        INBOX_DIR, 
        ATTORNEY_PACKAGE, 
        ATTORNEY_PACKAGE / "00_forensic_summaries",
        ATTORNEY_PACKAGE / "01_narrative",
        ATTORNEY_PACKAGE / "02_timeline",
        ATTORNEY_PACKAGE / "03_evidence_cards",
        ATTORNEY_PACKAGE / "04_dossiers",
        ATTORNEY_PACKAGE / "05_letters",
        LETTERS_DIR, 
        LETTERS_DIR / "agency", 
        LETTERS_DIR / "attorneys"
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)

def update_stats():
    """Update system stats."""
    log("Updating system stats...")
    pass

def process_inbox():
    """Scan inbox and move files to appropriate locations."""
    log("Scanning inbox for new evidence...")
    if not INBOX_DIR.exists():
        return
    
    files = list(INBOX_DIR.glob("*"))
    if not files:
        log("Inbox is empty.")
        return

    for f in files:
        if f.suffix.lower() == ".pdf":
            target = DATA_DIR / "legal_docs_exhibits" / f.name
            log(f"Moving {f.name} to exhibits...")
            shutil.move(str(f), str(target))
        elif f.suffix.lower() in [".csv", ".xlsx"]:
            target = DATA_DIR / "financial" / f.name
            log(f"Moving {f.name} to financial...")
            shutil.move(str(f), str(target))
        else:
            log(f"Unknown file type: {f.name}, skipping.")

def filter_evidence_cards(card_path):
    """Return True if the card is high quality."""
    try:
        with open(card_path, 'r') as f:
            data = json.load(f)
            
        snippet = data.get("body_snippet", "")
        # Filter out empty/placeholder snippets
        if not snippet or "[Attachment/Empty]" in snippet or snippet.strip() == "":
            return False
            
        # Prioritize significant tags
        priority_tags = {'fraud', 'embezzlement', 'kickback', 'spoofing', 'tax', 'reconciliation'}
        tags = set(data.get("tags", []))
        if priority_tags.intersection(tags):
            return True
            
        return True # Default to keep if not empty
    except:
        return False

def generate_export_package():
    """Regenerate the attorney package with high-quality data."""
    log("Regenerating High-Quality Attorney Export Package...")
    
    # 0. Forensic Summaries
    if PRESENTATION_LOCKER.exists():
        log("Packing forensic summaries from presentation locker...")
        target = ATTORNEY_PACKAGE / "00_forensic_summaries"
        for f in PRESENTATION_LOCKER.glob("*.md"):
            shutil.copy(str(f), str(target / f.name))
            log(f"  + Added summary: {f.name}")

    # 1. Timelines
    timelines_src = DATA_DIR / "timelines"
    if timelines_src.exists():
        target = ATTORNEY_PACKAGE / "02_timeline"
        for t in timelines_src.glob("*.csv"):
            shutil.copy(str(t), str(target / t.name))
            log(f"  + Added timeline: {t.name}")
    
    # 2. Filtered Evidence Cards
    if EVIDENCE_CARDS_DIR.exists():
        log("Filtering and packing high-quality EvidenceCards...")
        target = ATTORNEY_PACKAGE / "03_evidence_cards"
        count = 0
        total = 0
        for c in EVIDENCE_CARDS_DIR.glob("*.json"):
            total += 1
            if filter_evidence_cards(c):
                shutil.copy(str(c), str(target / c.name))
                count += 1
        log(f"  + Packed {count} of {total} EvidenceCards (filtered low-quality).")

    # 3. Dossiers
    if DOSSIERS_DIR.exists():
        log("Packing dossiers...")
        target = ATTORNEY_PACKAGE / "04_dossiers"
        for f in DOSSIERS_DIR.glob("*.md"):
            shutil.copy(str(f), str(target / f.name))
            log(f"  + Added dossier: {f.name}")

    # 4. Letters
    if LETTERS_DIR.exists():
        log("Packing letters...")
        target = ATTORNEY_PACKAGE / "05_letters"
        for f in LETTERS_DIR.glob("*.md"):
            shutil.copy(str(f), str(target / f.name))
            log(f"  + Added letter: {f.name}")

    # 5. Case Overview Population
    briefing_path = PRESENTATION_LOCKER / "lawyer_briefing_document.md"
    overview_path = ATTORNEY_PACKAGE / "01_narrative" / "case_overview.md"
    if briefing_path.exists():
        log("Generating narrative overview from briefing document...")
        with open(briefing_path, "r") as src:
            content = src.read()
            # Extract executive summary (usually starts at ## 1. Executive Summary)
            parts = content.split("## 2. Potential Charges")
            narrative = parts[0].strip() if parts else content[:2000]
            
        with open(overview_path, "w") as f:
            f.write(f"#{narrative}\n\n[Full Briefing included in 00_forensic_summaries]")

    generate_manifest()
    log("✓ Export package ready.")

def generate_manifest():
    """Generate SHA-256 manifest."""
    import hashlib
    log("Generating export manifest...")
    manifest = {}
    for root, _, files in os.walk(ATTORNEY_PACKAGE):
        for f in files:
            if f == "manifest.json": continue
            path = Path(root) / f
            rel_path = str(path.relative_to(ATTORNEY_PACKAGE))
            sha256 = hashlib.sha256()
            with open(path, "rb") as bf:
                for chunk in iter(lambda: bf.read(4096), b""):
                    sha256.update(chunk)
            manifest[rel_path] = sha256.hexdigest()
            
    with open(ATTORNEY_PACKAGE / "manifest.json", "w") as mf:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "file_count": len(manifest),
            "hashes": manifest
        }, mf, indent=2)

def run_notebooklm_deepdive(all_templates: bool = False):
    """gem-notebooklm hook — fires after export package is generated."""
    if not NOTEBOOKLM_SCRIPT.exists():
        log("[gem-notebooklm] Script not found, skipping.")
        return

    log("[gem-notebooklm] Generating new evidence brief...")
    try:
        cmd = [sys.executable, str(NOTEBOOKLM_SCRIPT)]
        if not all_templates:
            # Default: just the new-evidence-spotlight for quick review
            cmd += ["--template", "new-evidence-spotlight", "--days", "30"]
        # else: no --template flag = all 5 templates

        result = subprocess.run(cmd, capture_output=False, text=True, timeout=120)
        if result.returncode == 0:
            log("[gem-notebooklm] ✓ Brief(s) generated. Check AUDIO_OVERVIEW_LOCKER.")
        else:
            log(f"[gem-notebooklm] Completed with warnings (exit {result.returncode}).")
    except Exception as ex:
        log(f"[gem-notebooklm] Error: {ex}")


def main():
    log("--- Starting READY BAG Overhaul ---")
    ensure_dirs()
    process_inbox()
    generate_export_package()

    # gem-notebooklm: Generate new-evidence-spotlight brief automatically
    # Pass --all-templates to generate all 5 audio overview briefs:
    #   python scripts/save_ready_bag.py --all-nlm-templates
    all_nlm = "--all-nlm-templates" in sys.argv
    run_notebooklm_deepdive(all_templates=all_nlm)

    log("--- Process Complete ---")

if __name__ == "__main__":
    main()
