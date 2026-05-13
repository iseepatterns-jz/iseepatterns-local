#!/usr/bin/env python3
import json
import shutil
from pathlib import Path
from datetime import datetime, timezone

PIPELINE_ROOT = Path('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline')
STATE_PATH = PIPELINE_ROOT / 'pipeline-state.json'
OUTPUT_PATH = PIPELINE_ROOT / 'artifacts/03-email-attorney/2026-05-06T04-24-18.166736Z_EXH-0507_email_synthesis.md'
SOURCE_REL = 'artifacts/02-email-paralegal/2026-05-06T04-24-18.166736Z_EXH-0507_email_analysis.md'
OUTPUT_REL = 'artifacts/03-email-attorney/2026-05-06T04-24-18.166736Z_EXH-0507_email_synthesis.md'
ITEM_ID = '2026-05-06T04-24-18.166736Z_EXH-0507'
EXHIBIT_ID = 'EXH-0507'
PROCESSED_BY = 'email_attorney_worker'
DB_SOURCE = 'mayersky_smoking_gun / 229'
TAGS = ['BANK_FRAUD_TRANSFERS']

def iso_now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

now = iso_now()
artifact = f"""# Stage 03E Attorney Synthesis — Email

| Field | Value |
|---|---|
| item_id | {ITEM_ID} |
| exhibit_id | {EXHIBIT_ID} |
| source paralegal artifact path | {SOURCE_REL} |
| generated timestamp | {now} |
| processed_by | {PROCESSED_BY} |

## 1. Source and procedural posture

- This Stage 03E synthesis is based on the Stage 02 paralegal analysis for item `{ITEM_ID}` / exhibit `{EXHIBIT_ID}`, source type EMAIL, source database / DB row ID `mayersky_smoking_gun / 229`, with source paralegal artifact path `{SOURCE_REL}`.
- The canonical queue source path identified by Stage 02 was `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`, and Stage 02 reported that path was missing when checked on 2026-05-11.
- The relocated derivative reviewed by Stage 02 was `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.
- The derivative source path inside the reviewed file was `LG-and-Leonard-Mayersky-communicate-corporate-email-servers-no-JZ/2021-03-24 09_37_57__Mayersky, Leonard_ _Leonard.Mayersky@53.com__Last c.eml`.
- Stage 02 identified EXH-0507 as a single direct message with no forwarded-message headers, no quoted prior thread, and `IN-REPLY-TO: N/A`, based on `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.

## 2. Potential legal issue mapping

- Merchant/payment-processing offer communications: the body states, `The first quarter offer is expiring soon at the end of March, $1,000 credit at closing and you have a high volume 😃`, and asks recipients to connect with Charlie, with Charlie Balazs at `Charlie.Balazs@fisglobal.com` copied in the metadata. Source: `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.
- Participant identification and third-party relationship mapping: the sender metadata identifies Leonard Mayersky at `Leonard.Mayersky@53.com`; the raw-body signature block identifies `Len Mayersky` as `Vice President | Business Banking` with `Fifth Third Bank`; and the copied recipient uses the `fisglobal.com` domain. Source: `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.
- Evidence provenance and duplicate-source handling: Stage 02 reported the canonical EMAILS_LOCKER path missing, a relocated derivative reviewed, and MBOX metadata matches to rows 200652 and 401799 in `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db` for stripped Message-ID `DM6PR19MB29869CCD40F1C8112FF59471E1639@DM6PR19MB2986.namprd19.prod.outlook.com`.
- Recipient-label consistency: the source subdirectory contains `no-JZ`, while the metadata lists Joe Zangrilli at `joe@rowboatcreative.com` as a direct `TO` recipient and marks `JZ_CCED: YES`. Source: `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.
- No Delaware LLC Act, FRCP, FRE, or federal statutory issue is independently mapped from EXH-0507 because the Stage 02 analysis reports email metadata, provenance details, participant identities, and offer-language excerpts, but does not identify an LLC governance act, federal procedural event, evidentiary ruling, or federal statutory reference in the message body.

## 3. Evidence references

| Reference | Source-supported details |
|---|---|
| Exhibit | `{EXHIBIT_ID}` / item `{ITEM_ID}`. |
| Reviewed derivative file | `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`. |
| Missing canonical queue source path | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`, reported missing by Stage 02 when checked on 2026-05-11. |
| Source database and row | `mayersky_smoking_gun / 229`. |
| Source path inside derivative | `LG-and-Leonard-Mayersky-communicate-corporate-email-servers-no-JZ/2021-03-24 09_37_57__Mayersky, Leonard_ _Leonard.Mayersky@53.com__Last c.eml`. |
| Date sent | `2021-03-24T14:37:48+00:00`. |
| Message-ID | `<DM6PR19MB29869CCD40F1C8112FF59471E1639@DM6PR19MB2986.namprd19.prod.outlook.com>`. |
| Sender | `Mayersky, Leonard <Leonard.Mayersky@53.com>`. |
| Recipients | `Joe Zangrilli <joe@rowboatcreative.com>` and `lucas@rowboatcreative.com <lucas@rowboatcreative.com>`. |
| CC | `Balazs, Charlie <Charlie.Balazs@fisglobal.com>`. |
| Subject | `Last call!`. |
| Greeting quote | `Good morning Gents,` from `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`. |
| Offer-language quote | `The first quarter offer is expiring soon at the end of March, $1,000 credit at closing and you have a high volume 😃` from `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`. |
| Request quote | `Please connect with Charlie as soon as you can.` from `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`. |
| Closing/sign-off quotes | `Thanks guys!` and `King Len` from `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`. |
| Signature-block quotes | `Len Mayersky\nVice President | Business Banking` and `Fifth Third Bank  |  3959 N Lincoln Ave  |  MD G24371  |  Chicago, IL  60613` from `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`. |
| Confidentiality-notice quote | `This e-mail transmission contains information that is confidential and may be privileged.` from `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`. |
| MBOX reconnect | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db`, table `emails`, rows 200652 and 401799, both matching the stripped Message-ID and showing `labels_raw=^INBOX,^OPENED`, `is_draft=0`, and `mbox_source=2024-06-22-all--joe@rowboatcreative.com-9vjjwt.mbox`. |

## 4. Claims/topics tags

- `BANK_FRAUD_TRANSFERS` — copied from Stage 02 priority/tags and inbox notes for EXH-0507.
- `merchant/payment-processing offer language` — normalized from Stage 02 issue spotting concerning the `$1,000 credit at closing`, `first quarter offer`, and `high volume` language.
- `Fifth Third Bank` — normalized from Stage 02 sender/signature-block identification.
- `FIS/Worldpay participant identification` — normalized from Stage 02 references to Charlie Balazs at `Charlie.Balazs@fisglobal.com` and related EXH-0505/EXH-0506/EXH-0508/EXH-0509–EXH-0524 family context.
- `source provenance` — normalized from Stage 02 notes concerning the missing canonical path, relocated derivative, and MBOX reconnect.
- `recipient metadata` — normalized from Stage 02 notes concerning `no-JZ`, Joe Zangrilli as direct `TO`, and `JZ_CCED: YES`.

## 5. Follow-up items

1. Identify the proposal, offer sheet, agreement, application, account, merchant-services arrangement, or closing document tied to the phrase `$1,000 credit at closing`, because Stage 02 reported that EXH-0507 does not identify the specific agreement, account, application, product, or merchant-services arrangement. Source reviewed: `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.
2. Determine what `high volume` refers to, because Stage 02 reported that EXH-0507 does not quantify whether the phrase concerns card transactions, merchant-processing volume, bank-account activity, sales volume, or another metric. Source reviewed: `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.
3. Locate records identifying Charlie Balazs's title, employer, and role in the offer or closing process, because Stage 02 identified only the copied `fisglobal.com` email address in EXH-0507. Source reviewed: `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.
4. Check whether the original `.eml`, MBOX records, or related exhibit family include attachments, embedded images, proposal PDFs, fee schedules, or closing documents for this offer, because Stage 02 reported no offer-document attachments in the derivative and noted `[cid:image001.png@01D72091.58C7B9F0]` in the raw body. Source reviewed: `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.
5. Determine when and why `EXH-0507_MSG_229_2021-03-24.txt` was relocated from `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER/` to `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/`, because Stage 02 reported the canonical path missing and the relocated derivative reviewed.
6. Reconcile the `no-JZ` subdirectory label with Joe Zangrilli appearing as a direct `TO` recipient and `JZ_CCED: YES`, and compare related copies in the same family for the same label/recipient mismatch. Source reviewed: `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`.
7. Determine whether MBOX rows 200652 and 401799 in `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db` represent duplicate mailbox copies, different Gmail export records, or another duplication pattern.
8. Cross-reference EXH-0505, EXH-0506, EXH-0508, and EXH-0509–EXH-0524 to identify any written offer terms, response messages, or continuation correspondence referenced by Stage 02 pipeline context.

## 6. Attorney synthesis notes

EXH-0507 is a March 24, 2021 email from Leonard Mayersky at `Leonard.Mayersky@53.com` to Joe Zangrilli at `joe@rowboatcreative.com` and Lucas Guariglia at `lucas@rowboatcreative.com`, with Charlie Balazs at `Charlie.Balazs@fisglobal.com` copied, according to the relocated derivative at `/Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt`. The body states that a first-quarter offer was expiring at the end of March, references a `$1,000 credit at closing` and `high volume`, and asks the recipients to connect with Charlie as soon as they can. The raw body includes Mayersky's `King Len` sign-off and a Fifth Third Bank signature block identifying him as Vice President, Business Banking. The derivative's subdirectory contains `no-JZ`, while the same metadata lists Joe Zangrilli as a direct recipient and marks `JZ_CCED: YES`. The canonical queue source file at `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER/EXH-0507_MSG_229_2021-03-24.txt` was missing when checked by Stage 02, so this synthesis identifies the relocated derivative and the MBOX reconnect to rows 200652 and 401799 in `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db` as the source references reported by Stage 02.
"""

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH.write_text(artifact, encoding='utf-8')

if not STATE_PATH.exists():
    raise FileNotFoundError(f'State file not found: {STATE_PATH}')
backup_path = STATE_PATH.with_name(STATE_PATH.name + f'.{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")}.bak')
shutil.copy2(STATE_PATH, backup_path)

with STATE_PATH.open('r', encoding='utf-8') as f:
    state = json.load(f)

stage_key = '03-email-attorney'
stages = state.setdefault('stages', {})
stage = stages.setdefault(stage_key, {})
items = stage.setdefault('items', [])
if not isinstance(items, list):
    raise TypeError("stages['03-email-attorney']['items'] is not a list")

entry = {
    'item_id': ITEM_ID,
    'exhibit_id': EXHIBIT_ID,
    'pipeline_stage': stage_key,
    'source_type': 'email',
    'status': 'completed',
    'completed_at': now,
    'processed_at': now,
    'artifact_path': OUTPUT_REL,
    'source_path': SOURCE_REL,
    'paralegal_artifact': SOURCE_REL,
    'processed_by': PROCESSED_BY,
    'db_source': DB_SOURCE,
    'tags': TAGS,
}

updated_existing = False
for i, item in enumerate(items):
    if isinstance(item, dict) and item.get('item_id') == ITEM_ID:
        merged = dict(item)
        merged.update(entry)
        items[i] = merged
        updated_existing = True
        break
if not updated_existing:
    items.append(entry)

state['updated_at'] = now

with STATE_PATH.open('w', encoding='utf-8') as f:
    json.dump(state, f, indent=2, ensure_ascii=False)
    f.write('\n')

# Verification
with STATE_PATH.open('r', encoding='utf-8') as f:
    verify_state = json.load(f)
verify_items = verify_state.get('stages', {}).get(stage_key, {}).get('items', [])
verify_entry = None
for item in verify_items:
    if isinstance(item, dict) and item.get('item_id') == ITEM_ID:
        verify_entry = item
        break
required = {
    'item_id': ITEM_ID,
    'exhibit_id': EXHIBIT_ID,
    'pipeline_stage': stage_key,
    'source_type': 'email',
    'status': 'completed',
    'artifact_path': OUTPUT_REL,
    'source_path': SOURCE_REL,
    'paralegal_artifact': SOURCE_REL,
    'processed_by': PROCESSED_BY,
}
missing_or_wrong = []
if verify_entry is None:
    missing_or_wrong.append('state entry missing')
else:
    for k, v in required.items():
        if verify_entry.get(k) != v:
            missing_or_wrong.append(f'{k}={verify_entry.get(k)!r} expected {v!r}')
    for k in ('completed_at', 'processed_at'):
        if not verify_entry.get(k):
            missing_or_wrong.append(f'{k} missing')
if not OUTPUT_PATH.exists() or OUTPUT_PATH.stat().st_size == 0:
    missing_or_wrong.append('artifact missing or empty')
if missing_or_wrong:
    raise RuntimeError('Verification failed: ' + '; '.join(missing_or_wrong))

print(json.dumps({
    'artifact_path': str(OUTPUT_PATH),
    'artifact_bytes': OUTPUT_PATH.stat().st_size,
    'state_path': str(STATE_PATH),
    'backup_path': str(backup_path),
    'state_updated': True,
    'updated_existing_entry': updated_existing,
    'item_id': ITEM_ID,
    'completed_at': now,
    'verification': 'artifact exists and state entry contains required completed fields',
}, indent=2, ensure_ascii=False))
