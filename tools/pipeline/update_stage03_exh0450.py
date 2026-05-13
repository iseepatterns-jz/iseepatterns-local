#!/usr/bin/env python3
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

STATE = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json')
ITEM_ID = '2026-05-06T04-24-18.160317Z_EXH-0450'
EXHIBIT_ID = 'EXH-0450'
ARTIFACT_REL = 'artifacts/03-email-attorney/2026-05-06T04-24-18.160317Z_EXH-0450_email_synthesis.md'
SOURCE_REL = 'artifacts/02-email-paralegal/2026-05-06T04-24-18.160317Z_EXH-0450_email_analysis.md'
SOURCE_ABS = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/artifacts/02-email-paralegal/2026-05-06T04-24-18.160317Z_EXH-0450_email_analysis.md'
ARTIFACT_ABS = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/artifacts/03-email-attorney/2026-05-06T04-24-18.160317Z_EXH-0450_email_synthesis.md'
STAGE = '03-email-attorney'


def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def walk(obj, path=()):
    if isinstance(obj, dict):
        yield obj, path
        for k, v in obj.items():
            yield from walk(v, path + (str(k),))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, path + (str(i),))


def path_has_stage(path):
    return any(part == STAGE for part in path)


def entry_stage_value(d):
    for key in ('stage', 'stage_id', 'stage_name', 'queue', 'pipeline_stage'):
        if d.get(key) == STAGE:
            return True
    return False


def looks_like_stage03(d, path):
    if d.get('item_id') != ITEM_ID:
        return False
    if path_has_stage(path) or entry_stage_value(d):
        return True
    if d.get('artifact_path') == ARTIFACT_REL or d.get('processed_by') == 'email_attorney_worker':
        return True
    return False


def main():
    with STATE.open('r', encoding='utf-8') as f:
        data = json.load(f)

    matches = [(d, path) for d, path in walk(data) if looks_like_stage03(d, path)]
    if len(matches) != 1:
        all_item_matches = [(d, path) for d, path in walk(data) if isinstance(d, dict) and d.get('item_id') == ITEM_ID]
        raise SystemExit(f'Expected exactly one {STAGE} entry for {ITEM_ID}; found {len(matches)} stage03-like matches, {len(all_item_matches)} total item_id matches; paths={ [p for _, p in all_item_matches] }')

    entry, path = matches[0]
    started_at = entry.get('started_at')
    ts = utc_now()

    entry['status'] = 'completed'
    if started_at is not None:
        entry['started_at'] = started_at
    entry['completed_at'] = ts
    entry['processed_at'] = ts
    entry['artifact_path'] = ARTIFACT_REL
    entry['source_path'] = SOURCE_REL
    entry['paralegal_artifact'] = SOURCE_REL
    entry['source_type'] = 'email'
    entry['processed_by'] = 'email_attorney_worker'
    entry['exhibit_id'] = EXHIBIT_ID

    if isinstance(data, dict):
        data['updated_at'] = ts

    backup = STATE.with_name(STATE.name + f'.bak-{ts.replace(":", "").replace("-", "")}')
    shutil.copy2(STATE, backup)

    tmp = STATE.with_name(STATE.name + f'.tmp-{os.getpid()}')
    with tmp.open('w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    os.replace(tmp, STATE)

    # Re-read and verify.
    with STATE.open('r', encoding='utf-8') as f:
        verified = json.load(f)
    verified_matches = [(d, p) for d, p in walk(verified) if looks_like_stage03(d, p)]
    if len(verified_matches) != 1:
        raise SystemExit(f'Verification failed: duplicate/missing stage03 entries ({len(verified_matches)})')
    ventry, vpath = verified_matches[0]
    checks = {
        'status': ventry.get('status') == 'completed',
        'completed_at': ventry.get('completed_at') == ts,
        'processed_at': ventry.get('processed_at') == ts,
        'artifact_path': ventry.get('artifact_path') == ARTIFACT_REL,
        'source_path': ventry.get('source_path') == SOURCE_REL,
        'paralegal_artifact': ventry.get('paralegal_artifact') == SOURCE_REL,
        'source_type': ventry.get('source_type') == 'email',
        'processed_by': ventry.get('processed_by') == 'email_attorney_worker',
        'exhibit_id': ventry.get('exhibit_id') == EXHIBIT_ID,
        'artifact_exists': Path(ARTIFACT_ABS).is_file(),
        'source_exists': Path(SOURCE_ABS).is_file(),
    }
    if not all(checks.values()):
        raise SystemExit('Verification failed: ' + json.dumps(checks, sort_keys=True))

    print(json.dumps({
        'updated_path': '.'.join(vpath),
        'status': ventry.get('status'),
        'completed_at': ts,
        'artifact_path': ventry.get('artifact_path'),
        'backup_path': str(backup),
        'checks': checks,
    }, indent=2, sort_keys=True))

if __name__ == '__main__':
    main()
