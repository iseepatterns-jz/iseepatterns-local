#!/usr/bin/env python3
"""Mark EXH-0148 as in_progress in Stage 03, and get its source info."""
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

shutil.copy2(state_path, state_path + '.bak')

with open(state_path) as f:
    data = json.load(f)

item_id = '2026-05-06T04-24-18.128032Z_EXH-0148'
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

stage_03_name = "03-email-attorney"
stage_02_name = "02-email-paralegal"

# Ensure stage exists
if stage_03_name not in data['stages']:
    data['stages'][stage_03_name] = {'items': []}

# Find Stage 02 item for source info
s2item = None
for i in data['stages'][stage_02_name]['items']:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        s2item = i
        break

# Check if already in Stage 03
existing = None
for i in data['stages'][stage_03_name]['items']:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        existing = i
        break

if existing:
    existing['status'] = 'in_progress'
    existing['started_at'] = now
    existing['processed_by'] = 'isp_hrm_cron_bot'
else:
    new_item = {
        "item_id": item_id,
        "exhibit_id": s2item.get('exhibit_id', 'EXH-0148') if s2item else 'EXH-0148',
        "pipeline_stage": stage_03_name,
        "source_type": s2item.get('source_type', 'email') if s2item else 'email',
        "db_source": s2item.get('db_source', 'mayersky_smoking_gun') if s2item else 'mayersky_smoking_gun',
        "status": "in_progress",
        "started_at": now,
        "processed_by": "isp_hrm_cron_bot",
        "tags": s2item.get('tags', []) if s2item else []
    }
    data['stages'][stage_03_name]['items'].append(new_item)

data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

print(f"Marked {item_id} as in_progress in {stage_03_name}")
if s2item:
    print(f"Source tags: {s2item.get('tags', [])}")
    print(f"Source artifact: {s2item.get('artifact_path', '?')}")
    print(f"Source exhibit_id: {s2item.get('exhibit_id', '?')}")
