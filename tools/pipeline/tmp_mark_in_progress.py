#!/usr/bin/env python3
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'
item_id = '2026-05-06T04-24-18.125124Z_EXH-0122'
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# Backup
shutil.copy2(state_path, state_path + '.bak')

with open(state_path) as f:
    data = json.load(f)

stage_name = '03-email-attorney'
if stage_name not in data['stages']:
    data['stages'][stage_name] = {'items': []}

# Check if item already exists in stage 03
existing = None
for i in data['stages'][stage_name]['items']:
    if i['item_id'] == item_id:
        existing = i
        break

if existing:
    existing['status'] = 'in_progress'
    existing['started_at'] = now
else:
    # Copy metadata from stage 02 item
    s2items = data['stages'].get('02-email-paralegal', {}).get('items', [])
    s2_item = None
    for i in s2items:
        if i['item_id'] == item_id:
            s2_item = i
            break
    
    new_item = {
        'item_id': item_id,
        'exhibit_id': s2_item.get('exhibit_id', ''),
        'pipeline_stage': stage_name,
        'source_type': s2_item.get('source_type', 'email'),
        'db_source': s2_item.get('db_source', ''),
        'status': 'in_progress',
        'artifact_path': f'artifacts/03-email-attorney/{item_id}_email_synthesis.md',
        'source_path': s2_item.get('artifact_path', ''),
        'paralegal_artifact': s2_item.get('artifact_path', ''),
        'tags': s2_item.get('tags', []),
        'started_at': now,
        'processed_by': 'isp_hrm_cron_bot'
    }
    data['stages'][stage_name]['items'].append(new_item)

data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

print(f"Marked {item_id} as in_progress in {stage_name}")
