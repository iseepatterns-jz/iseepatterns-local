#!/usr/bin/env python3
"""Batch upload all statement PDFs to the lawmodel1 import pipeline."""

import os
import sys
import json
import time
import hashlib
import subprocess
from pathlib import Path

STATEMENTS_LOCKER = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/STATEMENTS_LOCKER"
API_URL = "http://localhost:3000/api/financials/import"
LOG_FILE = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/batch_import_log.jsonl"

def classify_pdf(filepath: str) -> tuple[str, str]:
    """
    Determine bank name and statement type from directory path.
    Returns (bank_name, statement_type)
    """
    path_upper = filepath.upper()
    
    if "CHASE_BANK_CC" in path_upper or "CREDIT" in path_upper:
        return ("Chase", "CREDIT_CARD")
    elif "CHASE_BANK_CHECKING" in path_upper or "CHASE BUISNESS CHECKING" in path_upper:
        return ("Chase", "CHECKING")
    elif "CHASE" in path_upper:
        return ("Chase", "CHECKING")  # default Chase → CHECKING
    elif "FIFTH_THIRD" in path_upper:
        return ("Fifth Third", "CHECKING")
    else:
        return ("Unknown", "CHECKING")


def sha256_file(filepath: str) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def upload_pdf(filepath: str, bank: str, stmt_type: str) -> dict:
    """Upload a single PDF via curl POST."""
    cmd = [
        "curl", "-s", "-X", "POST", API_URL,
        "-F", f"file=@{filepath}",
        "-F", f"bankName={bank}",
        "-F", f"statementType={stmt_type}",
        "--connect-timeout", "10",
        "--max-time", "60",
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=65)
        stdout = result.stdout.strip()
        if result.returncode != 0:
            return {"error": result.stderr.strip(), "exit_code": result.returncode}
        if not stdout:
            return {"error": "Empty response", "exit_code": -1}
        return json.loads(stdout)
    except subprocess.TimeoutExpired:
        return {"error": "Timeout", "exit_code": -2}
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse: {e}", "raw": result.stdout[:200] if 'result' in dir() else ""}
    except Exception as e:
        return {"error": str(e), "exit_code": -3}


def main():
    # Collect all PDFs
    pdfs = []
    for root, dirs, files in os.walk(STATEMENTS_LOCKER):
        for f in files:
            if f.lower().endswith('.pdf'):
                pdfs.append(os.path.join(root, f))
    
    pdfs.sort()
    total = len(pdfs)
    print(f"=== BATCH IMPORT: {total} PDFs ===")
    
    results = []
    successes = 0
    duplicates = 0
    failures = 0
    total_txns = 0
    start_time = time.time()
    
    # Open log file (append mode to survive restarts)
    log_fh = open(LOG_FILE, 'a')
    
    for i, pdf_path in enumerate(pdfs, 1):
        filename = os.path.basename(pdf_path)
        sha = sha256_file(pdf_path)
        bank, stmt_type = classify_pdf(pdf_path)
        
        elapsed = time.time() - start_time
        rate = i / elapsed if elapsed > 0 else 0
        
        print(f"\n[{i}/{total}] {filename} ({bank} / {stmt_type}) [{rate:.1f} PDF/s]")
        
        resp = upload_pdf(pdf_path, bank, stmt_type)
        
        entry = {
            "index": i,
            "filename": filename,
            "path": pdf_path,
            "sha256": sha,
            "bank": bank,
            "statement_type": stmt_type,
            "response": resp,
            "timestamp": time.time(),
        }
        log_fh.write(json.dumps(entry) + "\n")
        log_fh.flush()
        
        if "error" in resp:
            failures += 1
            print(f"  ✗ FAIL: {resp.get('error', 'unknown')}")
        elif resp.get("session_id"):
            successes += 1
            count = resp.get("count", 0)
            total_txns += count
            print(f"  ✓ Session #{resp['session_id']}: {count} transactions")
        else:
            failures += 1
            print(f"  ? UNEXPECTED: {resp}")
        
        results.append(entry)
        
        # Brief pause between requests to avoid overwhelming the server
        time.sleep(0.1)
    
    log_fh.close()
    
    elapsed_total = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"COMPLETE in {elapsed_total:.1f}s ({elapsed_total/60:.1f} min)")
    print(f"  PDFs processed: {total}")
    print(f"  Success: {successes}")
    print(f"  Failures: {failures}")
    print(f"  Total transactions: {total_txns}")
    print(f"  Log: {LOG_FILE}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
