#!/usr/bin/env python3
"""Update pipeline state to claim 2026-05-06T0301-08Z for Stage 02 processing."""
import json
from datetime import datetime, timezone

PIPELINE_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline"
STATE_PATH = f"{PIPELINE_DIR}/state/pipeline-state.json"

with open(STATE_PATH) as f:
    state = json.load(f)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# Add 02-paralegal stage if not present
if '02-paralegal' not in state['stages']:
    state['stages']['02-paralegal'] = {
        "label": "Paralegal Analysis & Transcription Review",
        "worker_profile": "para_02_bot",
        "worker_skill": "court-case/pipeline-paralegal-worker",
        "input_dir": "artifacts/01-intake",
        "output_dir": "artifacts/02-paralegal",
        "status": "active",
        "items": [],
        "updated_at": now
    }

# Add item as in_progress
item_entry = {
    "item_id": "2026-05-06T0301-08Z",
    "exhibit_id": "EXH-0016",
    "pipeline_stage": "02-paralegal",
    "status": "in_progress",
    "started_at": now,
    "claim_holder": "para_02_bot",
    "input_artifact": "artifacts/01-intake/2026-05-06T0301-08Z.json",
    "source_path": f"{PIPELINE_DIR}/../data/TRANSCRIPTS_LOCKER/transcripts-accounting-meetings/2023-04-11-trs-acct-lg-jz-sm-75-percent-cog/txt/2023-04-11-trs-acct-lg-jz-sm-75-percent-cog.txt",
    "source_type": "transcript"
}

existing = [i for i in state['stages']['02-paralegal']['items'] if i['item_id'] == '2026-05-06T0301-08Z']
if not existing:
    state['stages']['02-paralegal']['items'].append(item_entry)

state['stages']['02-paralegal']['status'] = 'active'
state['updated_at'] = now

with open(STATE_PATH, 'w') as f:
    json.dump(state, f, indent=2)

print(f"State updated. 02-paralegal items: {len(state['stages']['02-paralegal']['items'])}")
print(f"Item 08Z status: {item_entry['status']}")
