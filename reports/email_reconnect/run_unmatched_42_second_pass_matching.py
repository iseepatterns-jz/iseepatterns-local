#!/usr/bin/env python3
"""Second-pass EMAILS_LOCKER unmatched matching against MBOX/Gmail metadata.
Writes derived CSV/MD reports only; does not modify evidence inputs.
"""
import csv, os, re, sqlite3, json
from collections import Counter, defaultdict
from datetime import datetime
from email.utils import parsedate_to_datetime

REPORT_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/email_reconnect"
DRAFT_CSV = os.path.join(REPORT_DIR, "unmatched_42_draft_metadata_check.csv")
MAP_CSV = os.path.join(REPORT_DIR, "emails_locker_to_mbox_metadata_message_id_map.csv")
SRC1 = "/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER"
SRC2 = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER"
MBOX_DB = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db"
GMAIL_DB = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/gmail_master_index.db"
OUT_CSV = os.path.join(REPORT_DIR, "unmatched_42_second_pass_matching.csv")
OUT_MD = os.path.join(REPORT_DIR, "unmatched_42_second_pass_matching.md")
SCRIPT_PATH = os.path.abspath(__file__)

HEADER_KEYS = {
    'EXHIBIT':'exhibit','SOURCE DATABASE':'source_database','DB ROW ID':'db_row_id','SOURCE PATH':'source_path',
    'MESSAGE-ID':'message_id','DATE':'date','FROM':'from','TO':'to','CC':'cc','SUBJECT':'subject','SUBDIRECTORY':'subdirectory'
}

def norm_space(s): return re.sub(r'\s+', ' ', (s or '')).strip()
def norm_text(s): return norm_space((s or '').replace('\ufb01','fi').replace('\ufb02','fl'))
def emails(s): return sorted(set(e.lower() for e in re.findall(r'[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}', s or '', re.I)))
def source_type(path):
    ext=os.path.splitext(path or '')[1].lower().lstrip('.')
    return ext or 'no_extension'

def date_day(s):
    s=(s or '').strip()
    if not s or s.upper()=='N/A': return ''
    for fmt in ['%Y-%m-%dT%H:%M:%S%z','%Y-%m-%dT%H:%M:%S.%fZ','%Y-%m-%dT%H:%M:%S%z','%Y-%m-%d']:
        try: return datetime.strptime(s.replace('Z','+0000'), fmt).strftime('%Y-%m-%d')
        except Exception: pass
    try: return parsedate_to_datetime(s).strftime('%Y-%m-%d')
    except Exception: pass
    m=re.search(r'(20\d\d)[-_ ]?(\d\d)[-_ ]?(\d\d)', s)
    if m: return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return ''

def path_date(path):
    b=os.path.basename(path or '')
    m=re.search(r'(20\d\d)[-_ ](\d\d)[-_ ](\d\d)', b)
    if m: return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m=re.search(r'(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)', b)
    if m:
        yy=int(m.group(3)); y=2000+yy
        return f"{y:04d}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    return ''

def parse_source_file(path):
    data={k:'' for k in HEADER_KEYS.values()}
    clean_lines=[]; raw_lines=[]; section=None
    if not path or not os.path.exists(path):
        data['parse_error']='source_txt_not_found'; return data
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        lines=f.read().splitlines()
    for line in lines:
        if line.strip() == '--- BODY (CLEAN) ---': section='clean'; continue
        if line.strip() == '--- RAW BODY ---': section='raw'; continue
        if section=='clean': clean_lines.append(line); continue
        if section=='raw': raw_lines.append(line); continue
        if line.startswith('EXHIBIT '): data['exhibit']=line.split(None,1)[1].strip(); continue
        for label,key in HEADER_KEYS.items():
            pref=label+':'
            if line.startswith(pref): data[key]=line[len(pref):].strip(); break
    body_clean='\n'.join(clean_lines).strip()
    body_raw='\n'.join(raw_lines).strip()
    data['body_clean_snippet']=norm_space(body_clean[:500])
    data['body_raw_snippet']=norm_space(body_raw[:500])
    data['body_search_phrase']=pick_phrase(body_clean or body_raw)
    data['parse_error']=''
    return data

def pick_phrase(body):
    for line in (body or '').splitlines():
        t=norm_space(line)
        if len(t) >= 30 and not re.match(r'^\d+ of \d+', t) and 'confidential' not in t.lower():
            return t[:120]
    t=norm_space(body)
    return t[:120]

def subject_variants(s):
    s=norm_text(s)
    vals=[]
    def add(x):
        x=norm_text(x)
        if x and x.upper()!='N/A' and x not in vals: vals.append(x)
    add(s)
    add(re.split(r'From:', s, maxsplit=1, flags=re.I)[0])
    add(re.sub(r'^\[PDF\]\s*','',s,flags=re.I))
    add(re.sub(r'\.pdf$','',s,flags=re.I))
    # remove common OCR concatenation such as "2021From:" and spaced " From:"
    for v in list(vals):
        add(re.split(r'From\s*:', v, maxsplit=1, flags=re.I)[0])
    return vals[:5]

def fts_query_phrase(s):
    toks=re.findall(r'[A-Za-z0-9]{3,}', s or '')[:12]
    if len(toks)<3: return ''
    return ' '.join(toks)

def read_unmatched():
    # use draft as authoritative 42 if present; fallback to map rows with match_count=0
    with open(DRAFT_CSV, newline='', encoding='utf-8-sig') as f:
        rows=list(csv.DictReader(f))
    if len(rows)==42: return rows, DRAFT_CSV
    with open(MAP_CSV, newline='', encoding='utf-8-sig') as f:
        rows=[r for r in csv.DictReader(f) if str(r.get('match_count',''))=='0']
    return rows, MAP_CSV

MBOX_FIELDS = "id,rfc822_id,gmail_id,filename,account,from_addr,to_addr,cc_addr,subject,date_sent,locker_source,zip_source,mbox_source,substr(body_single,1,250) as snippet"
GMAIL_FIELDS = "id,message_id,zip_file,mbox_name,email_account,from_addr,to_addr,cc_addr,subject,date,labels,substr(body_snippet,1,250) as snippet"

def dict_rows(cur): return [dict(r) for r in cur.fetchall()]

def add_candidate(cands, db, method, row, evidence):
    rid=f"{db}:{row.get('id')}"
    if rid not in cands:
        cands[rid]={'target_db':db,'method_hits':[], 'row':row, 'evidence':[]}
    cands[rid]['method_hits'].append(method)
    if evidence: cands[rid]['evidence'].append(evidence)

def query_candidates(mcon, gcon, meta):
    cands={}
    sp=meta.get('source_path','') or ''
    base=os.path.basename(sp)
    stem=os.path.splitext(base)[0]
    msg=meta.get('message_id','')
    if msg and msg.upper()!='N/A':
        for r in dict_rows(mcon.execute(f"select {MBOX_FIELDS} from emails where rfc822_id=? limit 20", (msg.strip('<>'),))):
            add_candidate(cands,'mbox_metadata.db','message_id',r,'rfc822_id equals EMAILS_LOCKER MESSAGE-ID')
        for r in dict_rows(gcon.execute(f"select {GMAIL_FIELDS} from emails where message_id in (?,?) limit 20", (msg, '<'+msg.strip('<>')+'>'))):
            add_candidate(cands,'gmail_master_index.db','message_id',r,'message_id equals EMAILS_LOCKER MESSAGE-ID')
    # exact basename/source-path in available path/file fields
    if base:
        like='%'+base+'%'
        for r in dict_rows(mcon.execute(f"select {MBOX_FIELDS} from emails where filename=? or zip_source like ? or mbox_source like ? limit 20", (base, like, like))):
            add_candidate(cands,'mbox_metadata.db','filename/source_path',r,f'filename/zip_source/mbox_source contains basename {base}')
        for r in dict_rows(gcon.execute(f"select {GMAIL_FIELDS} from emails where zip_file like ? or mbox_name like ? limit 20", (like, like))):
            add_candidate(cands,'gmail_master_index.db','filename/source_path',r,f'zip_file/mbox_name contains basename {base}')
    day=date_day(meta.get('date')) or path_date(sp)
    src_emails=set(emails(' '.join([meta.get('from',''),meta.get('to',''),meta.get('cc','')])))
    for subj in subject_variants(meta.get('subject','')):
        # exact subject
        for r in dict_rows(mcon.execute(f"select {MBOX_FIELDS} from emails where subject=? collate nocase limit 50", (subj,))):
            add_candidate(cands,'mbox_metadata.db','exact_subject',r,f'exact subject: {subj}')
        for r in dict_rows(gcon.execute(f"select {GMAIL_FIELDS} from emails where subject=? collate nocase limit 50", (subj,))):
            add_candidate(cands,'gmail_master_index.db','exact_subject',r,f'exact subject: {subj}')
        q=fts_query_phrase(subj)
        if q:
            try:
                for r in dict_rows(mcon.execute(f"select {MBOX_FIELDS} from emails join emails_fts on emails_fts.rowid=emails.id where emails_fts match ? limit 25", (q,))):
                    add_candidate(cands,'mbox_metadata.db','subject_fts',r,f'FTS subject/body terms from subject: {q}')
            except Exception: pass
            try:
                for r in dict_rows(gcon.execute(f"select {GMAIL_FIELDS} from emails join emails_fts on emails_fts.rowid=emails.id where emails_fts match ? limit 25", (q,))):
                    add_candidate(cands,'gmail_master_index.db','subject_fts',r,f'FTS subject/snippet terms from subject: {q}')
            except Exception: pass
    phrase=meta.get('body_search_phrase') or ''
    q=fts_query_phrase(phrase)
    if q:
        try:
            for r in dict_rows(mcon.execute(f"select {MBOX_FIELDS} from emails join emails_fts on emails_fts.rowid=emails.id where emails_fts match ? limit 25", (q,))):
                add_candidate(cands,'mbox_metadata.db','body_fts',r,f'FTS terms from body phrase: {q}')
        except Exception: pass
        try:
            for r in dict_rows(gcon.execute(f"select {GMAIL_FIELDS} from emails join emails_fts on emails_fts.rowid=emails.id where emails_fts match ? limit 25", (q,))):
                add_candidate(cands,'gmail_master_index.db','body_fts',r,f'FTS terms from body phrase: {q}')
        except Exception: pass
    # score
    scored=[]
    for c in cands.values():
        r=c['row']; target_text=' '.join(str(r.get(k,'') or '') for k in r.keys())
        cand_day=date_day(r.get('date_sent') or r.get('date'))
        cand_emails=set(emails(' '.join(str(r.get(k,'') or '') for k in ['from_addr','to_addr','cc_addr','account','email_account'])))
        exact_source='filename/source_path' in c['method_hits']
        subj_exact='exact_subject' in c['method_hits']
        body='body_fts' in c['method_hits']
        date_match= bool(day and cand_day==day)
        addr_overlap= len(src_emails & cand_emails)
        score=0
        if 'message_id' in c['method_hits']: score+=100
        if exact_source: score+=80
        if subj_exact: score+=35
        if date_match: score+=25
        score+=min(addr_overlap,3)*12
        if body: score+=18
        if 'subject_fts' in c['method_hits']: score+=10
        category='possible body/subject match'
        if exact_source or 'message_id' in c['method_hits']:
            category='exact filename/source-path match' if exact_source else 'probable metadata match'
        elif subj_exact and (date_match or addr_overlap):
            category='probable metadata match'
        elif body or 'subject_fts' in c['method_hits'] or subj_exact:
            category='possible body/subject match'
        c.update({'score':score,'date_match':date_match,'addr_overlap':addr_overlap,'candidate_day':cand_day,'match_category':category})
        scored.append(c)
    scored.sort(key=lambda x:(x['score'], x['target_db']=='mbox_metadata.db'), reverse=True)
    return scored

def main():
    input_rows, input_source = read_unmatched()
    mcon=sqlite3.connect(f'file:{MBOX_DB}?mode=ro', uri=True); mcon.row_factory=sqlite3.Row
    gcon=sqlite3.connect(f'file:{GMAIL_DB}?mode=ro', uri=True); gcon.row_factory=sqlite3.Row
    out=[]
    for r in input_rows:
        fn=r.get('filename') or ''
        p1=os.path.join(SRC1, fn); p2=os.path.join(SRC2, fn)
        source_txt=p1 if os.path.exists(p1) else (p2 if os.path.exists(p2) else '')
        meta=parse_source_file(source_txt)
        # fill from CSV if parse absent
        for k in ['source_db','db_row_id','source_path','message_id','date','subject','subdirectory']:
            mk='source_database' if k=='source_db' else k
            if not meta.get(mk): meta[mk]=r.get(k,'')
        cands=query_candidates(mcon,gcon,meta)
        best=cands[0] if cands else None
        if best is None:
            category='no match found'; target_db=''; target_id=''; target_message_id=''; target_subject=''; target_date=''; target_from=''; target_to=''; target_cc=''; target_source=''; reason='No message-id, filename/source path, subject/date/address, or body/snippet candidate found in queried fields.'; evidence=''
        else:
            br=best['row']; category=best['match_category']; target_db=best['target_db']; target_id=str(br.get('id',''))
            target_message_id=br.get('rfc822_id') or br.get('message_id') or ''
            target_subject=br.get('subject') or ''; target_date=br.get('date_sent') or br.get('date') or ''
            target_from=br.get('from_addr') or ''; target_to=br.get('to_addr') or ''; target_cc=br.get('cc_addr') or ''
            target_source='; '.join(str(br.get(k,'') or '') for k in ['filename','zip_source','mbox_source','zip_file','mbox_name'] if br.get(k))
            reason=f"methods={'+'.join(sorted(set(best['method_hits'])))}; score={best['score']}; date_match={best['date_match']}; address_overlap_count={best['addr_overlap']}"
            evidence=' | '.join(best['evidence'][:3])
        out.append({
            'filename':fn,'source_txt_path':source_txt,'exhibit':meta.get('exhibit',''),'source_database':meta.get('source_database',''),
            'db_row_id':meta.get('db_row_id',''),'source_path':meta.get('source_path',''),'source_type':source_type(meta.get('source_path','')),
            'message_id':meta.get('message_id',''),'date':meta.get('date',''),'date_day_used':date_day(meta.get('date')) or path_date(meta.get('source_path','')),
            'from':meta.get('from',''),'to':meta.get('to',''),'cc':meta.get('cc',''),'subject':meta.get('subject',''),
            'subdirectory':meta.get('subdirectory',''),'body_clean_snippet':meta.get('body_clean_snippet',''),'body_raw_snippet':meta.get('body_raw_snippet',''),
            'body_search_phrase':meta.get('body_search_phrase',''),'match_category':category,'target_db':target_db,'target_id':target_id,
            'target_message_id':target_message_id,'target_subject':target_subject,'target_date':target_date,'target_from':target_from,
            'target_to':target_to,'target_cc':target_cc,'target_source':target_source,'match_reason':reason,'match_evidence':evidence,
            'candidate_count':len(cands),'parse_error':meta.get('parse_error','')
        })
    fields=list(out[0].keys())
    with open(OUT_CSV,'w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(out)
    write_md(out, input_source)
    # verification to stdout
    print(json.dumps({
        'input_rows':len(input_rows),'output_rows':len(out),'csv':OUT_CSV,'md':OUT_MD,'script':SCRIPT_PATH,
        'source_type_counts':Counter(x['source_type'] for x in out),
        'match_category_counts':Counter(x['match_category'] for x in out),
        'target_db_counts':Counter(x['target_db'] or 'none' for x in out),
        'missing_source_txt':sum(1 for x in out if not x['source_txt_path'])
    }, indent=2, default=dict))

def write_md(out, input_source):
    c_source=Counter(x['source_type'] for x in out)
    c_cat=Counter(x['match_category'] for x in out)
    c_db=Counter(x['target_db'] or 'none' for x in out)
    c_reason=Counter((x['match_reason'].split(';')[0] if x['match_reason'] else 'none') for x in out)
    lines=[]
    lines.append('# Unmatched 42 EMAILS_LOCKER second-pass MBOX/Gmail metadata matching')
    lines.append('')
    lines.append(f'Input unmatched list: {input_source}')
    lines.append(f'EMAILS_LOCKER source metadata checked first: {SRC1}')
    lines.append(f'Alternate EMAILS_LOCKER metadata location: {SRC2}')
    lines.append(f'MBOX metadata DB queried read-only: {MBOX_DB}')
    lines.append(f'Gmail master index DB queried read-only: {GMAIL_DB}')
    lines.append(f'Derived CSV output: {OUT_CSV}')
    lines.append(f'Script path: {SCRIPT_PATH}')
    lines.append('')
    lines.append('Scope note: classifications are factual matching categories only; no legal significance is assessed.')
    lines.append('')
    lines.append('## Verification checks')
    lines.append(f'- Input records processed: {len(out)}')
    lines.append(f'- Output CSV rows written: {len(out)}')
    lines.append(f'- Source TXT files not found: {sum(1 for x in out if not x["source_txt_path"])}')
    lines.append(f'- Records with no candidate in target DBs: {sum(1 for x in out if x["match_category"]=="no match found")}')
    lines.append('')
    lines.append('## Counts by source type')
    for k,v in sorted(c_source.items()): lines.append(f'- {k}: {v}')
    lines.append('')
    lines.append('## Counts by match category')
    for k,v in sorted(c_cat.items()): lines.append(f'- {k}: {v}')
    lines.append('')
    lines.append('## Counts by target DB')
    for k,v in sorted(c_db.items()): lines.append(f'- {k}: {v}')
    lines.append('')
    lines.append('## Counts by reason prefix')
    for k,v in sorted(c_reason.items()): lines.append(f'- {k}: {v}')
    lines.append('')
    lines.append('## Record-level results')
    for x in out:
        lines.append('')
        lines.append(f'### {x["filename"]}')
        lines.append(f'- Source TXT: {x["source_txt_path"]}')
        lines.append(f'- Source path: {x["source_path"]}')
        lines.append(f'- Source database / row: {x["source_database"]} / {x["db_row_id"]}')
        lines.append(f'- Parsed headers: exhibit={x["exhibit"]}; message_id={x["message_id"]}; date={x["date"]}; from={x["from"]}; to={x["to"]}; cc={x["cc"]}; subject={x["subject"]}; subdirectory={x["subdirectory"]}')
        lines.append(f'- Body phrase used: {x["body_search_phrase"]}')
        lines.append(f'- Classification: {x["match_category"]}')
        lines.append(f'- Target DB / ID: {x["target_db"] or "N/A"} / {x["target_id"] or "N/A"}')
        lines.append(f'- Target message/date/from/to/cc/subject: {x["target_message_id"]}; {x["target_date"]}; {x["target_from"]}; {x["target_to"]}; {x["target_cc"]}; {x["target_subject"]}')
        lines.append(f'- Target source fields: {x["target_source"]}')
        lines.append(f'- Match reason: {x["match_reason"]}')
        lines.append(f'- Match evidence: {x["match_evidence"]}')
        lines.append(f'- Candidate count: {x["candidate_count"]}')
    with open(OUT_MD,'w',encoding='utf-8') as f: f.write('\n'.join(lines)+'\n')

if __name__=='__main__': main()
