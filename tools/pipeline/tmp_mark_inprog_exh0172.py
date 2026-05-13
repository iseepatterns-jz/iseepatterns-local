#!/usr/bin/env python3
import json, shutil, os
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

# Backup
shutil.copy2(state_path, state_path + '.cron.bak')

with open(state_path) as f:
    data = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
item_id = '2026-05-06T04-24-18.130633Z_EXH-0172'

# Ensure stage exists
if '03-email-attorney' not in data['stages']:
    data['stages']['03-email-attorney'] = {'items': []}

# Check if item already exists in Stage 03
existing = None
for i in data['stages']['03-email-attorney']['items']:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        existing = i
        break

if existing:
    existing['status'] = 'in_progress'
    existing['started_at'] = now
    print(f"Updated existing item: {item_id} -> in_progress")
else:
    # Get info from Stage 02
    s2_item = None
    for i in data['stages']['02-email-paralegal']['items']:
        if isinstance(i, dict) and i.get('item_id') == item_id:
            s2_item = i
            break
    
    new_item = {
        'item_id': item_id,
        'exhibit_id': 'EXH-0172',
        'pipeline_stage': '03-email-attorney',
        'source_type': 'email',
        'db_source': s2_item.get('db_source', 'mayersky_smoking_gun') if s2_item else 'mayersky_smoking_gun',
        'status': 'in_progress',
        'artifact_path': f'artifacts/03-email-attorney/{item_id}_email_synthesis.md',
        'source_path': f'artifacts/02-email-paralegal/{item_id}_email_analysis.md',
        'paralegal_artifact': f'artifacts/02-email-paralegal/{item_id}_email_analysis.md',
        'tags': s2_item.get('tags', []) if s2_item else [],
        'started_at': now,
        'processed_at': now,
        'processed_by': 'isp_hrm_cron_bot'
    }
    data['stages']['03-email-attorney']['items'].append(new_item)
    print(f"Created new item: {item_id} -> in_progress")

data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

print("State updated successfully")
