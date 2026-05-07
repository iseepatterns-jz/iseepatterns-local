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
if stage_name not in data['stages']:
    data['stages'][stage_name] = {'items': []}

# Get the source item from stage 02 for metadata
s2items = data['stages'].get('02-email-paralegal', {}).get('items', [])
source_item = None
for i in s2items:
    if i['item_id'] == item_id:
        source_item = i
        break

if not source_item:
    print("ERROR: item not found in stage 02")
else:
    new_item = {
        'item_id': item_id,
        'exhibit_id': source_item.get('exhibit_id', '?'),
        'pipeline_stage': stage_name,
        'source_type': source_item.get('source_type', 'email'),
        'db_source': source_item.get('db_source', '?'),
        'status': 'in_progress',
        'artifact_path': f'artifacts/03-email-attorney/{item_id}_email_synthesis.md',
        'source_path': source_item.get('artifact_path', source_item.get('paralegal_artifact', '?')),
        'paralegal_artifact': source_item.get('artifact_path', source_item.get('paralegal_artifact', '?')),
        'tags': source_item.get('tags', []),
        'started_at': now,
        'processed_at': now,
        'processed_by': 'isp_hrm_cron_bot'
    }
    data['stages'][stage_name]['items'].append(new_item)
    data['updated_at'] = now
    with open(state_path, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    print(f"Marked {item_id} as in_progress in {stage_name}")
