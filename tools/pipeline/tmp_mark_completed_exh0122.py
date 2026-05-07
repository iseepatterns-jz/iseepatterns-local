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

# Find and update the item
for i in data['stages'][stage_name]['items']:
    if i['item_id'] == item_id:
        i['status'] = 'completed'
        i['completed_at'] = now
        i['processed_at'] = now
        i['processed_by'] = 'isp_hrm_cron_bot'
        break

data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

# Print summary
s2 = data['stages'].get('02-email-paralegal', {}).get('items', [])
s3 = data['stages'].get('03-email-attorney', {}).get('items', [])
s2_completed = sum(1 for i in s2 if i.get('status') == 'completed')
s3_completed = sum(1 for i in s3 if i.get('status') == 'completed')
s3_in_prog = sum(1 for i in s3 if i.get('status') == 'in_progress')

print(f"Updated: {item_id} -> completed")
print(f"Stage 02-email-paralegal: {s2_completed}/{len(s2)} completed")
print(f"Stage 03-email-attorney: {s3_completed}/{len(s3)} completed, {s3_in_prog} in_progress")
