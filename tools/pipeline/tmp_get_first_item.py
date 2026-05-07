#!/usr/bin/env python3
"""Get the exact item_id for EXH-0103 and read its paralegal analysis."""
import json, os

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

# Get the first unprocessed item
s2items = data['stages']['02-email-paralegal']['items']
s3items = data['stages'].get('03-email-attorney', {}).get('items', [])
s3_ids = set(i.get('item_id', '') for i in s3items)
unproc = [i for i in s2items if i.get('status') == 'completed' and i.get('item_id', '') not in s3_ids]
unproc.sort(key=lambda x: x.get('completed_at', ''))

first = unproc[0]
item_id = first['item_id']
exh = first.get('exhibit_id', '?')
print(f"First unprocessed: item_id={item_id}")
print(f"Exhibit: {exh}")

# Find the paralegal analysis file
paralegal_dir = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/artifacts/02-email-paralegal'
analysis_file = f"{paralegal_dir}/{item_id}_email_analysis.md"
if os.path.exists(analysis_file):
    print(f"Analysis file exists: {analysis_file}")
else:
    # Try other patterns
    for fname in os.listdir(paralegal_dir):
        if item_id in fname:
            print(f"Found: {fname}")
            analysis_file = os.path.join(paralegal_dir, fname)
            break
    else:
        print(f"No analysis file found for {item_id}")
        print(f"Files in dir: {os.listdir(paralegal_dir)[:10]}")

# Also check the source info in intake
intake_items = data['stages'].get('01-intake', {}).get('items', [])
for i in intake_items:
    if i.get('item_id') == item_id:
        print(f"\nIntake info: {json.dumps(i, indent=2, default=str)[:500]}")
        break
