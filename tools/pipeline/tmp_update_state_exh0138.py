#!/usr/bin/env python3
"""Update pipeline-state.json for EXH-0138 email paralegal analysis."""
import json, shutil
from datetime import datetime, timezone

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'
backup_path = state_path + '.bak'

# Backup
shutil.copy2(state_path, backup_path)

with open(state_path) as f:
    data = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

item_id = '2026-05-06T04-24-18.126929Z_EXH-0138'

new_entry = {
    "item_id": item_id,
    "exhibit_id": "EXH-0138",
    "pipeline_stage": "02-email-paralegal",
    "status": "completed",
    "source_path": "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER/EXH-0138_MSG_53_2023-05-25.txt",
    "source_type": "email",
    "db_source": "mayersky_smoking_gun",
    "db_id": 53,
    "classification": "EMAIL",
    "artifact_path": "artifacts/02-email-paralegal/2026-05-06T04-24-18.126929Z_EXH-0138_email_analysis.md",
    "paralegal_artifact": "artifacts/02-email-paralegal/2026-05-06T04-24-18.126929Z_EXH-0138_email_analysis.md",
    "tags": ["BANK_FRAUD_ACCOUNT_MANIPULATION"],
    "processed_at": now,
    "processed_by": "email_paralegal_worker"
}

# Add to 02-email-paralegal items
stage = data['stages']['02-email-paralegal']
stage['items'].append(new_entry)

# Update timestamp
data['updated_at'] = now

with open(state_path, 'w') as f:
    json.dump(data, f, indent=2, default=str)

# Verify
with open(state_path) as f:
    verify = json.load(f)

s2 = verify['stages']['02-email-paralegal']['items']
found = [i for i in s2 if i['item_id'] == item_id]
if found:
    print(f"SUCCESS: pipeline-state updated with {item_id}")
    print(f"Total 02-email-paralegal items: {len(s2)}")
else:
    print(f"ERROR: item not found after write!")
