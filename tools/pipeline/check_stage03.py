#!/usr/bin/env python3
import json

with open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json', 'r') as f:
    data = json.load(f)

stage02_items = data.get('stages', {}).get('02-email-paralegal', {}).get('items', [])
print(f'Stage 02 items: {len(stage02_items)}')

completed_stage02 = {item['item_id'] for item in stage02_items if item.get('status') == 'completed'}
print(f'Stage 02 completed: {len(completed_stage02)}')

stage03_items = data.get('stages', {}).get('03-email-attorney', {}).get('items', [])
print(f'Stage 03 items: {len(stage03_items)}')

stage03_ids = {item['item_id'] for item in stage03_items}
stage03_completed = {item['item_id'] for item in stage03_items if item.get('status') == 'completed'}
print(f'Stage 03 completed: {len(stage03_completed)}')

not_in_stage03 = completed_stage02 - stage03_ids
print(f'\nItems completed in Stage 02 but NOT in Stage 03: {len(not_in_stage03)}')

for item_id in sorted(not_in_stage03):
    item = next((i for i in stage02_items if i['item_id'] == item_id), None)
    if item:
        print(f'  {item_id} | {item.get("exhibit_id", "N/A")} | {item.get("artifact_path", "N/A")}')
