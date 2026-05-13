#!/usr/bin/env python3
import json

with open('pipeline-state.json') as f:
    state = json.load(f)

items_03 = state['stages']['03-email-attorney']['items']
print(f'Total Stage 03 items: {len(items_03)}')

in_progress = [i for i in items_03 if i.get('status') == 'in_progress']
completed = [i for i in items_03 if i.get('status') == 'completed']
pending = [i for i in items_03 if i.get('status') == 'pending']
error = [i for i in items_03 if i.get('status') == 'error']
print(f'  in_progress: {len(in_progress)}')
print(f'  completed: {len(completed)}')
print(f'  pending: {len(pending)}')
print(f'  error: {len(error)}')

if in_progress:
    for i in in_progress[:5]:
        print(f'  - {i["item_id"]} (status: {i.get("status")})')
        print(f'    artifact: {i.get("artifact_path", i.get("output_path","N/A"))}')
