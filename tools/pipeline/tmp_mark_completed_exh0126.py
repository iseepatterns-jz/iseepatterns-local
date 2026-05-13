#!/usr/bin/env python3
import json, shutil
from datetime import datetime, timezone

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json"
item_id = "2026-05-06T04-24-18.125594Z_EXH-0126"
stage_name = "03-email-attorney"

# Backup
shutil.copy2(state_path, state_path + '.bak')

with open(state_path) as f:
    data = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# Find and update the item in stage 03
s3_items = data.get("stages", {}).get(stage_name, {}).get("items", [])
updated = False
for i in s3_items:
    if isinstance(i, dict) and i["item_id"] == item_id:
        i["status"] = "completed"
        i["completed_at"] = now
        i["processed_at"] = now
        updated = True
        print(f"Item marked completed: {item_id}")
        print(f"Tags: {i.get('tags', [])}")
        print(f"Artifact: artifacts/{stage_name}/{item_id}_email_synthesis.md")
        break

if not updated:
    print(f"ERROR: Item {item_id} not found in stage {stage_name}")

data["updated_at"] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

# Verify
print(f"\nPipeline updated at: {now}")

# Print summary of stage 03
s3_done = sum(1 for i in s3_items if isinstance(i, dict) and i.get("status") == "completed")
s3_total = len(s3_items)
print(f"Stage 03: {s3_done}/{s3_total} completed")
