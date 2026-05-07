#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(state_path) as f:
    data = json.load(f)

s3 = data['stages'].get('03-email-attorney', {}).get('items', [])
for i in s3:
    if i['item_id'] == '2026-05-06T04-24-18.124212Z_EXH-0117':
        print(f"Status: {i['status']}")
        print(f"Completed at: {i.get('completed_at','N/A')}")
        print(f"Artifact: {i.get('artifact_path','N/A')}")
        break

# Count remaining unprocessed
s2items = data['stages'].get('02-email-paralegal', {}).get('items', [])
s3_ids = set(i['item_id'] for i in s3)
remaining = [i for i in s2items if i['status'] == 'completed' and i['item_id'] not in s3_ids]
print(f"\nRemaining unprocessed in 03-email-attorney: {len(remaining)}")
for r in remaining:
    print(f"  {r['item_id']} | EXH-{r.get('exhibit_id','?')}")
