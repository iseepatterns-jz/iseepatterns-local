#!/usr/bin/env python3
"""Check if inbox items are already in the email pipeline state (root level)."""
import json, os

# Email pipeline state file
email_state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json"
with open(email_state_path) as f:
    edata = json.load(f)

# Collect all item IDs from email pipeline stages
all_email_items = {}
for sname, sdata in edata.get("stages", {}).items():
    for item in sdata.get("items", []):
        if isinstance(item, dict):
            iid = item.get("item_id")
            if iid:
                all_email_items[iid] = {
                    "stage": sname,
                    "status": item.get("status"),
                    "exhibit_id": item.get("exhibit_id"),
                    "source_type": item.get("source_type")
                }

# Check if EXH-0149 is in email pipeline
print(f"Email pipeline stages: {list(edata.get('stages', {}).keys())}")
print(f"Total items across all email stages: {len(all_email_items)}")

# Check for EXH-0149
for iid in ["2026-05-06T04-24-18.128134Z_EXH-0149", "2026-05-06T04-24-18.127926Z_EXH-0147", "2026-05-06T04-24-18.128032Z_EXH-0148"]:
    if iid in all_email_items:
        print(f"  {iid}: {all_email_items[iid]}")
    else:
        print(f"  {iid}: NOT FOUND in email pipeline")

# Check what's in the email pipeline's intake stage
email_intake = edata.get("stages", {}).get("01-intake", {}).get("items", [])
print(f"\nEmail pipeline 01-intake items: {len(email_intake)}")
for i in email_intake:
    if isinstance(i, dict):
        print(f"  {i.get('item_id')} | exh={i.get('exhibit_id')} | status={i.get('status')}")

# Check what the last completed inbox item was in transcript pipeline
transcript_state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/state/pipeline-state.json"
with open(transcript_state_path) as f:
    tdata = json.load(f)

intake_items = tdata.get("stages", {}).get("01-intake", {}).get("items", [])
# Find the ones with the latest timestamps
import re
email_like = [i for i in intake_items if isinstance(i, dict) and i.get("item_id", "").startswith("2026-05-06T04-24")]
print(f"\nTranscript pipeline email-like intake items: {len(email_like)}")
if email_like:
    for i in email_like[-3:]:
        print(f"  {i.get('item_id')} | exh={i.get('exhibit_id')} | status={i.get('status')} | type={i.get('source_type')}")
