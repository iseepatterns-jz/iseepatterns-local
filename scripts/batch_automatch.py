#!/usr/bin/env python3
"""Batch automatch all import sessions against RosettaStone master_transactions."""

import subprocess
import json
import time

API_URL = "http://localhost:3000/api/financials/automatch"

def automatch_session(session_id: int) -> dict:
    """Run automatch on a single session."""
    cmd = [
        "curl", "-s", "-X", "POST", API_URL,
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"sessionId": session_id}),
        "--connect-timeout", "5",
        "--max-time", "60",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=65)
        if result.returncode != 0:
            return {"error": result.stderr.strip()}
        return json.loads(result.stdout.strip() or "{}")
    except Exception as e:
        return {"error": str(e)}

# Get all sessions with transactions
import sqlite3
DB = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db"
conn = sqlite3.connect(DB)
sessions = conn.execute("""
    SELECT s.id, sf.statement_type, COUNT(st.id) as txn_count
    FROM import_sessions s
    JOIN statement_files sf ON s.statement_file_id = sf.id
    LEFT JOIN statement_transactions st ON st.import_session_id = s.id
    GROUP BY s.id
    ORDER BY txn_count DESC
""").fetchall()
conn.close()

total = len(sessions)
print(f"=== BATCH AUTOMATCH: {total} sessions ===")

results = []
total_matched = 0
total_forensic = 0
zero_match_sessions = 0
failures = 0
start = time.time()

for i, (sid, stmt_type, txn_count) in enumerate(sessions, 1):
    elapsed = time.time() - start
    rate = i / elapsed if elapsed > 0 else 0
    
    resp = automatch_session(sid)
    
    matched = resp.get("matched_count", 0)
    forensic = resp.get("total_forensic", 0)
    error = resp.get("error")
    
    if error:
        failures += 1
        status = f"✗ {error[:60]}"
    elif matched > 0:
        total_matched += matched
        total_forensic += forensic
        status = f"✓ {matched}/{forensic} matched"
    else:
        zero_match_sessions += 1
        total_forensic += forensic
        status = f"- 0/{forensic} matched"
    
    pct = (matched/forensic*100) if forensic > 0 else 0
    
    print(f"[{i}/{total}] S{sid} {stmt_type:12s} {txn_count:4d} txns → {status} [{rate:.1f} sess/s]")
    results.append({"session_id": sid, "matched": matched, "forensic": forensic, "error": error})

elapsed = time.time() - start
print(f"\n{'='*60}")
print(f"AUTOMATCH COMPLETE in {elapsed:.1f}s")
print(f"  Sessions: {total}")
print(f"  Matched: {total_matched}/{total_forensic} ({total_matched/max(total_forensic,1)*100:.1f}%)")
print(f"  Zero-match sessions: {zero_match_sessions}")
print(f"  Failures: {failures}")
print(f"{'='*60}")
