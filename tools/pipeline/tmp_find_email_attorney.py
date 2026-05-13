#!/usr/bin/env python3
"""Find items completed in 02-email-paralegal but not yet in 03-email-attorney."""
import json

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json"

with open(state_path) as f:
    data = json.load(f)

# Get Stage 02 email paralegal items
s2_items = data.get("stages", {}).get("02-email-paralegal", {}).get("items", [])
completed_s2 = [i for i in s2_items if isinstance(i, dict) and i.get("status") == "completed"]

# Get Stage 03 email attorney items
s3_items = data.get("stages", {}).get("03-email-attorney", {}).get("items", [])
s3_processed_ids = set()
for i in s3_items:
    if isinstance(i, dict):
        s3_processed_ids.add(i.get("item_id"))
        # Also check for items in_progress
        if i.get("status") in ("in_progress",):
            print(f"NOTE: Stage 03 in_progress item: {i.get('item_id')}")

# Also check legacy items array
for i in data.get("items", []):
    if isinstance(i, dict) and i.get("pipeline_stage") == "03-email-attorney" and i.get("status") == "completed":
        s3_processed_ids.add(i.get("item_id"))

unprocessed = [i for i in completed_s2 if i["item_id"] not in s3_processed_ids]
unprocessed.sort(key=lambda x: x.get("processed_at", ""))

print(f"Stage 02 completed items: {len(completed_s2)}")
print(f"Stage 03 already processed: {len(s3_processed_ids)}")
print(f"Unprocessed items: {len(unprocessed)}")
print()

for i in unprocessed:
    item_id = i["item_id"]
    exh = i.get("exhibit_id", "?")
    db = i.get("db_source", "?")
    tags = ", ".join(i.get("tags", []))
    art = i.get("artifact_path", "?")
    print(f"ITEM: {item_id}")
    print(f"  Exhibit: {exh} | DB: {db}")
    print(f"  Tags: {tags}")
    print(f"  Artifact: {art}")
    print()

if not unprocessed:
    print("No unprocessed items found. All Stage 02 completed items have Stage 03 entries.")
    print()

# Also show stage summary
print("=== Stage Summary ===")
for name, stage in sorted(data.get("stages", {}).items()):
    items = stage.get("items", [])
    total = len(items)
    completed = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "completed")
    in_prog = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "in_progress")
    failed = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "failed")
    print(f"  {name:25s}: {total:3d} items | {completed:3d} done | {in_prog:2d} prog | {failed:2d} fail")
