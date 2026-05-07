#!/usr/bin/env python3
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

shutil.copy2(state_path, state_path + '.bak')

with open(state_path) as f:
    data = json.load(f)

item_id = '2026-05-06T04-24-18.124212Z_EXH-0117'
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

stage_name = '03-email-attorney'

# Find and update the item
found = False
for i in data['stages'][stage_name]['items']:
    if i['item_id'] == item_id:
        i['status'] = 'completed'
        i['completed_at'] = now
        i['processed_at'] = now
        found = True
        break

if found:
    data['updated_at'] = now
    with open(state_path, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    print(f"Marked {item_id} as completed in {stage_name}")
else:
    print(f"ERROR: item {item_id} not found in {stage_name}")
