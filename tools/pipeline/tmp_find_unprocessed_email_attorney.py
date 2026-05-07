#!/usr/bin/env python3
"""Find items in Stage 02-email-paralegal with status=completed not yet in Stage 03-email-attorney."""
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

# Check all keys to find stage names
stage_keys = list(data.get('stages', {}).keys())
print(f"Available stages: {stage_keys}")

# Identify email paralegal and email attorney stages
pg_name = None
at_name = None
for k in stage_keys:
    if 'email' in k.lower() and ('paralegal' in k.lower() or 'attorney' in k.lower()):
        if 'paralegal' in k.lower() or '02' in k:
            pg_name = k
        if 'attorney' in k.lower() or '03' in k:
            at_name = k

print(f"Using Paralegal stage: {pg_name}")
print(f"Using Attorney stage: {at_name}")

if not pg_name:
    print("No email paralegal stage found!")
    exit(1)

s2items = data['stages'].get(pg_name, {}).get('items', [])
s3items = data['stages'].get(at_name, {}).get('items', []) if at_name else []

s3_ids = set(i.get('item_id', '') for i in s3items)
print(f"\nStage {pg_name}: {len(s2items)} total items")
print(f"Stage {at_name}: {len(s3items)} already processed")

unproc = [i for i in s2items if i.get('status') == 'completed' and i.get('item_id', '') not in s3_ids]
unproc.sort(key=lambda x: x.get('completed_at', ''))

print(f"\nUnprocessed items ready for Stage 03: {len(unproc)}")
for i in unproc:
    print(f"  {i.get('item_id','?'):50s} | EXH={i.get('exhibit_id','?'):8s} | title={i.get('title','?')[:60]}")

# Also show items already in attorney stage for reference
if s3items:
    print(f"\nItems already in {at_name}:")
    for i in s3items:
        print(f"  {i.get('item_id','?'):50s} | status={i.get('status','?'):15s}")
