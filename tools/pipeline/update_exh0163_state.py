#!/usr/bin/env python3
"""Update EXH-0163 Stage 03 entry to completed."""
import json
from datetime import datetime, timezone

STATE_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'

with open(STATE_PATH, 'r') as f:
    data = json.load(f)

s3_items = data.get('stages', {}).get('03-email-attorney', {}).get('items', [])
target_item_id = '2026-05-06T04-24-18.129602Z_EXH-0163'
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

updated = False
for item in s3_items:
    if item.get('item_id') == target_item_id:
        # Look at a completed entry for reference format
        for ref in s3_items:
            if ref.get('status') == 'completed':
                # Copy all keys from reference, override with our values
                ref_format = {k: v for k, v in ref.items() if k not in ('artifact_path', 'processed_at', 'processed_by', 'completed_at', 'tags', 'started_at')}
                break
        
        item['status'] = 'completed'
        item['artifact_path'] = 'artifacts/03-email-attorney/2026-05-06T04-24-18.129602Z_EXH-0163_email_synthesis.md'
        item['processed_at'] = now
        item['processed_by'] = 'email_attorney_worker'
        item['completed_at'] = now
        updated = True
        print(f'Updated {target_item_id} to completed')
        break

if not updated:
    print(f'ERROR: {target_item_id} not found in stage 03 items')

with open(STATE_PATH, 'w') as f:
    json.dump(data, f, indent=2)

print(f'State file written. Stage 03 items: {len(s3_items)}')
