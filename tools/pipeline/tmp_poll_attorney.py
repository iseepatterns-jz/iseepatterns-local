#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

f = open(state_path)
data = json.load(f)

# Email pipeline: 02-email-paralegal -> 03-email-attorney
s2_items = data.get("stages", {}).get("02-email-paralegal", {}).get("items", [])
s3_items = data.get("stages", {}).get("03-email-attorney", {}).get("items", [])

s3_processed = set(i["item_id"] for i in s3_items)

completed_s2 = [i for i in s2_items if isinstance(i, dict) and i.get("status") == "completed"]
unprocessed = [i for i in completed_s2 if i["item_id"] not in s3_processed]
unprocessed.sort(key=lambda x: x.get("processed_at", x.get("completed_at", "")))

print(f"Stage 02 completed: {len(completed_s2)}")
print(f"Stage 03 processed: {len(s3_processed)}")
print(f"Unprocessed: {len(unprocessed)}")
print()
for i in unprocessed:
    print(f"item_id: {i['item_id']}")
    print(f"  exhibit_id: {i.get('exhibit_id','?')}")
    print(f"  source: {i.get('db_source','?')}")
    print(f"  tags: {i.get('tags',[])}")
    print(f"  artifact: {i.get('artifact_path', i.get('paralegal_artifact','?'))}")
    print(f"  processed: {i.get('processed_at','?')}")
    print()
