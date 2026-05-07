#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'
with open(state_path) as f:
    data = json.load(f)

s2 = data['stages'].get('02-email-paralegal', {}).get('items', [])
s3 = data['stages'].get('03-email-attorney', {}).get('items', [])
s3_ids = set(i['item_id'] for i in s3)

unproc = [i for i in s2 if i.get('status') == 'completed' and i['item_id'] not in s3_ids]
unproc.sort(key=lambda x: x.get('completed_at', x.get('processed_at', '')))

print(f"Still unprocessed after this run: {len(unproc)}")
for i in unproc:
    print(f"  {i['item_id']} | EXH-{i.get('exhibit_id','?')} | tags={i.get('tags',[])}")
