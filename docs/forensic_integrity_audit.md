# Forensic Integrity Audit (FIA) Protocol

The **Forensic Integrity Audit (FIA)** is a mandatory synchronization procedure for the `lawmodel1` platform. It ensures that raw evidence (Lockers), canonical data (Hub), strategic intelligence (Brain), and attorney deliverables (ReadyBag) remain in perfect harmony.

## 1. The Trinity of FIA

Every audit must verify the alignment of these three layers:

1.  **THE LOCKERS (Source)**: Raw evidence in `data/*_LOCKER/`.
    - Check: Are all new files ingested?
    - Check: Is file metadata (mtime) preserved as `start_timestamp`?

2.  **THE HUB (Canonical)**: Databases like `evidence_hub.db` and `mbox_metadata.db`.
    - Check: Are `canonical_id` formats correct (e.g., `legal_COURT_{hash}`)?
    - Check: Are all records linked to at least one `participant`?
    - Check: Is the `source_file` provenance recorded?

3.  **THE BRAIN (Intelligence)**: Artifacts in the `.gemini/antigravity/brain/` directory.
    - Check: Is the `player_communication_registry.md` evidence count accurate?
    - Check: Does the `walkthrough.md` reflect the current system state?
    - Check: Are all gems in `registry.json` up to date?

## 2. Audit Workflow

A Forensic Integrity Audit should be triggered:
- After any new evidence ingestion (Email, iMessage, Legal).
- Before any major Case Briefing or Attorney Export.
- Whenever a new "Player" or "Alias" is identified.
- Before running `save_ready_bag.py` to regenerate the ReadyBag.

### Step-by-Step Procedure:
1.  **Scan Gems**: Verify every active Gem in `registry.json` has its required scripts, schemas, and output directories.
2.  **Verify Governance**: Run SQL checks on `evidence` table for `canonical_id` and `timestamp` compliance.
3.  **Sync Brain**: Update the Player Communication Registry with fresh counts from:
    ```sql
    SELECT p.display_name, COUNT(*) 
    FROM evidence_participants ep 
    JOIN participants p ON ep.participant_id = p.id 
    GROUP BY p.display_name;
    ```
4.  **Verify ReadyBag** (see §4 below).
5.  **Audit Logs**: Document the audit results in the current session's `walkthrough.md`.

## 3. Enforcement
Any agent operating on `lawmodel1` MUST conclude their task by performing an FIA and confirming compliance in their final report.

---

## 4. ReadyBag Verification (`gem-ready-bag`)

The **ReadyBag** is the terminal output of the forensic pipeline — the attorney-ready evidence package at `exports/attorney_package/ready_bag/`. Every FIA must verify its integrity.

### Required Files:
| File | Purpose |
|:---|:---|
| `README_ATTORNEY_MANIFEST.md` | Executive summary and evidence catalog |
| `COMPLETE_FORENSIC_VALIDATION_MANIFEST.csv` | Core evidence ledger (cross-references all proof layers) |
| `validated_misconduct_manifest.csv` | Events with 100% proof-layer failure |
| `DIGITAL_BLINDSPOT_REPORT.md` | Technical brief on the audit-trail blind spot |
| `phase_22_pattern_of_conduct.md` | 22 behavioral patterns of misconduct |
| `pivot_key_players.csv` | Player involvement breakdown |
| `sg_employment_disclosures.csv` | Extracted admissions from chat logs |

### Verification Checks:
1.  **File Presence**: All 7 required files must exist in `exports/attorney_package/ready_bag/`.
2.  **Row Count Validation**: All `.csv` manifests must have non-zero row counts.
3.  **Player Slug Cross-Check**: Player slugs in `pivot_key_players.csv` must match entries in `data/players.db`.
4.  **Timestamp Freshness**: `README_ATTORNEY_MANIFEST.md` must reflect the date of the last pipeline run.
5.  **Evidence Count Reconciliation**: The count in `validated_misconduct_manifest.csv` should be ≤ the total in `COMPLETE_FORENSIC_VALIDATION_MANIFEST.csv`.

### Quick Validation SQL:
```sql
-- Cross-check player slugs against players.db
SELECT slug FROM players 
WHERE slug NOT IN (/* slugs from pivot_key_players.csv */);
```

---

## 5. Gem Registry Compliance

Every FIA must also verify that `gems/registry.json` is in sync:
- All active gems have `status: "active"`.
- No gem references files that have been moved or archived.
- The `registry_version` matches the latest governance update.
- Dependencies between gems are valid (no circular or missing dependencies).
