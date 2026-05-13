#!/usr/bin/env python3
"""Check what inbox items are already in the state file schema."""
import json

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/state/pipeline-state.json"
with open(state_path) as f:
    data = json.load(f)

# Get all intake item IDs
intake_items = data.get("stages", {}).get("01-intake", {}).get("items", [])
intake_ids = set()
for i in intake_items:
    if isinstance(i, dict):
        iid = i.get("item_id")
        if iid:
            intake_ids.add(iid)
    elif isinstance(i, str):
        intake_ids.add(i)

# Get all completed work items
completed = data.get("completed_items", [])
print(f"completed_items array: {len(completed)} entries")
if completed:
    print(f"  Last 3: {completed[-3:]}")

# Check inbox item IDs
inbox_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/work-queue/inbox/"
import os, glob
inbox_files = sorted(glob.glob(inbox_path + "*.json"))
print(f"\nInbox: {len(inbox_files)} files")
print(f"  First: {os.path.basename(inbox_files[0])}")
print(f"  Last: {os.path.basename(inbox_files[-1])}")

# Extract item_ids from inbox filenames
inbox_ids = set()
for f in inbox_files:
    name = os.path.basename(f).replace(".json", "")
    inbox_ids.add(name)

# Check overlap
overlap = inbox_ids & intake_ids
print(f"\nInbox items already in intake: {len(overlap)}")
if overlap:
    for o in sorted(overlap)[:5]:
        print(f"  Already in intake: {o}")

# Check which inbox items are NOT in intake
not_in_intake = inbox_ids - intake_ids
print(f"\nInbox items NOT in intake: {len(not_in_intake)}")
for n in sorted(not_in_intake)[:10]:
    print(f"  Not in intake: {n}")

# Also check the email pipeline state (tools/pipeline/pipeline-state.json root level)
email_state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json"
if os.path.exists(email_state_path):
    with open(email_state_path) as f:
        edata = json.load(f)
    print(f"\nEmail pipeline state (root): {edata.get('pipeline_id','?')} | updated: {edata.get('updated_at','?')}")
    for sname, sdata in edata.get("stages", {}).items():
        items = sdata.get("items", [])
        print(f"  {sname}: {len(items)} items")
