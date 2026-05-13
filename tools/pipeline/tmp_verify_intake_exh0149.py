#!/usr/bin/env python3
"""Verify intake processing completed successfully."""
import os, json

pipeline_root = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline"
item_name = "2026-05-06T04-24-18.128134Z_EXH-0149"

checks = []

# 1. Work item moved from inbox → completed
completed_path = f"{pipeline_root}/work-queue/completed/{item_name}.json"
checks.append(("1", "Item in completed", os.path.exists(completed_path), completed_path))

# 2. No longer in inbox or in-progress
inbox_path = f"{pipeline_root}/work-queue/inbox/{item_name}.json"
inprog_json = f"{pipeline_root}/work-queue/in-progress/{item_name}.json"
inprog_claimed = f"{pipeline_root}/work-queue/in-progress/{item_name}.claimed_by"
checks.append(("2a", "Not in inbox", not os.path.exists(inbox_path), inbox_path))
checks.append(("2b", "Not in-progress JSON", not os.path.exists(inprog_json), inprog_json))
checks.append(("2c", "Not in-progress claimed_by", not os.path.exists(inprog_claimed), inprog_claimed))

# 3. Intake artifact written
artifact_path = f"{pipeline_root}/artifacts/01-intake/{item_name}.json"
artifact_exists = os.path.exists(artifact_path)
checks.append(("3", "Artifact exists", artifact_exists, artifact_path))

if artifact_exists:
    with open(artifact_path) as f:
        art = json.load(f)
    required_fields = ["item_id", "pipeline_stage", "status", "source_path", "source_type", "classification", "sha256", "metadata", "summary", "tags", "processed_at", "processed_by"]
    for field in required_fields:
        checks.append((f"3.{field}", f"Artifact has {field}", field in art, field))
    checks.append(("3.verif", "status=completed", art.get("status") == "completed", art.get("status")))

# 4. SHA-256 recorded
if artifact_exists:
    sha = art.get("sha256", "?")
    expected_sha = "2daa2719d0dea5211357bb748e2e94fb03faa535214cc416c4bea4e39fa3a80e"
    checks.append(("4", "SHA-256 matches", sha == expected_sha, f"{sha[:16]}..."))

# 5. Pipeline state updated
state_path = f"{pipeline_root}/state/pipeline-state.json"
if os.path.exists(state_path):
    with open(state_path) as f:
        state = json.load(f)
    intake_items = state.get("stages", {}).get("01-intake", {}).get("items", [])
    found = any(
        (isinstance(i, dict) and i.get("item_id") == item_name) or (isinstance(i, str) and i == item_name)
        for i in intake_items
    )
    checks.append(("5", "Pipeline state has item", found, state_path))
    checks.append(("5b", "completed_items has item", item_name in state.get("completed_items", []), "completed_items"))

# 6. Log entry written
log_path = f"{pipeline_root}/logs/2026-05-07_pipeline-intake.log"
if os.path.exists(log_path):
    with open(log_path) as f:
        log_content = f.read()
    found_log = item_name in log_content
    checks.append(("6", "Log entry written", found_log, log_path))

# 7. Original evidence not modified
source_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER/EXH-0149_MSG_27_2017-12-12.txt"
if os.path.exists(source_path):
    import hashlib
    with open(source_path, 'rb') as f:
        current_sha = hashlib.sha256(f.read()).hexdigest()
    expected = "2daa2719d0dea5211357bb748e2e94fb03faa535214cc416c4bea4e39fa3a80e"
    checks.append(("7", "Original evidence unmodified", current_sha == expected, f"SHA verified: {current_sha[:16]}..."))

print("=" * 70)
print("VERIFICATION RESULTS — Pipeline Intake Worker")
print("=" * 70)
all_pass = True
for check_id, desc, passed, detail in checks:
    status = "✅ PASS" if passed else "❌ FAIL"
    if not passed:
        all_pass = False
    print(f"  {check_id:6s} {status} | {desc}")
    if detail:
        print(f"          └─ {detail}")

print()
print(f"OVERALL: {'✅ ALL CHECKS PASSED' if all_pass else '❌ SOME CHECKS FAILED'}")
