#!/usr/bin/env python3
import json

with open('pipeline-state.json') as f:
    state = json.load(f)

# Look at 02-email-paralegal items: find which ones have stage02=completed but NOT stage03=completed
email_items = state['stages']['02-email-paralegal']['items']
attorney_items = state['stages']['03-email-attorney']['items']

print("=== Checking 02-email-paralegal items for stage03 gaps ===")
candidates = []
for item in email_items:
    stage03 = item.get('03-email-attorney', {})
    stage03_status = stage03.get('status', 'pending') if isinstance(stage03, dict) else 'pending'
    stage02_status = item.get('status', '')
    item_id = item.get('item_id', '')
    exhibit_id = item.get('exhibit_id', '')
    
    if stage02_status == 'completed' and stage03_status != 'completed':
        candidates.append({
            'item_id': item_id,
            'exhibit_id': exhibit_id,
            'stage03_status': stage03_status,
            'artifact_path': item.get('artifact_path', '')
        })

print(f'Candidates from 02-email-paralegal.items: {len(candidates)}')
for c in candidates[:5]:
    print(f'  {c["item_id"]} (EXH-{c["exhibit_id"]}) -> stage03: {c["stage03_status"]}')

# Now check what's in the 03-email-attorney stage items
print("\n=== Checking 03-email-attorney stage ===")
attorney_items_by_id = {}
for item in attorney_items:
    item_id = item.get('item_id', '')
    attorney_items_by_id[item_id] = item
    
# Count by status
status_counts = {}
for item in attorney_items:
    s = item.get('status', 'unknown')
    status_counts[s] = status_counts.get(s, 0) + 1
print(f'Status counts in 03-email-attorney.items: {status_counts}')

# Check the ones that are NOT completed in 03-email-attorney
unprocessed = [item for item in attorney_items if item.get('status') != 'completed']
print(f'Unprocessed items (not completed) in 03-email-attorney: {len(unprocessed)}')
for item in unprocessed[:5]:
    print(f'  {item.get("item_id")} (EXH-{item.get("exhibit_id")}) -> status: {item.get("status")}')

# Check: for items in 02-email-paralegal that are completed, are they also in 03-email-attorney?
print("\n=== Cross-check: 02-email-paralegal completed items in 03-email-attorney ===")
match_counts = {'completed_both': 0, 'completed_02_not_03': 0, 'not_in_03': 0}
for item in email_items:
    if item.get('status') != 'completed':
        continue
    item_id = item.get('item_id', '')
    if item_id in attorney_items_by_id:
        att_status = attorney_items_by_id[item_id].get('status', '')
        if att_status == 'completed':
            match_counts['completed_both'] += 1
        else:
            match_counts['completed_02_not_03'] += 1
    else:
        match_counts['not_in_03'] += 1
        
print(json.dumps(match_counts, indent=2))
