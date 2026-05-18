# LawModel1 candidate_rewrite stale path dry-run rewrite map

Created UTC: 2026-05-12T00-44-00Z
Workspace: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER
LawModel1 root: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1
Dry run only: true
Original evidence files modified: false

## Source files
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T00-37-02Z_lawmodel1_stale_reference_triage_cleanup_queue.json sha256=377f14697968f038d863c9e7ecd74023dad4e655abb82823617d337c4e63c55f
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T00-37-02Z_lawmodel1_stale_reference_triage_cleanup_queue.md sha256=1871b24af0dc1f6a2f653a803edc51e95854c0898a9e0cea24cff2441e177ce6
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-12T00-37-02Z_lawmodel1_stale_reference_triage_cleanup_queue.cleanup_queue_sample.csv sha256=0130cdedc18111b71d1efbce8a4eac512d8e8b772a7839b37f156aa44f25beae
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-10_15-31-48_lawmodel1_bounded_duplicate_stale_audit.json sha256=b1ba749ecd756f8e4821322f8dd6275ac3236f35d44fce3e6e5e626a57c60741
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-10_15-31-48_lawmodel1_bounded_duplicate_stale_audit.md sha256=f5dc0316a7b73823c0abe7bdcf1dd7b02fd0cea443ecf27081cdd191d0d323a0

## Summary counts
- Rewrite rules total: 6
- Rewrite rules with candidate_rewrite hits: 4
- Candidate occurrences counted by rule: 5008724
- Candidate file-term pairs counted by rule: 2613624

## Counts by mapping status (occurrences)
- mapped_target_exists: 2537249
- mapped_target_missing: 2471470
- unresolved_no_controlled_mapping: 5

## Counts by proposed mapping (occurrences)
- /AI_TRAINING/ -> /ISEEPATTERNS_LOCKER/: 2471470
- /Users/iseepatterns-ms-m4 -> [unresolved]: 0
- /Volumes/2026-iseepatterns-tb3 -> [unresolved]: 3
- /Volumes/batdrivetb5 -> /Volumes/iseepatterns-evidence: 2537249
- /Volumes/iseepatterns-evidence/IGNORE -> [unresolved]: 0
- /Volumes/messageshd -> [unresolved]: 2

## Dry-run rewrite map
| mapping_key | old_path | proposed_new_path | affected_file_count | occurrence_count | target_existence_status | unresolved_mapping_reason | sample_affected_files |
| --- | --- | --- | --- | --- | --- | --- | --- |
| prefix:/Volumes/batdrivetb5 | /Volumes/batdrivetb5 | /Volumes/iseepatterns-evidence | 1339697 | 2537249 | exists_directory |  | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/parse_vault_xml_full.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_accounting_db.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_accountant_emails.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_side_business_emails.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_mbox_accounts.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_ashley_myles_db.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.github/workflows/notebooklm_deepdive.yml; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.agent/skills/lawmodel1-governance/SKILL.md; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.agent/skills/eml-to-court-pdf/scripts/eml_to_court_pdf.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/DRAWS_LOCKER/draws_emails_all.csv |
| segment:/AI_TRAINING/ | /AI_TRAINING/ | /ISEEPATTERNS_LOCKER/ | 1273923 | 2471470 | missing |  | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_accounting_db.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_accountant_emails.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_side_business_emails.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_mbox_accounts.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_ashley_myles_db.py; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.github/workflows/notebooklm_deepdive.yml; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/.agent/skills/lawmodel1-governance/SKILL.md; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/DRAWS_LOCKER/draws_emails_all.csv; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_cards/imsg_CHAT_DB_IMAC_109084.json; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_cards/imsg_CHAT_DB_IMAC_328114.json |
| unmapped:/Volumes/2026-iseepatterns-tb3 | /Volumes/2026-iseepatterns-tb3 |  | 3 | 3 | not_checked_unresolved_mapping | No controlled replacement supplied in task context for candidate_rewrite references. | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/app/app/api/legal/route.ts; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/app/app/api/legal/complaints/route.ts; /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/app/app/api/legal/document/route.ts |
| unmapped:/Volumes/messageshd | /Volumes/messageshd |  | 1 | 2 | not_checked_unresolved_mapping | No controlled replacement supplied in task context for candidate_rewrite references. | /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/imazing_forensic_audit.py |
| unmapped:/Users/iseepatterns-ms-m4 | /Users/iseepatterns-ms-m4 |  | 0 | 0 | not_checked_unresolved_mapping | No controlled replacement supplied in task context for candidate_rewrite references. |  |
| unmapped:/Volumes/iseepatterns-evidence/IGNORE | /Volumes/iseepatterns-evidence/IGNORE |  | 0 | 0 | not_checked_unresolved_mapping | No controlled replacement supplied in task context for candidate_rewrite references. |  |

## Sample line hits
### prefix:/Volumes/batdrivetb5
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/parse_vault_xml_full.py', 'line': 11, 'terms': ['/Volumes/batdrivetb5'], 'text': '"/Volumes/batdrivetb5/GDRIVE_LOCKER/2023-11-22_GDRIVE_LG_LOCKER/2023-11-22_GDRIVE_LG_ZIPPED/datach-metadata.xml",'}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/parse_vault_xml_full.py', 'line': 12, 'terms': ['/Volumes/batdrivetb5'], 'text': '"/Volumes/batdrivetb5/GDRIVE_LOCKER/2023-11-22_GDRIVE_LG_LOCKER/2023-11-22_GDRIVE_LG_ZIPPED/112223-metadata.xml",'}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_accounting_db.py', 'line': 13, 'terms': ['/Volumes/batdrivetb5'], 'text': "ZIP_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-4.zip'"}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_accounting_db.py', 'line': 15, 'terms': ['/Volumes/batdrivetb5'], 'text': "DB_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/accounting_all.db'"}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_accountant_emails.py', 'line': 5, 'terms': ['/Volumes/batdrivetb5'], 'text': "SOURCE_DB = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db'"}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_accountant_emails.py', 'line': 6, 'terms': ['/Volumes/batdrivetb5'], 'text': "TARGET_DB = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/accountant_correspondence.db'"}
### segment:/AI_TRAINING/
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_accounting_db.py', 'line': 13, 'terms': ['AI_TRAINING'], 'text': "ZIP_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/2024-06-22-all-4.zip'"}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/create_accounting_db.py', 'line': 15, 'terms': ['AI_TRAINING'], 'text': "DB_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/accounting_all.db'"}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_accountant_emails.py', 'line': 5, 'terms': ['AI_TRAINING'], 'text': "SOURCE_DB = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db'"}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_accountant_emails.py', 'line': 6, 'terms': ['AI_TRAINING'], 'text': "TARGET_DB = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/accountant_correspondence.db'"}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_side_business_emails.py', 'line': 8, 'terms': ['AI_TRAINING'], 'text': 'DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/side_business_correspondence.db"'}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/unused/extract_side_business_emails.py', 'line': 9, 'terms': ['AI_TRAINING'], 'text': 'MBOX_SUZANNE = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2023-06-08_GMAIL_MBOX_SG_LOCKER/2023-06-08_GMAIL_MBOX_SG_ZIPPED/sggmail--suzanne@rowboatcreative.com-YtFVqI.mbox"'}
### unmapped:/Volumes/2026-iseepatterns-tb3
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/app/app/api/legal/route.ts', 'line': 7, 'terms': ['/Volumes/2026-iseepatterns-tb3'], 'text': 'const COURT_ROOT = "/Volumes/2026-iseepatterns-tb3/COURT_LOCKER";'}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/app/app/api/legal/complaints/route.ts', 'line': 7, 'terms': ['/Volumes/2026-iseepatterns-tb3'], 'text': '"/Volumes/2026-iseepatterns-tb3/COURT_LOCKER/zDataStorage - Complaints.csv";'}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/app/app/api/legal/document/route.ts', 'line': 7, 'terms': ['/Volumes/2026-iseepatterns-tb3'], 'text': 'const COURT_ROOT = "/Volumes/2026-iseepatterns-tb3/COURT_LOCKER";'}
### unmapped:/Volumes/messageshd
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/imazing_forensic_audit.py', 'line': 16, 'terms': ['/Volumes/messageshd'], 'text': 'python3 imazing_forensic_audit.py /Volumes/messageshd/imazing-export-1/showgoat'}
- {'file': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/imazing_forensic_audit.py', 'line': 759, 'terms': ['/Volumes/messageshd'], 'text': 'help="Path to the iMazing raw export root directory (e.g., /Volumes/messageshd/imazing-export-1/showgoat)",'}
### unmapped:/Users/iseepatterns-ms-m4
- No line samples captured from sampled candidate files.
### unmapped:/Volumes/iseepatterns-evidence/IGNORE
- No line samples captured from sampled candidate files.
