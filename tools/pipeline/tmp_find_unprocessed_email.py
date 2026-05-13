#!/usr/bin/env python3
import json

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json"
stage_02_name = "02-email-paralegal"
stage_03_name = "03-email-attorney"

f = open(state_path)
data = json.load(f)

# Collect all Stage 03 processed IDs
s3_items = data.get("stages", {}).get(stage_03_name, {}).get("items", [])
all_processed = set(i["item_id"] for i in s3_items if isinstance(i, dict) and i.get("status") == "completed")

# Find Stage 02 completed items not yet in Stage 03
s2_items = data.get("stages", {}).get(stage_02_name, {}).get("items", [])
unproc = [i for i in s2_items if isinstance(i, dict) and i.get("status") == "completed" and i["item_id"] not in all_processed]

# Also check for in_progress items (that might have been started but not completed)
s3_in_progress = [i for i in s3_items if isinstance(i, dict) and i.get("status") == "in_progress"]

unproc.sort(key=lambda x: x.get("completed_at", ""))
print(f"Stage 02 total items: {len(s2_items)}")
print(f"Completed in Stage 02: {sum(1 for i in s2_items if isinstance(i,dict) and i.get('status')=='completed')}")
print(f"Stage 03 total items: {len(s3_items)}")
print(f"Completed in Stage 03: {len(all_processed)}")
print(f"In progress in Stage 03: {len(s3_in_progress)}")
print(f"Unprocessed (completed stage 02, not in stage 03): {len(unproc)}")
print(f"---")
for i in unproc:
    print(f"{i['item_id']:50s} | EXH={i.get('exhibit_id','?'):8s} | completed={i.get('completed_at','?'):30s} | tags={','.join(i.get('tags',[]))}")
print(f"---")
for i in s3_in_progress:
    print(f"[IN-PROGRESS] {i['item_id']:50s} | EXH={i.get('exhibit_id','?'):8s} | started={i.get('started_at','?'):30s}")
