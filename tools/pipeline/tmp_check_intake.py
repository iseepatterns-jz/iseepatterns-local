#!/usr/bin/env python3
import json

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/state/pipeline-state.json"
with open(state_path) as f:
    data = json.load(f)

print(f"Pipeline: {data.get('name','?')} | Updated: {data.get('updated_at','?')}")
print(f"Top-level keys: {list(data.keys())}")

# Check stages
for name, stage in data.get("stages", {}).items():
    items = stage.get("items", [])
    total = len(items)
    completed = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "completed")
    in_prog = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "in_progress")
    failed = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "failed")
    stage_status = stage.get("status", "?")
    print(f"  {name:30s} | status={stage_status:8s} | {total:4d} items | {completed:4d} done | {in_prog:2d} prog | {failed:2d} fail")

# Check last few completed items in 01-intake
intake = data.get("stages", {}).get("01-intake", {})
items = intake.get("items", [])
if items:
    last5 = items[-5:] if len(items) >= 5 else items
    print(f"\nLast {len(last5)} items in 01-intake:")
    for i in last5:
        if isinstance(i, dict):
            print(f"  {i.get('item_id','?'):50s} | status={i.get('status','?'):10s} | exh={i.get('exhibit_id','?'):10s} | type={i.get('source_type','?'):10s}")
        else:
            print(f"  (string item): {str(i)[:50]}")

# Check completed IDs to see if EXH-0149 is already done
completed_ids = set()
for i in items:
    if isinstance(i, dict) and i.get("status") == "completed":
        completed_ids.add(i.get("item_id"))
    elif isinstance(i, str):
        completed_ids.add(i)

print(f"\nTotal completed+string items in 01-intake: {len(completed_ids)}")
print(f"EXH-0149 in completed? {'2026-05-06T04-24-18.128134Z_EXH-0149' in completed_ids}")
