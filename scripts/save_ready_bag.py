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
# Current Session Task File
TASK_FILE = Path("/Users/iseepatterns-ms-m4/.gemini/antigravity/brain/726a1bd1-e2b6-4bc4-a136-d151356c5f9b/task.md")
RAG_LIB = BASE_DIR / "app/lib/rag.ts"
EVIDENCE_CARDS_DIR = DATA_DIR / "evidence_cards"
MEMOS_DIR = DATA_DIR / "memos" # Transcripts / Analysis memos

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
    
    # 1. Timelines
    timelines_src = DATA_DIR / "timelines"
    if timelines_src.exists():
        target = ATTORNEY_PACKAGE / "02_timeline"
        target.mkdir(exist_ok=True)
        for t in timelines_src.glob("*.csv"):
            shutil.copy(str(t), str(target / t.name))
            log(f"  + Added timeline: {t.name}")
    
    # 2. Evidence Hub Snapshots (Recent EvidenceCards)
    if EVIDENCE_CARDS_DIR.exists():
        target = ATTORNEY_PACKAGE / "03_evidence_cards"
        target.mkdir(exist_ok=True)
        # Only copy a subset or most recent if too many? For now all.
        count = 0
        for c in EVIDENCE_CARDS_DIR.glob("*.json"):
            shutil.copy(str(c), str(target / c.name))
            count += 1
        log(f"  + Packed {count} EvidenceCards.")

    # 3. Paralegal Memos (DOCX)
    docx_memos = list(BASE_DIR.glob("*.docx")) + list(DATA_DIR.glob("*.docx"))
    if docx_memos:
        target = ATTORNEY_PACKAGE / "04_forensic_memos"
        target.mkdir(exist_ok=True)
        for m in docx_memos:
            shutil.copy(str(m), str(target / m.name))
            log(f"  + Added memo: {m.name}")

    # Case Overview
    overview_path = ATTORNEY_PACKAGE / "01_case_overview.md"
    if not overview_path.exists():
        with open(overview_path, "w") as f:
            f.write("# Case Overview: RBC v. LG\n\n*Generated on " + datetime.now().strftime("%Y-%m-%d") + "*\n\nNarrative goes here.")

    generate_manifest()
    log("✓ Export package ready.")

def generate_manifest():
    """Generate SHA-256 manifest for export integrity."""
    import hashlib
    log("Generating export manifest (SHA-256)...")
    manifest = {}
    
    for root, _, files in os.walk(ATTORNEY_PACKAGE):
        for f in files:
            if f == "manifest.json": continue
            path = Path(root) / f
            rel_path = str(path.relative_to(ATTORNEY_PACKAGE))
            
            sha256_hash = hashlib.sha256()
            with open(path, "rb") as bf:
                for byte_block in iter(lambda: bf.read(4096), b""):
                    sha256_hash.update(byte_block)
            manifest[rel_path] = sha256_hash.hexdigest()
            
    with open(ATTORNEY_PACKAGE / "manifest.json", "w") as mf:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "file_count": len(manifest),
            "hashes": manifest
        }, mf, indent=2)

def main():
    log("--- Starting SAVE / READY BAG Process ---")
    ensure_dirs()
    update_stats()
    process_inbox()
    generate_export_package()
    log("--- Process Complete ---")

if __name__ == "__main__":
    main()
