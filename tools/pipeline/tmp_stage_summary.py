#!/usr/bin/env python3
import json

f=open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json')
data=json.load(f)

print("Stage names:", list(data["stages"].keys()))

# Show what's in each stage
for name, stage in data["stages"].items():
    items = stage.get("items", [])
    total = len(items)
    completed = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "completed")
    in_prog = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "in_progress")
    failed = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "failed")
    pending = sum(1 for i in items if isinstance(i, dict) and i.get("status") == "pending")
    print(f"{name:30s} | {total:3d} items | {completed:3d} done | {in_prog:2d} prog | {pending:2d} pend | {failed:2d} fail")
