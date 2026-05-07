#!/usr/bin/env python3
"""Verify EXH-0103 is completed in stage 03."""
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

# Find EXH-0103 in stage 03
for i in data['stages']['03-email-attorney']['items']:
    if 'EXH-0103' in i.get('item_id',''):
        print(f"Verified: item_id={i['item_id']}")
        print(f"Status: {i.get('status','?')}")
        print(f"Completed at: {i.get('completed_at','?')}")
        break
else:
    print("NOT FOUND in stage 03!")
