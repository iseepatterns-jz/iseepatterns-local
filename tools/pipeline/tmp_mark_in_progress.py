#!/usr/bin/env python3
"""Mark item as in_progress in Stage 03, then read and print the paralegal analysis."""
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'
item_id = '2026-05-06T04-24-18.129183Z_EXH-0159'

# Backup
shutil.copy2(state_path, state_path + '.bak')

# Read
with open(state_path) as f:
    data = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
stage_name = '03-email-attorney'

# Ensure stage exists
if stage_name not in data['stages']:
    data['stages'][stage_name] = {'items': []}

# Check if already in stage
existing = None
for i in data['stages'][stage_name]['items']:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        existing = i
        break

if existing:
    print(f"Item already exists in {stage_name} with status: {existing.get('status')}")
    existing['status'] = 'in_progress'
    existing['started_at'] = now
    existing['processed_by'] = 'isp_hrm_cron_bot'
else:
    # Get info from Stage 02
    s2items = data['stages'].get('02-email-paralegal', {}).get('items', [])
    s2_item = None
    for i in s2items:
        if isinstance(i, dict) and i.get('item_id') == item_id:
            s2_item = i
            break
    
    new_item = {
        'item_id': item_id,
        'exhibit_id': s2_item.get('exhibit_id', '?') if s2_item else '?',
        'pipeline_stage': stage_name,
        'source_type': 'email',
        'db_source': s2_item.get('db_source', '?') if s2_item else '?',
        'status': 'in_progress',
        'started_at': now,
        'processed_by': 'isp_hrm_cron_bot',
        'tags': s2_item.get('tags', []) if s2_item else []
    }
    data['stages'][stage_name]['items'].append(new_item)
    print(f"Added new item {item_id} to {stage_name} with status=in_progress")

data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

print(f"State updated successfully at {now}")

# Get the paralegal artifact path from Stage 02
para_path = None
if s2_item:
    para_path = s2_item.get('paralegal_artifact') or s2_item.get('artifact_path', None)
    print(f"Paralegal artifact path: {para_path}")
else:
    print("ERROR: Could not find item in Stage 02")
