# LawModel1 Governance / Gems / Chain-of-Custody Audit

Generated: 2026-05-10 14:28:24 CDT
Scope: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1
Boundary: no intentional access outside /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER

## Skills / rules loaded

- lawmodel1-governance
- lawmodel1-gems
- pipeline-skill-tooling-limitations-v2
- pipeline-artifact-path-resolution-all-hierarchies
- lawmodel1-governance references/stale-path-migration.md
- lawmodel1-governance references/home-directory-artifact-relocation.md

## Actions completed

| Item | Result |
|---|---|
| Removed LawModel1 home-directory references | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/lawmodel1.code-workspace no longer references /Users/iseepatterns-ms-m4 |
| Updated active script output path | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/analyze_accountant_patterns.py now writes to /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/accountant_pattern_report.md |
| Updated mappable stale MBOX report paths | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/email_reconnect/mbox_locker_index_schema_summary.json MBOX source_path values now point to the Locker paths where files exist |
| Updated non-lawmodel1 database script DB output paths found during whole-Locker check | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/databases/scripts/build_smoking_gun_db.py, build_leonard_mayersky_db.py, clean_email_bodies.py, clean_email_bodies_v2.py now point DB_PATH/database lists inside /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/databases |
| Removed whole-Locker workspace external folder entries | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/ISEEPATTERNS_LOCKER.code-workspace now contains only the Locker root folder |

## Verification results

| Check | Result |
|---|---:|
| /Users/iseepatterns-ms-m4 references inside lawmodel1 | 0 |
| ../../../../Users/iseepatterns-ms-m4 references inside lawmodel1 | 0 |
| batdrivetb5 references inside lawmodel1 | 7 |
| AI_TRAINING references inside lawmodel1 | 3 |
| /Users/iseepatterns-ms-m4 references in whole Locker after fixes | 339 |

## Remaining LawModel1 stale references requiring source-path decision

| Path | Count | Notes |
|---|---:|---|
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/parse_vault_xml_full.py | 4 batdrivetb5 | References old GDRIVE_LOCKER XML paths. /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/GDRIVE_LOCKER was checked and was not found, so these were not rewritten. |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/email_reconnect/mbox_locker_index_schema_summary.json | 3 batdrivetb5 / 3 AI_TRAINING | Remaining entries are IMESSAGE_LOCKER database paths. The mapped Locker filenames were searched and were not found, so these were not rewritten. |

## Gem registry audit

Registry path: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/gems/registry.json
Registered gems found: 8

| Gem | Missing referenced components |
|---|---|
| gem-imessages | data/jz_lg_imessage_logs_all_numbered.csv; data/IMESSAGE_LOCKER/Attachments; scripts/extract_gaslighting_patterns.py |
| gem-gmail | data/ROWBOAT_CREATIVE_LOCKER/2024-06-22-all-metadata.csv; scripts/update_mbox_labels.py; scripts/search_emails.py; scripts/export_evidence_chain.py; app/app/api/emails/; app/app/emails/ |
| gem-financial-txns | data/AMAZON_LOCKER/; data/OWNER_CASH_INFUSION_LOCKER/ |
| gem-tax-returns | app/app/api/taxes/; app/app/taxes/ |
| gem-evidence-hub | scripts/rebuild_hub_index.py; scripts/check_hub_provenance.py; app/app/dashboard/ |
| gem-paralegal-exports | scripts/generate_agency_letters.py; scripts/generate_binder_index.py |
| gem-ready-bag | 0 missing reported |
| gem-qb-forensic | qbo-acct/; qb_forensic.db; app/app/api/financials/ view=qb_forensic |

Dependency IDs referenced but not registered as gems:
- gem-chain-of-custody
- gem-evidence-cards
- gem-players

Gem-like components found but not registered as exact gem IDs:
- players
- chain-of-custody / coc
- legal-docs
- rag-search / search
- transcripts
- evidence-cards
- calendar
- communications / conversations
- workbench
- briefing
- case-corner
- correlator
- timeline
- exports

## Chain-of-custody / transparency audit

| Control | Observed result |
|---|---|
| Chain-of-custody architecture doc | Present: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/docs/chain_of_custody_architecture.md |
| FIA procedure doc | Present: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/docs/forensic_integrity_audit.md |
| MBOX chain_of_custody schema | Present: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/schemas/mbox_metadata.sql |
| mbox_metadata.db chain_of_custody rows | 48 rows; all reported with 64-character sha256 |
| mbox_index.db chain_of_custody rows | 226 rows; all reported with 64-character sha256 |
| evidence_hub.db evidence rows | 1,000,995 rows |
| evidence_hub.db evidence_origins rows | 96 rows with source_file, source_rowid, card_file |
| evidence_hub.db hash fields | No hash/sha columns reported in evidence_hub.db schema |
| canonical workbench audit tables | master_audit_log 6,757 rows; forensic_audits 5 rows; cleaning_overrides 0; coc_notes_audit 0; workbench_audit 0 |
| required table name audit_log | Not found in canonical workbench.db; audit-like records are in master_audit_log |
| statement_files hash metadata | 214 rows with sha256_hash and size_bytes fields |
| attorney package manifest | /exports/attorney_package/manifest.json reports 152,205 file hashes |
| tax production manifest | 21 CSV/JSON items with sha256 fields |
| ReadyBag CSVs | 4,532 data rows counted in each of two manifests after stripping NUL bytes; README states 4,522 instances |

## Whole-Locker home-reference status

After code/config fixes, /Users/iseepatterns-ms-m4 still appears 339 times in the Locker. Current counted sources:

| Area | Count |
|---|---:|
| lawmodel1-cluster launchd plists | 10 |
| lawmodel1-cluster caddy access log | 42 |
| relocated-from-home relocation manifest / reference report / relocated scripts / logs | 287 |

Relocation manifests and logs preserve historical provenance and were not rewritten. The two launchd plists reference missing home-bin scripts and home log paths; no replacement path was found under the Locker during this audit.

## Transparency note

The delegated audit workers were instructed to stay inside /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER and not modify files. One delegated gem-registry worker reported using terminal workdir /Users/iseepatterns-ms-m4 while only reading absolute paths inside the Locker. This is recorded here for transparency.

## Files modified during this audit

- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/lawmodel1.code-workspace
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/analyze_accountant_patterns.py
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/email_reconnect/mbox_locker_index_schema_summary.json
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/ISEEPATTERNS_LOCKER.code-workspace
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/databases/scripts/build_smoking_gun_db.py
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/databases/scripts/build_leonard_mayersky_db.py
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/databases/scripts/clean_email_bodies.py
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/databases/scripts/clean_email_bodies_v2.py

## Open items requiring Joseph authorization or source decision

1. Determine replacement source for old GDRIVE_LOCKER XML paths in /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/parse_vault_xml_full.py.
2. Determine replacement source for old IMESSAGE_LOCKER DB paths remaining in /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/email_reconnect/mbox_locker_index_schema_summary.json.
3. Decide whether to preserve, relocate, or rewrite lawmodel1-cluster launchd plist references to /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/_relocated_from_home/2026-05-10_14-40-11_launchd_folders/bin and /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/_relocated_from_home/2026-05-10_14-40-11_launchd_folders/Logs.
4. Register or intentionally retire the unregistered gem dependency IDs: gem-chain-of-custody, gem-evidence-cards, gem-players.
5. Add or alias an audit_log table in canonical workbench.db if the governance requirement must match the exact table name rather than master_audit_log.
6. Reconcile evidence_hub provenance coverage: evidence_origins has 96 rows against 1,000,995 evidence rows.
7. Reconcile ReadyBag count mismatch: CSV row count 4,532 versus README count 4,522.
