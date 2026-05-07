#!/usr/bin/env python3
"""Get info about EXH-0103 from intake stage."""
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

# Check intake stage
for sname in data['stages']:
    if 'intake' in sname.lower():
        items = data['stages'][sname].get('items', [])
        print(f"Intake stage name: {sname}, items: {len(items)}")
        for i in items:
            if 'EXH-0103' in str(i):
                print(json.dumps(i, indent=2, default=str)[:500])

# Check stage 02 for this item
for i in data['stages']['02-email-paralegal']['items']:
    if 'EXH-0103' in i.get('item_id',''):
        print(f"\nStage 02 item:")
        print(json.dumps(i, indent=2, default=str))
        break
