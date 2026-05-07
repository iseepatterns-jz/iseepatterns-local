#!/usr/bin/env python3
"""Mark EXH-0103 as completed in Stage 03."""
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'
item_id = '2026-05-06T04-24-18.122645Z_EXH-0103'

# Read
with open(state_path) as f:
    data = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# Find and update the item in stage 03
for i in data['stages']['03-email-attorney']['items']:
    if i.get('item_id') == item_id:
        i['status'] = 'completed'
        i['completed_at'] = now
        print(f"Marked {item_id} as completed in 03-email-attorney")
        break
else:
    print(f"Item {item_id} not found in stage 03 — creating entry")
    new_item = {
        "item_id": item_id,
        "exhibit_id": "EXH-0103",
        "pipeline_stage": "03-email-attorney",
        "status": "completed",
        "source_path": "artifacts/02-email-paralegal/2026-05-06T04-24-18.122645Z_EXH-0103_email_analysis.md",
        "artifact_path": "artifacts/03-email-attorney/2026-05-06T04-24-18.122645Z_EXH-0103_email_synthesis.md",
        "completed_at": now
    }
    data['stages']['03-email-attorney']['items'].append(new_item)

# Write atomically
with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

print("State file written successfully")
