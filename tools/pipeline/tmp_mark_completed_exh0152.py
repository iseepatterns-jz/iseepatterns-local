#!/usr/bin/env python3
"""Mark EXH-0152 as completed in Stage 03 of pipeline-state.json."""
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

# Backup
shutil.copy2(state_path, state_path + '.bak')

with open(state_path) as f:
    data = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
item_id = '2026-05-06T04-24-18.128443Z_EXH-0152'

stage_name = '03-email-attorney'
s3_items = data['stages'][stage_name]['items']

found = False
for i in s3_items:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        i['status'] = 'completed'
        i['completed_at'] = now
        i['processed_at'] = now
        found = True
        break

if not found:
    print(f"ERROR: Item {item_id} not found in Stage 03")
    exit(1)

data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

# Verify
with open(state_path) as f:
    verified = json.load(f)

for i in verified['stages'][stage_name]['items']:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        print(f"EXH-0152 Stage 03 status: {i['status']}")
        print(f"Completed at: {i.get('completed_at', 'N/A')}")
        print(f"Artifact: {i.get('artifact_path', 'N/A')}")
        break

print(f"\npipeline-state.json updated at {now}")
