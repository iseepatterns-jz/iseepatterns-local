#!/usr/bin/env python3
"""Update pipeline state with completed intake item."""
import json
from datetime import datetime, timezone

PIPELINE_ROOT = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline"
STATE_PATH = f"{PIPELINE_ROOT}/state/pipeline-state.json"

ITEM_ID = "2026-05-06T04-24-18.128340Z_EXH-0151"
EXHIBIT_ID = "EXH-0151"
SOURCE_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER/EXH-0151_LML_154_2018-01-10.txt"
SOURCE_TYPE = "email"
CLASSIFICATION = "EMAIL"
SHA256 = "e066db98419d1aee8fd1bac22d5a500b1ab902e16b1fa7db70d5460b1cc4f47c"
TIMESTAMP = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Read state
with open(STATE_PATH) as f:
    state = json.load(f)

# Ensure 01-intake stage exists
if "01-intake" not in state.get("stages", {}):
    state["stages"]["01-intake"] = {"status": "idle", "items": []}

stage = state["stages"]["01-intake"]
if "items" not in stage:
    stage["items"] = []

# Add to completed_items if it exists
if "completed_items" in state:
    state["completed_items"].append({
        "item_id": ITEM_ID,
        "pipeline_stage": "01-intake",
        "status": "completed",
        "completed_at": TIMESTAMP
    })

# Add to stages.01-intake.items
stage["items"].append({
    "item_id": ITEM_ID,
    "exhibit_id": EXHIBIT_ID,
    "pipeline_stage": "01-intake",
    "source_type": SOURCE_TYPE,
    "classification": CLASSIFICATION,
    "status": "completed",
    "sha256": SHA256,
    "artifact_path": f"artifacts/01-intake/{ITEM_ID}.json",
    "source_path": SOURCE_PATH,
    "processed_at": TIMESTAMP,
    "processed_by": "para_01_bot"
})

# Update stage status
stage["status"] = "active"
state["updated_at"] = TIMESTAMP

# Check if inbox is empty -> set idle
import os
inbox_dir = f"{PIPELINE_ROOT}/work-queue/inbox"
inbox_items = [f for f in os.listdir(inbox_dir) if f.endswith('.json')]
if not inbox_items:
    stage["status"] = "idle"

# Write state
with open(STATE_PATH, 'w') as f:
    json.dump(state, f, indent=2, default=str)

print(f"State updated. Stage 01-intake status: {stage['status']}")
print(f"Inbox items remaining: {len(inbox_items)}")
