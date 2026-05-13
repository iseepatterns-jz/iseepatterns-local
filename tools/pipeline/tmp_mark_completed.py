#!/usr/bin/env python3
"""Mark item as completed in Stage 03."""
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

# Find the item in Stage 03
found = False
for i in data['stages'][stage_name]['items']:
    if isinstance(i, dict) and i.get('item_id') == item_id:
        i['status'] = 'completed'
        i['completed_at'] = now
        i['processed_at'] = now
        i['artifact_path'] = f'artifacts/03-email-attorney/{item_id}_email_synthesis.md'
        i['source_path'] = f'artifacts/02-email-paralegal/{item_id}_email_analysis.md'
        i['paralegal_artifact'] = f'artifacts/02-email-paralegal/{item_id}_email_analysis.md'
        found = True
        print(f"Item {item_id} marked as completed.")
        break

if not found:
    print(f"ERROR: Item {item_id} not found in {stage_name} stage items.")

data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

print(f"State updated successfully at {now}")
