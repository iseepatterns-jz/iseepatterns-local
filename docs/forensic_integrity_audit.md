# Forensic Integrity Audit (FIA) Protocol

The **Forensic Integrity Audit (FIA)** is a mandatory synchronization procedure for the `lawmodel1` platform. It ensures that raw evidence (Lockers), canonical data (Hub), and strategic intelligence (Brain) remain in perfect harmony.

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
    - Check: Is the `player_rosettastone.md` evidence count accurate?
    - Check: Does the `walkthrough.md` reflect the current system state?
    - Check: Are all gems in `registry.json` up to date?

## 2. Audit Workflow

A Forensic Integrity Audit should be triggered:
- After any new evidence ingestion (Email, iMessage, Legal).
- Before any major Case Briefing or Attorney Export.
- Whenever a new "Player" or "Alias" is identified.

### Step-by-Step Procedure:
1.  **Scan Gems**: Verify every active Gem in `registry.json` has its required scripts and schemas.
2.  **Verify Governance**: Run SQL checks on `evidence` table for `canonical_id` and `timestamp` compliance.
3.  **Sync Brain**: Update the Rosetta Stone with fresh counts from:
    ```sql
    SELECT p.display_name, COUNT(*) 
    FROM evidence_participants ep 
    JOIN participants p ON ep.participant_id = p.id 
    GROUP BY p.display_name;
    ```
4.  **Audit Logs**: Document the audit results in the current session's `walkthrough.md`.

## 3. Enforcement
Any agent operating on `lawmodel1` MUST conclude their task by performing an FIA and confirming compliance in their final report.
