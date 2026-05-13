#!/usr/bin/env python3
"""Bounded duplicate/stale/governance audit for LawModel1.
Read-only except writing report files under lawmodel1/reports/governance_audits.
"""
import os, json, hashlib, time, re, sqlite3
from pathlib import Path
from collections import defaultdict

ROOT = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1')
LOCKER = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER')
assert str(ROOT).startswith(str(LOCKER))
REPORT_DIR = ROOT / 'reports' / 'governance_audits'
REPORT_DIR.mkdir(parents=True, exist_ok=True)
TS = time.strftime('%Y-%m-%d_%H-%M-%S')
REPORT = REPORT_DIR / f'{TS}_lawmodel1_bounded_duplicate_stale_audit.md'
SIDECAR = REPORT_DIR / f'{TS}_lawmodel1_bounded_duplicate_stale_audit.json'

SKIP_DIRS = {'.git', 'node_modules', '.next', '.venv', 'venv', '.venv-3.14', 'chroma_db'}
# Include data, but skip deep attachment/image caches and archive storage for the bounded hash pass.
HASH_SKIP_PARTS = {'Attachments', 'attachments', 'StickerCache', 'CloudKitMetaData', '_archive', 'archive', 'Caches'}
HASH_MAX_SIZE = 50 * 1024 * 1024
HASH_MAX_FILES = 8000
TEXT_MAX_SIZE = 3 * 1024 * 1024
TEXT_EXTS = {'.py','.ts','.tsx','.js','.jsx','.json','.md','.txt','.yml','.yaml','.plist','.sh','.sql','.csv','.toml'}
TERMS = ['/Users/iseepatterns-ms-m4','/Volumes/batdrivetb5','AI_TRAINING','/Volumes/iseepatterns-evidence/IGNORE','/Volumes/messageshd','/Volumes/2026-iseepatterns-tb3']

files = []
dirs = []
walk_errors = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    dirs.append(dirpath)
    for fn in filenames:
        fp = Path(dirpath) / fn
        try:
            st = fp.stat()
            files.append({'path': str(fp), 'name': fn, 'size': st.st_size, 'mtime': st.st_mtime})
        except Exception as e:
            walk_errors.append({'path': str(fp), 'error': repr(e)})

# Duplicate filenames.
by_name = defaultdict(list)
for f in files:
    by_name[f['name']].append(f)
dup_names = {k:v for k,v in by_name.items() if len(v) > 1}

# Bounded duplicate content hash.
by_size = defaultdict(list)
for f in files:
    if f['size'] > 0:
        by_size[f['size']].append(f)

def hash_candidate(f):
    p = Path(f['path'])
    if f['size'] > HASH_MAX_SIZE:
        return False
    if any(part in HASH_SKIP_PARTS for part in p.parts):
        return False
    return True

hash_groups = defaultdict(list)
hash_candidates = []
skipped_same_size = []
for size, group in by_size.items():
    if len(group) < 2:
        continue
    for f in group:
        if hash_candidate(f) and len(hash_candidates) < HASH_MAX_FILES:
            hash_candidates.append(f)
        else:
            skipped_same_size.append(f)

for f in hash_candidates:
    h = hashlib.sha256()
    try:
        with open(f['path'], 'rb') as fh:
            for chunk in iter(lambda: fh.read(1024 * 1024), b''):
                h.update(chunk)
        hash_groups[h.hexdigest()].append(f)
    except Exception as e:
        f['hash_error'] = repr(e)

dup_hashes = {h:g for h,g in hash_groups.items() if len(g) > 1}

# Stale/temp items.
stale_items = []
for d in dirs:
    name = Path(d).name
    dl = d.lower()
    if name == '__pycache__' or name in {'tmp','temp','backup','backups','archive','_archive'}:
        stale_items.append({'type':'directory','path':d,'reason':name})
    elif '/_archive/' in dl or dl.endswith('/_archive'):
        stale_items.append({'type':'directory','path':d,'reason':'archive_path'})
for f in files:
    n = f['name'].lower(); p = f['path'].lower()
    reasons = []
    if f['name'] == '.DS_Store': reasons.append('.DS_Store')
    if n.endswith(('.pyc','.pyo')): reasons.append('compiled_python')
    if re.search(r'(^|[_\-.])(tmp|temp|backup|bak|old|copy)([_\-.]|$)', n): reasons.append('temp_or_backup_name')
    if '/_archive/' in p: reasons.append('archive_path')
    if reasons:
        stale_items.append({'type':'file','path':f['path'],'size':f['size'],'reason':','.join(reasons)})

# External/stale references in text files.
refs = {t: [] for t in TERMS}
for f in files:
    fp = Path(f['path'])
    if fp.suffix.lower() not in TEXT_EXTS or f['size'] > TEXT_MAX_SIZE:
        continue
    try:
        txt = fp.read_text(errors='ignore')
    except Exception:
        continue
    for term in TERMS:
        c = txt.count(term)
        if c:
            refs[term].append({'path': f['path'], 'count': c})

# Registry parse.
registry_info = {}
reg = ROOT / 'gems' / 'registry.json'
try:
    data = json.loads(reg.read_text())
    gems = data.get('gems', []) if isinstance(data, dict) else data
    ids, deps = [], []
    for g in gems:
        if isinstance(g, dict):
            gid = g.get('id') or g.get('name')
            if gid: ids.append(gid)
            deps.extend(g.get('dependencies') or [])
    registry_info = {'registered_ids': ids, 'unregistered_dependencies': sorted(set(deps) - set(ids))}
except Exception as e:
    registry_info = {'error': repr(e)}

# DB targeted checks.
db_checks = []
key_dbs = [ROOT/'data/evidence_hub.db', ROOT/'data/rowboat-creative/RC-2026/db/workbench.db', ROOT/'data/MBOX_LOCKER/mbox_metadata.db', ROOT/'data/MBOX_LOCKER/mbox_index.db', ROOT/'data/IMESSAGE_DATA_LOCKER/chat_case_only.db', ROOT/'data/chat_master.db']
for db in key_dbs:
    if not db.exists():
        db_checks.append({'db':str(db),'status':'missing'}); continue
    try:
        con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
        cur = con.cursor()
        tables = [r[0] for r in cur.execute("select name from sqlite_master where type='table'").fetchall()]
        for table in tables:
            cols = [r[1] for r in cur.execute(f'pragma table_info("{table}")').fetchall()]
            for col in ['evidence_id','transaction_id','message_id','rfc822_id','sha256','sha256_hash','forensic_hash']:
                if col in cols:
                    q = f'''select count(*) from (select "{col}" v, count(*) c from "{table}" where "{col}" is not null and trim(cast("{col}" as text))<>'' group by "{col}" having c>1)'''
                    groups = cur.execute(q).fetchone()[0]
                    if groups:
                        rows = cur.execute(f'''select sum(c) from (select count(*) c from "{table}" where "{col}" is not null and trim(cast("{col}" as text))<>'' group by "{col}" having c>1)''').fetchone()[0]
                        db_checks.append({'db':str(db),'table':table,'column':col,'duplicate_groups':groups,'duplicate_rows':rows})
        con.close()
    except Exception as e:
        db_checks.append({'db':str(db),'status':'error','error':repr(e)})

summary = {
    'scope': str(ROOT),
    'file_count': len(files),
    'directory_count': len(dirs),
    'duplicate_filename_groups': len(dup_names),
    'same_size_hash_candidates': len(hash_candidates),
    'duplicate_content_hash_groups': len(dup_hashes),
    'stale_temp_archive_items': len(stale_items),
    'external_reference_counts': {t: sum(x['count'] for x in refs[t]) for t in TERMS},
    'db_nonzero_duplicate_checks': len(db_checks),
    'registry_info': registry_info,
    'walk_errors': len(walk_errors),
}
sidecar = {
    'summary': summary,
    'duplicate_content_hash_groups': dup_hashes,
    'duplicate_filename_samples': dict(list(sorted(dup_names.items(), key=lambda kv:(-len(kv[1]), kv[0])))[:150]),
    'stale_items_sample': stale_items[:1000],
    'external_references': refs,
    'database_duplicate_checks': db_checks,
    'skipped_same_size_files_sample': skipped_same_size[:200],
    'walk_errors': walk_errors[:100],
}
SIDECAR.write_text(json.dumps(sidecar, indent=2, default=str))

lines = []
lines.append('# LawModel1 Bounded Duplicate, Stale Item, Governance, and Chain-of-Custody Audit')
lines.append('')
lines.append(f'Scope: {ROOT}')
lines.append('Boundary: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER only')
lines.append('Modification statement: no original evidence files or databases were modified; this pass wrote only this report, its JSON sidecar, and the audit script under lawmodel1/scripts.')
lines.append('')
lines.append('## Summary')
for k, v in summary.items():
    lines.append(f'- {k}: {v}')
lines.append('')
lines.append('## Duplicate content groups by SHA-256 (bounded hash pass)')
if dup_hashes:
    for h, group in sorted(dup_hashes.items(), key=lambda kv:(-len(kv[1]), -kv[1][0]['size']))[:75]:
        lines.append(f'- sha256 {h}; files {len(group)}; size {group[0]["size"]}')
        for f in group[:15]:
            lines.append(f'  - {f["path"]}')
else:
    lines.append('- none found in bounded hash candidate set')
lines.append('')
lines.append('## Duplicate filename groups (sample)')
for name, group in sorted(dup_names.items(), key=lambda kv:(-len(kv[1]), kv[0]))[:100]:
    lines.append(f'- {name}: {len(group)}')
    for f in group[:12]:
        lines.append(f'  - {f["path"]}')
lines.append('')
lines.append('## Stale/temp/archive item sample')
for item in stale_items[:300]:
    lines.append(f'- {item.get("reason")}: {item["path"]}')
lines.append('')
lines.append('## External/stale path references')
for term in TERMS:
    lst = refs[term]
    lines.append(f'- {term}: {sum(x["count"] for x in lst)} references across {len(lst)} files')
    for x in lst[:30]:
        lines.append(f'  - {x["path"]}: {x["count"]}')
lines.append('')
lines.append('## Gem registry findings')
lines.append(f'- registered_ids: {registry_info.get("registered_ids")}')
lines.append(f'- unregistered_dependencies: {registry_info.get("unregistered_dependencies")}')
lines.append('')
lines.append('## Database duplicate/provenance checks with nonzero duplicate groups')
if db_checks:
    for c in db_checks[:200]:
        lines.append(f'- {c}')
else:
    lines.append('- none found in targeted checks')
lines.append('')
lines.append('## Bounded-pass notes')
lines.append(f'- Same-size files skipped from content hashing due size/path caps: {len(skipped_same_size)}')
lines.append(f'- JSON sidecar: {SIDECAR}')
REPORT.write_text('\n'.join(lines))
print(json.dumps({'report': str(REPORT), 'sidecar': str(SIDECAR), 'summary': summary}, indent=2))
