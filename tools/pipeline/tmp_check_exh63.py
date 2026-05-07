#!/usr/bin/env python3
import json

f=open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json')
data=json.load(f)

item_id = '2026-05-06T04-24-18.118196Z_EXH-0063'

# Get 02-email-paralegal info
for i in data['stages']['02-email-paralegal']['items']:
    if i['item_id'] == item_id:
        print("=== 02-EMAIL-PARALEGAL ===")
        print(json.dumps(i, indent=2, default=str))
        break

# Check if in 03-email-attorney
s3 = data['stages'].get('03-email-attorney', {})
print(f"\n03-email-attorney stage exists: {bool(s3)}")
for i in s3.get('items', []):
    if i['item_id'] == item_id:
        print("=== 03-EMAIL-ATTORNEY (already exists) ===")
        print(json.dumps(i, indent=2, default=str))

# Search all stages for this item
print("\n=== Search all stages ===")
for sname, sdata in data['stages'].items():
    items = sdata.get('items', [])
    for i in items:
        if isinstance(i, dict) and i.get('item_id') == item_id:
            print(f"Found in {sname}: status={i.get('status','?')}")
