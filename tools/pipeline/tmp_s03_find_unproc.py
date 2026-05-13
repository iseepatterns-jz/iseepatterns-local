#!/usr/bin/env python3
"""Find Stage 02-email-paralegal items completed but not yet in Stage 03-email-attorney."""
import json
from datetime import datetime, timezone

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json"

with open(state_path) as f:
    data = json.load(f)

# Collect all Stage 03 processed item_ids (from stages array)
s3_items = data.get("stages", {}).get("03-email-attorney", {}).get("items", [])
s3_ids = set()
for i in s3_items:
    if isinstance(i, dict):
        iid = i.get("item_id")
        if iid:
            s3_ids.add(iid)

# Also check legacy items array
legacy_ids = set()
for i in data.get("items", []):
    if isinstance(i, dict) and i.get("pipeline_stage") == "03-email-attorney" and i.get("status") == "completed":
        iid = i.get("item_id")
        if iid:
            legacy_ids.add(iid)

all_processed = s3_ids | legacy_ids

# Find Stage 02 completed items
s2_items = data.get("stages", {}).get("02-email-paralegal", {}).get("items", [])
unprocessed = []
for i in s2_items:
    if isinstance(i, dict) and i.get("status") == "completed" and i.get("item_id") not in all_processed:
        unprocessed.append(i)

unprocessed.sort(key=lambda x: x.get("processed_at", "") or "")

# Stage summary
s2_completed = sum(1 for i in s2_items if isinstance(i, dict) and i.get("status") == "completed")
s3_in_stage = len(s3_ids)
s3_legacy = len(legacy_ids)
s3_total = len(all_processed)

print(f"STAGE SUMMARY")
print(f"=============")
print(f"Stage 02-email-paralegal completed: {s2_completed}")
print(f"Stage 03-email-attorney (from stages array): {s3_in_stage}")
print(f"Stage 03-email-attorney (from legacy items): {s3_legacy}")
print(f"Stage 03-email-attorney total processed: {s3_total}")
print(f"Unprocessed items: {len(unprocessed)}")
print()

if unprocessed:
    print(f"{'item_id':45s} | {'exhibit_id':10s} | {'source_type':10s} | {'db_source':20s} | {'processed_at':30s}")
    print("-"*120)
    for i in unprocessed:
        iid = i.get("item_id", "?")
        exh = i.get("exhibit_id", "?")
        st = i.get("source_type", "?")
        db = i.get("db_source", "?")
        pa = i.get("processed_at", "?")
        art = i.get("artifact_path", i.get("paralegal_artifact", "?"))
        print(f"{iid:45s} | {exh:10s} | {st:10s} | {db:20s} | {pa:30s}")
        print(f"     artifact_path: {art}")
    print()
    print(f"First unprocessed item_id for processing: {unprocessed[0].get('item_id', '?')}")
else:
    print("No unprocessed items found.")
