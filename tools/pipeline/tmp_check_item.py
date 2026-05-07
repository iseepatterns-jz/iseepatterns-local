#!/usr/bin/env python3
import json
import os

# Read pipeline state
f=open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json')
data=json.load(f)

# First unprocessed item
item_id = '2026-05-06T0303-45Z'

# Find this item in the stages
for stage_name, stage_data in data['stages'].items():
    items = stage_data.get('items', [])
    for i in items:
        if i['item_id'] == item_id:
            print(f"Stage: {stage_name}")
            print(json.dumps(i, indent=2, default=str))

# Also look for this item_id pattern in the paralegal directory
# Check the output path from stage 02
s2items = data['stages']['02-paralegal']['items']
for i in s2items:
    if i['item_id'] == item_id:
        output_path = i.get('output_path', '')
        print(f"\nStage 02 output_path: {output_path}")
        # Try to find it
        if os.path.exists(output_path):
            print(f"File exists at: {output_path}")
        else:
            # Search for files containing this item_id
            base_dir = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline'
            for root, dirs, files in os.walk(base_dir):
                for fn in files:
                    if item_id in fn or '0303-45' in fn:
                        print(f"Found matching file: {os.path.join(root, fn)}")
