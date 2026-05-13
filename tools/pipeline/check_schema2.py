#!/usr/bin/env python3
import json

with open('pipeline-state.json') as f:
    state = json.load(f)

# Check stages
stages = state.get('stages', {})
print('Stages:', list(stages.keys()))

# Check data
data = state.get('data', {})
print('Data keys:', list(data.keys()))

# Check completed_items
completed = state.get('completed_items', [])
print('Completed items:', len(completed), type(completed).__name__)

# Check if items are nested differently
if isinstance(data, dict):
    for k, v in data.items():
        print(f'data.{k} type:', type(v).__name__)
        if isinstance(v, list):
            print(f'  [{len(v)} items]')
            if v:
                print(f'  First item keys:', list(v[0].keys()) if isinstance(v[0], dict) else v[0])
