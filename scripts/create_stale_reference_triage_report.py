#!/usr/bin/env python3
"""Read-only stale reference triage report generator for LawModel1 audit output."""
from __future__ import annotations

import csv
import hashlib
import json
import mimetypes
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

WORKSPACE = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER')
LAWROOT = WORKSPACE / 'lawmodel1'
REPORT_DIR = LAWROOT / 'reports' / 'governance_audits'
INPUT_JSON = REPORT_DIR / '2026-05-10_15-31-48_lawmodel1_bounded_duplicate_stale_audit.json'
INPUT_MD = REPORT_DIR / '2026-05-10_15-31-48_lawmodel1_bounded_duplicate_stale_audit.md'
TERMS = [
    '/Users/iseepatterns-ms-m4',
    '/Volumes/batdrivetb5',
    'AI_TRAINING',
    '/Volumes/iseepatterns-evidence/IGNORE',
    '/Volumes/messageshd',
    '/Volumes/2026-iseepatterns-tb3',
]
NOW = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ')
OUT_MD = REPORT_DIR / f'{NOW}_lawmodel1_stale_reference_triage_cleanup_queue.md'
OUT_JSON = REPORT_DIR / f'{NOW}_lawmodel1_stale_reference_triage_cleanup_queue.json'
QUEUE_SAMPLE_LIMIT = 2000
LINE_SAMPLE_FILE_LIMIT = 250
LINE_SAMPLE_MAX_PER_FILE = 3
LINE_LEN = 240
TEXT_EXTS = {
    '.txt','.md','.json','.jsonl','.csv','.tsv','.py','.js','.ts','.jsx','.tsx','.sh','.zsh','.bash',
    '.yaml','.yml','.toml','.ini','.cfg','.conf','.sql','.html','.htm','.xml','.css','.scss','.log',
    '.plist','.env','.mjs','.cjs','.rb','.go','.java','.rs','.swift','.php','.r','.ipynb'
}
BINARY_OR_DB_EXTS = {'.db','.sqlite','.sqlite3','.duckdb','.parquet','.pkl','.pickle','.bin','.zip','.gz','.7z','.tar','.tgz','.pdf','.docx','.xlsx','.xls','.png','.jpg','.jpeg','.heic','.mov','.mp4','.eml','.mbox'}

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def ext_for(path: str) -> str:
    name = Path(path).name
    suf = Path(path).suffix.lower()
    return suf if suf else '[no_extension]'

def top_dir(path: str) -> str:
    p = Path(path)
    try:
        rel = p.relative_to(LAWROOT)
        parts = rel.parts
        return str(LAWROOT / parts[0]) if parts else str(LAWROOT)
    except ValueError:
        return '[outside_lawroot_string]'

def is_text_path(path: Path) -> bool:
    if path.suffix.lower() in TEXT_EXTS:
        return True
    mt, _ = mimetypes.guess_type(str(path))
    return bool(mt and (mt.startswith('text/') or mt in {'application/json','application/xml'}))

def classify(path: str) -> tuple[str, str]:
    lp = path.lower()
    ext = ext_for(path)
    if str(OUT_MD) in path or str(OUT_JSON) in path or 'stale_reference_triage_cleanup_queue' in lp:
        return 'instrumentation_self_reference', 'exclude_self_reference'
    if '/reports/' in lp or 'manifest' in lp or '/docs/' in lp or '/audit' in lp:
        return 'report_or_manifest_preserve', 'preserve'
    if '/_archive/' in lp or '/archive/' in lp or '_archive' in lp or '_bak' in lp or '/backup' in lp or 'backup' in lp:
        return 'archive_or_backup_historical_reference', 'preserve'
    if ext in BINARY_OR_DB_EXTS or '/data/' in lp and ext in {'.db','.sqlite','.sqlite3','.parquet'}:
        return 'database_or_binary_manual_review', 'manual_review'
    if '/exports/' in lp or '/export' in lp or '/attorney_package/' in lp or '/artifacts/' in lp or '/ready_bag/' in lp:
        return 'generated_export_historical_reference', 'preserve'
    if '/scripts/' in lp or '/src/' in lp or '/app/' in lp or '/tools/' in lp or '/ingest/' in lp or ext in {'.py','.js','.ts','.sh','.sql','.yaml','.yml','.toml','.ini','.cfg','.conf','.env'}:
        return 'source_or_config_candidate_rewrite', 'candidate_rewrite'
    return 'database_or_binary_manual_review' if ext in BINARY_OR_DB_EXTS else 'source_or_config_candidate_rewrite', 'manual_review' if ext in BINARY_OR_DB_EXTS else 'candidate_rewrite'

def sample_lines(path: str, terms: list[str]) -> list[dict[str, Any]]:
    p = Path(path)
    samples = []
    try:
        if not p.is_file() or not str(p).startswith(str(WORKSPACE)) or not is_text_path(p):
            return samples
        with p.open('r', encoding='utf-8', errors='replace') as f:
            for i, line in enumerate(f, 1):
                hits = [t for t in terms if t in line]
                if hits:
                    samples.append({'line': i, 'terms': hits, 'text': line.strip()[:LINE_LEN]})
                    if len(samples) >= LINE_SAMPLE_MAX_PER_FILE:
                        break
    except Exception as e:
        samples.append({'error': repr(e)[:200]})
    return samples

def md_table(rows, headers):
    out = ['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---']*len(headers)) + ' |']
    for row in rows:
        out.append('| ' + ' | '.join(str(row.get(h, '')).replace('|','\\|') for h in headers) + ' |')
    return '\n'.join(out)

def main():
    os.environ['HOME'] = str(WORKSPACE)
    os.environ['PWD'] = str(WORKSPACE)
    os.environ['WORKSPACE'] = str(WORKSPACE)
    input_hashes = {str(INPUT_JSON): sha256(INPUT_JSON), str(INPUT_MD): sha256(INPUT_MD)}
    with INPUT_JSON.open('r', encoding='utf-8') as f:
        audit = json.load(f)
    ext_refs = audit.get('external_references', {})
    summary_counts = audit.get('summary', {}).get('external_reference_counts', {})

    by_ext = Counter()
    by_top_dir = Counter()
    by_class = Counter()
    by_action = Counter()
    by_term_file_count = Counter()
    queue_full_count = 0
    per_file = {}

    for term, entries in ext_refs.items():
        if term not in TERMS:
            continue
        for ent in entries:
            path = ent['path']
            count = int(ent.get('count', 0))
            item = per_file.setdefault(path, {'path': path, 'terms': {}, 'count': 0})
            item['terms'][term] = item['terms'].get(term, 0) + count
            item['count'] += count

    for path, item in per_file.items():
        ext = ext_for(path)
        cls, action = classify(path)
        item['extension'] = ext
        item['top_directory'] = top_dir(path)
        item['proposed_class'] = cls
        item['action_label'] = action
        by_ext[ext] += item['count']
        by_top_dir[item['top_directory']] += item['count']
        by_class[cls] += item['count']
        by_action[action] += item['count']
        queue_full_count += 1
        for term in item['terms']:
            by_term_file_count[term] += 1

    queue_sorted = sorted(per_file.values(), key=lambda x: (-x['count'], x['path']))
    queue = []
    sample_budget = LINE_SAMPLE_FILE_LIMIT
    for item in queue_sorted[:QUEUE_SAMPLE_LIMIT]:
        terms = list(item['terms'].keys())
        q = dict(item)
        q['line_samples'] = []
        if sample_budget > 0:
            s = sample_lines(item['path'], terms)
            if s:
                q['line_samples'] = s
                sample_budget -= 1
        queue.append(q)

    queue_csv = OUT_JSON.with_suffix('.cleanup_queue_sample.csv')
    with queue_csv.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['path','terms','count','extension','top_directory','proposed_class','action_label'])
        w.writeheader()
        for item in queue:
            w.writerow({
                'path': item['path'],
                'terms': '; '.join(f'{k}={v}' for k,v in item['terms'].items()),
                'count': item['count'],
                'extension': item['extension'],
                'top_directory': item['top_directory'],
                'proposed_class': item['proposed_class'],
                'action_label': item['action_label'],
            })

    result = {
        'created_utc': NOW,
        'workspace': str(WORKSPACE),
        'lawmodel1_root': str(LAWROOT),
        'source_audit_json': str(INPUT_JSON),
        'source_audit_md': str(INPUT_MD),
        'source_sha256': input_hashes,
        'stale_terms': TERMS,
        'limitations': {
            'read_only_scope': str(WORKSPACE),
            'source': 'Existing bounded audit JSON external_references plus targeted line sampling of queued text files under workspace only.',
            'queue_total_unique_files': queue_full_count,
            'queue_sidecar_limit': QUEUE_SAMPLE_LIMIT,
            'line_sample_file_limit': LINE_SAMPLE_FILE_LIMIT,
            'line_sample_max_per_file': LINE_SAMPLE_MAX_PER_FILE,
            'line_sample_max_chars': LINE_LEN,
            'original_evidence_files_modified': False,
        },
        'counts_by_stale_term_occurrences': {t: int(summary_counts.get(t, 0)) for t in TERMS},
        'counts_by_stale_term_unique_files': dict(by_term_file_count),
        'counts_by_extension_occurrences': dict(by_ext.most_common()),
        'counts_by_top_directory_occurrences': dict(by_top_dir.most_common()),
        'counts_by_remediation_class_occurrences': dict(by_class.most_common()),
        'counts_by_action_label_occurrences': dict(by_action.most_common()),
        'cleanup_queue_sample_csv': str(queue_csv),
        'cleanup_queue_sample': queue,
    }
    OUT_JSON.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')

    def top_rows(counter_dict, n=20):
        return [{'name': k, 'occurrences': v} for k, v in list(counter_dict.items())[:n]]
    queue_rows = []
    for item in queue[:100]:
        samples = ' / '.join((f"L{s.get('line')}: {s.get('text','')}" if 'line' in s else s.get('error','')) for s in item.get('line_samples', [])[:2])
        queue_rows.append({
            'path': item['path'], 'terms': '; '.join(f'{k}={v}' for k,v in item['terms'].items()),
            'count': item['count'], 'extension': item['extension'], 'class': item['proposed_class'],
            'action': item['action_label'], 'line_samples': samples
        })

    md = []
    md.append('# LawModel1 stale-reference triage and cleanup queue')
    md.append('')
    md.append(f'Created UTC: {NOW}')
    md.append(f'Workspace: {WORKSPACE}')
    md.append(f'LawModel1 root: {LAWROOT}')
    md.append(f'Source audit JSON: {INPUT_JSON}')
    md.append(f'Source audit markdown: {INPUT_MD}')
    md.append(f'Source audit JSON SHA-256: {input_hashes[str(INPUT_JSON)]}')
    md.append(f'Source audit markdown SHA-256: {input_hashes[str(INPUT_MD)]}')
    md.append('Original evidence/project files modified: false. Files written by this triage are limited to this report, JSON sidecar, CSV queue sample, and generator script under LawModel1.')
    md.append('')
    md.append('## Counts by stale term')
    md.append(md_table([{'term': t, 'occurrences': int(summary_counts.get(t,0)), 'unique_files_in_external_references': by_term_file_count.get(t,0)} for t in TERMS], ['term','occurrences','unique_files_in_external_references']))
    md.append('')
    md.append('## Counts by file extension')
    md.append(md_table(top_rows(result['counts_by_extension_occurrences'], 30), ['name','occurrences']))
    md.append('')
    md.append('## Counts by top directory')
    md.append(md_table(top_rows(result['counts_by_top_directory_occurrences'], 30), ['name','occurrences']))
    md.append('')
    md.append('## Counts by remediation class')
    md.append(md_table(top_rows(result['counts_by_remediation_class_occurrences'], 20), ['name','occurrences']))
    md.append('')
    md.append('## Counts by action label')
    md.append(md_table(top_rows(result['counts_by_action_label_occurrences'], 20), ['name','occurrences']))
    md.append('')
    md.append('## Cleanup queue sample')
    md.append(f'Total unique files in cleanup queue: {queue_full_count}. Markdown table shows first 100 entries sorted by occurrence count descending. JSON and CSV sidecars contain first {QUEUE_SAMPLE_LIMIT} entries sorted by occurrence count descending.')
    md.append(md_table(queue_rows, ['path','terms','count','extension','class','action','line_samples']))
    md.append('')
    md.append('## Remediation class labels')
    md.append('- generated_export_historical_reference: path under exports/artifacts/attorney_package/ready_bag/export locations; action label preserve.')
    md.append('- archive_or_backup_historical_reference: path under archive, _archive, backup, or bak naming; action label preserve.')
    md.append('- source_or_config_candidate_rewrite: source/config/script/app/tool locations or text config extensions; action label candidate_rewrite unless overridden.')
    md.append('- report_or_manifest_preserve: report, docs, audit, or manifest locations; action label preserve.')
    md.append('- database_or_binary_manual_review: database, compressed, office/media, or other binary-like extensions; action label manual_review.')
    md.append('- instrumentation_self_reference: generated triage artifacts only; action label exclude_self_reference.')
    md.append('')
    md.append('## Limitations and performance caps')
    md.append(f'- Input source is the existing bounded audit JSON external_references object: {INPUT_JSON}.')
    md.append(f'- Targeted filesystem scans were limited to line samples from queued text files under {WORKSPACE}; no reads were made outside the workspace by the generator.')
    md.append(f'- JSON/CSV cleanup queue sidecars are capped at {QUEUE_SAMPLE_LIMIT} file entries sorted by stale-term occurrence count; full aggregate counts were computed from all external_references entries in the source audit JSON.')
    md.append(f'- Line sampling cap: {LINE_SAMPLE_FILE_LIMIT} files, {LINE_SAMPLE_MAX_PER_FILE} matching lines per sampled text file, {LINE_LEN} characters per line sample.')
    md.append('- The report records stale path strings already present in files; it does not verify external target existence and does not modify source files.')
    md.append('')
    md.append('## Verification')
    md.append(f'- Markdown report path: {OUT_MD}')
    md.append(f'- JSON sidecar path: {OUT_JSON}')
    md.append(f'- CSV queue sample path: {queue_csv}')
    OUT_MD.write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(json.dumps({'out_md': str(OUT_MD), 'out_json': str(OUT_JSON), 'out_csv': str(queue_csv), 'queue_total_unique_files': queue_full_count}, indent=2))

if __name__ == '__main__':
    main()
