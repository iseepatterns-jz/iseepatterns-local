#!/usr/bin/env python3
import json

with open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json', 'r') as f:
    data = json.load(f)

s3 = data.get('stages', {}).get('03-email-attorney', {}).get('items', [])
found = False
for item in s3:
    if 'EXH-0163' in item.get('item_id', ''):
        print('=== Stage 03 EXH-0163 Entry ===')
        print(json.dumps(item, indent=2))
        found = True
        break

if not found:
    print('EXH-0163 NOT found in stage 03 items')

# Also check if it's in stage 02
s2 = data.get('stages', {}).get('02-email-paralegal', {}).get('items', [])
for item in s2:
    if 'EXH-0163' in item.get('item_id', ''):
        print('\n=== Stage 02 EXH-0163 Entry ===')
        print(json.dumps(item, indent=2))
        break
