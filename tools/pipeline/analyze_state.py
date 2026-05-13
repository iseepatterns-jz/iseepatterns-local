#!/usr/bin/env python3
import json

with open('pipeline-state.json') as f:
    data = json.load(f)

items = data['stages']['02-email-paralegal']['items']
print(f'Total items: {len(items)}')
completed = [i for i in items if i.get('status') == 'completed']
print(f'Stage 02 completed: {len(completed)}')

for i in completed[:5]:
    print(f'  item_id: {i["item_id"]}')
    print(f'  exhibit_id: {i["exhibit_id"]}')
    print(f'  artifact_path: {i.get("artifact_path","N/A")}')
    print(f'  processed_at: {i.get("processed_at","N/A")}')
    print()
