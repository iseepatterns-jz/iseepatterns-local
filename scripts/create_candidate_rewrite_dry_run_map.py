#!/usr/bin/env python3
"""Create a read-only dry-run rewrite map for LawModel1 candidate_rewrite stale path references.

Inputs are existing stale-reference triage artifacts. This script writes only new
report artifacts under lawmodel1/reports/governance_audits/.
"""
from __future__ import annotations

import csv
import hashlib
import json
import mimetypes
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

WORKSPACE = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER')
LAWROOT = WORKSPACE / 'lawmodel1'
REPORT_DIR = LAWROOT / 'reports' / 'governance_audits'
INPUT_TRIAGE_JSON = REPORT_DIR / '2026-05-12T00-37-02Z_lawmodel1_stale_reference_triage_cleanup_queue.json'
INPUT_TRIAGE_MD = REPORT_DIR / '2026-05-12T00-37-02Z_lawmodel1_stale_reference_triage_cleanup_queue.md'
INPUT_TRIAGE_CSV = REPORT_DIR / '2026-05-12T00-37-02Z_lawmodel1_stale_reference_triage_cleanup_queue.cleanup_queue_sample.csv'
NOW = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ')
OUT_BASE = REPORT_DIR / f'{NOW}_lawmodel1_candidate_rewrite_dry_run_map'
OUT_JSON = OUT_BASE.with_suffix('.json')
OUT_CSV = OUT_BASE.with_suffix('.csv')
OUT_MD = OUT_BASE.with_suffix('.md')
ERROR_LOG = OUT_BASE.with_suffix('.errors.log')

TERMS = [
    '/Users/iseepatterns-ms-m4',
    '/Volumes/batdrivetb5',
    'AI_TRAINING',
    '/Volumes/iseepatterns-evidence/IGNORE',
    '/Volumes/messageshd',
    '/Volumes/2026-iseepatterns-tb3',
]
TEXT_EXTS = {
    '.txt','.md','.json','.jsonl','.csv','.tsv','.py','.js','.ts','.jsx','.tsx','.sh','.zsh','.bash',
    '.yaml','.yml','.toml','.ini','.cfg','.conf','.sql','.html','.htm','.xml','.css','.scss','.log',
    '.plist','.env','.mjs','.cjs','.rb','.go','.java','.rs','.swift','.php','.r','.ipynb'
}
BINARY_OR_DB_EXTS = {'.db','.sqlite','.sqlite3','.duckdb','.parquet','.pkl','.pickle','.bin','.zip','.gz','.7z','.tar','.tgz','.pdf','.docx','.xlsx','.xls','.png','.jpg','.jpeg','.heic','.mov','.mp4','.eml','.mbox'}

# Controlled rewrite rules. No rewrites are performed.
RULES = [
    {
        'mapping_key': 'prefix:/Volumes/batdrivetb5',
        'old_path': '/Volumes/batdrivetb5',
        'proposed_new_path': '/Volumes/iseepatterns-evidence',
        'match_term': '/Volumes/batdrivetb5',
        'match_type': 'literal_prefix_or_substring',
        'unresolved_mapping_reason': '',
    },
    {
        'mapping_key': 'segment:/AI_TRAINING/',
        'old_path': '/AI_TRAINING/',
        'proposed_new_path': '/ISEEPATTERNS_LOCKER/',
        'target_check_path': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER',
        'match_term': 'AI_TRAINING',
        'match_type': 'path_segment',
        'unresolved_mapping_reason': '',
    },
    {
        'mapping_key': 'unmapped:/Users/iseepatterns-ms-m4',
        'old_path': '/Users/iseepatterns-ms-m4',
        'proposed_new_path': '',
        'match_term': '/Users/iseepatterns-ms-m4',
        'match_type': 'literal_prefix_or_substring',
        'unresolved_mapping_reason': 'No controlled replacement supplied in task context for candidate_rewrite references.',
    },
    {
        'mapping_key': 'unmapped:/Volumes/iseepatterns-evidence/IGNORE',
        'old_path': '/Volumes/iseepatterns-evidence/IGNORE',
        'proposed_new_path': '',
        'match_term': '/Volumes/iseepatterns-evidence/IGNORE',
        'match_type': 'literal_prefix_or_substring',
        'unresolved_mapping_reason': 'No controlled replacement supplied in task context for candidate_rewrite references.',
    },
    {
        'mapping_key': 'unmapped:/Volumes/messageshd',
        'old_path': '/Volumes/messageshd',
        'proposed_new_path': '',
        'match_term': '/Volumes/messageshd',
        'match_type': 'literal_prefix_or_substring',
        'unresolved_mapping_reason': 'No controlled replacement supplied in task context for candidate_rewrite references.',
    },
    {
        'mapping_key': 'unmapped:/Volumes/2026-iseepatterns-tb3',
        'old_path': '/Volumes/2026-iseepatterns-tb3',
        'proposed_new_path': '',
        'match_term': '/Volumes/2026-iseepatterns-tb3',
        'match_type': 'literal_prefix_or_substring',
        'unresolved_mapping_reason': 'No controlled replacement supplied in task context for candidate_rewrite references.',
    },
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


def classify(path: str) -> tuple[str, str]:
    lp = path.lower()
    ext = ext_for(path)
    if 'stale_reference_triage_cleanup_queue' in lp or 'candidate_rewrite_dry_run_map' in lp:
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


def sample_lines(path: str, terms: list[str], max_lines: int = 3, max_chars: int = 240) -> list[dict[str, Any]]:
    p = Path(path)
    samples: list[dict[str, Any]] = []
    try:
        if not p.is_file() or not str(p).startswith(str(WORKSPACE)) or not is_text_path(p):
            return samples
        with p.open('r', encoding='utf-8', errors='replace') as f:
            for i, line in enumerate(f, 1):
                hits = [t for t in terms if t in line]
                if hits:
                    samples.append({'file': path, 'line': i, 'terms': hits, 'text': line.strip()[:max_chars]})
                    if len(samples) >= max_lines:
                        break
    except Exception as e:
        samples.append({'file': path, 'error': repr(e)[:300]})
    return samples


def status_for_target(path_text: str) -> str:
    if not path_text:
        return 'not_checked_unresolved_mapping'
    p = Path(path_text)
    if p.exists():
        if p.is_dir():
            return 'exists_directory'
        if p.is_file():
            return 'exists_file'
        return 'exists_other'
    return 'missing'


def md_table(rows: list[dict[str, Any]], headers: list[str]) -> str:
    out = ['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---'] * len(headers)) + ' |']
    for row in rows:
        vals = []
        for h in headers:
            v = row.get(h, '')
            if isinstance(v, list):
                v = '; '.join(str(x) for x in v)
            vals.append(str(v).replace('|', '\\|').replace('\n', ' '))
        out.append('| ' + ' | '.join(vals) + ' |')
    return '\n'.join(out)


def main() -> None:
    os.environ['HOME'] = str(WORKSPACE)
    os.environ['PWD'] = str(WORKSPACE)
    errors: list[str] = []
    input_paths = [INPUT_TRIAGE_JSON, INPUT_TRIAGE_MD, INPUT_TRIAGE_CSV]
    input_hashes = {}
    for p in input_paths:
        try:
            input_hashes[str(p)] = sha256(p)
        except Exception as e:
            input_hashes[str(p)] = ''
            errors.append(f'hash_error\t{p}\t{repr(e)}')

    try:
        with INPUT_TRIAGE_JSON.open('r', encoding='utf-8') as f:
            triage = json.load(f)
    except Exception as e:
        ERROR_LOG.write_text(f'load_error\t{INPUT_TRIAGE_JSON}\t{repr(e)}\n', encoding='utf-8')
        raise

    source_audit_json = Path(triage['source_audit_json'])
    source_audit_md = Path(triage.get('source_audit_md', ''))
    for p in [source_audit_json, source_audit_md]:
        if str(p):
            try:
                input_hashes[str(p)] = sha256(p)
            except Exception as e:
                input_hashes[str(p)] = ''
                errors.append(f'hash_error\t{p}\t{repr(e)}')

    with source_audit_json.open('r', encoding='utf-8') as f:
        audit = json.load(f)

    external_references = audit.get('external_references', {})
    by_rule: dict[str, dict[str, Any]] = {r['mapping_key']: dict(r) for r in RULES}
    candidate_files_by_rule: dict[str, set[str]] = defaultdict(set)
    counts_by_status = Counter()
    candidate_totals = {'affected_file_term_pairs': 0, 'occurrences': 0}

    for row in by_rule.values():
        row.update({
            'affected_file_count': 0,
            'occurrence_count': 0,
            'sample_affected_files': [],
            'sample_line_hits': [],
            'target_check_path': row.get('target_check_path', row['proposed_new_path']),
            'target_existence_status': status_for_target(row.get('target_check_path', row['proposed_new_path'])),
            'action_label': 'candidate_rewrite',
            'source_filter': 'existing audit external_references filtered through triage classification action_label=candidate_rewrite',
        })

    for rule in RULES:
        term = rule['match_term']
        for ent in external_references.get(term, []):
            path = ent.get('path', '')
            try:
                proposed_class, action_label = classify(path)
                if action_label != 'candidate_rewrite':
                    continue
                count = int(ent.get('count', 0))
                key = rule['mapping_key']
                by_rule[key]['occurrence_count'] += count
                candidate_files_by_rule[key].add(path)
                candidate_totals['affected_file_term_pairs'] += 1
                candidate_totals['occurrences'] += count
                if len(by_rule[key]['sample_affected_files']) < 10:
                    by_rule[key]['sample_affected_files'].append(path)
            except Exception as e:
                errors.append(f'entry_error\t{term}\t{path}\t{repr(e)}')

    for key, files in candidate_files_by_rule.items():
        by_rule[key]['affected_file_count'] = len(files)
        row = by_rule[key]
        if row['unresolved_mapping_reason']:
            counts_by_status['unresolved_no_controlled_mapping'] += row['occurrence_count']
        elif row['target_existence_status'].startswith('exists'):
            counts_by_status['mapped_target_exists'] += row['occurrence_count']
        else:
            counts_by_status['mapped_target_missing'] += row['occurrence_count']
        # sample lines from at most first three sampled files per rule
        terms = [row['match_term']]
        for fpath in row['sample_affected_files'][:3]:
            row['sample_line_hits'].extend(sample_lines(fpath, terms, max_lines=2))

    rows = sorted(by_rule.values(), key=lambda r: (-int(r['occurrence_count']), r['mapping_key']))
    proposed_mapping_counts = Counter()
    for r in rows:
        proposed_mapping_counts[f"{r['old_path']} -> {r['proposed_new_path'] or '[unresolved]'}"] += int(r['occurrence_count'])

    result = {
        'created_utc': NOW,
        'workspace': str(WORKSPACE),
        'lawmodel1_root': str(LAWROOT),
        'dry_run_only': True,
        'original_evidence_files_modified': False,
        'input_files': [str(p) for p in input_paths] + [str(source_audit_json), str(source_audit_md)],
        'input_sha256': input_hashes,
        'candidate_rewrite_filter': {
            'classifier_source': str(LAWROOT / 'scripts' / 'create_stale_reference_triage_report.py'),
            'action_label': 'candidate_rewrite',
            'included_remediation_class': 'source_or_config_candidate_rewrite',
        },
        'summary': {
            'rules_total': len(rows),
            'rules_with_candidate_hits': sum(1 for r in rows if r['occurrence_count']),
            'candidate_occurrences_counted_by_rule': candidate_totals['occurrences'],
            'candidate_file_term_pairs_counted_by_rule': candidate_totals['affected_file_term_pairs'],
            'counts_by_mapping_status_occurrences': dict(counts_by_status),
            'counts_by_proposed_mapping_occurrences': dict(proposed_mapping_counts),
        },
        'rewrite_map': rows,
        'errors_log': str(ERROR_LOG),
    }

    with OUT_JSON.open('w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, sort_keys=True)
        f.write('\n')

    with OUT_CSV.open('w', newline='', encoding='utf-8') as f:
        fieldnames = ['mapping_key','old_path','proposed_new_path','target_check_path','match_term','match_type','affected_file_count','occurrence_count','target_existence_status','unresolved_mapping_reason','sample_affected_files']
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: ('; '.join(r[k]) if k == 'sample_affected_files' else r.get(k, '')) for k in fieldnames})

    md_lines = [
        '# LawModel1 candidate_rewrite stale path dry-run rewrite map',
        '',
        f'Created UTC: {NOW}',
        f'Workspace: {WORKSPACE}',
        f'LawModel1 root: {LAWROOT}',
        f'Dry run only: true',
        f'Original evidence files modified: false',
        '',
        '## Source files',
    ]
    for p in result['input_files']:
        md_lines.append(f'- {p} sha256={input_hashes.get(p, "")}')
    md_lines.extend([
        '',
        '## Summary counts',
        f'- Rewrite rules total: {result["summary"]["rules_total"]}',
        f'- Rewrite rules with candidate_rewrite hits: {result["summary"]["rules_with_candidate_hits"]}',
        f'- Candidate occurrences counted by rule: {result["summary"]["candidate_occurrences_counted_by_rule"]}',
        f'- Candidate file-term pairs counted by rule: {result["summary"]["candidate_file_term_pairs_counted_by_rule"]}',
        '',
        '## Counts by mapping status (occurrences)',
    ])
    for k, v in sorted(counts_by_status.items()):
        md_lines.append(f'- {k}: {v}')
    md_lines.extend(['', '## Counts by proposed mapping (occurrences)'])
    for k, v in sorted(proposed_mapping_counts.items()):
        md_lines.append(f'- {k}: {v}')
    md_headers = ['mapping_key','old_path','proposed_new_path','target_check_path','affected_file_count','occurrence_count','target_existence_status','unresolved_mapping_reason','sample_affected_files']
    md_lines.extend(['', '## Dry-run rewrite map', md_table(rows, md_headers), '', '## Sample line hits'])
    for r in rows:
        md_lines.append(f'### {r["mapping_key"]}')
        if r['sample_line_hits']:
            for hit in r['sample_line_hits'][:6]:
                md_lines.append(f'- {hit}')
        else:
            md_lines.append('- No line samples captured from sampled candidate files.')
    OUT_MD.write_text('\n'.join(md_lines) + '\n', encoding='utf-8')

    ERROR_LOG.write_text('\n'.join(errors) + ('\n' if errors else ''), encoding='utf-8')
    print(json.dumps({'json': str(OUT_JSON), 'csv': str(OUT_CSV), 'md': str(OUT_MD), 'errors': str(ERROR_LOG)}, indent=2))


if __name__ == '__main__':
    main()
