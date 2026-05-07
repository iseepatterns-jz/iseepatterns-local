#!/usr/bin/env python3
import json
from datetime import datetime, timezone

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json"
item_id = "2026-05-06T0303-55Z"
synthesis_path = "artifacts/03-attorney/2026-05-06T0303-55Z_synthesis.md"

with open(state_path, "r") as f:
    state = json.load(f)

now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Find the item and update it to completed
items = state["stages"]["03-attorney"]["items"]
updated = False
for item in items:
    if item.get("item_id") == item_id and item.get("status") == "in_progress":
        item["status"] = "completed"
        item["completed_at"] = now_utc
        item["output_path"] = synthesis_path
        updated = True
        break

if not updated:
    print(f"WARNING: Item {item_id} not found in in_progress state")
    # Try to find it anyway
    for item in items:
        if item.get("item_id") == item_id:
            print(f"Found but status is: {item.get('status')}")
            break

# Check if there are still unprocessed Stage 02 items
# Stage 03 items processed = any with status completed or failed
# Check: which Stage 02 items are still not in Stage 03 items
stage02_completed = [i.get("item_id") for i in state["stages"]["02-paralegal"]["items"] if i.get("status") == "completed"]
stage03_processed = [i.get("item_id") for i in items if i.get("status") in ("completed", "failed", "error")]
stage03_unprocessed = [sid for sid in stage02_completed if sid not in stage03_processed]

# Also check the full list of Stage 03 item_ids for ones missing status
all_stage03_item_ids = set()
for i in items:
    item_id_val = i.get("item_id")
    if item_id_val:
        all_stage03_item_ids.add(item_id_val)

# Items in Stage 02 completed but not in Stage 03 items array at all
truly_unprocessed = [sid for sid in stage02_completed if sid not in all_stage03_item_ids]

if truly_unprocessed:
    state["stages"]["03-attorney"]["status"] = "active"
    print(f"More items pending ({len(truly_unprocessed)} unprocessed Stage 02 items not in Stage 03)")
else:
    # Check if any Stage 03 items are still in_progress
    in_progress_items = [i for i in items if i.get("status") == "in_progress"]
    if in_progress_items:
        state["stages"]["03-attorney"]["status"] = "active"
        print(f"{len(in_progress_items)} items still in_progress")
    else:
        state["stages"]["03-attorney"]["status"] = "idle"
        print("No items pending — setting status to idle")

state["stages"]["03-attorney"]["updated_at"] = now_utc

with open(state_path, "w") as f:
    json.dump(state, f, indent=2)

print(f"Pipeline state updated. Item {item_id} marked completed.")
print(f"Stage 03 status: {state['stages']['03-attorney']['status']}")
print(f"Unprocessed Stage 02 items not in Stage 03: {truly_unprocessed}")
