# LawModel1: Governance & Implementation Standard

This document defines the core rules, architectural patterns, and quality standards for the LawModel1 project. **Adherence is mandatory for all automated and manual changes.**

---

## 1. Core Mandate: The Prime Directive
**Original Evidence is Sacrosanct.**
*   NEVER modify original `.db`, `.mbox`, `.eml`, `.pdf`, `.csv`, `.xlsx`, or `.json` files in the `data/` directory (except for explicitly allowed Rosetta Stone master sheets).
*   All additions, annotations, and overrides MUST be stored in the **Workbench** (`workbench.db`) or specific annotation sidecars.
*   Preserve all metadata, including timestamps, sender/receiver info, and original IDs.

---

## 2. Project Root & Directory Standards

```
/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/
├── .agent/skills/          # Agent skills (including this governance skill)
├── app/                    # Next.js frontend (App Router)
│   ├── app/                # Pages and API routes
│   │   ├── api/            # 22 API route directories
│   │   └── [page]/         # 15 page directories
│   ├── components/         # Shared React components
│   ├── lib/                # Core libraries (db.ts, rag.ts, bm25.ts)
│   └── types/              # TypeScript type definitions
├── data/                   # SOURCE OF TRUTH — all evidence data
│   ├── *_LOCKER/           # Organized evidence lockers (15+)
│   ├── FORENSIC_VERIFICATION_LOCKER/ # Archived reconciliation audit results
│   ├── evidence_cards/     # Generated evidence card JSONs
│   ├── memos/              # Investigation memos
│   ├── transcripts/        # Call/meeting transcripts
│   ├── evidence_hub.db     # Canonical evidence store
│   ├── players.db          # Person intelligence
│   └── chat_master.db      # Consolidated iMessages
├── chatdb_storage/         # iMessage forensic storage (raw — NEVER MODIFY)
│   ├── imac_2025-06-01_.../           # iMac backup extract
│   │   ├── 2025-06-01_original_file_from_imac/chat.db  # Raw DB (603k msgs)
│   │   ├── Attachments/               # 57 GB, 33k files (photos/videos/docs)
│   │   ├── CloudKitMetaData/          # iCloud sync metadata
│   │   └── StickerCache/              # Sticker assets
│   ├── m1studio_2025-05-31_.../       # M1 Studio backup extract
│   │   ├── db/decoded/...db           # Decoded DB (501k msgs, has decodedBody)
│   │   ├── db/2025-05-31_original_.../chat.db  # Original raw DB
│   │   ├── Attachments/               # 72 GB, 41k files
│   │   ├── CloudKitMetaData/          # iCloud sync metadata
│   │   ├── StickerCache/              # Sticker assets
│   │   ├── Caches/                    # Message caches
│   │   ├── NickNameCache/             # Contact display names
│   │   └── CollaborationNoticeCache/  # Collaboration notices
│   └── consolidated_investigation_m1_imac.db  # Merged investigation DB
├── chroma_db/              # Vector embeddings (ChromaDB)
├── docs/                   # Documentation and handoffs
├── exports/                # Generated outputs (dossiers, letters, packages)
├── gems/                   # Gem registry (modular pipeline definitions)
├── ingest/                 # PERMANENT ingestion modules (Python package)
├── schemas/                # SQL schema definitions (canonical)
├── scripts/                # ONE-TIME or utility scripts
├── tools/                  # Standalone tool scripts
└── prompts/                # LLM prompt templates
```

### Placement Rules

| Type | Location | When |
|:---|:---|:---|
| Reusable ingestion pipeline | `ingest/` | Will be called repeatedly; is part of the evidence pipeline |
| One-time utility or analysis | `scripts/` | Run once or ad-hoc; not part of core pipeline |
| Standalone CLI tool | `tools/` | Self-contained tool with its own argument parsing |
| SQL schema definition | `schemas/` | ANY new table in ANY database |
| Evidence source files | `data/*_LOCKER/` | Raw evidence organized by type |
| Forensic Audit Results| `data/FORENSIC_VERIFICATION_LOCKER/` | Verified reconciliation reports and manifests |
| iMessage raw DBs & attachments | `chatdb_storage/` | Original forensic extracts — NEVER modify |
| Generated outputs | `exports/` | Dossiers, attorney packages, letters |
| API routes | `app/app/api/` | Next.js API handlers |
| UI pages | `app/app/[page]/` | Next.js page components (Organized by Workflow) |

### UI Architecture (Workflow-Driven)

The UI is organized into four logical stages reflecting the forensic lifecycle:
1. **RECON**: `evidence-hub` (Discovery Hub), `communications`, `transcripts`
2. **ANALYZE**: `correlator`, `players`
3. **STRATEGIZE**: `case-corner` (Strategy Hub), `legal`
4. **PRESENT**: `briefing` (Briefing Room)

---

## 3. The Gem System (Plugin Architecture)
A "Gem" is a self-contained unit of functionality (e.g., `gem-gmail`).
*   **Registration**: Every Gem MUST be registered in `gems/registry.json`.
*   **Structure**:
    *   `ingest/`: Python scripts to move raw data to normalized DBs.
    *   `schemas/`: SQL definitions for underlying tables.
    *   `app/app/api/[gem]/`: Next.js API routes.
    *   `app/app/[gem]/`: UI pages.

---

## 4. SQLite Protocol
*   **Production/Lambda**: Use `better-sqlite3` in read-only mode where possible.
*   **Journal Mode**: All databases SHOULD use `PRAGMA journal_mode = WAL` for concurrent access.
*   **Foreign Keys**: ALWAYS enable `PRAGMA foreign_keys = ON` in the Workbench.
*   **Schema Evolution**: Use migration scripts in `schemas/` instead of direct table modification.

---

## 5. UI/UX: The Premium Aesthetic
The interface must reflect the high stakes of forensic legal work.
*   **Design Language**: Use "Glassmorphism" (high transparency, blurring, subtle borders).
*   **Colors**: 
    *   Accents: Cyber Cyan (`#00ffff`), Warning Amber (`#f59e0b`), Critical Red (`#ef4444`).
    *   Backgrounds: Deep Noir (`#050505`) with subtle radial gradients.
*   **Micro-interactions**: Use `lucide-react` icons and subtle transitions for state changes.

---

## 6. Security & Verification
*   **Hashing**: All ingested forensic files MUST have their SHA-256 hash recorded.
*   **Provenance**: Every piece of evidence in the Hub MUST link back to its original source file and hash.
*   **Chain of Custody**: Any manual modification of data (overrides) MUST be logged in an `audit_log` table within `workbench.db`.

---

## 7. Development Workflow
1.  **Plan**: Check `docs/` and `gems/registry.json` before creating new files.
2.  **Implement**: Follow directory conventions strictly.
3.  **GEM Validation**: Verify that new routes/pages are added to the Registry.
4.  **Audit**: Run `forensic_integrity_audit.md` before final submission.

---

## 8. Python vs. Typescript
*   **Python**: Use for data processing, heavy ingest, and heavy-lifting logic (LLM extraction, OCR).
*   **TypeScript (React/Next.js)**: Use for UI and core application logic (API mediation).

---

## 9. Naming Conventions
*   **Files/Dirs**: `snake_case` for Python/scripts, `directory-kebab-case` for UI routes.
*   **Code**: `camelCase` for TypeScript, `snake_case` for Python.
*   **SQL Tables**: `snake_case`.

---

## 10. Error Handling
*   **API**: Always return consistent JSON: `{ "success": boolean, "data"?: any, "error"?: string }`.
*   **Ingest**: Provide detailed logs in `debug_ingest.log` for troubleshooting.

---

## 11. The Rosetta Stone
The master translation layer that links bank descriptions to internal player IDs.
*   **Source of Truth**: `data/rowboat-creative/RC-2026/db/workbench.db` → `master_transactions` table (22k rows). Accessed via `getWorkbenchDb()` in `app/lib/db.ts`.
*   **Match Storage**: Automatch results (rosetta_user, rosetta_account, rosetta_category, rosetta_company, match score) are stored in `workbench.db` → `statement_transactions` table (6.5k rows).
*   **CSV Exports**: CSVs are generated from the DB for accountant audit review — they are outputs, NOT the source of truth.
*   **Legacy CSV**: `data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv` is retained as a backup reference.
*   **Usage**: All financial normalization MUST check the Rosetta Stone `master_transactions` table for player attribution.

---

## 12. Forensic Integrity Audit (FIA)

The **Forensic Integrity Audit (FIA)** is a mandatory synchronization procedure. It ensures that raw evidence (Lockers), canonical data (Hub), and strategic intelligence (Brain) remain in perfect harmony.

### The Audit Trinity:
1.  **THE LOCKERS**: Verify all raw files are ingested and metadata preserved.
2.  **THE HUB**: Verify `canonical_id` formats and participant linkages.
3.  **THE BRAIN**: Verify that Rosetta Stone and Walkthrough artifact counts are up to date.

### 💎 Forensic Verification Standard
Every financial session must conclude with:
1.  **Automatch**: Running the fuzzy matcher against the RosettaStone master CSV.
2.  **Human Review**: Manual confirmation of linked player identities.
3.  **Segregation**: Finalizing verification to create the `-UNVERIFIED-DISCREPANCIES.csv` artifact for unmatched records.

**RULE**: Every major task MUST conclude with an FIA. Consult [forensic_integrity_audit.md](file:///Volumes/batdrivetb5/AI_TRAINING/lawmodel1/docs/forensic_integrity_audit.md) for the full protocol.
