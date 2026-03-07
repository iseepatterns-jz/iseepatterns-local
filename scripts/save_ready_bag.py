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
from datetime import datetime
from pathlib import Path

# Paths
BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
DATA_DIR = BASE_DIR / "data"
INBOX_DIR = DATA_DIR / "inbox"
EXPORTS_DIR = BASE_DIR / "exports"
ATTORNEY_PACKAGE = EXPORTS_DIR / "attorney_package"
LETTERS_DIR = EXPORTS_DIR / "letters"
TASK_FILE = Path("/Users/iseepatterns-ms-m4/.gemini/antigravity/brain/4c252e35-483e-4c03-9b23-7d6e23bae028/task.md")
RAG_LIB = BASE_DIR / "app/lib/rag.ts"

def log(msg):
    print(f"[*] {msg}")

def ensure_dirs():
    dirs = [INBOX_DIR, ATTORNEY_PACKAGE, LETTERS_DIR, LETTERS_DIR / "agency", LETTERS_DIR / "attorneys"]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)

def update_stats():
    """Update task.md with current stats."""
    log("Updating system stats in task.md...")
    # placeholder logic for row counts
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

def generate_export_package():
    """Regenerate the attorney package."""
    log("Regenerating Attorney Export Package...")
    
    # Check for timelines
    timelines = list(DATA_DIR.glob("timelines/*.csv"))
    if timelines:
        (ATTORNEY_PACKAGE / "02_timeline").mkdir(exist_ok=True)
        for t in timelines:
            shutil.copy(str(t), str(ATTORNEY_PACKAGE / "02_timeline" / t.name))
    
    # Case Overview (Template or dynamic)
    overview_path = ATTORNEY_PACKAGE / "01_case_overview.md"
    if not overview_path.exists():
        with open(overview_path, "w") as f:
            f.write("# Case Overview: RBC v. LG\n\n*Generated on " + datetime.now().strftime("%Y-%m-%d") + "*\n\nNarrative goes here.")

    log("✓ Export package ready.")

def main():
    log("--- Starting SAVE / READY BAG Process ---")
    ensure_dirs()
    update_stats()
    process_inbox()
    generate_export_package()
    log("--- Process Complete ---")

if __name__ == "__main__":
    main()
