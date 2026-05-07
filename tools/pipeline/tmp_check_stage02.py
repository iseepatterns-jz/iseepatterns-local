#!/usr/bin/env python3
import json

f=open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json')
data=json.load(f)
s2items=data['stages']['02-paralegal']['items']
s3items=data['stages'].get('03-attorney',{}).get('items',[])
s3_item_ids=set(i['item_id'] for i in s3items)
unproc=[i for i in s2items if i['status']=='completed' and i['item_id'] not in s3_item_ids]
unproc.sort(key=lambda x: x.get('completed_at',''))
print(f'Unprocessed: {len(unproc)}')
for i in unproc:
    print(f'{i["item_id"]:35s} | completed={i.get("completed_at","N/A"):25s} | exhibit={i.get("exhibit_id","N/A"):10s} | output={i.get("output_path","N/A")}')
