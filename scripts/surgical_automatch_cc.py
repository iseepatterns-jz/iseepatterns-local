#!/usr/bin/env python3
"""Surgical automatch: all credit card sessions only."""

import subprocess, json, time, sqlite3

API_URL = "http://localhost:3000/api/financials/automatch"
DB = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db"

def automatch(sid):
    cmd = ["curl", "-s", "-X", "POST", API_URL,
           "-H", "Content-Type: application/json",
           "-d", json.dumps({"sessionId": sid}),
           "--connect-timeout", "5", "--max-time", "60"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=65)
        return json.loads(r.stdout.strip() or "{}")
    except:
        return {"error": "timeout"}

# Get credit card sessions with transactions
conn = sqlite3.connect(DB)
sessions = conn.execute("""
    SELECT s.id, sf.original_filename, COUNT(st.id) as txn_count
    FROM import_sessions s
    JOIN statement_files sf ON s.statement_file_id = sf.id
    LEFT JOIN statement_transactions st ON st.import_session_id = s.id
    WHERE sf.statement_type = 'CREDIT_CARD'
    GROUP BY s.id
    ORDER BY txn_count DESC
""").fetchall()
conn.close()

total = len(sessions)
print(f"AUTOMATCH: {total} credit card sessions")
print(f"={'='*60}")

total_matched = 0
total_txns = 0
failures = 0
start = time.time()

for i, (sid, fname, txn_count) in enumerate(sessions, 1):
    resp = automatch(sid)
    matched = resp.get("matched_count", 0)
    error = resp.get("error")

    if error:
        failures += 1
        status = f"✗ {error[:50]}"
    else:
        total_matched += matched
        total_txns += txn_count
        status = f"✓ {matched}/{txn_count}"

    elapsed = time.time() - start
    rate = i / elapsed if elapsed > 0 else 0
    print(f"[{i:3d}/{total}] S{sid:3d} {fname[:45]:45s} {txn_count:3d} txns → {status}  [{rate:.1f} sess/s]")

elapsed = time.time() - start
print(f"\n{'='*60}")
print(f"COMPLETE in {elapsed:.1f}s")
print(f"  Sessions: {total}")
print(f"  Matched: {total_matched}/{total_txns} ({total_matched/max(total_txns,1)*100:.1f}%)")
print(f"  Failures: {failures}")
print(f"{'='*60}")

# Final DB stats
conn = sqlite3.connect(DB)
stats = conn.execute("""
    SELECT 
        COALESCE(rosetta_user, 'unassigned') as usr,
        COUNT(*) as cnt,
        ROUND(SUM(ABS(amount)), 2) as total
    FROM statement_transactions st
    JOIN import_sessions s ON st.import_session_id = s.id
    JOIN statement_files sf ON s.statement_file_id = sf.id
    WHERE sf.statement_type = 'CREDIT_CARD' AND verification_status = 'MATCHED'
    GROUP BY 1
    ORDER BY cnt DESC
""").fetchall()
conn.close()

print("\nCREDIT CARD MATCHES BY USER:")
for usr, cnt, total in stats:
    print(f"  {usr:12s}: {cnt:5d} txns  ${total:>12,.2f}")
