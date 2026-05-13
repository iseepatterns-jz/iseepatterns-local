#!/usr/bin/env python3
import json
from datetime import datetime, timezone

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/state/pipeline-state.json"

with open(state_path) as f:
    state = json.load(f)

now = "2026-05-07T07:16:17Z"
item_id = "2026-05-06T04-24-18.128232Z_EXH-0150"
exhibit_id = "EXH-0150"

# Check remaining inbox items
import os
inbox_dir = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/work-queue/inbox"
try:
    inbox_items = [f for f in os.listdir(inbox_dir) if f.endswith('.json')]
    inbox_count = len(inbox_items)
except FileNotFoundError:
    inbox_count = 0

# Build new entry
new_entry = {
    "item_id": item_id,
    "pipeline_stage": "01-intake",
    "status": "completed",
    "source_path": "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER/EXH-0150_MSG_33_2017-12-12.txt",
    "source_type": "email",
    "classification": "EMAIL",
    "sha256": "4accafc1753dbd0e1d3df901cdf96025681ebb31340c780bb54c7df59920147f",
    "tags": ["FRAUD", "FINANCIAL"],
    "processed_at": now,
    "processed_by": "para_01_bot",
    "exhibit_id": exhibit_id,
    "metadata": {
        "date": "2017-12-12",
        "time": "23:03:34",
        "author_sender": "Len Mayersky (LMayersky@mbfinancial.com)",
        "recipient": "lucas@rowboatcreative.com",
        "title_subject": "RE: RE: Secure",
        "file_size_bytes": 3383
    },
    "summary": (
        "Email from Len Mayersky (MB Financial) to Lucas Guariglia at Rowboat Creative, "
        "with CC to Alex Hutchinson, dated December 12, 2017. The email delivers an "
        "encrypted PDF attachment via a secure delivery service notification. "
        "The subject line 'RE: RE: Secure' indicates this is part of an ongoing "
        "secure communication thread between Mayersky and Guariglia."
    )
}

# Add to top-level completed_items if it exists
if "completed_items" in state:
    state["completed_items"].append(new_entry)

# Add to stages.01-intake.items
stage_01 = state["stages"]["01-intake"]
stage_01["items"].append(new_entry)

# Update status
stage_01["status"] = "idle" if inbox_count == 0 else "active"

# Update top-level timestamp
state["updated_at"] = now

with open(state_path, 'w') as f:
    json.dump(state, f, indent=2)

print(f"State updated: stage_01.items={len(stage_01['items'])}, status={stage_01['status']}, inbox_remaining={inbox_count}, updated_at={now}")
