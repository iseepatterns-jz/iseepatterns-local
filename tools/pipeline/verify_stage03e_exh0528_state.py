#!/usr/bin/env python3
import json
from pathlib import Path

state_path = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json')
artifact_full = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/artifacts/03-email-attorney/2026-05-06T04-24-18.169174Z_EXH-0528_email_synthesis.md')
item_id = '2026-05-06T04-24-18.169174Z_EXH-0528'
stage = '03-email-attorney'
artifact_rel = 'artifacts/03-email-attorney/2026-05-06T04-24-18.169174Z_EXH-0528_email_synthesis.md'

with state_path.open('r', encoding='utf-8') as f:
    data = json.load(f)

matches = []

def walk(obj):
    if isinstance(obj, dict):
        if obj.get('item_id') == item_id and obj.get('pipeline_stage') == stage:
            matches.append(obj)
        for v in obj.values():
            walk(v)
    elif isinstance(obj, list):
        for v in obj:
            walk(v)

walk(data)
if not matches:
    raise SystemExit('No completed Stage 03 entry found for item')
entry = matches[0]
required = {
    'item_id': item_id,
    'exhibit_id': 'EXH-0528',
    'pipeline_stage': stage,
    'source_type': 'email',
    'status': 'completed',
    'artifact_path': artifact_rel,
    'source_path': 'artifacts/02-email-paralegal/2026-05-06T04-24-18.169174Z_EXH-0528_email_analysis.md',
    'paralegal_artifact': 'artifacts/02-email-paralegal/2026-05-06T04-24-18.169174Z_EXH-0528_email_analysis.md',
    'processed_by': 'email_attorney_worker',
}
for key, expected in required.items():
    if entry.get(key) != expected:
        raise SystemExit(f'Mismatch for {key}: {entry.get(key)!r} != {expected!r}')
for key in ('completed_at', 'processed_at'):
    if not entry.get(key):
        raise SystemExit(f'Missing timestamp field {key}')
if not artifact_full.exists():
    raise SystemExit('Artifact file missing')
text = artifact_full.read_text(encoding='utf-8')
for marker in ('## 1. Source and procedural posture', '## 2. Potential legal issue mapping', '## 6. Attorney synthesis notes'):
    if marker not in text:
        raise SystemExit(f'Missing artifact marker {marker}')
print(json.dumps({
    'verified': True,
    'matches_found': len(matches),
    'artifact_path': str(artifact_full),
    'artifact_bytes': artifact_full.stat().st_size,
    'status': entry.get('status'),
    'completed_at': entry.get('completed_at'),
    'state_updated_at': data.get('updated_at') if isinstance(data, dict) else None,
}, indent=2))
