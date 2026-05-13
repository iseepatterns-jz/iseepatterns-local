#!/usr/bin/env python3
import json

with open('pipeline-state.json') as f:
    state = json.load(f)

items_02 = state['stages']['02-email-paralegal']['items']
items_03 = state['stages']['03-email-attorney']['items']

id_02_completed = {i['item_id'] for i in items_02 if i.get('status') == 'completed'}
id_02_all = {i['item_id'] for i in items_02}
id_03_completed = {i['item_id'] for i in items_03 if i.get('status') == 'completed'}
id_03_all = {i['item_id'] for i in items_03}

print(f'Stage 02 total: {len(items_02)}')
print(f'Stage 02 completed: {len(id_02_completed)}')
print(f'Stage 03 total: {len(items_03)}')
print(f'Stage 03 completed: {len(id_03_completed)}')

# Completed in 02 but not in 03 at all
missing_from_03 = id_02_completed - id_03_all
print(f'Completed in Stage 02, absent from Stage 03: {len(missing_from_03)}')
if missing_from_03:
    for m in sorted(missing_from_03)[:10]:
        print(f'  - {m}')

# In 03 but not completed
in_03_not_completed = id_03_all - id_03_completed
print(f'In Stage 03 but not completed: {len(in_03_not_completed)}')
if in_03_not_completed:
    for m in sorted(in_03_not_completed)[:5]:
        print(f'  - {m}')

# Check if 03 has items not in 02
extra_in_03 = id_03_all - id_02_all
print(f'In Stage 03 but not Stage 02: {len(extra_in_03)}')
if extra_in_03:
    for m in sorted(extra_in_03)[:5]:
        print(f'  - {m}')
