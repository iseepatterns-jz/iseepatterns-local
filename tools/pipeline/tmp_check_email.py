#!/usr/bin/env python3
import json

f=open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json')
data=json.load(f)

# Check the email pipeline (02-email-paralegal)
print("=== EMAIL PARALEGAL STAGE ===")
if '02-email-paralegal' in data['stages']:
    items = data['stages']['02-email-paralegal']['items']
    print(f"Total items: {len(items)}")
    completed = [i for i in items if i['status']=='completed']
    in_prog = [i for i in items if i['status']=='in_progress']
    pending = [i for i in items if i['status']=='pending']
    failed = [i for i in items if i['status']=='failed']
    print(f"Completed: {len(completed)}, In_progress: {len(in_prog)}, Pending: {len(pending)}, Failed: {len(failed)}")
    
    # Check for completed items not in attorney stage
    s3items = data['stages'].get('03-email-attorney', {}).get('items', [])
    s3_ids = set(i['item_id'] for i in s3items)
    unproc = [i for i in completed if i['item_id'] not in s3_ids]
    print(f"Completed but not yet in Stage 03: {len(unproc)}")
    for i in unproc:
        print(f"  {i['item_id']}")
else:
    print("No 02-email-paralegal stage found")

# Check other stages
print("\n=== ALL STAGES ===")
for name in data['stages']:
    items = data['stages'][name].get('items', [])
    completed_count = sum(1 for i in items if i['status']=='completed')
    print(f"{name}: {len(items)} items, {completed_count} completed")
