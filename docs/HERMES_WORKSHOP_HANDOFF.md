# Hermes Workshop — Rowboat Creative Handoff Doc

**Date:** 2026-05-19
**Prepared by:** Hermes Agent (Case Manager for Joseph Zangrilli)
**Purpose:** Onboarding document for a new Hermes workshop session. This captures everything accomplished, current state, conventions, and next priorities so you don't start blind.

---

## 1. The Case

**Rowboat Creative, LLC** — business partnership dispute.

- **Entity:** Delaware LLC (6 Del. C. § 18-101 et seq.)
- **Plaintiff:** Joseph Zangrilli (Illinois)
- **Defendant:** Lucas Guariglia (Charlotte, North Carolina)
- **Jurisdiction:** Federal — diversity (28 U.S.C. § 1332), wire fraud (18 U.S.C. § 1343), mail fraud (§ 1341), computer fraud (§ 1030)
- **Venue:** N.D. Ill., W.D.N.C., or D. Del.
- **Substantive law:** Delaware LLC Act (internal affairs), state tort law (fraud/conversion), federal criminal statutes
- **Procedural rules:** FRCP, FRE
- **Claims:** Fraud, breach of fiduciary duty, asset misappropriation, conversion, breach of contract, unjust enrichment, accounting, potential RICO

**Key people:**
- Suzanne Ronayne = Suzanne Guariglia (married to Lucas, managed RBC event activations and BA payroll exceeding $8,200)
- QBO salesperson initials map: JZ=Joseph Zangrilli, HB/H.B.=Haight Brand, LG=Lucas Guariglia, PH=Patrick Houdek, LO=Lauren Owen, WZ=Whitney Zech, KR=Kevin Rotter, JG=Jorge Gonzalez (before 2019-03-09) / ambiguous (2019-03-09 to 2019-06-24) / Jay/John Goebel (after)

---

## 2. Evidence Drive — THE source of truth

```
/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/
```

This is the operational HOME/PWD/WORKSPACE for all Rowboat work. Do not create files in `/Users/iseepatterns-ms-m4/` without explicit approval.

### SSOT Rules (Source of Truth)

| Evidence Type | Primary Source | Reference-Only |
|---|---|---|
| Email | MBOX files (or canonical MBOX-derived indexes/metadata) | `.eml` files (unless standalone — see Nitschke EMails below) |
| iMessage | **RSMF forensic exports (exclusive)** | SQLite `chat_case_only.db`, `chat_master.db`, iMazing raw extracts |

**iMessage SSOT Critical Rule:** RSMF forensic exports are the EXCLUSIVE iMessage source of truth. SQL-derived databases (chat_case_only.db, chat_master.db) are reference/roadmap only — they may silently miss iOS blob-packed messages and attachment-accompanied messages that RSMF preserves. **evidence_hub.db contains ZERO iMessages** (186,985 records purged 2026-05-17). evidence_hub.db = email + tax records only (~1M records).

**evidence_fts has ZERO iMessages:** The `evidence_fts` FTS5 table covers emails and evidence cards only. iMessage source_type queries MUST route to `chat_case_only.db`, not `evidence_hub.db`.

**Never modify original evidence files.** Reference them by full path on the evidence drive.

**Standalone EMail Exception:** Standalone `.eml` files with no corresponding MBOX (e.g., JZ personal Gmail forwards to attorneys) ARE primary evidence and must be ingested into `evidence_hub.db` via the pattern in the lawmodel1-governance skill. New `.eml` ingestions deduplicate automatically via `canonical_id` on Message-ID.

---

## 3. What's Been Accomplished

### 3.1 Evidence Catalog
- **58 exhibits** cataloged (EXH-0001 to EXH-0058), each with SHA-256, date, size, path
- Index at: `catalog/evidence-index.md` (note: file may be in `lawmodel1/catalog/`)

### 3.2 Transcript Paralegal Analysis
- **50+ transcripts** analyzed using the 7-part paralegal analysis structure
- Output: `analysis/paralegal-analysis/*.md`
- Covers 2020–2025, including:
  - Court hearings (objections, APA, liquidation, dismissal)
  - Partnership disputes (LG-JZ takeover, payroll fraud, domain lockout)
  - Witness calls (Constellation Brands, Eleven Eleven, 53 Bank, FBI, OCC, 311)
  - Team meetings (MMM weekly calls, rally meetings)
  - Accounting discussions (COG disputes, payroll diversion)

### 3.3 QBO Unallocated Order Hunt

The pipeline for identifying salespeople on unallocated QuickBooks orders.

**Pipeline funnel:**
```
2,820 QBO source orders
  → 2,428 matched via DecoNetwork
  → 392 remaining
  → Lucas PDF extract → 333
  → Joe PDF extract → 319
  → All 12 MBOX PDF indexes → 193 truly unallocated
  → Joseph manually identified ~106 → 87 remaining
  → Invoice Locker second pass applied
```

**Current state:** Hunt continues — remaining unallocated orders being resolved via multi-pass PDF hunt layering and direct Joseph identification.

**Sidecar:** 110 approved rows ($261,137) — handled separately, not in the hunt CSV.

**Hunt CSV location:**
```
_analysis_outputs/qbo_unallocated_all_pdf_index_matches/qbo_unallocated_true_remaining_after_joseph_identified.csv
```

**Dashboard:** Next.js app API at `/api/financials/qbo-unallocated?view=remaining`

**Salesperson allocations applied (approximate):**
- Lucas Guariglia: ~$157K (Brand Addition, Black Buffalo, Nonpoint, Davos, Lisa Mathis, Joe Freshgoods, Alden Almagro, Rachel Ibrahim, Carmel Halim, YCA, Playa Society, Legacy Marketing, AJ Capital, Amjad Shehade, Pepsi, Iconic Duo, Little Goat, Fireplace Inn, Sofi Tucker, Saint Alfred, Chicago Blackhawks, Doug Jackson, Mike Polans)
- Joseph Zangrilli: ~$62K (Hope For The Day, InkT, Ivy Hall, Brandon Breaux, Havas, Kotawear, Ronin Branding)
- Jorge Gonzalez: ~$11.8K (Chicago Native, Creative Promotional, RSVP)
- Abel Rodriguez: ~$9.1K (85 Supply — 23 Margaret Searls + 1 Brad Foster)
- Tenant Rent removed: $4,200 (Pendulum Creative — these are rent payments, not sales orders)

**IMPORTANT:** 85 Supply = Abel Rodriguez, not Lucas Guariglia (Joseph corrected).

**Test data removed:** `zang shirts2` (4 orders, $476.88), `TEST COMPANY / DAVE Davis` (8 orders, $70.04)

**Salesperson Canonical Source Priority Chain** (governance §11.5):
1. **data7 Owner** (HIGHEST — Joseph's hand-curated Google Sheet, 4,286 invoices, 6 salespeople + House). Path: `data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_SALES_LOCKER/data7.csv`
2. **Deco Salesperson Key** (Deco-only fallback, 2,964 orders, 7 salespeople). Path: `data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_SALES_LOCKER/DECO_SALESPERSON_KEY - key.csv`
3. **Auto-propagation** (lowest — algorithmic only; when all known orders for a customer share one SP, unassigned rows auto-assign)

### 3.4 Tax Document Pipeline
- **96 tax documents** ingested (84 PDFs, 8 spreadsheets, 4 images) spanning 2011–2024
- Processed via batch acceleration in ~14 minutes (3 parallel sub-agents, ~31 docs each)
- Artifacts: `lawmodel1/pipeline/artifacts/01-taxes-intake/*.json`

### 3.5 PPP Fraud Documentation (COMPLETE)
- **44 files** of PPP analysis and documentation
- Account #9710 (Wells Fargo) reconstructed from PPP loan records
- **423 emails** tagged with PPP-related canonical IDs
- Tag SQL: `lawmodel1/data/tag_ppp.sql`
- Key documents: `lawmodel1/reports/ppp_tagging/ppp_tagging_report.md`, `lawmodel1/reports/ppp_tagging/ppp_key_documents.json`

### 3.6 Seven Explosive Lockers Cataloged (COMPLETE)
Full catalog at `lawmodel1/reports/seven_locker/seven_locker_catalog.md`:

| # | Locker | Files | Size | Primary Content |
|---|--------|-------|------|-----------------|
| 1 | COURT_LOCKER | 722 | 690 MB | Pleadings, motions, orders, exhibits, receivership, court audio |
| 2 | DRAWS_LOCKER | 47 | 3.2 MB | Yearly partner draw records (2014-2023) + distributions guide |
| 3 | ETHICS_LOCKER | 23 | 32 MB | SG Mosaic ethics violation, Constellation policies, whistleblower complaints |
| 4 | MISAPPROPRIATION_LOCKER | 1,445 | 215 MB | 21 vendor sub-lockers: APPLE, AT&T, STARBUCKS, RIDESHARE, WSJ_WINE, etc. |
| 5 | evidence_cards | 1,339,690 | 5.1 GB | JSON card index of chat + iMessage (845K+ messages with forensic tags) |
| 6 | ACCOUNTING_LOCKER | 3,312 | 423 MB | Johansen/Rudder/Supporting Strategies exports, invoices, receipts, POs |
| 7 | AMAZON_LOCKER | 2,982 | 661 MB | 2,961 Amazon invoices/screenshots + data export CSVs (2006-2023) |
| **TOTAL** | | **1,350,220** | **~7.7 GB** | |

### 3.7 Nitschke EML Ingestion (COMPLETE)
- **96 files** ingested from Blaisenitschke Law correspondence into `evidence_hub.db`
- **35 thread groups** (41 unique threads)
- Date range: 2022-03-24 to 2023-09-13
- Includes key threads: "Review and Advise on the Potential Termination of Relationship" (11 emails), "PRICE FIXING WITH WIFE" (8 emails), "Rowboat - Request for Phone Call" (18 emails)
- Brief: `_analysis_outputs/nitschke_eml_ingest_brief.md`

### 3.8 Receivership 2024-2025 Analysis (COMPLETE)
- **768 emails** analyzed across receiver reports and financial periods
- **109 Hayes SMS messages** extracted (lucasideas bypass, hayesr account identified)
- Deep dive report: `_analysis_outputs/receivership_fraud_deepdive.md`
- Email/query index: `_analysis_outputs/receivership_email_queries.json`

### 3.9 USE_MBOX_INDEX Top-10 Analysis (COMPLETE)
- **35 lockers** cataloged, **17,074 files** indexed
- Top-10 analysis generated for evidence prioritization

### 3.10 Slack Viewer UI (DEPLOYED)
- **14 channels** from Rowboat Creative Slack workspace
- Built and deployed at `localhost:3000/slack`
- Source analysis: `rowboat_slack_report.txt`, `rowboat_slack_analysis.py`
- Cross-reference with accountant emails: `_analysis_outputs/accountant_email_analysis/slack_analysis.md`

### 3.11 iMessage API Fix (DIAGNOSED)
- **chat_case_only.db dual-schema pitfall resolved**: Two `chat_case_only.db` files exist with DIFFERENT schemas. The API routes query `IMESSAGE_LOCKER/Messages/chat_case_only.db` (VIEW-based: `messages` table, `handle` VIEW, Unix `date_utc`). The legacy forensic DB at `IMESSAGE_DATA_LOCKER/chat_case_only.db` uses Apple-native schema (`chat_message_join`, Cocoa epoch `date`).
- **184K messages** now queryable via the API
- RSMF indexed markdown at `lawmodel1/imessage_sources.md` (4,264 messages, 2017-11 to 2024-02, 96% from 2023)
- **iMessage Forensic Search patterns**: `lawmodel1-imessage-search` skill

### 3.12 App Bug Fixes
- **Evidence Hub default tab**: Fixed from "imessage" to "all" (evidence_hub.db has zero iMessages)
- **Workbench save**: Fixed no-op `handleSaveDescription` (now calls the API)
- **Correlator**: Fixed table name mismatches (`messages` → `emails`, `sender` → `from_addr`, `date` → `date_sent`)
- **Sidebar completeness**: 6 new nav items added (20-page layout now)
- **Description edits table**: Created missing `description_edits` table in workbench.db to fix 500 on `/api/workbench/descriptions`

### 3.13 Obsidian Vault (SCAFFOLDED)
- **49 notes** organized by case entities, claims, timeline, dashboards, and templates
- **8 plugins** including **Obsidian Git by denolehov** (auto-commit to iseepatterns-local)
- Located at: `lawmodel1/obsidian_vault/`
- Synced via Obsidian Git plugin — commits pushed to GitHub iseepatterns-local repo
- Claim template: `obsidian_vault/templates/claim-template.md`

### 3.14 NotebookLM Integration
- **MCP server** configured and authenticated for NotebookLM
- **11 briefing files** ingested into the "Rowboat Discovery" notebook
- Notebook topics: RSMF iMessages, accountant emails, PPP fraud, banking collusion, partnership dissolution, forensic accounting, fiduciary breach
- Active queries handled via `mcp_notebooklm_ask_question` tool
- NotebookLM hook: `lawmodel1/gems/notebooklm_hook.sh`

### 3.15 Claim-by-Claim Evidence Mapping (COMPLETE)
- **75KB, 864 lines**, mapping all 11 claims + Civil RICO
- Each claim has: legal elements (Delaware LLC Act / federal statutes), evidence summary, source citations
- Located at: `_analysis_outputs/claim_by_claim_evidence_mapping.md`
- Obsidian mirror: `obsidian_vault/claims/` (individual claim notes)

### 3.16 Subpoena Packages (COMPLETE)
- **5 FRCP 45 subpoena packages** drafted (50.7KB total)
- Targets: Flagstar Bank, First Citizens Bank, DHL Shipping, Fifth Third Bank, American Airlines
- Located at: `_analysis_outputs/subpoenas/01-05_*.md`

### 3.17 GitHub: iseepatterns-local Repo
- **lawmodel1/** is a git repo synced to `iseepatterns-local` remote
- All analysis outputs backed up to `lawmodel1/reports/`
- Obsidian vault commits auto-pushed via Obsidian Git plugin
- `.github/workflows/` includes `notebooklm_deepdive.yml`

### 3.18 Forensic Accounting Work Product
- **PPP fraud analysis**: 44 files, account #9710 reconstructed, 423 emails tagged
- **Receivership deep dive**: 768 emails, 109 Hayes SMS messages, fraud patterns cataloged
- **7 locker catalog**: All financial lockers inventoried with top-5 evidentiary items per locker
- **QBO unallocated hunt**: invoice-level salesperson assignments with multi-pass PDF layering
- **Sales analysis DB**: `_analysis_outputs/rowboat_invoice_database/invoice_analysis.db` (7,484 invoices, 2016-2025, $12.93M)

### 3.19 Financial Explorer — Printavo/Deco/RosettaStone 5-Tab UI (COMPLETE — 2026-05-19)

Unified financial explorer wired into the Next.js app at `/financials` with five tabs.

**Data sources integrated:**
- **Printavo API**: 1,995 invoices imported with full metadata (customer, status, amounts, dates)
- **DecoNetwork API**: 2,949 orders imported with production and shipping details
- **Cross-referencing**: 340 records matched between Printavo and Deco (shared order/invoice IDs)
- **RosettaStone**: 22,000+ transactions imported into `evidence_hub.db` for unified financial querying

**5-Tab UI layout:**
1. **Explorer** — Searchable, filterable views across all Printavo invoices and Deco orders with sortable columns
2. **Statements** — Aggregated financial statements with period-over-period comparisons
3. **Summary** — High-level metrics (total revenue, outstanding, customer breakdowns)
4. **Tax Returns** — Tax document integration linking 96 ingested tax docs to financial periods
5. **Cross-Reference** — Side-by-side Printavo/Deco matching viewer with discrepancy highlighting for the 340 matched records

**API routes:**
- `/api/financials/printavo` — Printavo invoice queries with pagination
- `/api/financials/deco` — DecoNetwork order queries with pagination
- `/api/financials/cross-reference` — Matched/unmatched record comparison
- `/api/financials/summary` — Aggregated financial metrics

### 3.20 RosettaStone Transaction Import (COMPLETE — 2026-05-19)
- **22,000+ transactions** imported into `evidence_hub.db` from RosettaStone financial data
- Printavo and Deco APIs used as canonical reference sources for categorization
- Enables unified SQL queries across email, tax, financial, and Slack data from a single database
- Transaction categories mapped to QBO chart of accounts for consistent financial reporting

### 3.21 Legacy FastAPI Removal (COMPLETE — 2026-05-19)
- **Legacy FastAPI server (port 8000)** fully decommissioned and removed
- All functionality migrated to the Next.js app on port 3000
- **RAG button** removed from Evidence Hub UI (legacy retrieval-augmented generation feature)
- **Legal Research page** decommissioned and replaced with a deprecation notice pointing users to NotebookLM integration
- No remaining dependencies on the legacy Python FastAPI stack

### 3.22 Slack Message Ingestion (COMPLETE — 2026-05-19)
- **2,707 Slack messages** ingested into `evidence_hub.db` from the 14-channel Rowboat Creative workspace
- Messages now searchable alongside email and tax records via the Evidence Hub FTS5 index
- Source data at: `lawmodel1/data/USE_MBOX_INDEX/SLACK_WORKSPACE/`
- Slack Viewer UI at `localhost:3000/slack` now backed by database queries as well as file-based analysis

### 3.23 iMessage API Schema Correction Applied (COMPLETE — 2026-05-19)
- **chat_case_only.db schema correction** applied to the iMessage API routes
- Fix ensures all API queries target the correct VIEW-based schema (`IMESSAGE_LOCKER/Messages/chat_case_only.db`) and never the legacy Apple-native schema (`IMESSAGE_DATA_LOCKER/chat_case_only.db`)
- All `/api/imessage/*` routes verified against the SSOT database
- Prevents silent query failures documented in dual-schema pitfall (see Section 7, Critical Governance Rules)

### 3.24 Documentation Refresh (COMPLETE — 2026-05-19)
- **Full documentation refresh** completed across lawmodel1 docs
- Updated: `HERMES_WORKSHOP_HANDOFF.md` (this document), API route documentation, governance skill references
- Stale dev server command references verified and corrected (all point to `lawmodel1/app/` — no legacy port 8000 references remain)
- Pipeline stage statuses updated in documentation to reflect current state

### 3.25 GitHub Push (COMPLETE — 2026-05-19)
- **All 2026-05-19 changes pushed** to `iseepatterns-local` GitHub repo
- Includes: Financial Explorer code, FastAPI removal, Slack ingestion scripts, iMessage API fixes, documentation updates
- Commit history reflects the full day's work with descriptive commit messages

---

## 4. Pipeline Architecture

### Stages
| Stage | Name | Status |
|---|---|---|
| 01-intake | General intake | Artifacts: 0 |
| 01-taxes-intake | Tax document intake | Artifacts: 96 (complete) |
| 02-paralegal | Transcript paralegal | Artifacts: 0 (output in `analysis/paralegal-analysis/`) |
| 02-email-paralegal | Email paralegal | Artifacts: 0 |
| 02-taxes-paralegal | Tax paralegal | Artifacts: 0 |
| 03-email-attorney | Email attorney | Artifacts: 0 |
| 03-taxes-attorney | Tax attorney | Artifacts: 0 |

### Pipeline State File
```
/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json
```

### Cron Workers (status may have changed — verify before relying)

| Worker | Job ID | Schedule | Model |
|---|---|---|---|
| Pipeline Intake (01) | `48c4a58f0c1c` | every 5m | deepseek-v4-pro |
| Pipeline Paralegal (02) | `70036c533462` | every 10m | deepseek-v4-pro |
| Pipeline Attorney (03) | `7da378aea236` | every 15m | deepseek-v4-pro |
| Email Paralegal (02E) | `914b196ab56e` | every 2m | deepseek-v4-pro |
| Email Attorney (03E) | `64dde7b363a1` | every 2m | deepseek-v4-pro |
| Taxes Intake (01T) | `610032a09393` | every 5m | (inherits) |
| Taxes Paralegal (02T) | `06f53f30fbaf` | every 2m | (inherits) |
| Daily Backup | `1d18085cbb50` | 3am CDT | script-only (no_agent) |

**All pipeline workers are on deepseek-v4-pro.** The daily backup is a script-only job (`backup-push.sh`) with no LLM agent.

**To resume workers:** Use the cronjob tool with `action="update"` and set enabled to true. Verify worker status before relying on any automation.

---

## 5. LawModel1 App

- **Next.js** application at `lawmodel1/app/`
- **Dev server:** Run from `lawmodel1/app/` directory with `npm run dev` (NOT `lawmodel1/` root — that package.json has no dev script)
- **Port:** `3000` (verify with `lsof -i :3000`)
- **Transcripts:** `/transcripts` route, served from `lawmodel1/data/transcripts/`
- **QBO Unallocated API:** `/api/financials/qbo-unallocated` — points to the hunt CSV
- **Financial Explorer:** `/financials` — 5-tab UI (Explorer, Statements, Summary, Tax Returns, Cross-Reference) with Printavo, Deco, and RosettaStone data
- **Slack Viewer:** `/slack` — 14 Rowboat Creative Slack channels (2,707 messages ingested into evidence_hub.db)
- **Evidence Hub:** `/evidence-hub` — default tab must be "all" (NOT "imessage")
- **Obsidian Vault Viewer:** `/obsidian` — case knowledge graph browser
- **Sidebar:** 20-page navigation layout (see governance skill for checklist)
- **Cloudflare tunnel:** May be running for mobile access. Check `ps aux | grep cloudflared`

### Key App Bug Knowledge
- **Default tab bug**: Evidence Hub previously defaulted to "imessage" tab — but evidence_hub.db has zero iMessages (all purged). Default must be "all".
- **No-op functions**: Function handlers that set loading state but never call the API (e.g., the old `handleSaveDescription` was a no-op).
- **Table name mismatches**: Old code used `FROM messages` — correct is `FROM emails` (mbox_metadata.db). Column mismatches: `sender` → `from_addr`, `date` → `date_sent`.
- **Vite HMR gotcha**: Code edits to route.ts and page.tsx trigger browser refresh — users see as a crash. Edit data files (JSONs in public/data/) safely without disruption.
- **Legacy FastAPI (port 8000)**: Fully removed 2026-05-19. No code references remain. If you see port 8000 mentioned anywhere, it's stale.

---

## 6. Skills Ecosystem

All skills are under `~/.hermes/profiles/isp_ds_manager_bot/skills/`. Key categories:

### Rowboat Pipeline Skills
- `pipeline-intake-worker` — Stage 01 general intake
- `pipeline-paralegal-worker` — Stage 02 transcript paralegal batch processor
- `pipeline-attorney-worker` — Stage 03 attorney synthesis
- `pipeline-email-paralegal-operations` / `pipeline-email-paralegal-worker` — Email paralegal
- `pipeline-email-attorney-operations` / email attorney worker — Email attorney
- `pipeline-taxes-intake-worker` / `pipeline-taxes-document-operations` / `pipeline-taxes-attorney-worker` — Tax pipeline
- `pipeline-cross-stage-operations` — Cross-stage orchestration
- `pipeline-state-operations` / `pipeline-state-inspection` / `pipeline-state-structure` — Pipeline state management
- `pipeline-mixed-type-reference` / `paralegal-worker-schema-mismatch` — Pipeline schema handling

### Evidence Processing
- `evidence-intake` — Catalog evidence with SHA-256 hashes
- `evidence-memo` — Forensic memo generation
- `evidence-package-synthesis` — Multi-agent workflow for court-ready packages
- `transcript-paralegal-analysis` — 7-part transcript analysis
- `imazing-cli-forensic-extraction` — iMessage extraction from iOS backups
- `lawmodel1-imessage-search` — iMessage forensic search patterns (schema reference, coverage)

### Financial / QBO
- `lawmodel1-financial-ingestion` — Batch import/parse bank/credit card PDFs
- `lawmodel1-governance` — **Core rules and quality standards (MANDATORY — loaded at session start)**
- `lawmodel1-gems` — Gem registry and plugin architecture
- `subpoena-package-drafting` — Institutional subpoena workflow with evidentiary citation

### Operational
- `hermes-configuration-operations` — Provider/model changes, gateway restarts, cron management
- `operations/hermes-memory-operations` — Memory maintenance procedures
- `operations/rowboat-cloudflare-mobile-report-hosting` — iPhone-friendly hosted report pages

### Known Skill Manager Quirks
- `skill_manage` cannot find certain skills that `skill_view` loads fine (confirmed for `financial-statement-review` and `kanban-orchestrator`)
- `skill_manage` cannot find the `hermes-agent` hub skill; use `hermes-configuration-operations` as the writable fallback
- Workaround: create a new skill under a findable name or patch a sibling skill

---

## 7. Key Conventions

### File Paths
- Evidence drive root: `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/`
- LawModel1 project root: `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/`
- evidence_hub.db canonical path: `lawmodel1/data/evidence_hub.db` (3.4GB — NOT the 0-byte stubs at root or app/)
- QBO unallocated: `_analysis_outputs/qbo_unallocated_all_pdf_index_matches/`
- Hunt CSV: `qbo_unallocated_true_remaining_after_joseph_identified.csv`
- Pipeline state: `lawmodel1/tools/pipeline/pipeline-state.json`
- Pipeline artifacts: `lawmodel1/pipeline/artifacts/`
- Analysis output: `analysis/paralegal-analysis/`
- Workbench DB: `lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db`
- Invoice analysis DB: `_analysis_outputs/rowboat_invoice_database/invoice_analysis.db`
- iMessage API DB: `lawmodel1/data/IMESSAGE_LOCKER/Messages/chat_case_only.db` (VIEW-based schema)
- Obsidian vault: `lawmodel1/obsidian_vault/`
- Subpoena packages: `_analysis_outputs/subpoenas/`
- Slack workspace data: `lawmodel1/data/USE_MBOX_INDEX/SLACK_WORKSPACE/`
- Printavo invoices: `lawmodel1/data/FINANCIAL_LOCKER/PRINTAVO/`
- Deco orders: `lawmodel1/data/FINANCIAL_LOCKER/DECO/`
- RosettaStone transactions: ingested into `evidence_hub.db` (query via `source_type='rosettastone'`)

### Communication Style (Joseph's Preferences)
- **Frustrated when:** asked about things already in progress
- **Prefers:** decisive, state-aware updates ("here's what's running, what's blocked, what needs your call")
- **Prefers conclusions over menus:** if asked "A or B?" and both are viable, pick one and explain why
- **Trust delegation:** "if you think X then I trust you" means make the call
- **Post-session:** Update memory/skills for real signal; prefer umbrella patches

### QBO Unallocated Conventions
- TEST COMPANY and zangshirts are test noise — skip/remove, do not allocate
- Hunt CSV must live in `all_pdf_index_matches/` directory for the dashboard API route
- The API route's Next.js cache expects that path
- Pendulum Creative was identified as tenant rent payments — removed from hunt, not allocated to a salesperson
- Salesperson resolution follows canonical priority: data7 Owner → Deco Key → auto-propagation

### Pipeline Conventions
- Pause cron when backlogs finish (not unconditionally — verify completion first)
- Mobile status updates via Telegram
- Batch acceleration: split large backlogs into parallel sub-agents for speed

### Critical Governance Rules (from lawmodel1-governance)

**iMessage DB Dual-Schema Pitfall:** There are TWO `chat_case_only.db` files with DIFFERENT schemas. The API routes query `IMESSAGE_LOCKER/Messages/chat_case_only.db` (VIEW-based: `messages` table, `handle` VIEW, Unix `date_utc`). The legacy forensic DB at `IMESSAGE_DATA_LOCKER/chat_case_only.db` uses Apple-native schema (`chat_message_join`, Cocoa epoch `date`). Queries that work on one silently fail on the other. Always verify schema with `.tables` and `PRAGMA table_info(messages)` before writing queries. **Schema correction applied to all API routes 2026-05-19.**

**evidence_fts has ZERO iMessages:** The `evidence_fts` FTS5 table covers emails and evidence cards only. iMessage queries MUST route to `chat_case_only.db`. When the evidence-hub API receives `source_type=imessage`, skip the FTS5 search block: `if (q && sourceType !== "imessage")`.

**execute_code vs delegate_task (§14):** Use `execute_code` for data processing (filtering, CSV transforms, SQL queries, file remapping, API validation, FTS queries with quoted phrases). Reserve `delegate_task` for reasoning-heavy tasks (legal claim analysis, fraud pattern investigation, OCR architecture design). Pre-flight checklist: (1) Can this be 1-3 direct tool calls? (2) Is it data transformation? Use execute_code. (3) >100 files? Use background terminal. (4) Status check? Answer from live data immediately — never delegate.

**Salesperson Priority Chain (§11.5):** data7 Owner (HIGHEST) → Deco Salesperson Key → Auto-propagation (LOWEST). data7 overrides everything. When an invoice appears in both data7 and the Deco key, data7 wins.

**FTS Quoted-Phrase Query Rule:** `terminal()` sqlite3 fails on FTS5 quoted-phrase syntax (`MATCH '"Paycheck Protection"'` produces "unrecognized token"). Use execute_code with Python `sqlite3` parameterized queries. If a query returns 0 from terminal(), rewrite in execute_code before concluding no data exists.

**Canonical DB Path Rule:** The real `evidence_hub.db` is at `lawmodel1/data/evidence_hub.db` (3.4GB, ~1M records — email + tax only). Multiple 0-byte stubs exist at root, `lawmodel1/`, and `lawmodel1/app/`. Always verify with `SELECT source_type, COUNT(*) FROM evidence GROUP BY source_type`.

**No Legacy FastAPI (port 8000):** The legacy Python FastAPI server on port 8000 was fully removed 2026-05-19. All API routes now live exclusively in the Next.js app on port 3000. Any reference to port 8000 in code, config, or documentation is stale and must be removed.

---

## 8. Next Priorities (as of 2026-05-19)

1. **QBO unallocated hunt — remaining orders** — Continue multi-pass PDF hunt layering against remaining unallocated rows. Use data7 → Deco key → auto-propagation priority chain. Sources: MBOX emails, PDF extracts, INVOICE_LOCKER, and Joseph's per-company memory.

2. **Tax pipeline stages** — 96 intake artifacts complete. Paralegal stage (02T) and attorney stage (03T) need to run. Review pipeline-state.json for backlog items.

3. **Email pipeline population** — Email pipeline stages (02E, 03E) defined but need items populated into pipeline state for processing through paralegal → attorney.

4. **Evidence exhibit prep** — `evidence-memo` and `evidence-package-synthesis` skills exist. Use the 7-locker catalog and claim-by-claim mapping as sources for court-ready exhibit packages.

5. **iMessage cross-reference deep dive** — RSMF forensic exports are the exclusive SSOT. Build on the 4,264 indexed messages in `imessage_sources.md` and the 184K messages in the API (schema correction applied 2026-05-19). Cross-reference iMessage timelines with email evidence, receivership filings, and PPP fraud patterns.

6. **Printavo/Deco cross-reference analysis** — Investigate the 340 matched records between Printavo and Deco for discrepancies. Flag orders present in one system but missing from the other. Use the Cross-Reference tab at `/financials` as the investigation UI.

7. **RosettaStone transaction categorization** — 22K+ transactions imported. Categorize by type (revenue, expense, transfer), map to QBO chart of accounts, and flag anomalies for forensic review.

8. **Keep GitHub backups current** — Copy completed analysis from `_analysis_outputs/` into `lawmodel1/reports/` and commit to `iseepatterns-local` when major outputs accumulate. Financial Explorer code and RosettaStone imports already pushed 2026-05-19.

---

## 9. Answers to Common Questions

**"What model do the pipeline workers run on?"**
deepseek-v4-pro (provider: deepseek). All pipeline workers. Do NOT switch them.

**"Where is the evidence drive?"**
`/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/` — this is the operational workspace.

**"How do I see what's in the pipeline?"**
Read `lawmodel1/tools/pipeline/pipeline-state.json`, or check `lawmodel1/pipeline/artifacts/` for per-stage outputs.

**"What's the QBO unallocated status?"**
See Section 3.3. Dashboard available via Next.js dev server at localhost:3000.

**"Are the pipeline workers running?"**
Verify before relying. All pipeline cron jobs may be paused. Resume individually or in groups as needed via the cronjob tool.

**"How do I find Joseph's allocations?"**
He identifies salespeople by company name from memory. Present companies by name for fastest resolution. Follow the canonical priority chain: data7 → Deco key → auto-propagation.

**"What's the lawmodel1 app URL?"**
`http://localhost:3000` (verify with `lsof -i :3000`). Cloudflare tunnel may also be running for mobile access. Legacy port 8000 is DECOMMISSIONED — do not use.

**"Does evidence_hub.db contain iMessages?"**
NO. evidence_hub.db = email + tax + Slack + RosettaStone (~1M records). iMessages were purged 2026-05-17. RSMF forensic exports are the exclusive iMessage SSOT. Use `chat_case_only.db` for iMessage search.

**"Which chat_case_only.db do I use?"**
The API routes use: `lawmodel1/data/IMESSAGE_LOCKER/Messages/chat_case_only.db` (VIEW-based schema). The legacy DB at `IMESSAGE_DATA_LOCKER/chat_case_only.db` uses a different Apple-native schema — queries silently fail on the wrong one. Always verify schema first. Schema correction applied to all API routes 2026-05-19.

**"When do I use execute_code vs delegate_task?"**
execute_code for data processing (CSV, SQL, file ops, API verification). delegate_task for reasoning (legal analysis, fraud patterns). Never delegate a status check — answer from live data immediately. See governance §14 for the full pre-flight checklist.

**"What Slack channels are available?"**
14 Rowboat Creative channels available at `localhost:3000/slack`. 2,707 messages ingested into evidence_hub.db for unified search. Slack data in `lawmodel1/data/USE_MBOX_INDEX/SLACK_WORKSPACE/`.

**"How do I start the dev server?"**
`cd lawmodel1/app && npm run dev`. Do NOT run from `lawmodel1/` root — that package.json has no dev script. Port 3000 only — port 8000 is decommissioned.

**"Where is the evidence catalog?"**
7-locker consolidated catalog at `lawmodel1/reports/seven_locker/seven_locker_catalog.md`. Evidence exhibit index at `catalog/evidence-index.md`.

**"How do I access the Obsidian vault?"**
Open `lawmodel1/obsidian_vault/` in Obsidian. 49 notes, 8 plugins including Obsidian Git (auto-commit to iseepatterns-local). Web viewer at `localhost:3000/obsidian`.

**"What's the Financial Explorer?"**
5-tab UI at `/financials` (Explorer, Statements, Summary, Tax Returns, Cross-Reference). Backed by 1,995 Printavo invoices, 2,949 Deco orders, 340 cross-referenced records, and 22K+ RosettaStone transactions. See Section 3.19.

**"Is the legacy FastAPI still running?"**
NO. Legacy FastAPI on port 8000 was fully removed 2026-05-19. RAG button removed from Evidence Hub. Legal Research page decommissioned. All API routes now live exclusively in the Next.js app on port 3000.

---

*End of handoff. This document lives at `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/docs/HERMES_WORKSHOP_HANDOFF.md`*
