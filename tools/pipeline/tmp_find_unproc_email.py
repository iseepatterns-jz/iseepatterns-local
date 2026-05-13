#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'
with open(state_path) as f:
    data = json.load(f)

# Collect Stage 03 processed item_ids
s3_items = data.get("stages", {}).get("03-email-attorney", {}).get("items", [])
s3_ids = set()
for i in s3_items:
    if isinstance(i, dict):
        iid = i.get("item_id")
        if iid:
            s3_ids.add(iid)

# Find Stage 02 completed items not in Stage 03
s2_items = data.get("stages", {}).get("02-email-paralegal", {}).get("items", [])
unproc = []
for i in s2_items:
    if isinstance(i, dict) and i.get("status") == "completed":
        iid = i.get("item_id")
        if iid and iid not in s3_ids:
            unproc.append(i)

unproc.sort(key=lambda x: x.get("processed_at", x.get("item_id", "")))
print(f"Stage 02 total items: {len(s2_items)}")
print(f"Stage 03 processed IDs: {len(s3_ids)}")
print(f"Unprocessed items found: {len(unproc)}")
print()
for u in unproc:
    iid = u.get("item_id", "?")
    exh = u.get("exhibit_id", "?")
    src = u.get("source_type", "?")
    db = u.get("db_source", "?")
    pa = u.get("paralegal_artifact") or u.get("artifact_path", "?")
    processed_at = u.get("processed_at", "?")
    tags = u.get("tags", [])
    print(f"item_id: {iid}")
    print(f"  exhibit_id: {exh}")
    print(f"  source_type: {src}")
    print(f"  db_source: {db}")
    print(f"  paralegal_artifact: {pa}")
    print(f"  processed_at: {processed_at}")
    print(f"  tags: {tags}")
    print()
