# LawModel1 Post-Rewrite Baseline Audit Supplement

Created UTC: 2026-05-12T01:11:45Z
Scope: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1
Modification statement: read-only audit interpretation; wrote only this supplement JSON/MD under reports/governance_audits.

## Source audit artifacts
- Raw audit MD: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-11_20-03-49_lawmodel1_bounded_duplicate_stale_audit.md
- Raw audit JSON: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/governance_audits/2026-05-11_20-03-49_lawmodel1_bounded_duplicate_stale_audit.json
- Raw audit JSON SHA-256: c926c7f3cddcab3c75f1b341788d7d1b76c2be31f4a66cc8dc1d2ded94d011e4

## Raw baseline counts
- scope: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1
- file_count: 1873168
- directory_count: 207854
- duplicate_filename_groups: 488602
- same_size_hash_candidates: 8000
- duplicate_content_hash_groups: 810
- stale_temp_archive_items: 565536
- external_reference_counts: {'/Users/iseepatterns-ms-m4': 111, '/Volumes/batdrivetb5': 2775047, 'AI_TRAINING': 2709094, '/Volumes/iseepatterns-evidence/IGNORE': 1915, '/Volumes/messageshd': 79, '/Volumes/2026-iseepatterns-tb3': 87}
- db_nonzero_duplicate_checks: 7
- registry_info: {'registered_ids': ['gem-imessages', 'gem-gmail', 'gem-financial-txns', 'gem-tax-returns', 'gem-evidence-hub', 'gem-paralegal-exports', 'gem-ready-bag', 'gem-qb-forensic'], 'unregistered_dependencies': ['gem-chain-of-custody', 'gem-evidence-cards', 'gem-players']}
- walk_errors: 0

## Classified external reference baseline
### /Users/iseepatterns-ms-m4
- total_occurrences: 111
- total_files: 22
- active_project_reference_candidate_occurrences: 0
- active_project_reference_candidate_files: 0
  - archive_historical: 2 occurrences across 1 files
  - audit_tool_instrumentation_literal: 9 occurrences across 5 files
  - governance_report_or_sidecar: 98 occurrences across 15 files
  - pipeline_artifacts: 2 occurrences across 1 files

### /Volumes/batdrivetb5
- total_occurrences: 2775047
- total_files: 1491932
- active_project_reference_candidate_occurrences: 0
- active_project_reference_candidate_files: 0
  - archive_historical: 112 occurrences across 20 files
  - audit_tool_instrumentation_literal: 10 occurrences across 4 files
  - data_historical_or_generated: 2537227 occurrences across 1339688 files
  - exports_generated: 231565 occurrences across 152196 files
  - governance_backup_artifact: 22 occurrences across 9 files
  - governance_report_or_sidecar: 6108 occurrences across 14 files
  - other: 3 occurrences across 1 files

### AI_TRAINING
- total_occurrences: 2709094
- total_files: 1426157
- active_project_reference_candidate_occurrences: 0
- active_project_reference_candidate_files: 0
  - archive_historical: 111 occurrences across 20 files
  - audit_tool_instrumentation_literal: 11 occurrences across 5 files
  - data_historical_or_generated: 2471455 occurrences across 1273916 files
  - exports_generated: 231561 occurrences across 152193 files
  - governance_backup_artifact: 15 occurrences across 7 files
  - governance_report_or_sidecar: 5938 occurrences across 15 files
  - other: 3 occurrences across 1 files

### /Volumes/iseepatterns-evidence/IGNORE
- total_occurrences: 1915
- total_files: 62
- active_project_reference_candidate_occurrences: 38
- active_project_reference_candidate_files: 1
  - active_project_reference_candidate: 38 occurrences across 1 files
  - audit_tool_instrumentation_literal: 8 occurrences across 4 files
  - governance_report_or_sidecar: 85 occurrences across 12 files
  - other: 157 occurrences across 7 files
  - pipeline_artifacts: 1627 occurrences across 38 files

### /Volumes/messageshd
- total_occurrences: 79
- total_files: 18
- active_project_reference_candidate_occurrences: 2
- active_project_reference_candidate_files: 1
  - active_project_reference_candidate: 2 occurrences across 1 files
  - archive_historical: 1 occurrences across 1 files
  - audit_tool_instrumentation_literal: 8 occurrences across 4 files
  - governance_report_or_sidecar: 68 occurrences across 12 files

### /Volumes/2026-iseepatterns-tb3
- total_occurrences: 87
- total_files: 19
- active_project_reference_candidate_occurrences: 3
- active_project_reference_candidate_files: 3
  - active_project_reference_candidate: 3 occurrences across 3 files
  - audit_tool_instrumentation_literal: 8 occurrences across 4 files
  - governance_report_or_sidecar: 76 occurrences across 12 files

## Database duplicate/provenance checks
- {'db': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db', 'table': 'master_transactions', 'column': 'forensic_hash', 'duplicate_groups': 1, 'duplicate_rows': 2}
- {'db': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db', 'table': 'emails', 'column': 'rfc822_id', 'duplicate_groups': 127197, 'duplicate_rows': 330067}
- {'db': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db', 'table': 'drive_links', 'column': 'rfc822_id', 'duplicate_groups': 8391, 'duplicate_rows': 31933}
- {'db': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db', 'table': 'chain_of_custody', 'column': 'sha256', 'duplicate_groups': 1, 'duplicate_rows': 2}
- {'db': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/IMESSAGE_DATA_LOCKER/chat_case_only.db', 'table': 'chat_message_join', 'column': 'message_id', 'duplicate_groups': 28, 'duplicate_rows': 304}
- {'db': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/IMESSAGE_DATA_LOCKER/chat_case_only.db', 'table': 'message_attachment_join', 'column': 'message_id', 'duplicate_groups': 1744, 'duplicate_rows': 4476}
- {'db': '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/chat_master.db', 'table': 'chat_message_join', 'column': 'message_id', 'duplicate_groups': 8, 'duplicate_rows': 16}

## Verification
- JSON parsed: true
- Raw report exists: True
- Walk errors: 0
- Original evidence files modified by this supplement: 0