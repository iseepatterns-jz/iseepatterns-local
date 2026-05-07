#!/usr/bin/env python3
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'
bak_path = state_path + '.bak'
item_id = '2026-05-06T04-24-18.124327Z_EXH-0118'

shutil.copy2(state_path, bak_path)

with open(state_path) as f:
    data = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# Find and update the stage 03 item
for i in data['stages']['03-email-attorney']['items']:
    if i['item_id'] == item_id:
        i['status'] = 'completed'
        i['completed_at'] = now
        i['processed_at'] = now
        break

data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Marked {item_id} as completed in stage 03-email-attorney")
print(f"Completed at: {now}")

# Summarize remaining unprocessed
s2_items = data['stages']['02-email-paralegal']['items']
s3_items = data['stages']['03-email-attorney']['items']
s3_ids = {i['item_id'] for i in s3_items}
unproc = [i for i in s2_items if i['status'] == 'completed' and i['item_id'] not in s3_ids]
print(f"\nStage 02 completed items: {len([i for i in s2_items if i['status'] == 'completed'])}")
print(f"Stage 03 items processed: {len(s3_items)}")
print(f"Remaining unprocessed: {len(unproc)}")
if unproc:
    print(f"Next up: {unproc[0]['item_id']} ({unproc[0].get('exhibit_id', '?')})")
