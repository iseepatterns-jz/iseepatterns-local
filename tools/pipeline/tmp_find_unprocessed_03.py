#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

stage_02_name = "02-email-paralegal"
stage_03_name = "03-email-attorney"

s2items = data["stages"].get(stage_02_name, {}).get("items", [])
s3items = data["stages"].get(stage_03_name, {}).get("items", [])
s3_ids = set(i["item_id"] for i in s3items)

unproc = [i for i in s2items if i["status"] == "completed" and i["item_id"] not in s3_ids]
unproc.sort(key=lambda x: x.get("processed_at", ""))  # oldest first

print(f"Unprocessed items: {len(unproc)}")
print("---")
for i in unproc:
    print(f"ITEM_ID: {i['item_id']}")
    print(f"  EXHIBIT: {i.get('exhibit_id','?')}")
    print(f"  TAGS: {i.get('tags', [])}")
    print(f"  ARTIFACT: {i.get('artifact_path','?')}")
    print(f"  PROCESSED: {i.get('processed_at','?')}")
    print()
