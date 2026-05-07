#!/usr/bin/env python3
"""Stage 03 update: mark 0303-36Z completed, update state + log."""
import json
from datetime import datetime, timezone

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json"
log_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/logs/2026-05-06_pipeline-attorney.log"
synthesis_path = "artifacts/03-attorney/2026-05-06T0303-36Z_synthesis.md"

now = datetime.now(timezone.utc)
now_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")
log_ts = now.strftime("%H:%M:%S")

with open(state_path, 'r') as f:
    state = json.loads(f.read())

# Find and update the Stage 03 item
found = False
for item in state["stages"]["03-attorney"]["items"]:
    if item["item_id"] == "2026-05-06T0303-36Z":
        item["status"] = "completed"
        item["completed_at"] = now_str
        item["output_path"] = synthesis_path
        found = True
        break

assert found, "Item 2026-05-06T0303-36Z not found in Stage 03 items!"

# Check if any Stage 03 items remain in_progress
remaining = [i for i in state["stages"]["03-attorney"]["items"] if i.get("status") == "in_progress"]
state["stages"]["03-attorney"]["status"] = "active" if remaining else "idle"
state["updated_at"] = now_str

with open(state_path, 'w') as f:
    json.dump(state, f, indent=2, ensure_ascii=False)

print(f"State updated: 0303-36Z → completed. Remaining in_progress: {len(remaining)}")
print(f"Stage 03 status: {state['stages']['03-attorney']['status']}")

# Append log
log_entry = f"[{log_ts}] 2026-05-06T0303-36Z | source_type=transcript | status=completed | output={synthesis_path}\n"
with open(log_path, 'a') as f:
    f.write(log_entry)
print(f"Log appended: {log_entry.strip()}")
