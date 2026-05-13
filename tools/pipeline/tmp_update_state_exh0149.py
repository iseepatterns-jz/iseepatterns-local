#!/usr/bin/env python3
import json, shutil
from datetime import datetime, timezone

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/state/pipeline-state.json"

# Backup
shutil.copy2(state_path, state_path + '.bak')

with open(state_path) as f:
    data = json.load(f)

# The new intake item
new_item = {
    "item_id": "2026-05-06T04-24-18.128134Z_EXH-0149",
    "exhibit_id": "EXH-0149",
    "pipeline_stage": "01-intake",
    "source_type": "email",
    "classification": "EMAIL",
    "status": "completed",
    "source_path": "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER/EXH-0149_MSG_27_2017-12-12.txt",
    "sha256": "2daa2719d0dea5211357bb748e2e94fb03faa535214cc416c4bea4e39fa3a80e",
    "artifact_path": "artifacts/01-intake/2026-05-06T04-24-18.128134Z_EXH-0149.json",
    "tags": ["FRAUD", "FINANCIAL", "TIMELINE"],
    "processed_at": "2026-05-07T07:04:37Z",
    "processed_by": "para_01_bot"
}

# Ensure 01-intake stage exists
if "01-intake" not in data["stages"]:
    data["stages"]["01-intake"] = {"items": [], "status": "active"}
elif "items" not in data["stages"]["01-intake"]:
    data["stages"]["01-intake"]["items"] = []

# Add the item
data["stages"]["01-intake"]["items"].append(new_item)

# Also update completed_items array
if "completed_items" not in data:
    data["completed_items"] = []
data["completed_items"].append(new_item["item_id"])

# Update stage status
data["stages"]["01-intake"]["status"] = "active"

# Check if inbox is now empty - read it
import os, glob
inbox_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/work-queue/inbox/"
inbox_files = glob.glob(inbox_path + "*.json")
if len(inbox_files) == 0:
    data["stages"]["01-intake"]["status"] = "idle"

# Update timestamp
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
data["updated_at"] = now

# Write back
with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

print(f"State updated. 01-intake items: {len(data['stages']['01-intake']['items'])}")
print(f"Status: {data['stages']['01-intake']['status']}")
print(f"Updated at: {now}")
print(f"Inbox remaining: {len(inbox_files)} files")
