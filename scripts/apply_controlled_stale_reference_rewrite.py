#!/usr/bin/env python3
"""Controlled stale-reference rewrite for approved LawModel1 project-reference mappings.

Approval scope:
- /Volumes/batdrivetb5 -> /Volumes/iseepatterns-evidence
- /AI_TRAINING/ -> /ISEEPATTERNS_LOCKER/

Safety scope:
- Uses the bounded audit external_references as the candidate file source.
- Applies only items classified candidate_rewrite by the triage classifier.
- Further limits application to project-reference locations; evidence/data, exports,
  artifacts, reports, archives, backups, ready_bag, and chatdb_storage are skipped.
- Creates byte-for-byte backups and a manifest before writing each modified file.
"""
from __future__ import annotations

import csv
import hashlib
import json
import mimetypes
import os
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

WORKSPACE = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER')
LAWROOT = WORKSPACE / 'lawmodel1'
REPORT_DIR = LAWROOT / 'reports' / 'governance_audits'
INPUT_AUDIT_JSON = REPORT_DIR / '2026-05-10_15-31-48_lawmodel1_bounded_duplicate_stale_audit.json'
INPUT_TRIAGE_JSON = REPORT_DIR / '2026-05-12T00-37-02Z_lawmodel1_stale_reference_triage_cleanup_queue.json'
INPUT_DRY_RUN_JSON = REPORT_DIR / '2026-05-12T00-44-57Z_lawmodel1_candidate_rewrite_dry_run_map.json'
NOW = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ')
OUT_BASE = REPORT_DIR / f'{NOW}_lawmodel1_controlled_stale_reference_rewrite'
OUT_JSON = OUT_BASE.with_suffix('.json')
OUT_MD = OUT_BASE.with_suffix('.md')
OUT_CSV = OUT_BASE.with_suffix('.modified_files.csv')
OUT_ERRORS = OUT_BASE.with_suffix('.errors.log')
BACKUP_DIR = REPORT_DIR / f'{NOW}_controlled_stale_reference_rewrite_backups'

APPROVED_MAPPINGS = [
    ('/Volumes/batdrivetb5', '/Volumes/iseepatterns-evidence'),
    ('/AI_TRAINING/', '/ISEEPATTERNS_LOCKER/'),
]
TERMS = ['/Volumes/batdrivetb5', 'AI_TRAINING']
TEXT_EXTS = {
    '.txt','.md','.json','.jsonl','.csv','.tsv','.py','.js','.ts','.jsx','.tsx','.sh','.zsh','.bash',
    '.yaml','.yml','.toml','.ini','.cfg','.conf','.sql','.html','.htm','.xml','.css','.scss','.log',
    '.plist','.env','.mjs','.cjs','.rb','.go','.java','.rs','.swift','.php','.r','.ipynb'
}
BINARY_OR_DB_EXTS = {'.db','.sqlite','.sqlite3','.duckdb','.parquet','.pkl','.pickle','.bin','.zip','.gz','.7z','.tar','.tgz','.pdf','.docx','.xlsx','.xls','.png','.jpg','.jpeg','.heic','.mov','.mp4','.eml','.mbox'}
PROJECT_REFERENCE_EXCLUDE_SUBSTRINGS = [
    '/data/',
    '/chatdb_storage/',
    '/exports/',
    '/artifacts/',
    '/reports/',
    '/_archive/',
    '/archive/',
    '_archive',
    '_bak',
    '/backup',
    'backup',
    '/ready_bag/',
    '/attorney_package/',
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def ext_for(path: str) -> str:
    suf = Path(path).suffix.lower()
    return suf if suf else '[no_extension]'


def top_dir(path: str) -> str:
    p = Path(path)
    try:
        rel = p.relative_to(LAWROOT)
        return rel.parts[0] if rel.parts else '.'
    except ValueError:
        return '[outside_lawroot]'


def classify(path: str) -> tuple[str, str]:
    lp = path.lower()
    ext = ext_for(path)
    if 'stale_reference_triage_cleanup_queue' in lp or 'candidate_rewrite_dry_run_map' in lp or 'controlled_stale_reference_rewrite' in lp:
        return 'instrumentation_self_reference', 'exclude_self_reference'
    if '/reports/' in lp or 'manifest' in lp or '/docs/' in lp or '/audit' in lp:
        return 'report_or_manifest_preserve', 'preserve'
    if '/_archive/' in lp or '/archive/' in lp or '_archive' in lp or '_bak' in lp or '/backup' in lp or 'backup' in lp:
        return 'archive_or_backup_historical_reference', 'preserve'
    if ext in BINARY_OR_DB_EXTS or ('/data/' in lp and ext in {'.db','.sqlite','.sqlite3','.parquet'}):
        return 'database_or_binary_manual_review', 'manual_review'
    if '/exports/' in lp or '/export' in lp or '/attorney_package/' in lp or '/artifacts/' in lp or '/ready_bag/' in lp:
        return 'generated_export_historical_reference', 'preserve'
    if '/scripts/' in lp or '/src/' in lp or '/app/' in lp or '/tools/' in lp or '/ingest/' in lp or ext in {'.py','.js','.ts','.sh','.sql','.yaml','.yml','.toml','.ini','.cfg','.conf','.env'}:
        return 'source_or_config_candidate_rewrite', 'candidate_rewrite'
    return ('database_or_binary_manual_review', 'manual_review') if ext in BINARY_OR_DB_EXTS else ('source_or_config_candidate_rewrite', 'candidate_rewrite')


def is_text_path(path: Path) -> bool:
    if path.suffix.lower() in TEXT_EXTS:
        return True
    mt, _ = mimetypes.guess_type(str(path))
    return bool(mt and (mt.startswith('text/') or mt in {'application/json','application/xml'}))


def is_project_reference_safe(path: str) -> bool:
    lp = path.lower()
    if not path.startswith(str(LAWROOT) + os.sep):
        return False
    return not any(token in lp for token in PROJECT_REFERENCE_EXCLUDE_SUBSTRINGS)


def count_mappings(text: str) -> dict[str, int]:
    return {old: text.count(old) for old, _new in APPROVED_MAPPINGS}


def count_unresolved(text: str) -> dict[str, int]:
    unresolved_terms = ['/Volumes/2026-iseepatterns-tb3', '/Volumes/messageshd', '/Users/iseepatterns-ms-m4', '/Volumes/iseepatterns-evidence/IGNORE']
    return {term: text.count(term) for term in unresolved_terms}


def replace_text(text: str) -> str:
    out = text
    for old, new in APPROVED_MAPPINGS:
        out = out.replace(old, new)
    return out


def git_status_count() -> int | None:
    try:
        proc = subprocess.run(
            ['git', '-C', str(LAWROOT), 'status', '--short'],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if proc.returncode != 0:
            return None
        return len([line for line in proc.stdout.splitlines() if line.strip()])
    except Exception:
        return None


def syntax_check(path: Path) -> dict[str, Any]:
    ext = path.suffix.lower()
    if ext == '.py':
        proc = subprocess.run([sys.executable, '-m', 'py_compile', str(path)], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        return {'command': f'{sys.executable} -m py_compile {path}', 'exit_code': proc.returncode, 'stdout': proc.stdout[-2000:], 'stderr': proc.stderr[-4000:]}
    if ext == '.json':
        try:
            json.loads(path.read_text(encoding='utf-8'))
            return {'command': f'json.loads({path})', 'exit_code': 0, 'stdout': 'json parses', 'stderr': ''}
        except Exception as e:
            return {'command': f'json.loads({path})', 'exit_code': 1, 'stdout': '', 'stderr': repr(e)}
    return {'command': 'not_applicable', 'exit_code': 0, 'stdout': 'not applicable', 'stderr': ''}


def md_table(rows: list[dict[str, Any]], headers: list[str]) -> str:
    out = ['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---'] * len(headers)) + ' |']
    for row in rows:
        out.append('| ' + ' | '.join(str(row.get(h, '')).replace('|', '\\|') for h in headers) + ' |')
    return '\n'.join(out)


def main() -> int:
    os.environ['HOME'] = str(WORKSPACE)
    os.environ['PWD'] = str(WORKSPACE)
    os.environ['WORKSPACE'] = str(WORKSPACE)
    errors: list[str] = []
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    input_paths = [INPUT_AUDIT_JSON, INPUT_TRIAGE_JSON, INPUT_DRY_RUN_JSON]
    input_hashes = {str(p): sha256(p) for p in input_paths if p.exists()}

    with INPUT_AUDIT_JSON.open('r', encoding='utf-8') as f:
        audit = json.load(f)

    file_terms: dict[str, Counter[str]] = {}
    for term in TERMS:
        for ent in audit.get('external_references', {}).get(term, []):
            path = ent['path']
            file_terms.setdefault(path, Counter())[term] += int(ent.get('count', 0))

    git_before = git_status_count()
    candidates = []
    skipped = []
    for path, term_counts in sorted(file_terms.items()):
        cls, action = classify(path)
        p = Path(path)
        reason = ''
        if action != 'candidate_rewrite':
            reason = f'action_label={action}'
        elif not is_project_reference_safe(path):
            reason = 'outside_project_reference_safe_scope_or_evidence_generated_archive_report_path'
        elif not p.is_file():
            reason = 'not_file_or_missing'
        elif not is_text_path(p):
            reason = 'not_text_path'
        if reason:
            skipped.append({'path': path, 'terms': dict(term_counts), 'occurrences': sum(term_counts.values()), 'class': cls, 'action': action, 'reason': reason})
        else:
            candidates.append({'path': path, 'terms': dict(term_counts), 'occurrences': sum(term_counts.values()), 'class': cls, 'action': action})

    modified = []
    aggregate_before = Counter()
    aggregate_after = Counter()
    aggregate_unresolved_before = Counter()
    aggregate_unresolved_after = Counter()
    syntax_results = []

    for item in candidates:
        p = Path(item['path'])
        try:
            original_bytes = p.read_bytes()
            original_text = original_bytes.decode('utf-8')
            before_counts = count_mappings(original_text)
            unresolved_before = count_unresolved(original_text)
            new_text = replace_text(original_text)
            after_counts = count_mappings(new_text)
            unresolved_after = count_unresolved(new_text)
            if new_text == original_text:
                skipped.append({**item, 'reason': 'no_approved_mapping_literal_present_at_apply_time'})
                continue
            rel = p.relative_to(LAWROOT)
            backup_path = BACKUP_DIR / rel
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, backup_path)
            before_sha = hashlib.sha256(original_bytes).hexdigest()
            backup_sha = sha256(backup_path)
            if backup_sha != before_sha:
                raise RuntimeError(f'backup hash mismatch for {p}')
            p.write_text(new_text, encoding='utf-8')
            after_sha = sha256(p)
            row = {
                **item,
                'backup_path': str(backup_path),
                'before_sha256': before_sha,
                'backup_sha256': backup_sha,
                'after_sha256': after_sha,
                'before_counts': before_counts,
                'after_counts': after_counts,
                'replaced_counts': {old: before_counts[old] - after_counts[old] for old, _new in APPROVED_MAPPINGS},
                'unresolved_before': unresolved_before,
                'unresolved_after': unresolved_after,
            }
            modified.append(row)
            aggregate_before.update(before_counts)
            aggregate_after.update(after_counts)
            aggregate_unresolved_before.update(unresolved_before)
            aggregate_unresolved_after.update(unresolved_after)
            syntax_results.append({'path': str(p), **syntax_check(p)})
        except Exception as e:
            errors.append(f'{p}: {repr(e)}')

    git_after = git_status_count()

    # Post-apply targeted recount for candidate files only.
    candidate_after_counts = Counter()
    candidate_unresolved_after_counts = Counter()
    for item in candidates:
        p = Path(item['path'])
        if not p.is_file() or not is_text_path(p):
            continue
        try:
            text = p.read_text(encoding='utf-8', errors='replace')
            candidate_after_counts.update(count_mappings(text))
            candidate_unresolved_after_counts.update(count_unresolved(text))
        except Exception as e:
            errors.append(f'post_count {p}: {repr(e)}')

    by_skip_reason_occ = Counter()
    by_skip_action_occ = Counter()
    for item in skipped:
        by_skip_reason_occ[item['reason']] += int(item.get('occurrences', 0))
        by_skip_action_occ[item.get('action', '[missing]')] += int(item.get('occurrences', 0))

    result = {
        'created_utc': NOW,
        'workspace': str(WORKSPACE),
        'lawmodel1_root': str(LAWROOT),
        'approval_scope': {
            'approved_mappings': [{'old': old, 'new': new} for old, new in APPROVED_MAPPINGS],
            'do_not_modify_original_evidence_files': True,
            'leave_preserve_classified_untouched': True,
            'leave_unresolved_references_untouched': True,
            'project_reference_safe_scope_exclusions': PROJECT_REFERENCE_EXCLUDE_SUBSTRINGS,
        },
        'input_files': [str(p) for p in input_paths],
        'input_sha256': input_hashes,
        'git_status_count_before': git_before,
        'git_status_count_after': git_after,
        'candidate_files_considered': len(candidates),
        'modified_files_count': len(modified),
        'skipped_files_count': len(skipped),
        'modified_files': modified,
        'skipped_summary_occurrences_by_reason': dict(by_skip_reason_occ.most_common()),
        'skipped_summary_occurrences_by_action': dict(by_skip_action_occ.most_common()),
        'approved_mapping_counts_in_modified_files_before': dict(aggregate_before),
        'approved_mapping_counts_in_modified_files_after': dict(aggregate_after),
        'approved_mapping_counts_in_candidate_files_after': dict(candidate_after_counts),
        'unresolved_counts_in_modified_files_before': dict(aggregate_unresolved_before),
        'unresolved_counts_in_modified_files_after': dict(aggregate_unresolved_after),
        'unresolved_counts_in_candidate_files_after': dict(candidate_unresolved_after_counts),
        'syntax_checks': syntax_results,
        'backup_dir': str(BACKUP_DIR),
        'original_evidence_files_modified': False,
        'errors': errors,
    }

    with OUT_JSON.open('w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    with OUT_CSV.open('w', newline='', encoding='utf-8') as f:
        fieldnames = ['path','occurrences','class','action','backup_path','before_sha256','after_sha256','replaced_counts','before_counts','after_counts']
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in modified:
            w.writerow({k: json.dumps(row[k], ensure_ascii=False) if isinstance(row.get(k), (dict, list)) else row.get(k, '') for k in fieldnames})

    OUT_ERRORS.write_text('\n'.join(errors), encoding='utf-8')

    rows = []
    for old, new in APPROVED_MAPPINGS:
        rows.append({
            'old': old,
            'new': new,
            'before_in_modified_files': aggregate_before.get(old, 0),
            'after_in_modified_files': aggregate_after.get(old, 0),
            'after_in_candidate_files': candidate_after_counts.get(old, 0),
        })
    skip_rows = [{'reason': k, 'occurrences': v} for k, v in by_skip_reason_occ.most_common()]
    modified_rows = []
    for row in modified:
        modified_rows.append({
            'path': row['path'],
            'replaced_counts': json.dumps(row['replaced_counts'], ensure_ascii=False),
            'before_sha256': row['before_sha256'],
            'after_sha256': row['after_sha256'],
            'backup_path': row['backup_path'],
        })
    syntax_rows = [{'path': r['path'], 'exit_code': r['exit_code'], 'command': r['command']} for r in syntax_results]

    md = []
    md.append('# LawModel1 controlled stale-reference rewrite governance report')
    md.append('')
    md.append(f'Created UTC: {NOW}')
    md.append(f'Workspace: {WORKSPACE}')
    md.append(f'LawModel1 root: {LAWROOT}')
    md.append('')
    md.append('## Approval scope')
    md.append('- Approved mapping 1: /Volumes/batdrivetb5 -> /Volumes/iseepatterns-evidence')
    md.append('- Approved mapping 2: /AI_TRAINING/ -> /ISEEPATTERNS_LOCKER/')
    md.append('- Do not modify original evidence files: true')
    md.append('- Leave preserve-classified references untouched: true')
    md.append('- Leave unresolved references untouched: true')
    md.append('')
    md.append('## Input artifacts')
    for p in input_paths:
        md.append(f'- {p} SHA-256: {input_hashes.get(str(p), "[missing]")}')
    md.append('')
    md.append('## Execution counts')
    md.append(f'- Candidate project-reference files considered: {len(candidates)}')
    md.append(f'- Files modified: {len(modified)}')
    md.append(f'- Files skipped: {len(skipped)}')
    md.append(f'- Git status count before: {git_before}')
    md.append(f'- Git status count after: {git_after}')
    md.append(f'- Backup directory: {BACKUP_DIR}')
    md.append(f'- Errors log: {OUT_ERRORS}')
    md.append(f'- Error count: {len(errors)}')
    md.append('')
    md.append('## Approved mapping counts')
    md.append(md_table(rows, ['old','new','before_in_modified_files','after_in_modified_files','after_in_candidate_files']))
    md.append('')
    md.append('## Unresolved references in modified files')
    unresolved_rows = []
    for term in ['/Volumes/2026-iseepatterns-tb3','/Volumes/messageshd','/Users/iseepatterns-ms-m4','/Volumes/iseepatterns-evidence/IGNORE']:
        unresolved_rows.append({'term': term, 'before': aggregate_unresolved_before.get(term, 0), 'after': aggregate_unresolved_after.get(term, 0), 'after_in_candidate_files': candidate_unresolved_after_counts.get(term, 0)})
    md.append(md_table(unresolved_rows, ['term','before','after','after_in_candidate_files']))
    md.append('')
    md.append('## Skipped occurrence summary')
    md.append(md_table(skip_rows, ['reason','occurrences']))
    md.append('')
    md.append('## Modified file manifest')
    md.append(md_table(modified_rows, ['path','replaced_counts','before_sha256','after_sha256','backup_path']))
    md.append('')
    md.append('## Syntax checks')
    md.append(md_table(syntax_rows, ['path','exit_code','command']))
    md.append('')
    md.append('## Sidecars')
    md.append(f'- JSON sidecar: {OUT_JSON}')
    md.append(f'- CSV modified-file manifest: {OUT_CSV}')
    md.append(f'- Errors log: {OUT_ERRORS}')
    OUT_MD.write_text('\n'.join(md) + '\n', encoding='utf-8')

    print(json.dumps({
        'out_json': str(OUT_JSON),
        'out_md': str(OUT_MD),
        'out_csv': str(OUT_CSV),
        'out_errors': str(OUT_ERRORS),
        'backup_dir': str(BACKUP_DIR),
        'modified_files_count': len(modified),
        'candidate_files_considered': len(candidates),
        'errors': len(errors),
        'git_status_count_before': git_before,
        'git_status_count_after': git_after,
        'approved_mapping_counts_in_modified_files_before': dict(aggregate_before),
        'approved_mapping_counts_in_modified_files_after': dict(aggregate_after),
        'approved_mapping_counts_in_candidate_files_after': dict(candidate_after_counts),
    }, indent=2))
    return 0 if not errors and all(r['exit_code'] == 0 for r in syntax_results) else 1


if __name__ == '__main__':
    raise SystemExit(main())
