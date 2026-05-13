#!/usr/bin/env python3
import json

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json"
item_id = "2026-05-06T04-24-18.125594Z_EXH-0126"

with open(state_path) as f:
    data = json.load(f)

# Find the stage 02 item for source_path
s2_items = data.get("stages", {}).get("02-email-paralegal", {}).get("items", [])
for i in s2_items:
    if isinstance(i, dict) and i["item_id"] == item_id:
        print(f"Source path: {i.get('source_path', '?')}")
        print(f"Artifact path: {i.get('artifact_path', '?')}")
        print(f"Exhibit ID: {i.get('exhibit_id', '?')}")
        print(f"Tags: {i.get('tags', [])}")
        print(f"DB source: {i.get('db_source', '?')}")
        break
