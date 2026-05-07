#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

# Check intake structure
intake = data['stages'].get('01-intake', {})
print(f"Intake type: {type(intake)}")
print(f"Intake keys: {list(intake.keys())[:5]}")
if 'items' in intake:
    items = intake['items']
    print(f"Intake items count: {len(items)}")
    if items:
        print(f"First item keys: {list(items[0].keys())}")
        print(f"Sample: {json.dumps(items[0], indent=2, default=str)[:300]}")
