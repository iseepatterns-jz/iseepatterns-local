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

# gem-paralegal-exports hook
PARALEGAL_SCRIPT = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/generate_paralegal_exports.py")

# Paths
BASE_DIR = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
DATA_DIR = BASE_DIR / "data"
INBOX_DIR = DATA_DIR / "inbox"
EXPORTS_DIR = BASE_DIR / "exports"
ATTORNEY_PACKAGE = EXPORTS_DIR / "attorney_package"
LETTERS_DIR = EXPORTS_DIR / "letters"
DOSSIERS_DIR = EXPORTS_DIR / "dossiers"
PRESENTATION_LOCKER = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/ATTORNEY_PRESENTATION_LOCKER/2026-02-24_ATTORNEY_PRESENTATION")

# Current Session Task File
EVIDENCE_CARDS_DIR = DATA_DIR / "evidence_cards"

def log(msg):
    print(f"[*] {msg}")

def ensure_dirs():
    dirs = [
        INBOX_DIR, 
        ATTORNEY_PACKAGE, 
        ATTORNEY_PACKAGE / "00_summaries",
        ATTORNEY_PACKAGE / "01_exhibits",
        ATTORNEY_PACKAGE / "02_dossiers",
        ATTORNEY_PACKAGE / "03_letters",
        ATTORNEY_PACKAGE / "04_evidence_cards",
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
        target = ATTORNEY_PACKAGE / "00_summaries"
        for f in PRESENTATION_LOCKER.glob("*.md"):
            shutil.copy(str(f), str(target / f.name))
            log(f"  + Added summary: {f.name}")

    # 1. Timelines (Go into exhibits)
    timelines_src = DATA_DIR / "timelines"
    if timelines_src.exists():
        target = ATTORNEY_PACKAGE / "01_exhibits"
        for t in timelines_src.glob("*.csv"):
            shutil.copy(str(t), str(target / t.name))
            log(f"  + Added timeline: {t.name}")
    
    # 2. Filtered Evidence Cards
    if EVIDENCE_CARDS_DIR.exists():
        log("Filtering and packing high-quality EvidenceCards...")
        target = ATTORNEY_PACKAGE / "04_evidence_cards"
        count = 0
        total = 0
        for c in EVIDENCE_CARDS_DIR.glob("*.json"):
            total += 1
            if filter_evidence_cards(c):
                shutil.copy(str(c), str(target / c.name))
                count += 1
        log(f"  + Packed {count} of {total} EvidenceCards (filtered low-quality).")

    # 3. Dossiers — Handled by generate_paralegal_exports.py
    # (Removed to prevent overwriting live dossiers with legacy placeholders)

    # 4. Letters
    if LETTERS_DIR.exists():
        log("Packing letters...")
        target = ATTORNEY_PACKAGE / "03_letters"
        for f in LETTERS_DIR.glob("*.md"):
            shutil.copy(str(f), str(target / f.name))
            log(f"  + Added letter: {f.name}")

    # 5. Case Overview Population
    briefing_path = PRESENTATION_LOCKER / "lawyer_briefing_document.md"
    overview_path = ATTORNEY_PACKAGE / "00_summaries" / "case_overview.md"
    if briefing_path.exists():
        log("Generating narrative overview from briefing document...")
        with open(briefing_path, "r") as src:
            content = src.read()
            # Extract executive summary (usually starts at ## 1. Executive Summary)
            parts = content.split("## 2. Potential Charges")
            narrative = parts[0].strip() if parts else content[:2000]
            
        with open(overview_path, "w") as f:
            f.write(f"#{narrative}\n\n[Full Briefing included in 00_summaries]")

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

def run_paralegal_exports():
    """gem-paralegal-exports hook — regenerates attorney export package."""
    if not PARALEGAL_SCRIPT.exists():
        log("[gem-paralegal-exports] Script not found, skipping.")
        return

    log("[gem-paralegal-exports] Regenerating attorney export package...")
    try:
        result = subprocess.run(
            [sys.executable, str(PARALEGAL_SCRIPT)],
            capture_output=False, text=True, timeout=120
        )
        if result.returncode == 0:
            log("[gem-paralegal-exports] ✓ Attorney package regenerated.")
        else:
            log(f"[gem-paralegal-exports] Completed with warnings (exit {result.returncode}).")
    except Exception as ex:
        log(f"[gem-paralegal-exports] Error: {ex}")


def main():
    log("--- Starting READY BAG Overhaul ---")
    ensure_dirs()
    process_inbox()
    generate_export_package()

    # gem-paralegal-exports: Regenerate attorney package with live DB data
    run_paralegal_exports()

    log("--- Process Complete ---")

if __name__ == "__main__":
    main()
