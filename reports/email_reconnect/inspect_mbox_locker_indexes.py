#!/usr/bin/env python3
import csv, json, os, sqlite3
from pathlib import Path

ROOT = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER')
REPORT_DIR = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/email_reconnect')
DBS = []
for dirpath, _, filenames in os.walk(ROOT):
    for fn in filenames:
        if fn.lower().endswith('.db'):
            p = Path(dirpath)/fn
            try:
                if p.stat().st_size > 0:
                    DBS.append(p)
            except OSError:
                pass
DBS = sorted(DBS, key=lambda p: (p.name != 'mbox_metadata.db', str(p)))
MAP_JSON = REPORT_DIR/'emails_locker_to_mbox_metadata_message_id_map.json'
OUT_JSON = REPORT_DIR/'mbox_locker_index_schema_summary.json'
OUT_TXT = REPORT_DIR/'mbox_locker_index_schema_summary.txt'

SQL_USED = [
    "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','index','view','trigger') ORDER BY type, name;",
    "PRAGMA table_info(<table>);",
    "SELECT COUNT(*) FROM <table>;",
    "SELECT COUNT(*) FROM emails;",
    "SELECT COUNT(*) FROM emails WHERE rfc822_id IS NOT NULL AND TRIM(rfc822_id) <> '';",
    "SELECT COUNT(DISTINCT rfc822_id) FROM emails WHERE rfc822_id IS NOT NULL AND TRIM(rfc822_id) <> '';",
    "SELECT locker_source, COUNT(*) FROM emails GROUP BY locker_source ORDER BY COUNT(*) DESC, locker_source;",
    "SELECT zip_source, COUNT(*) FROM emails GROUP BY zip_source ORDER BY COUNT(*) DESC, zip_source;",
    "SELECT mbox_source, COUNT(*) FROM emails GROUP BY mbox_source ORDER BY COUNT(*) DESC, mbox_source;",
    "SELECT account, COUNT(*) FROM emails GROUP BY account ORDER BY COUNT(*) DESC, account;",
    "SELECT gmail_id, COUNT(*) c FROM emails WHERE gmail_id IS NOT NULL AND TRIM(gmail_id) <> '' GROUP BY gmail_id HAVING c > 1 ORDER BY c DESC, gmail_id LIMIT 20;",
    "SELECT rfc822_id, COUNT(*) c FROM emails WHERE rfc822_id IS NOT NULL AND TRIM(rfc822_id) <> '' GROUP BY rfc822_id HAVING c > 1 ORDER BY c DESC, rfc822_id LIMIT 20;"
]

def ro_connect(path: Path):
    return sqlite3.connect(f"file:{path}?mode=ro", uri=True)

def jsonable(v):
    if isinstance(v, bytes):
        return {'bytes_hex_prefix': v[:64].hex(), 'bytes_len': len(v)}
    return v

def rowdict(row):
    return {k: jsonable(row[k]) for k in row.keys()}

def db_summary(path: Path):
    con = ro_connect(path)
    con.row_factory = sqlite3.Row
    objects = [dict(r) for r in con.execute(SQL_USED[0])]
    tables = [o['name'] for o in objects if o['type'] == 'table']
    table_info = {}
    counts = {}
    samples = {}
    for t in tables:
        table_info[t] = [dict(r) for r in con.execute(f"PRAGMA table_info({t})")]
        try:
            counts[t] = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            samples[t] = [rowdict(r) for r in con.execute(f"SELECT * FROM {t} LIMIT 3")]
        except Exception as e:
            counts[t] = f"ERROR: {e}"
    email_counts = {}
    if 'emails' in tables:
        email_counts['total'] = con.execute("SELECT COUNT(*) FROM emails").fetchone()[0]
        # collect per available useful columns
        cols = {c['name'] for c in table_info['emails']}
        for col in ['rfc822_id','gmail_id','account','locker_source','zip_source','mbox_source','subject','date_sent','from_addr','to_addr']:
            if col in cols:
                email_counts[f'{col}_nonblank'] = con.execute(f"SELECT COUNT(*) FROM emails WHERE {col} IS NOT NULL AND TRIM(CAST({col} AS TEXT)) <> ''").fetchone()[0]
                if col in ['rfc822_id','gmail_id']:
                    email_counts[f'{col}_distinct_nonblank'] = con.execute(f"SELECT COUNT(DISTINCT {col}) FROM emails WHERE {col} IS NOT NULL AND TRIM(CAST({col} AS TEXT)) <> ''").fetchone()[0]
                    email_counts[f'{col}_duplicate_values'] = con.execute(f"SELECT COUNT(*) FROM (SELECT {col}, COUNT(*) c FROM emails WHERE {col} IS NOT NULL AND TRIM(CAST({col} AS TEXT)) <> '' GROUP BY {col} HAVING c > 1)").fetchone()[0]
                if col in ['locker_source','zip_source','mbox_source','account']:
                    email_counts[f'{col}_groups'] = [dict(r) for r in con.execute(f"SELECT {col} AS value, COUNT(*) AS count FROM emails GROUP BY {col} ORDER BY count DESC, {col} LIMIT 50")]
        if 'rfc822_id' in cols:
            email_counts['top_duplicate_rfc822_id'] = [dict(r) for r in con.execute("SELECT rfc822_id, COUNT(*) c FROM emails WHERE rfc822_id IS NOT NULL AND TRIM(rfc822_id) <> '' GROUP BY rfc822_id HAVING c > 1 ORDER BY c DESC, rfc822_id LIMIT 20")]
        if 'gmail_id' in cols:
            email_counts['top_duplicate_gmail_id'] = [dict(r) for r in con.execute("SELECT gmail_id, COUNT(*) c FROM emails WHERE gmail_id IS NOT NULL AND TRIM(gmail_id) <> '' GROUP BY gmail_id HAVING c > 1 ORDER BY c DESC, gmail_id LIMIT 20")]
    con.close()
    return {'path': str(path), 'objects': objects, 'tables': tables, 'table_info': table_info, 'counts': counts, 'email_counts': email_counts, 'samples': samples}

# file inventory relevant index artifacts
inventory = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    for fn in filenames:
        p = Path(dirpath)/fn
        suf = ''.join(p.suffixes).lower()
        if p.name.lower().endswith(('.db','.db-wal','.db-shm','.msf','.csv','.xml','.md5')) or 'index' in p.name.lower() or 'metadata' in p.name.lower() or 'mapping' in p.name.lower():
            try:
                st = p.stat()
                size = st.st_size
            except OSError:
                size = None
            inventory.append({'path': str(p), 'size_bytes': size})
inventory.sort(key=lambda x: x['path'])

summary = {'root': str(ROOT), 'sql_used': SQL_USED, 'index_files_found': inventory, 'databases': []}
for db in DBS:
    summary['databases'].append(db_summary(db))

# preliminary mapping categories from existing JSON
if MAP_JSON.exists():
    with open(MAP_JSON) as f:
        m = json.load(f)
    summary['emails_locker_preliminary_map'] = {'path': str(MAP_JSON), 'counts': m.get('counts', {})}
    recs = m.get('records', [])
    unmatched = [r for r in recs if r.get('match_count', 0) == 0]
    summary['emails_locker_preliminary_map']['unmatched_count'] = len(unmatched)
    summary['emails_locker_preliminary_map']['unmatched_by_source_db'] = {}
    summary['emails_locker_preliminary_map']['unmatched_by_extension'] = {}
    for r in unmatched:
        sd = r.get('source_db') or ''
        ext = Path(r.get('source_path') or '').suffix.lower() or '(none)'
        summary['emails_locker_preliminary_map']['unmatched_by_source_db'][sd] = summary['emails_locker_preliminary_map']['unmatched_by_source_db'].get(sd,0)+1
        summary['emails_locker_preliminary_map']['unmatched_by_extension'][ext] = summary['emails_locker_preliminary_map']['unmatched_by_extension'].get(ext,0)+1

with open(OUT_JSON, 'w') as f:
    json.dump(summary, f, indent=2, sort_keys=True)

lines=[]
lines.append(f"Root: {ROOT}")
lines.append("Index files found:")
for item in inventory:
    lines.append(f"  {item['path']} ({item['size_bytes']} bytes)")
lines.append("SQL used:")
for s in SQL_USED:
    lines.append(f"  {s}")
for dbs in summary['databases']:
    lines.append(f"Database: {dbs['path']}")
    lines.append(f"  tables: {', '.join(dbs['tables'])}")
    for t in dbs['tables']:
        lines.append(f"  table {t}: count={dbs['counts'][t]}")
        cols = ', '.join([f"{c['name']} {c['type']}" for c in dbs['table_info'][t]])
        lines.append(f"    columns: {cols}")
    if dbs['email_counts']:
        lines.append("  email_counts:")
        for k,v in dbs['email_counts'].items():
            if not isinstance(v, list):
                lines.append(f"    {k}: {v}")
        for k,v in dbs['email_counts'].items():
            if isinstance(v, list):
                lines.append(f"    {k}: {json.dumps(v, ensure_ascii=False)}")
if 'emails_locker_preliminary_map' in summary:
    lines.append(f"Preliminary EMAILS_LOCKER map: {summary['emails_locker_preliminary_map']['path']}")
    lines.append(f"  counts: {json.dumps(summary['emails_locker_preliminary_map']['counts'], sort_keys=True)}")
    lines.append(f"  unmatched_count: {summary['emails_locker_preliminary_map']['unmatched_count']}")
    lines.append(f"  unmatched_by_source_db: {json.dumps(summary['emails_locker_preliminary_map']['unmatched_by_source_db'], sort_keys=True)}")
    lines.append(f"  unmatched_by_extension: {json.dumps(summary['emails_locker_preliminary_map']['unmatched_by_extension'], sort_keys=True)}")
with open(OUT_TXT, 'w') as f:
    f.write('\n'.join(lines)+'\n')
print(OUT_JSON)
print(OUT_TXT)
