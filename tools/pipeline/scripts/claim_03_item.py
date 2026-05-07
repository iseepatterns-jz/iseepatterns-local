import json
from datetime import datetime, timezone

state_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json"

with open(state_path, 'r') as f:
    data = f.read()

state = json.loads(data)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

existing = [i.get('item_id') for i in state['stages']['03-attorney']['items']]
print(f"Existing Stage 03 items: {len(existing)}")
print(f"0303-36Z in Stage 03: {'2026-05-06T0303-36Z' in existing}")

if '2026-05-06T0303-36Z' not in existing:
    new_item = {
        'item_id': '2026-05-06T0303-36Z',
        'exhibit_id': 'EXH-0035',
        'source_type': 'transcript',
        'pipeline_stage': '03-attorney',
        'status': 'in_progress',
        'started_at': now,
        'input_stage_01': 'artifacts/01-intake/2026-05-06T0303-36Z.json',
        'input_stage_02': 'artifacts/02-paralegal/2026-05-06T0303-36Z_analysis.md',
        'source_path': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/TRANSCRIPTS_LOCKER/transcripts-lg-and-jz-calls/2023-11-17-trs-lg-jz-work-to-solve-mca-issue/txt/2023-11-17-trs-lg-jz-work-to-solve-mca-issue.txt'
    }
    state['stages']['03-attorney']['items'].append(new_item)
    state['stages']['03-attorney']['status'] = 'active'
    state['updated_at'] = now
    
    with open(state_path, 'w') as f:
        json.dump(state, f, indent=2, ensure_ascii=False)
    print('State updated successfully')
    
    marker_path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/artifacts/03-attorney/2026-05-06T0303-36Z.claimed_by"
    with open(marker_path, 'w') as f:
        f.write(f'isp_hrm_attorney_bot {now}\n')
    print('Claim marker created')
else:
    print('Already claimed')
