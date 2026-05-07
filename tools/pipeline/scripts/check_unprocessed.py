#!/usr/bin/env python3
import json

with open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json') as f:
    state = json.load(f)

# Check the top-level keys and stages structure
print("Top-level keys:", list(state.keys()))
print("\nStages keys:", list(state['stages'].keys()))
print("\n03-attorney schema keys:", list(state['stages']['03-attorney'].keys()))
print("03-attorney items count:", len(state['stages']['03-attorney']['items']))

# Check what items are already tracked in completed_items for stage 02
completed_s02 = [item for item in state.get('completed_items', []) if item.get('pipeline_stage') == '02-paralegal']
print(f"\ncompleted_items with pipeline_stage=02-paralegal: {len(completed_s02)}")
for item in completed_s02:
    print(f"  {item['item_id']} — status={item.get('status','?')}")

# Check all completed_items entries
print(f"\nTotal completed_items: {len(state.get('completed_items', []))}")
for item in state.get('completed_items', []):
    print(f"  {item.get('item_id')} — stage={item.get('pipeline_stage')} — status={item.get('status')}")
