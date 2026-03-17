# LawModel1: Governance & Implementation Standard

This document defines the core rules, architectural patterns, and quality standards for the LawModel1 project. **Adherence is mandatory for all automated and manual changes.**

---

## 1. Core Mandate: The Prime Directive
**Original Evidence is Sacrosanct.**
*   NEVER modify original `.db`, `.mbox`, `.eml`, `.pdf`, `.csv`, `.xlsx`, or `.json` files in the `data/` directory (except for explicitly allowed Rosetta Stone master sheets).
*   All additions, annotations, and overrides MUST be stored in the **Workbench** (`workbench.db`) or specific annotation sidecars.
*   Preserve all metadata, including timestamps, sender/receiver info, and original IDs.

---

## 2. The Gem System (Plugin Architecture)
A "Gem" is a self-contained unit of functionality (e.g., `gem-gmail`).
*   **Registration**: Every Gem MUST be registered in `gems/registry.json`.
*   **Structure**:
    *   `ingest/`: Python scripts to move raw data to normalized DBs.
    *   `schemas/`: SQL definitions for underlying tables.
    *   `app/app/api/[gem]/`: Next.js API routes.
    *   `app/app/[gem]/`: UI pages.

---

## 3. SQLite Protocol
*   **Production/Lambda**: Use `better-sqlite3` in read-only mode where possible.
*   **Journal Mode**: All databases SHOULD use `PRAGMA journal_mode = WAL` for concurrent access.
*   **Foreign Keys**: ALWAYS enable `PRAGMA foreign_keys = ON` in the Workbench.
*   **Schema Evolution**: Use migration scripts in `schemas/` instead of direct table modification.

---

## 4. UI/UX: The Premium Aesthetic
The interface must reflect the high stakes of forensic legal work.
*   **Design Language**: Use "Glassmorphism" (high transparency, blurring, subtle borders).
*   **Colors**: 
    *   Accents: Cyber Cyan (`#00ffff`), Warning Amber (`#f59e0b`), Critical Red (`#ef4444`).
    *   Backgrounds: Deep Noir (`#050505`) with subtle radial gradients.
*   **Micro-interactions**: Use `lucide-react` icons and subtle transitions for state changes.

---

## 5. Security & Verification
*   **Hashing**: All ingested forensic files MUST have their SHA-256 hash recorded.
*   **Provenance**: Every piece of evidence in the Hub MUST link back to its original source file and hash.
*   **Chain of Custody**: Any manual modification of data (overrides) MUST be logged in an `audit_log` table within `workbench.db`.

---

## 6. Development Workflow
1.  **Plan**: Check `docs/` and `gems/registry.json` before creating new files.
2.  **Implement**: Follow directory conventions strictly.
3.  **GEM Validation**: Verify that new routes/pages are added to the Registry.
4.  **Audit**: Run `forensic_integrity_audit.md` before final submission.

---

## 7. Python vs. Typescript
*   **Python**: Use for data processing, heavy ingest, and heavy-lifting logic (LLM extraction, OCR).
*   **TypeScript (React/Next.js)**: Use for UI and core application logic (API mediation).

---

## 8. Naming Conventions
*   **Files/Dirs**: `snake_case` for Python/scripts, `directory-kebab-case` for UI routes.
*   **Code**: `camelCase` for TypeScript, `snake_case` for Python.
*   **SQL Tables**: `snake_case`.

---

## 9. Error Handling
*   **API**: Always return consistent JSON: `{ "success": boolean, "data"?: any, "error"?: string }`.
*   **Ingest**: Provide detailed logs in `debug_ingest.log` for troubleshooting.

---

## 10. The Rosetta Stone
The master translation layer that links bank descriptions to internal player IDs.
*   **Format**: `data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv`.
*   **Usage**: All financial normalization MUST check the Rosetta Stone for player attribution.

---

## 11. Verification Logic
1.  **THE Gavel**: Verify that all files have been registered and categorized properly.
2.  **THE HUB**: Verify `canonical_id` formats and participant linkages.
3.  **THE BRAIN**: Verify that Rosetta Stone and Walkthrough artifact counts are up to date.

### 💎 Forensic Verification Standard
Every financial session must conclude with:
1.  **Automatch**: Running the fuzzy matcher against the RosettaStone master CSV.
2.  **Human Review**: Manual confirmation of linked player identities.
3.  **Segregation**: Finalizing verification to create the `-UNVERIFIED-DISCREPANCIES.csv` artifact for unmatched records.

**RULE**: Every major task MUST conclude with an FIA. Consult [forensic_integrity_audit.md](file:///Volumes/batdrivetb5/AI_TRAINING/lawmodel1/docs/forensic_integrity_audit.md) for the full protocol.
