#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

stage_02_name = "02-email-paralegal"
stage_03_name = "03-email-attorney"

s2_items = data["stages"].get(stage_02_name, {}).get("items", [])
s3_items = data["stages"].get(stage_03_name, {}).get("items", [])

s3_ids = set(i["item_id"] for i in s3_items)

unproc = [i for i in s2_items if i["status"] == "completed" and i["item_id"] not in s3_ids]
unproc.sort(key=lambda x: x.get("completed_at", ""))

print(f"Stage 02 items total: {len(s2_items)}")
print(f"Stage 03 items total: {len(s3_items)}")
print(f"Unprocessed (completed in s2, not in s3): {len(unproc)}")
print()

for i in unproc:
    tags = ", ".join(i.get("tags", []))
    print(f"item_id: {i['item_id']}")
    print(f"  exhibit_id: {i.get('exhibit_id', 'N/A')}")
    print(f"  source_type: {i.get('source_type', '?')}")
    print(f"  db_source: {i.get('db_source', '?')}")
    print(f"  tags: {tags}")
    print(f"  completed_at: {i.get('completed_at', '?')}")
    print(f"  artifact: {i.get('artifact_path', 'N/A')}")
    print()

# Also print stage summary
for name, stage in data["stages"].items():
    items = stage.get("items", [])
    total = len(items)
    completed = sum(1 for it in items if isinstance(it, dict) and it.get("status") == "completed")
    in_prog = sum(1 for it in items if isinstance(it, dict) and it.get("status") == "in_progress")
    failed = sum(1 for it in items if isinstance(it, dict) and it.get("status") == "failed")
    print(f"Stage: {name:25s} | {total:3d} items | {completed:3d} done | {in_prog:2d} prog | {failed:2d} fail")
