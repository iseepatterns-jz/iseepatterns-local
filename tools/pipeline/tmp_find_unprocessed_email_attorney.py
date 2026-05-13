#!/usr/bin/env python3
"""Find email pipeline items completed in Stage 02 but not yet in Stage 03."""
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

f = open(state_path)
data = json.load(f)

stage_02_name = "02-email-paralegal"
stage_03_name = "03-email-attorney"

# Collect Stage 03 processed IDs
s3items = data.get("stages", {}).get(stage_03_name, {}).get("items", [])
s3_processed = set(i["item_id"] for i in s3items if isinstance(i, dict))

# Stage 02 items
s2items = data.get("stages", {}).get(stage_02_name, {}).get("items", [])
# Filter to only dict items for counting
s2_dicts = [i for i in s2items if isinstance(i, dict)]
s2_strings = [i for i in s2items if isinstance(i, str)]

s2_completed = [i for i in s2_dicts if i.get("status") == "completed"]
s2_in_prog = [i for i in s2_dicts if i.get("status") == "in_progress"]
s2_failed = [i for i in s2_dicts if i.get("status") in ("failed", "error")]

unproc = [i for i in s2_completed if i["item_id"] not in s3_processed]
unproc.sort(key=lambda x: x.get("processed_at", ""))

s3_dicts = [i for i in s3items if isinstance(i, dict)]
s3_strings = [i for i in s3items if isinstance(i, str)]

print(f"=== Email Pipeline Stage Summary ===")
print(f"Pipeline: {data.get('name','?')} | Status: {data.get('status','?')} | Updated: {data.get('updated_at','?')}")
print()

for name, stage in data.get("stages", {}).items():
    items = stage.get("items", [])
    total = len(items)
    d_items = [i for i in items if isinstance(i, dict)]
    s_items = [i for i in items if isinstance(i, str)]
    completed = sum(1 for i in d_items if i.get("status") == "completed")
    in_prog = sum(1 for i in d_items if i.get("status") == "in_progress")
    failed = sum(1 for i in d_items if i.get("status") in ("failed", "error"))
    pending = len(d_items) - completed - in_prog - failed
    strings_info = f" (+{len(s_items)} strings)" if s_items else ""
    print(f"{name:25s} | {total:3d} items{strings_info} | {completed:3d} done | {in_prog:2d} prog | {failed:2d} fail | {pending:2d} pend")

print()
print(f"=== Unprocessed Items (Stage 02 done, Stage 03 not yet) ===")
print(f"Stage 02 completed: {len(s2_completed)}")
print(f"Stage 03 processed: {len(s3_processed)}")
print(f"Total unprocessed: {len(unproc)}")

for i in unproc:
    exh = i.get("exhibit_id", "?")
    tags = i.get("tags", [])
    para_artifact = i.get("paralegal_artifact") or i.get("artifact_path", "?")
    print(f"  item_id: {i['item_id']}")
    print(f"    exhibit_id: {exh}")
    print(f"    tags: {tags}")
    print(f"    paralegal_artifact: {para_artifact}")
    print()

if not unproc:
    print("No unprocessed items found.")
