#!/usr/bin/env python3
import json

with open('pipeline-state.json') as f:
    state = json.load(f)

# Check EXH-0264 specifically
email_items = state['stages']['02-email-paralegal']['items']
for item in email_items:
    if 'EXH-0264' in item.get('item_id', ''):
        print("=== EXH-0264 in 02-email-paralegal.items ===")
        print(json.dumps(item, indent=2, default=str))
        
# Also check in 03-email-attorney.items
attorney_items = state['stages']['03-email-attorney']['items']
for item in attorney_items:
    if 'EXH-0264' in item.get('item_id', ''):
        print("\n=== EXH-0264 in 03-email-attorney.items ===")
        print(json.dumps(item, indent=2, default=str))
