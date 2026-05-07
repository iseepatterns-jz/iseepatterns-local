#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

# List all stages and their schemas
for name, stage in data['stages'].items():
    print(f"\n=== Stage: {name} ===")
    print(f"Type: {type(stage)}")
    if isinstance(stage, dict):
        print(f"Keys: {list(stage.keys())[:10]}")
        items = stage.get('items', [])
        print(f"Items: {len(items)}")
        if items and len(items) > 0:
            print(f"Item 0 keys: {list(items[0].keys())}")
            print(f"Item 0 sample: {json.dumps(items[0], indent=2, default=str)[:400]}")
