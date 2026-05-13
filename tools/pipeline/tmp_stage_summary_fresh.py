#!/usr/bin/env python3
import json

state_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json'
with open(state_path) as f:
    data = json.load(f)

print(f"Pipeline: {data.get('name','?')} | Status: {data.get('status','?')} | Updated: {data.get('updated_at','?')}")
print(f"Legacy items array: {len(data.get('items',[]))} entries")
print()

for name, stage in data.get("stages", {}).items():
    items = stage.get("items", [])
    total = len(items)
    completed = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "completed")
    in_prog = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "in_progress")
    failed = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "failed")
    pending = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "pending")
    stage_status = stage.get("status", "?")
    print(f"{name:30s} | stage_status={stage_status:8s} | {total:3d} items | {completed:3d} done | {in_prog:2d} prog | {failed:2d} fail | {pending:2d} pend")
