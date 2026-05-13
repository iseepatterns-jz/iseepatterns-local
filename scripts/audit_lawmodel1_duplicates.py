#!/usr/bin/env python3
"""Locker-scoped LawModel1 duplicate/stale audit.

Read-only audit. Does not modify evidence. Outputs JSON + Markdown reports under
lawmodel1/reports/governance_audits/.
"""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import json
import os
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

LOCKER = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER').resolve()
ROOT = (LOCKER / 'lawmodel1').resolve()
REPORT_DIR = ROOT / 'reports' / 'governance_audits'
RUN_ID = dt.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
JSON_OUT = REPORT_DIR / f'{RUN_ID}_lawmodel1_duplicate_audit.json'
MD_OUT = REPORT_DIR / f'{RUN_ID}_lawmodel1_duplicate_audit.md'

EXCLUDE_DIR_NAMES = {
    '.git', 'node_modules', '.next', '__pycache__', '.pytest_cache',
    'venv', '.venv', '.venv-3.14', 'chroma_db', 'data',
}
MAX_HASH_SIZE = 50 * 1024 * 1024
MAX_DB_DUP_CHECK_ROWS = 250_000
TEXT_EXTS = {'.py', '.md', '.json', '.ts', '.tsx', '.js', '.jsx', '.sh', '.sql', '.txt', '.csv', '.yml', '.yaml', '.plist'}
CANDIDATE_DUP_COLUMNS = [
    'id', 'canonical_id', 'message_id', 'source_id', 'source_path', 'file_path',
    'path', 'sha256', 'sha256_hash', 'hash', 'transaction_id', 'email_id',
    'exhibit_id', 'evidence_id', 'document_id'
]


def ensure_inside_locker(path: Path) -> Path:
    resolved = path.resolve()
    if not str(resolved).startswith(str(LOCKER) + os.sep) and resolved != LOCKER:
        raise RuntimeError(f'Path outside Locker denied: {resolved}')
    return resolved


def iter_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dp = Path(dirpath)
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIR_NAMES]
        for name in filenames:
            p = dp / name
            try:
                rp = ensure_inside_locker(p)
                if rp.is_file() and not rp.is_symlink():
                    yield rp
            except Exception:
                continue


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def quote_ident(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def sqlite_audit(db_path: Path):
    result = {
        'path': str(db_path),
        'opened': False,
        'error': None,
        'tables_checked': [],
    }
    try:
        if db_path.stat().st_size > 2 * 1024 * 1024 * 1024:
            result['error'] = 'skipped: database file exceeds 2 GiB size limit for mobile audit pass'
            return result
        uri = f'file:{db_path}?mode=ro&immutable=1'
        con = sqlite3.connect(uri, uri=True, timeout=5)
        con.set_progress_handler(lambda: 1, 2_000_000)
        con.execute('PRAGMA query_only=ON')
        result['opened'] = True
        tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        for table in tables:
            table_entry = {'table': table, 'row_count': None, 'duplicate_checks': []}
            try:
                table_q = quote_ident(table)
                row_count = con.execute(f'SELECT COUNT(*) FROM {table_q}').fetchone()[0]
                table_entry['row_count'] = row_count
                if row_count > MAX_DB_DUP_CHECK_ROWS:
                    table_entry['duplicate_check_skipped'] = f'row_count exceeds MAX_DB_DUP_CHECK_ROWS={MAX_DB_DUP_CHECK_ROWS}'
                    result['tables_checked'].append(table_entry)
                    continue
                cols_info = con.execute(f'PRAGMA table_info({table_q})').fetchall()
                cols = [c[1] for c in cols_info]
                for col in CANDIDATE_DUP_COLUMNS:
                    if col not in cols:
                        continue
                    col_q = quote_ident(col)
                    # Count duplicate groups and duplicate rows, excluding blank/null values.
                    q = f'''
                        SELECT COUNT(*) AS duplicate_groups, COALESCE(SUM(cnt), 0) AS duplicate_rows
                        FROM (
                            SELECT {col_q}, COUNT(*) AS cnt
                            FROM {table_q}
                            WHERE {col_q} IS NOT NULL AND TRIM(CAST({col_q} AS TEXT)) != ''
                            GROUP BY {col_q}
                            HAVING COUNT(*) > 1
                        )
                    '''
                    dup_groups, dup_rows = con.execute(q).fetchone()
                    if dup_groups:
                        examples = con.execute(f'''
                            SELECT CAST({col_q} AS TEXT) AS value, COUNT(*) AS cnt
                            FROM {table_q}
                            WHERE {col_q} IS NOT NULL AND TRIM(CAST({col_q} AS TEXT)) != ''
                            GROUP BY {col_q}
                            HAVING COUNT(*) > 1
                            ORDER BY cnt DESC, value ASC
                            LIMIT 10
                        ''').fetchall()
                        example_rows = []
                        for v, c in examples:
                            example_rows.append({'value': str(v), 'count': int(c)})
                        table_entry['duplicate_checks'].append({
                            'column': col,
                            'duplicate_groups': int(dup_groups),
                            'duplicate_rows': int(dup_rows or 0),
                            'examples': example_rows,
                        })
            except Exception as e:
                table_entry['error'] = repr(e)
            result['tables_checked'].append(table_entry)
        con.close()
    except Exception as e:
        result['error'] = repr(e)
    return result


def main() -> int:
    ensure_inside_locker(ROOT)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    files = list(iter_files(ROOT))
    file_records = []
    by_size = defaultdict(list)
    by_name = defaultdict(list)
    stale_refs = {'/Users/iseepatterns-ms-m4': [], 'batdrivetb5': [], 'AI_TRAINING': []}

    for p in files:
        try:
            st = p.stat()
            rel = p.relative_to(ROOT).as_posix()
            rec = {'path': str(p), 'relpath': rel, 'name': p.name, 'size': st.st_size, 'ext': p.suffix.lower()}
            file_records.append(rec)
            by_size[st.st_size].append(p)
            by_name[p.name].append(p)
            if p.suffix.lower() in TEXT_EXTS and st.st_size <= 20 * 1024 * 1024:
                try:
                    text = p.read_text(errors='ignore')
                    for needle in stale_refs:
                        if needle in text:
                            stale_refs[needle].append(str(p))
                except Exception:
                    pass
        except Exception:
            continue

    duplicate_content_groups = []
    for size, paths in by_size.items():
        if len(paths) < 2 or size > MAX_HASH_SIZE:
            continue
        hashes = defaultdict(list)
        for p in paths:
            try:
                hashes[sha256_file(p)].append(p)
            except Exception:
                continue
        for digest, hpaths in hashes.items():
            if len(hpaths) > 1:
                duplicate_content_groups.append({
                    'sha256': digest,
                    'size': size,
                    'count': len(hpaths),
                    'paths': [str(x) for x in sorted(hpaths, key=lambda q: str(q))],
                })

    duplicate_filename_groups = []
    for name, paths in by_name.items():
        if len(paths) > 1:
            duplicate_filename_groups.append({
                'name': name,
                'count': len(paths),
                'paths': [str(x) for x in sorted(paths, key=lambda q: str(q))],
            })

    data_db_candidates = [
        ROOT / 'data' / 'evidence_hub.db',
        ROOT / 'data' / 'players.db',
        ROOT / 'data' / 'chat_master.db',
        ROOT / 'data' / 'MBOX_LOCKER' / 'mbox_metadata.db',
        ROOT / 'data' / 'MBOX_LOCKER' / 'mbox_index.db',
        ROOT / 'data' / 'rowboat-creative' / 'RC-2026' / 'db' / 'workbench.db',
    ]
    db_paths = sorted({p for p in files if p.suffix.lower() in {'.db', '.sqlite', '.sqlite3'}} | {p for p in data_db_candidates if p.exists()}, key=lambda q: str(q))
    db_results = [sqlite_audit(p) for p in db_paths]

    duplicate_db_findings = []
    for db in db_results:
        for table in db.get('tables_checked', []):
            for check in table.get('duplicate_checks', []):
                duplicate_db_findings.append({
                    'db': db['path'],
                    'table': table['table'],
                    'row_count': table.get('row_count'),
                    **check,
                })

    summary = {
        'workspace_boundary': str(LOCKER),
        'lawmodel1_root': str(ROOT),
        'run_id': RUN_ID,
        'file_count_scanned': len(file_records),
        'db_count_scanned': len(db_paths),
        'duplicate_content_group_count': len(duplicate_content_groups),
        'duplicate_content_file_count': sum(g['count'] for g in duplicate_content_groups),
        'duplicate_filename_group_count': len(duplicate_filename_groups),
        'duplicate_db_finding_count': len(duplicate_db_findings),
        'hash_size_limit_bytes': MAX_HASH_SIZE,
        'db_duplicate_check_row_limit': MAX_DB_DUP_CHECK_ROWS,
        'stale_reference_counts': {k: len(v) for k, v in stale_refs.items()},
    }

    report = {
        'summary': summary,
        'duplicate_content_groups': sorted(duplicate_content_groups, key=lambda g: (-g['count'], -g['size'], g['sha256'])),
        'duplicate_filename_groups': sorted(duplicate_filename_groups, key=lambda g: (-g['count'], g['name'])),
        'db_results': db_results,
        'duplicate_db_findings': sorted(duplicate_db_findings, key=lambda d: (d['db'], d['table'], d['column'])),
        'stale_references': stale_refs,
    }

    JSON_OUT.write_text(json.dumps(report, indent=2, sort_keys=True), encoding='utf-8')

    lines = []
    lines.append('# LawModel1 Duplicate / Stale Item Audit')
    lines.append('')
    lines.append(f'Run ID: {RUN_ID}')
    lines.append(f'Workspace boundary: `{LOCKER}`')
    lines.append(f'LawModel1 root: `{ROOT}`')
    lines.append('Scope: read-only scan for duplicate file content, duplicate filenames, SQLite duplicate candidate keys, and stale path references inside lawmodel1.')
    lines.append('File/content scan excluded raw `data/`, virtualenv, git, build-cache, node_modules, and chroma directories; selected canonical data DBs were inspected separately read-only.')
    lines.append(f'Hash limit: duplicate-content hashing was limited to same-size groups where file size <= {MAX_HASH_SIZE} bytes.')
    lines.append(f'Database duplicate-key checks were limited to tables with row_count <= {MAX_DB_DUP_CHECK_ROWS}; larger table row counts were recorded and duplicate grouping skipped.')
    lines.append('Original evidence modification: none.')
    lines.append('')
    lines.append('## Summary')
    for k, v in summary.items():
        lines.append(f'- {k}: {v}')
    lines.append('')
    lines.append('## Duplicate file content groups')
    if duplicate_content_groups:
        for g in report['duplicate_content_groups'][:100]:
            lines.append(f'- sha256={g["sha256"]} size={g["size"]} count={g["count"]}')
            for p in g['paths'][:20]:
                lines.append(f'  - `{p}`')
            if len(g['paths']) > 20:
                lines.append(f'  - ... {len(g["paths"]) - 20} additional paths omitted from markdown; see JSON report.')
    else:
        lines.append('- none located')
    lines.append('')
    lines.append('## Duplicate filename groups')
    if duplicate_filename_groups:
        for g in report['duplicate_filename_groups'][:100]:
            lines.append(f'- name={g["name"]} count={g["count"]}')
            for p in g['paths'][:20]:
                lines.append(f'  - `{p}`')
            if len(g['paths']) > 20:
                lines.append(f'  - ... {len(g["paths"]) - 20} additional paths omitted from markdown; see JSON report.')
    else:
        lines.append('- none located')
    lines.append('')
    lines.append('## SQLite duplicate candidate-key findings')
    if duplicate_db_findings:
        for d in report['duplicate_db_findings'][:200]:
            lines.append(f'- db=`{d["db"]}` table={d["table"]} column={d["column"]} duplicate_groups={d["duplicate_groups"]} duplicate_rows={d["duplicate_rows"]} row_count={d.get("row_count")}')
            for ex in d.get('examples', [])[:5]:
                lines.append(f'  - example value={ex["value"]!r} count={ex["count"]}')
    else:
        lines.append('- none located in checked candidate columns')
    lines.append('')
    lines.append('## Stale reference counts')
    for needle, paths in stale_refs.items():
        lines.append(f'- `{needle}`: {len(paths)} files')
        for p in sorted(paths)[:50]:
            lines.append(f'  - `{p}`')
        if len(paths) > 50:
            lines.append(f'  - ... {len(paths) - 50} additional paths omitted from markdown; see JSON report.')
    lines.append('')
    lines.append('## Transparency')
    lines.append('- Script path: `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/audit_lawmodel1_duplicates.py`')
    lines.append('- Command workdir: `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER`')
    lines.append('- All audited paths were constrained to the Locker boundary by `ensure_inside_locker()`.')
    lines.append('- SQLite databases were opened read-only with `mode=ro&immutable=1` and `PRAGMA query_only=ON`.')
    lines.append('')
    lines.append('## Machine-readable report')
    lines.append(f'- `{JSON_OUT}`')
    lines.append('')
    MD_OUT.write_text('\n'.join(lines), encoding='utf-8')

    print(json.dumps({'summary': summary, 'json_report': str(JSON_OUT), 'markdown_report': str(MD_OUT)}, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
