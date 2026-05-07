#!/usr/bin/env python3
import json

f=open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json')
data=json.load(f)

item_ids = ['2026-05-06T0303-45Z', '2026-05-06T0303-46Z', '2026-05-06T0303-47Z']

for item_id in item_ids:
    print(f"\n=== {item_id} ===")
    for i in data['stages']['01-intake']['items']:
        if i['item_id'] == item_id:
            print(f"Source type: {i.get('source_type','?')}")
            print(f"Exhibit: {i.get('exhibit_id','?')}")
            meta = i.get('metadata', {})
            if meta:
                print(f"Subject: {meta.get('title_subject','?')}")
            else:
                print(f"Full item keys: {list(i.keys())}")
            break
    
    for i in data['stages']['02-paralegal']['items']:
        if i['item_id'] == item_id:
            print(f"Output: {i.get('output_path','?')}")
            break
