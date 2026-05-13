#!/usr/bin/env python3
import json

with open('pipeline-state.json') as f:
    state = json.load(f)

# Check stages deeply
stages = state.get('stages', {})
for stage_name, stage_val in stages.items():
    print(f'\n=== {stage_name} ===')
    print(f'Type: {type(stage_val).__name__}')
    if isinstance(stage_val, dict):
        print(f'Keys: {list(stage_val.keys())[:10]}')
        items = stage_val.get('items', [])
        print(f'Items count: {len(items)}')
        if items:
            print(f'First item keys: {list(items[0].keys())}')
            print(f'First item stage03: {json.dumps(items[0].get("03-email-attorney", {}), indent=2)[:200]}')
            print(f'First item status: {items[0].get("status")}')
            print(f'First item pipeline_stage: {items[0].get("pipeline_stage")}')
            # Find items with stage02 completed and stage03 NOT completed
            for item in items:
                stage03 = item.get('03-email-attorney', {})
                stage03_status = stage03.get('status', 'pending') if isinstance(stage03, dict) else 'pending'
                stage02_status = item.get('status', '')
                if stage02_status == 'completed' and stage03_status != 'completed':
                    print(f'\n  CANDIDATE: {item.get("item_id")} (EXH-{item.get("exhibit_id")})')
                    print(f'    stage03_status: {stage03_status}')
