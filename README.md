# LawModel1 — Forensic Evidence Platform

May 2026 | Case RC-2026 (Rowboat Creative LLC Partnership Dispute)

A unified forensic evidence platform built on Next.js (App Router) with multiple SQLite backends, providing a workflow-driven UI for legal discovery, financial analysis, and case strategy. No local LLM dependency — the app is a self-contained investigator dashboard that indexes and links evidence across emails, iMessages, financial transactions, QuickBooks records, Slack logs, and an Obsidian legal vault.

- **Workflow-Driven UI**: Sidebar organized into five logical stages:
  - **Recon** (5 pages): Dashboard, Discovery, Communications, Transcripts, Players
  - **Analyze** (9 pages): Correlator, Timeline, Financials, Import, QBO Unallocated, Sales by SP, Sales Analysis, CoC History, Slack
  - **Financials Sub-Pages** (3 pages): Printavo Invoices, Deco Orders, Statements
  - **Strategize** (4 pages): Workbench, Strategy, Research, Legal
  - **Knowledge** (1 page): Obsidian Vault
  - **Present** (1 page): Briefing Room
- **Evidence Hub (SQLite SSOT)**: `evidence_hub.db` — canonical cross-source evidence store. Emails, tax records, RosettaStone financial transactions, Printavo invoices, Deco orders, and Slack messages (~1M+ records total). iMessages live separately in `chat_case_only.db` (query-only reference, pruned to 48 case-relevant handles).
- **iMessage SSOT**: RSMF forensic exports at `data/IMESSAGE_LOCKER/Messages/`. Original 186,985 iMessages were purged from `evidence_hub.db` on 2026-05-17; they now reside exclusively in `chat_case_only.db` — a read-only query database built from RSMF exports, NOT from raw `chat.db`.
- **Financial Explorer**: 5-tab UI at `/financials` (Explorer, Statements, Summary, Tax Returns, Cross-Reference). 21,981 RosettaStone transactions ingested into `evidence_hub.db` (`rosettastone_transactions` table). 1,995 Printavo invoices and 2,949 Deco orders imported. 340 cross-referenced QBO-Printavo-Deco records via `/api/financials/cross-reference`. 150 bank statements navigable in Statements tab.
- **Slack Workspace Viewer**: Full Slack export indexed with channel browser, search, and member profiles. 2,707 messages ingested into `evidence_hub.db`.
- **Obsidian Legal Vault**: 49+ interlinked Markdown notes (claims, entities, dashboards, timeline, templates) exposed via UI launcher. Opens natively in Obsidian or browseable in-app.
- **NotebookLM Integration**: MCP-tooled conversational research partner grounded on the full forensic corpus — used for attorney war room prep and cross-evidence analysis. Replaces the removed legacy FastAPI RAG backend.
- **Workbench**: Read-write workspace for attorney work product. Supports evidence sectioning, annotation, description editing, preview, attachment management, and save.
- **QBO Forensic Pipeline**: 41 QuickBooks tables (520K+ rows) cross-referenced against 22K master bank transactions. 4,082 matches ($4.89M), 15,741 QB-only ($10.82M). Forensic views for vendor risk, journal entry tracing, deleted accounts, backdated entries.
- **Evidence Cards**: 1.34M+ normalized `EvidenceCard` JSON records for paralegal export and attorney packaging.
- **24 API Route Directories**: REST endpoints covering evidence hub, iMessages, Slack, communications, financials (import/automatch/verification/forensic-audit/printavo/deco/explorer/statements/cross-reference), transcripts, players, correlator, timeline, workbench, CoC, legal, briefing, calendar, stats, entities, AI analysis, PDF export, EML matching, search, and auth.
- **Correlator Fix**: Auto-link engine for cross-source evidence correlation with attachment resolution.
- **Chain of Custody**: Provenance tracking and audit logging via `chain_of_custody` table in `mbox_metadata.db` plus CoC UI page with history and verification.
- **Legacy FastAPI Removed**: The FastAPI server on port 8000 (Ollama qwen2.5 RAG + Brain Status) was decommissioned on 2026-05-18. RAG/Ask AI buttons removed from Evidence Hub Dashboard and Legal Research page. All functionality consolidated into Next.js API routes and NotebookLM.

## Evidence SSOT Rules

| Evidence Type | Canonical Source | Query Database | Do Not Modify |
|:---|:---|:---|:---|
| Emails (Gmail) | `data/MBOX_LOCKER/mbox_metadata.db` (read-only) | Same | Original `.mbox` files |
| iMessages (Forensic) | RSMF exports in `data/IMESSAGE_LOCKER/Messages/` | `chat_case_only.db` (read-only, pruned) | Raw `chat.db` backups in `chatdb_storage/` |
| Tax Returns | `data/TAXES_LOCKER/` PDFs | `evidence_hub.db` tax tables | Original PDFs |
| Financial (RosettaStone) | `data/STATEMENTS_LOCKER/` | `evidence_hub.db` → `rosettastone_transactions` (22K) | Statement CSVs after ingest |
| Printavo Invoices | Printavo API / CSV import | `evidence_hub.db` → `printavo_invoices` (2K) | Raw export files |
| Deco Orders | Deco Network API / CSV import | `evidence_hub.db` → `deco_orders` (3K) | Raw export files |
| QuickBooks | `qb_forensic.db` (read-only) | Same | Raw QBO CSVs |
| Slack | `data/SLACK_EXPORT_LOCKER/` JSON | `evidence_hub.db` slack tables (2.7K msgs) | Export archives |
| Legal Documents | `data/LEGAL_LOCKER/` PDFs | `evidence_hub.db` + ChromaDB | Original PDFs |
| Players/Entities | `players.db` (44 profiles) | Same | Ingest scripts only |
| Workbench (Attorney) | `workbench.db` (read-write) | Same | Direct edits through UI only |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 16 App (port 3000)                 │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ 24+ Pages │  │ Sidebar  │  │Workbench │  │  Glass UI │  │
│  └─────┬─────┘  └──────────┘  └──────────┘  └───────────┘  │
│        │                                                     │
│  ┌─────▼──────────────────────────────────────────────────┐  │
│  │              24 API Route Directories                   │  │
│  │  evidence-hub, imessages, slack, communications,       │  │
│  │  financials (printavo/deco/explorer/statements/        │  │
│  │  cross-reference/transactions/import/automatch/         │  │
│  │  forensic-audit/invoices/sales-by-salesperson/          │  │
│  │  sales-analysis/qbo-unallocated/finalize-verification), │  │
│  │  transcripts, players, correlator, timeline,           │  │
│  │  workbench, coc, legal, briefing,                      │  │
│  │  case-corner, calendar, stats, entities, ai,           │  │
│  │  export, match-eml, files, search, auth                │  │
│  └─────┬──────────────────────────────────────────────────┘  │
└────────┼────────────────────────────────────────────────────┘
         │
    ┌────▼─────────────────────────────────────────────┐
    │               SQLite Backends                     │
    │  ┌──────────────────┐  ┌───────────────────────┐  │
    │  │ evidence_hub.db   │  │  chat_case_only.db    │  │
    │  │ ~1M+ records      │  │  186K iMessages       │  │
    │  │ email + tax +     │  │  (read-only, RSMF)    │  │
    │  │ financial + slack │  │                       │  │
    │  └──────────────────┘  └───────────────────────┘  │
    │  ┌──────────────────┐  ┌───────────────────────┐  │
    │  │ workbench.db      │  │  mbox_metadata.db     │  │
    │  │ attorney workspace │  │  402K+ emails         │  │
    │  │ (read-write)      │  │  (read-only)          │  │
    │  └──────────────────┘  └───────────────────────┘  │
    │  ┌──────────────────┐  ┌───────────────────────┐  │
    │  │ players.db        │  │  qb_forensic.db       │  │
    │  │ 44 profiles       │  │  41 tables, 520K rows │  │
    │  └──────────────────┘  └───────────────────────┘  │
    │  ┌──────────────────┐  ┌───────────────────────┐  │
    │  │ calendar_events.db│  │  ChromaDB (vectors)   │  │
    │  └──────────────────┘  └───────────────────────┘  │
    └──────────────────────────────────────────────────┘

    ╔══════════════════════════════════════════════════╗
    ║  REMOVED: FastAPI (port 8000) — 2026-05-18      ║
    ║  RAG engine (Ollama qwen2.5) decommissioned     ║
    ╚══════════════════════════════════════════════════╝
```

## Project Structure

```
lawmodel1/
├── .agent/skills/                         # Agent skills (governance)
│   └── lawmodel1-governance/              # Governance agent — SSOT for standards
├── app/                                   # Next.js Application (App Router)
│   ├── app/
│   │   ├── api/                           # 24 API route directories (60+ endpoints)
│   │   │   ├── evidence-hub/              # Cross-source evidence queries
│   │   │   ├── imessages/                 # iMessage chat_case_only.db queries
│   │   │   ├── imessage-attachment/       # Attachment resolver
│   │   │   ├── slack/                     # Slack workspace API
│   │   │   ├── communications/            # Email thread/detail routes
│   │   │   ├── financials/                # Financial router + 14 sub-routes
│   │   │   │   ├── route.ts              # Main financials API
│   │   │   │   ├── transactions/         # RosettaStone transaction queries
│   │   │   │   ├── import/               # CSV import pipeline
│   │   │   │   ├── automatch/            # Auto-match against master transactions
│   │   │   │   ├── forensic-audit/       # Forensic audit finalization
│   │   │   │   ├── invoices/             # Invoice CRUD
│   │   │   │   ├── printavo/             # Printavo invoice queries (1,995)
│   │   │   │   ├── deco/                 # Deco order queries (2,949)
│   │   │   │   ├── explorer/             # Financial Explorer API
│   │   │   │   ├── statements/           # Bank statement queries (150)
│   │   │   │   ├── cross-reference/      # QBO-Printavo-Deco linking (340)
│   │   │   │   ├── sales-by-salesperson/ # Salesperson view
│   │   │   │   ├── sales-analysis/       # Sales analysis
│   │   │   │   ├── qbo-unallocated/      # Unallocated QBO transactions
│   │   │   │   └── finalize-verification/ # Verification finalization
│   │   │   ├── transcripts/               # Call/meeting transcripts + audio
│   │   │   ├── players/                   # Player profiles and lookup
│   │   │   ├── correlator/                # Auto-link engine
│   │   │   ├── timeline/                  # Chronological evidence timeline
│   │   │   ├── workbench/                 # Attorney workbench CRUD
│   │   │   ├── coc/                       # Chain of custody (history, notes, verify)
│   │   │   ├── legal/                     # Legal docs, research, complaints
│   │   │   ├── briefing/                  # Briefing room exporter
│   │   │   ├── case-corner/               # Strategy and agency referrals
│   │   │   ├── calendar/                  # Calendar events
│   │   │   ├── stats/                     # Dashboard statistics
│   │   │   ├── entities/                  # Entity registry
│   │   │   ├── ai/                        # AI analysis, summarize (RAG removed)
│   │   │   ├── export/                    # PDF generation
│   │   │   ├── match-eml/                 # EML file matching
│   │   │   ├── files/                     # File download proxy
│   │   │   ├── search/                    # Global search
│   │   │   └── auth/                      # NextAuth authentication
│   │   ├── financials/                    # Financial Explorer 5-tab UI
│   │   │   ├── page.tsx                  # Explorer (5-tab: Explorer, Statements,
│   │   │   │                              #  Summary, Tax Returns, Cross-Reference)
│   │   │   ├── printavo-invoices/        # Printavo sub-page
│   │   │   ├── deco-orders/              # Deco sub-page
│   │   │   └── statements/               # Statements sub-page
│   │   ├── [page]/                        # 24+ UI pages
│   │   ├── layout.tsx                     # Root layout with Sidebar
│   │   └── globals.css                    # Glassmorphism theme
│   ├── components/                        # Shared React components (Sidebar, Providers)
│   ├── lib/                               # Core libraries (db.ts, etc.)
│   └── types/                             # TypeScript type definitions
├── data/                                  # SOURCE OF TRUTH — all evidence data
│   ├── evidence_hub.db                    # Canonical evidence store (~1M+ records)
│   │   │                                  #   rosettastone_transactions (22K)
│   │   │                                  #   printavo_invoices (2K)
│   │   │                                  #   deco_orders (3K)
│   │   │                                  #   slack messages (2.7K)
│   ├── players.db                         # Person intelligence (44 profiles)
│   ├── workbench.db                       # Attorney workbench
│   ├── chat_case_only.db                  # iMessage query DB (pruned, 48 handles)
│   ├── calendar_events.db                 # Case calendar
│   ├── invoice_analysis.db                # Invoice forensics
│   ├── MBOX_LOCKER/                       # Gmail metadata (mbox_metadata.db, 402K+)
│   ├── IMESSAGE_LOCKER/                   # RSMF forensic iMessage exports
│   ├── FINANCIAL_LOCKER/                  # Bank statements, QBO exports
│   │   └── ROWBOAT_CREATIVE_QUICKBOOKS_ADDITIONAL_DOCUMENTATION_LOCKER/
│   │       └── qb_forensic.db             # 41 QBO tables, 520K+ rows
│   ├── TAXES_LOCKER/                      # 1120-S and K-1 PDFs
│   ├── SLACK_EXPORT_LOCKER/               # Slack workspace export JSON
│   ├── LEGAL_LOCKER/                      # Court documents
│   ├── FORENSIC_VERIFICATION_LOCKER/      # Reconciliation audit results
│   ├── evidence_cards/                    # 1.34M+ EvidenceCard JSONs
│   ├── transcripts/                       # Call/meeting transcripts
│   └── memos/                             # Investigation memos
├── chatdb_storage/                        # iMessage raw backups (NEVER MODIFY)
│   ├── imac_2025-06-01_.../               # iMac backup (603K msgs, 57GB attachments)
│   └── m1studio_2025-05-31_.../           # M1 Studio backup (501K msgs, 72GB)
├── obsidian_vault/                        # Obsidian legal vault (49+ notes)
│   ├── claims/                            # Legal claims (11+)
│   ├── entities/                          # People and organizations (10+)
│   ├── dashboards/                        # Claim status, evidence tracker, witness binder
│   ├── timeline/                          # Master timeline
│   └── templates/                         # Note templates
├── ingest/                                # PERMANENT ingestion modules (Python)
├── schemas/                               # SQL schema definitions (canonical)
├── scripts/                               # Utility scripts (one-time or ad-hoc)
│   └── import_printavo_deco.py            # Printavo + Deco data import
├── gems/                                  # Gem registry (modular pipeline definitions)
│   └── registry.json                      # Master manifest of 11 gems
├── chroma_db/                             # Vector embeddings (ChromaDB)
├── exports/                               # Generated outputs (dossiers, letters, packages)
├── docs/                                  # Documentation and handoffs
└── tools/                                 # Standalone CLI tools
```

## Current Data Sizes (May 2026)

| Database | Records | Notes |
|:---|:---|:---|
| `evidence_hub.db` | ~1M+ | Emails (814K), tax records, rosettastone_transactions (22K), printavo_invoices (2K), deco_orders (3K), slack messages (2.7K). iMessages purged 2026-05-17 |
| `evidence_hub.db` → `rosettastone_transactions` | 21,981 | Master financial transactions (bank/CC statements) |
| `evidence_hub.db` → `printavo_invoices` | 1,995 | Printavo invoice records |
| `evidence_hub.db` → `deco_orders` | 2,949 | Deco Network order records |
| `evidence_hub.db` → `slack_messages` | 2,707 | Slack workspace messages, ingested 2026-05-18 |
| `mbox_metadata.db` | 402K+ | Gmail account index (read-only) |
| `chat_case_only.db` | 186K | iMessages — 48 pruned handles (read-only, RSMF-sourced) |
| `qb_forensic.db` | 520K+ | 41 QBO tables: purchases, invoices, transfers, journals |
| `players.db` | 44 | Person and entity profiles |
| `evidence_cards/` | 1.34M+ | Normalized EvidenceCard JSON records |
| `obsidian_vault/` | 49+ notes | Claims, entities, dashboards, timeline |

Cross-reference: 340 linked QBO-Printavo-Deco records via `/api/financials/cross-reference`.

## Setup

```bash
cd app && pnpm dev
```

Runs on `http://localhost:3000`. Next.js 16 App Router with glassmorphism UI theme.

**Note:** The legacy FastAPI server (port 8000, Ollama qwen2.5 RAG) has been decommissioned. Only Next.js on port 3000 is required.

### Prerequisites
- Node.js 20+
- `pnpm install` (first run, from `app/` directory)
- SQLite databases must be present at the paths defined in `app/lib/db.ts`
- NextAuth configured for authentication (credentials provider)

## Governance Architecture

LawModel1 uses a three-pillar governance framework:

### A. Governance Agent
`.agent/skills/lawmodel1-governance/SKILL.md` — Single source of truth for project standards including:
- **Forensic Security**: Evidence-heavy directories are strictly ignored by Git
- **Canonical IDs**: Strict mapping rules for `message_id`, `nexus_uuid`, and `txn_id`
- **Directory Conventions**: Placement rules for scripts, schemas, ingest modules, and exports
- **SQLite Protocol**: WAL journaling, foreign keys, schema migration discipline
- **UI Design Language**: Glassmorphism with cyber cyan, warning amber, critical red accents
- **Forensic Integrity Audit (FIA)**: Mandatory sync procedure: Lockers → Hub → Workbench

### B. Gem Registry
`gems/registry.json` — 11 modular evidence pipeline definitions:

| Gem | Purpose | Key Database/Output |
|:----|:--------|:--------------------|
| `gem-imessages` | RSMF iMessage forensic repository | `chat_case_only.db` (query-only) |
| `gem-gmail` | Gmail evidence locker | `mbox_metadata.db` (402K+ emails) |
| `gem-financial-txns` | Bank/Printavo/Deco/Amazon normalization | `evidence_hub.db` → `rosettastone_transactions` (22K) |
| `gem-tax-returns` | 1120-S K-1 ingestion | `evidence_hub.db` tax tables |
| `gem-evidence-hub` | Cross-source evidence dashboard | `evidence_hub.db` (~1M+ records) |
| `gem-chain-of-custody` | Provenance tracking and audit | `mbox_metadata.db` → `chain_of_custody` |
| `gem-evidence-cards` | EvidenceCard normalization (1.34M+) | `data/evidence_cards/` |
| `gem-players` | Person/entity profiles (44) | `players.db` |
| `gem-paralegal-exports` | Attorney package generator | `exports/attorney_package/` |
| `gem-ready-bag` | Litigation-ready evidence bundle | `exports/attorney_package/ready_bag/` |
| `gem-qb-forensic` | QuickBooks forensic database | `qb_forensic.db` (41 tables, 520K+ rows) |

### C. Evidence Flow
Interactive evidence flow diagram at `docs/evidence_flow.html` — color-coded visualization across 6 layers: Raw Sources → Processing → Databases → APIs → UI → Outputs.

## Key Features

### Evidence Hub (Discovery)
Unified cross-source evidence browser with full-text search, source filtering, participant linking, and annotation support. Shows evidence from emails, tax records, financial transactions (RosettaStone), and Slack messages — all linked by canonical `nexus_uuid`.

### Financial Explorer (5-Tab UI)
Comprehensive financial analysis at `/financials` with five tabs:
- **Explorer**: Browse, search, filter, and paginate 21,981 RosettaStone transactions. Column visibility controls, date range filtering, transaction type and category filters. Sortable columns with bank, user, and category breakdowns.
- **Statements**: Navigate 150 bank statements with statement-level metadata and file references.
- **Summary**: Aggregated financial metrics, category summaries, and trends.
- **Tax Returns**: View and cross-reference tax return data linked to underlying transactions.
- **Cross-Reference**: 340 linked QBO-Printavo-Deco records. Unified view connecting QuickBooks purchases to Printavo invoices and Deco Network orders.

Sub-pages accessible from the Sidebar under Financials:
- **Printavo Invoices** (`/financials/printavo-invoices`): 1,995 invoices with search and filter.
- **Deco Orders** (`/financials/deco-orders`): 2,949 orders with status tracking.
- **Statements** (`/financials/statements`): Dedicated bank statement browser.

### iMessage API
Dedicated `/api/imessages/` route queries `chat_case_only.db` (read-only, pruned to 48 case-relevant handles). Includes attachment resolution via `/api/imessage-attachment/`. All iMessages sourced from RSMF forensic exports, not raw `chat.db`.

### Slack Workspace Viewer
Full Slack export viewer at `/slack` — channel browser, message search, member profiles. 2,707 messages ingested into `evidence_hub.db` for cross-source correlation. Reads from `data/SLACK_EXPORT_LOCKER/` JSON exports.

### Obsidian Legal Vault
49+ interlinked Markdown notes at `/obsidian`. Covers 11+ legal claims, 10+ entity profiles, 3 dashboards, master timeline, and note templates. Launches natively in Obsidian (`obsidian://` URI) or browseable in-file.

### NotebookLM Integration
Conversational research partner grounded on the full forensic corpus. Used for attorney war room prep, cross-evidence question-answering, audio deep dives, and out-of-the-box insight generation. Replaces the decommissioned FastAPI RAG backend (Ollama qwen2.5, removed 2026-05-18).

### Workbench
Read-write attorney workspace at `/workbench`. Supports sectioning evidence, editing descriptions, saving annotations, previewing documents, managing attachments, and assigning items to work products.

### QBO Forensic Pipeline
Standalone `qb_forensic.db` with 41 QuickBooks tables (520K+ rows). Forensic views include:
- `v_vendor_risk_matrix` (1,412 high-risk vendors scored >= 4)
- `v_journal_entry_forensics` (112 off-hours entries, 30 backdated Dec 2020 entries)
- `v_transfer_tracing` (753 transfers)
- `v_deposit_analysis` ($454K undeposited funds)
- Cross-reference: 4,082 QB purchases matched to RosettaStone ($4.89M), 15,741 QB-only ($10.82M)

### Correlator
Auto-link engine at `/correlator` for cross-source evidence matching. Links emails to iMessages, financial transactions to communications, and attachments to parent records.

### Legacy FastAPI & RAG Removal (2026-05-18)
The FastAPI server on port 8000 (Ollama qwen2.5 RAG engine) has been fully decommissioned:
- RAG/Ask AI buttons removed from Evidence Hub Dashboard
- RAG search panel removed from Legal Research page
- Brain Status widget disabled
- All AI-powered research redirected to NotebookLM (Gemini 2.5)
- `api_server.py` retained for reference only; not active

### Briefing Room
Export and presentation layer at `/briefing` for generating attorney-ready briefs, evidence packages, and PDF exports.

## Licensing

Proprietary forensic investigation platform. All evidence data, schemas, and case-specific logic are confidential and subject to attorney-client privilege. Contact the project owner for usage permissions.
