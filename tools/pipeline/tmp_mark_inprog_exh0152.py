#!/usr/bin/env python3
"""Mark EXH-0152 as in_progress in Stage 03 of pipeline-state.json with backup."""
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

# Backup
shutil.copy2(state_path, state_path + '.bak')

with open(state_path) as f:
    data = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
item_id = '2026-05-06T04-24-18.128443Z_EXH-0152'

# Find the Stage 02 item to copy metadata
s2_items = data['stages']['02-email-paralegal']['items']
s2_item = None
for i in s2_items:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        s2_item = i
        break

if not s2_item:
    print(f"ERROR: Item {item_id} not found in Stage 02")
    exit(1)

# Ensure Stage 03 exists
if '03-email-attorney' not in data['stages']:
    data['stages']['03-email-attorney'] = {'items': []}

s3_items = data['stages']['03-email-attorney']['items']

# Check if already exists
existing = None
for i in s3_items:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        existing = i
        break

if existing:
    existing['status'] = 'in_progress'
    existing['started_at'] = now
    existing['processed_by'] = 'isp_hrm_cron_bot'
    action = 'updated'
else:
    new_item = {
        'item_id': item_id,
        'exhibit_id': 'EXH-0152',
        'pipeline_stage': '03-email-attorney',
        'source_type': 'email',
        'db_source': s2_item.get('db_source', ''),
        'status': 'in_progress',
        'artifact_path': f'artifacts/03-email-attorney/{item_id}_email_synthesis.md',
        'source_path': f'artifacts/02-email-paralegal/{item_id}_email_analysis.md',
        'paralegal_artifact': f'artifacts/02-email-paralegal/{item_id}_email_analysis.md',
        'tags': s2_item.get('tags', []),
        'started_at': now,
        'processed_at': now,
        'processed_by': 'isp_hrm_cron_bot'
    }
    s3_items.append(new_item)
    action = 'created'

data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

print(f"Marked {item_id} as in_progress in Stage 03 ({action}) at {now}")
