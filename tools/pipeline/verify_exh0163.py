#!/usr/bin/env python3
"""Verify EXH-0163 state update."""
import json

STATE_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(STATE_PATH, 'r') as f:
    data = json.load(f)

s3_items = data.get('stages', {}).get('03-email-attorney', {}).get('items', [])
for item in s3_items:
    if 'EXH-0163' in item.get('item_id', ''):
        print(json.dumps(item, indent=2))
        break

completed = sum(1 for i in s3_items if i.get('status') == 'completed')
in_progress = sum(1 for i in s3_items if i.get('status') == 'in_progress')
pending = sum(1 for i in s3_items if i.get('status') == 'pending')
print(f'\nStage 03 summary: {completed} completed, {in_progress} in_progress, {pending} pending')
