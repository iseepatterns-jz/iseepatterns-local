#!/usr/bin/env python3
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

shutil.copy2(state_path, state_path + '.bak')

with open(state_path) as f:
    data = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
item_id = '2026-05-06T04-24-18.127034Z_EXH-0139'

stage_name = '03-email-attorney'
if stage_name not in data['stages']:
    data['stages'][stage_name] = {'items': []}

# Find the Stage 02 item to copy metadata
s2_items = data['stages']['02-email-paralegal']['items']
s2_item = None
for i in s2_items:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        s2_item = i
        break

new_item = {
    'item_id': item_id,
    'exhibit_id': s2_item.get('exhibit_id', 'EXH-0139') if s2_item else 'EXH-0139',
    'pipeline_stage': stage_name,
    'source_type': 'email',
    'db_source': s2_item.get('db_source', '?') if s2_item else '?',
    'status': 'in_progress',
    'artifact_path': f'artifacts/03-email-attorney/{item_id}_email_synthesis.md',
    'source_path': f'artifacts/02-email-paralegal/{item_id}_email_analysis.md',
    'paralegal_artifact': f'artifacts/02-email-paralegal/{item_id}_email_analysis.md',
    'tags': s2_item.get('tags', []) if s2_item else [],
    'started_at': now,
    'processed_at': now,
    'processed_by': 'isp_hrm_cron_bot'
}

data['stages'][stage_name]['items'].append(new_item)
data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

print(f'Marked {item_id} as in_progress. updated_at={now}')
