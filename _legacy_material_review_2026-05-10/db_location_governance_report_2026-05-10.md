# LawModel1 DB Location Governance Report — 2026-05-10

## Legacy holding folder

`/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/_legacy_material_review_2026-05-10/`

Move manifest:

`/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/_legacy_material_review_2026-05-10/legacy_db_move_manifest_2026-05-10.json`

## Canonical DB locations retained in workspace

| Purpose | Canonical path | Source |
|---|---|---|
| Workbench / Rosetta Stone / financial review | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db` | `lawmodel1-governance`; `app/lib/db.ts:getWorkbenchDb()` |
| Evidence Hub | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_hub.db` | `lawmodel1-governance`; `app/lib/db.ts:getEvidenceHubDb()` |
| Email MBOX metadata | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db` | Email SSOT governance; `app/lib/db.ts:getCommDb()` |
| Email MBOX index / chain-of-custody utility | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_index.db` | Email SSOT governance; script references |

## Listed files moved to legacy folder

| Original path | Size bytes | Destination | SHA-256 |
|---|---:|---|---|
| `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/workbench.db` | 0 | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/_legacy_material_review_2026-05-10/data/workbench.db` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/rowboat-creative/RC-2026/db/evidence_hub.db` | 110592 | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/_legacy_material_review_2026-05-10/data/rowboat-creative/RC-2026/db/evidence_hub.db` | `58c9d01d07100bf981ed3bd280df2ac07762a2769183a0b42bd5491115aa2c4b` |
| `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/mbox_metadata.db` | 0 | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/_legacy_material_review_2026-05-10/data/mbox_metadata.db` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/rowboat-creative/RC-2026/db/mbox_metadata.db` | 0 | `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/_legacy_material_review_2026-05-10/data/rowboat-creative/RC-2026/db/mbox_metadata.db` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## Listed canonical files left in place

| Path | Size bytes | Status |
|---|---:|---|
| `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_hub.db` | 3799715840 | retained |
| `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db` | 859582464 | retained |
| `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db` | 10306514944 | retained |
| `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_index.db` | 126976 | retained |

## Additional stale candidate found but not moved

| Path | Reason not moved |
|---|---|
| `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/app/workbench.db` | Not in Joseph's listed paths. Targeted code search found one reference in `scripts/generate_paralegal_exports.py:35`; leave for separate cleanup decision. |

## Verification after move

The original paths for moved files are absent from the active workspace. The four canonical listed DBs remain present at their governance locations.
