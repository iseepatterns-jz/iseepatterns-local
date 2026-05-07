#!/usr/bin/env python3
import json
import shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json'
backup_path = state_path + '.bak'

# Read
with open(state_path) as f:
    data = json.load(f)

item_id = '2026-05-06T04-24-18.118196Z_EXH-0063'
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# Ensure 03-email-attorney stage exists
if '03-email-attorney' not in data['stages']:
    data['stages']['03-email-attorney'] = {'items': []}

# Check if item already exists
existing = None
for i in data['stages']['03-email-attorney']['items']:
    if i['item_id'] == item_id:
        existing = i
        break

if existing:
    existing['status'] = 'in_progress'
    existing['started_at'] = now
    print(f"Updated existing item: {item_id} -> in_progress")
else:
    new_item = {
        'item_id': item_id,
        'pipeline_stage': '03-email-attorney',
        'status': 'in_progress',
        'started_at': now
    }
    data['stages']['03-email-attorney']['items'].append(new_item)
    print(f"Added new item: {item_id} -> in_progress")

# Write
shutil.copy2(state_path, backup_path)
with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)
print(f"State updated. Backup at {backup_path}")
