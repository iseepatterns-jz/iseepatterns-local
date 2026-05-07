#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'
with open(state_path) as f:
    data = json.load(f)

s2 = data['stages'].get('02-email-paralegal', {}).get('items', [])
s3 = data['stages'].get('03-email-attorney', {}).get('items', [])

# Check if EXH-0122 is in s3
s3_ids = set(i['item_id'] for i in s3)
print(f"EXH-0122 in s3: {'2026-05-06T04-24-18.125124Z_EXH-0122' in s3_ids}")
for i in s3:
    if i['item_id'] == '2026-05-06T04-24-18.125124Z_EXH-0122':
        print(f"  Status: {i['status']}")
        print(f"  Completed at: {i.get('completed_at', 'N/A')}")

# Check EXH-0123 in s2 - look at exhibit_id field
for i in s2:
    if 'EXH-0123' in i['item_id']:
        print(f"EXH-0123 s2 exhibit_id: '{i.get('exhibit_id', 'MISSING')}'")
        print(f"  Check: 'EXH-0123' in s3: {'2026-05-06T04-24-18.125254Z_EXH-0123' in s3_ids}")
        
# Total counts
s2_completed = sum(1 for i in s2 if i.get('status') == 'completed')
print(f"\nStage 02 completed: {s2_completed}/{len(s2)}")
print(f"Stage 03 total: {len(s3)}, completed: {sum(1 for i in s3 if i.get('status') == 'completed')}")
