#!/usr/bin/env python3
import json, os

with open('pipeline-state.json') as f:
    state = json.load(f)

# Check 03-email-attorney items
attorney_items = state['stages']['03-email-attorney']['items']
attorney_dir = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/artifacts/03-email-attorney'

missing = 0
existing = 0
for item in attorney_items:
    item_id = item.get('item_id', '')
    exhibit_id = item.get('exhibit_id', '').replace('EXH-', '')
    
    # Check both naming conventions
    paths_to_check = [
        os.path.join(attorney_dir, f"{item_id}_email_synthesis.md"),
        os.path.join(attorney_dir, f"EXH-{exhibit_id}_email_synthesis.md") if exhibit_id else None
    ]
    
    found = any(os.path.exists(p) for p in paths_to_check if p)
    if found:
        existing += 1
    else:
        missing += 1
        print(f"MISSING: {item_id} (EXH-{exhibit_id})")

print(f"\nSynthesis files on disk: {existing} existing, {missing} missing out of {len(attorney_items)} items")

# Also check if 02-email-paralegal has any items that are completed but NOT in 03-email-attorney
email_items = state['stages']['02-email-paralegal']['items']
attorney_ids = {item['item_id'] for item in attorney_items if 'item_id' in item}

orphans = []
for item in email_items:
    if item.get('status') == 'completed' and item.get('item_id') not in attorney_ids:
        orphans.append(item)

print(f"Orphans (completed in 02 but not in 03): {len(orphans)}")
for o in orphans:
    print(f"  {o.get('item_id')} (EXH-{o.get('exhibit_id')})")
