#!/usr/bin/env python3
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

state_path = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json')
item_id = '2026-05-06T04-24-18.169174Z_EXH-0528'
exhibit_id = 'EXH-0528'
stage = '03-email-attorney'
source_type = 'email'
artifact_path = 'artifacts/03-email-attorney/2026-05-06T04-24-18.169174Z_EXH-0528_email_synthesis.md'
paralegal_artifact = 'artifacts/02-email-paralegal/2026-05-06T04-24-18.169174Z_EXH-0528_email_analysis.md'
processed_by = 'email_attorney_worker'
now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')

update_fields = {
    'item_id': item_id,
    'exhibit_id': exhibit_id,
    'pipeline_stage': stage,
    'source_type': source_type,
    'status': 'completed',
    'completed_at': now,
    'processed_at': now,
    'artifact_path': artifact_path,
    'source_path': paralegal_artifact,
    'paralegal_artifact': paralegal_artifact,
    'processed_by': processed_by,
}

with state_path.open('r', encoding='utf-8') as f:
    data = json.load(f)

matches = []

def walk(obj, parent=None, key=None):
    if isinstance(obj, dict):
        obj_item = obj.get('item_id') == item_id
        obj_exhibit = obj.get('exhibit_id') == exhibit_id
        obj_stage = obj.get('pipeline_stage') == stage or obj.get('stage') == stage
        obj_artifact = obj.get('artifact_path') == artifact_path
        if (obj_item and obj_stage) or (obj_exhibit and obj_stage) or obj_artifact:
            matches.append(obj)
        for k, v in obj.items():
            walk(v, obj, k)
    elif isinstance(obj, list):
        for idx, v in enumerate(obj):
            walk(v, obj, idx)

walk(data)

if matches:
    target = matches[0]
    target.update(update_fields)
    action = 'updated_existing'
else:
    # Append conservatively to the most likely pipeline item collection.
    target_list = None
    if isinstance(data, dict):
        for candidate in ('items', 'pipeline_items', 'queue', 'entries'):
            if isinstance(data.get(candidate), list):
                target_list = data[candidate]
                break
        if target_list is None:
            data.setdefault('items', [])
            target_list = data['items']
    elif isinstance(data, list):
        target_list = data
    else:
        raise TypeError('Unsupported pipeline-state root type')
    target_list.append(dict(update_fields))
    action = 'appended_new'

if isinstance(data, dict):
    data['updated_at'] = now

backup_path = state_path.with_name(state_path.name + f'.bak.{now.replace(":", "-")}')
shutil.copy2(state_path, backup_path)

fd, tmp_name = tempfile.mkstemp(prefix=state_path.name + '.', suffix='.tmp', dir=str(state_path.parent))
try:
    with os.fdopen(fd, 'w', encoding='utf-8') as tmp:
        json.dump(data, tmp, indent=2, ensure_ascii=False)
        tmp.write('\n')
        tmp.flush()
        os.fsync(tmp.fileno())
    os.replace(tmp_name, state_path)
finally:
    if os.path.exists(tmp_name):
        os.unlink(tmp_name)

print(json.dumps({
    'result': action,
    'state_path': str(state_path),
    'backup_path': str(backup_path),
    'item_id': item_id,
    'exhibit_id': exhibit_id,
    'pipeline_stage': stage,
    'status': 'completed',
    'artifact_path': artifact_path,
    'updated_at': now,
}, indent=2))
