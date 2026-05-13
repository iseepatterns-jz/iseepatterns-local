#!/usr/bin/env python3
import json

with open('pipeline-state.json') as f:
    state = json.load(f)

print('Top-level keys:', list(state.keys()))
items_block = state.get('02-email-paralegal', {})
print('02-email-paralegal keys:', list(items_block.keys()))
items = items_block.get('items', [])
print('Type of items:', type(items).__name__)
print('Number of items:', len(items))
if items:
    print('\nFirst item keys:', list(items[0].keys()))
    print('First item stage03:', json.dumps(items[0].get('03-email-attorney', {}), indent=2))
