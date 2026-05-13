# LawModel1 controlled stale-reference rewrite governance report

Created UTC: 2026-05-12T01-00-59Z
Workspace: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER
LawModel1 root: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1

## Approval scope
- Approved mapping 1: /Volumes/batdrivetb5 -> /Volumes/iseepatterns-evidence
- Approved mapping 2: /AI_TRAINING/ -> /ISEEPATTERNS_LOCKER/
- Do not modify original evidence files: true
- Leave preserve-classified references untouched: true
- Leave unresolved references untouched: true

## Input artifacts
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-10_15-31-48_lawmodel1_bounded_duplicate_stale_audit.json SHA-256: b1ba749ecd756f8e4821322f8dd6275ac3236f35d44fce3e6e5e626a57c60741
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T00-37-02Z_lawmodel1_stale_reference_triage_cleanup_queue.json SHA-256: 377f14697968f038d863c9e7ecd74023dad4e655abb82823617d337c4e63c55f
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T00-44-57Z_lawmodel1_candidate_rewrite_dry_run_map.json SHA-256: b9cddb84d307edd141132727d2851ffb5be956c63a98fef05d27ec67fb40a7fd

## Execution counts
- Candidate project-reference files considered: 9
- Files modified: 9
- Files skipped: 1491908
- Git status count before: 360
- Git status count after: 368
- Backup directory: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups
- Errors log: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_lawmodel1_controlled_stale_reference_rewrite.errors.log
- Error count: 0

## Approved mapping counts
| old | new | before_in_modified_files | after_in_modified_files | after_in_candidate_files |
| --- | --- | --- | --- | --- |
| /Volumes/batdrivetb5 | /Volumes/iseepatterns-evidence | 22 | 0 | 0 |
| /AI_TRAINING/ | /ISEEPATTERNS_LOCKER/ | 15 | 0 | 0 |

## Unresolved references in modified files
| term | before | after | after_in_candidate_files |
| --- | --- | --- | --- |
| /Volumes/2026-iseepatterns-tb3 | 0 | 0 | 0 |
| /Volumes/messageshd | 0 | 0 | 0 |
| /Users/iseepatterns-ms-m4 | 0 | 0 | 0 |
| /Volumes/iseepatterns-evidence/IGNORE | 0 | 0 | 0 |

## Skipped occurrence summary
| reason | occurrences |
| --- | --- |
| outside_project_reference_safe_scope_or_evidence_generated_archive_report_path | 5008682 |
| action_label=preserve | 463360 |

## Modified file manifest
| path | replaced_counts | before_sha256 | after_sha256 | backup_path |
| --- | --- | --- | --- | --- |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.agent/skills/eml-to-court-pdf/scripts/eml_to_court_pdf.py | {"/Volumes/batdrivetb5": 3, "/AI_TRAINING/": 0} | 943bcaf97b041e72ae126dacb521e008f9412097c3db7c6aa857c81fa9107df2 | 468b32aa14b4440f4d40029ef22c15fa2129f5f6c727a3b32fd8cb29cb692b60 | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups/.agent/skills/eml-to-court-pdf/scripts/eml_to_court_pdf.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.agent/skills/lawmodel1-governance/SKILL.md | {"/Volumes/batdrivetb5": 2, "/AI_TRAINING/": 2} | d3b45fc7effa03e2484ea176ef46360a8c5b94a14f1235993a7bfc21fc508844 | 5663016d48213a162ac4d4e20374e6cfa97e27fa01a85588b77747a50934da95 | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups/.agent/skills/lawmodel1-governance/SKILL.md |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.github/workflows/notebooklm_deepdive.yml | {"/Volumes/batdrivetb5": 3, "/AI_TRAINING/": 3} | fd1f4a436069d0f75b6dfecba65fd9ecb3fe07a368966fb546c0f6d94861cee5 | ff1b97718dd5c45fdadb0623ad68f4c727acab52dd1fe16f9ad8208b629651a7 | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups/.github/workflows/notebooklm_deepdive.yml |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/parse_vault_xml_full.py | {"/Volumes/batdrivetb5": 4, "/AI_TRAINING/": 0} | aa5c3ad33d7b0d0b85a6b48d9aa2a7e3457a511eddaf659b3d2d4ed58a1c339f | d0f02f4e8628d117d8cea2d81efc22aba6487cffecc842cc8bfd63f83b3fb417 | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups/scripts/parse_vault_xml_full.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_accounting_db.py | {"/Volumes/batdrivetb5": 2, "/AI_TRAINING/": 2} | 41a2ac98e144ade6004d4ccfd5a88ab872b18f38a49e1d31bcd0d3112b9318b7 | ca988024dcf5c854c7b9f2afba147377f052d737ac4b73d8df4d8f7240a8729b | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups/scripts/unused/create_accounting_db.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_ashley_myles_db.py | {"/Volumes/batdrivetb5": 2, "/AI_TRAINING/": 2} | 003c92490d4a3fc672786541a099d4eeb05ed8f4ca73965dfcf578fa733a2a71 | 50e6268bd27257b02ad7f18a98671886c336136fe40a95b0bac2a94adca39d61 | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups/scripts/unused/create_ashley_myles_db.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_accountant_emails.py | {"/Volumes/batdrivetb5": 2, "/AI_TRAINING/": 2} | c37e7d7fb5b738dab7c091e468109a6f7f98345973e904fc5780b62c2bc3cfa3 | dbe46f01ad0cbd5d3c1c178d2b484ad6856c17af468f46859687dde1c3ab1080 | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups/scripts/unused/extract_accountant_emails.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_mbox_accounts.py | {"/Volumes/batdrivetb5": 1, "/AI_TRAINING/": 1} | 96cc641a9dba31c94d027605d3a36161d1405832d73e0ae37860333cb18d4109 | 07dab25b872bb03ca9cd178b1a4a61e18c4853c1651de52ea7aaa81252f4ced7 | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups/scripts/unused/extract_mbox_accounts.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_side_business_emails.py | {"/Volumes/batdrivetb5": 3, "/AI_TRAINING/": 3} | 4f36c668a15a99179514beb367c8ce9f38b3daf28bb5652b4081a7a1c4cba302 | e8c87509e7106f71ed4b484090d13e0318531eea98aa77bd5bf61e9c95c56996 | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_controlled_stale_reference_rewrite_backups/scripts/unused/extract_side_business_emails.py |

## Syntax checks
| path | exit_code | command |
| --- | --- | --- |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.agent/skills/eml-to-court-pdf/scripts/eml_to_court_pdf.py | 0 | /Users/iseepatterns-ms-m4/.hermes/hermes-agent/venv/bin/python3 -m py_compile /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.agent/skills/eml-to-court-pdf/scripts/eml_to_court_pdf.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.agent/skills/lawmodel1-governance/SKILL.md | 0 | not_applicable |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.github/workflows/notebooklm_deepdive.yml | 0 | not_applicable |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/parse_vault_xml_full.py | 0 | /Users/iseepatterns-ms-m4/.hermes/hermes-agent/venv/bin/python3 -m py_compile /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/parse_vault_xml_full.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_accounting_db.py | 0 | /Users/iseepatterns-ms-m4/.hermes/hermes-agent/venv/bin/python3 -m py_compile /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_accounting_db.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_ashley_myles_db.py | 0 | /Users/iseepatterns-ms-m4/.hermes/hermes-agent/venv/bin/python3 -m py_compile /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_ashley_myles_db.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_accountant_emails.py | 0 | /Users/iseepatterns-ms-m4/.hermes/hermes-agent/venv/bin/python3 -m py_compile /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_accountant_emails.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_mbox_accounts.py | 0 | /Users/iseepatterns-ms-m4/.hermes/hermes-agent/venv/bin/python3 -m py_compile /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_mbox_accounts.py |
| /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_side_business_emails.py | 0 | /Users/iseepatterns-ms-m4/.hermes/hermes-agent/venv/bin/python3 -m py_compile /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_side_business_emails.py |

## Sidecars
- JSON sidecar: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_lawmodel1_controlled_stale_reference_rewrite.json
- CSV modified-file manifest: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_lawmodel1_controlled_stale_reference_rewrite.modified_files.csv
- Errors log: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T01-00-59Z_lawmodel1_controlled_stale_reference_rewrite.errors.log
