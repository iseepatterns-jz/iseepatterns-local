#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

# Get intake info for EXH-0103
intake_items = data['stages'].get('01-intake', {}).get('items', [])
for i in intake_items:
    if i.get('item_id') == '2026-05-06T04-24-18.122645Z_EXH-0103':
        print(json.dumps(i, indent=2, default=str))
        break
