---
name: lawmodel1-governance
description: >
  Governance agent for the lawmodel1 forensic investigation platform.
  Acts as the single source of truth for all project schemas, evidence paths,
  naming conventions, and chain-of-custody requirements. MUST be consulted
  before any agent creates, modifies, or queries databases, ingest scripts,
  API routes, or UI pages in the lawmodel1 project.
---

# LawModel1 Governance Agent

> **Role**: Senior Attorney / Paralegal / Senior Developer  
> **Purpose**: Maintain total harmony across all lawmodel1 processes  
> **Authority**: Every agent working on lawmodel1 MUST consult this skill first

## When To Use This Skill

Use this skill whenever you are about to:
- Create or modify a database schema
- Write or edit an ingest script
- Add or change an API route
- Create a new data locker or data file
- Generate evidence cards
- Link evidence across databases
- Build or modify a UI page that reads from any lawmodel1 database
- Run any pipeline that touches forensic evidence

**Trigger keywords**: lawmodel1, evidence hub, mbox, chatdb, evidence card, player, 
ingest, workbench, chain of custody, correlator, case corner, financial hub, 
schema, forensic, evidence, locker, canonical_id, provenance

---

## 1. Project Root & Directory Standards

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
│   │   └── unused/          # Legacy/superseded databases
│   ├── evidence_cards/     # Generated evidence card JSONs
│   ├── memos/              # Investigation memos
│   ├── transcripts/        # Call/meeting transcripts
│   ├── evidence_hub.db     # Canonical evidence store
│   ├── players.db          # Person intelligence
│   └── chat_master.db      # Consolidated iMessages
├── chatdb_storage/         # iMessage forensic storage (raw)
├── chroma_db/              # Vector embeddings (ChromaDB)
├── docs/                   # Documentation and handoffs
├── exports/                # Generated outputs (dossiers, letters, packages)
├── gems/                   # Gem registry (modular pipeline definitions)
├── ingest/                 # PERMANENT ingestion modules (Python package)
├── schemas/                # SQL schema definitions (canonical)
├── scripts/                # ONE-TIME or utility scripts
│   └── unused/              # Legacy/superseded scripts
├── tools/                  # Standalone tool scripts
└── prompts/                # LLM prompt templates
```

### Placement Rules

| Type | Location | When |
|:---|:---|:---|
| Reusable ingestion pipeline | `ingest/` | Will be called repeatedly; is part of the evidence pipeline |
| One-time utility or analysis | `scripts/` | Run once or ad-hoc; not part of core pipeline |
| Superseded scripts | `scripts/unused/` | Scripts replaced by better tools or master indexes |
| Standalone CLI tool | `tools/` | Self-contained tool with its own argument parsing |
| SQL schema definition | `schemas/` | ANY new table in ANY database |
| Evidence source files | `data/*_LOCKER/` | Raw evidence organized by type |
| Generated outputs | `exports/` | Dossiers, attorney packages, letters |
| API routes | `app/app/api/` | Next.js API handlers |
| UI pages | `app/app/[page]/` | Next.js page components |

---

## 2. Database Registry

### Primary Databases

| Database | Location | Access | Purpose |
|:---|:---|:---|:---|
| `gmail_master_index.db` | `data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/` | READ-ONLY | Primary master email index (746k+ records) |
| `evidence_hub.db` | `data/` | READ-ONLY* | Canonical evidence store (643k+ records) |
| `players.db` | `data/` | READ-ONLY | Person intelligence (44+ profiles) |
| `workbench.db` | `app/` (auto-created) | READ-WRITE | Assignments, annotations, timeline, claims |
| `chat_master.db` | `data/` | READ-ONLY | Consolidated iMessage storage |
| `brains.db` | Project root | READ-WRITE | Brain/task orchestration |
| `chroma_db/` | Project root | READ-WRITE | Vector embeddings for RAG |
| `bm25_index.pkl` | Project root | READ-ONLY | BM25 keyword search index (340 MB) |

*evidence_hub.db is written to only by ingest scripts, never by the UI/API layer.

### Legacy/Unused Databases (Move to `unused/` folders)
- 📧 `mbox_metadata.db` (Primary Email Index, 8.5 GB)
- 📧 `accountant_correspondence.db` (Filtered accountant emails)
- 📧 `fifth_third_correspondence.db` (Fifth Third Bank communications)
- 📧 `mayersky_correspondence.db` (Leonard Mayersky communications)
- 📧 `side_business_correspondence.db` (Side business evidence)
- 📧 `accounting_all.db` (All accounting@ emails)
- 📧 `accounting_ashley_myles.db` (Ashley Myles persona threads)
- 📧 `emails_LG_SM_SH_JZ.db` (4-person email index, 4 GB)

### Database Connection Layer

All database connections go through `app/lib/db.ts`. Available accessors:

```typescript
getCommDb()          // gmail_master_index.db (READ-ONLY)
getCommDbWritable()  // gmail_master_index.db (READ-WRITE, use sparingly)
getEvidenceHubDb()   // evidence_hub.db (READ-ONLY)
getWorkbenchDb()     // workbench.db (READ-WRITE, auto-schema)
getImessageDb()      // chat.db decoded (READ-ONLY)
getCaseCornerDb()    // workbench.db with case_corner schema applied
getDb(name)          // Generic accessor for data/*.db (READ-ONLY)
```

**RULE**: Never create a new database connection method without adding it to `db.ts`.

---

## 3. Schema Registry

All schemas MUST be defined in `schemas/` before being used. Current canonical schemas:

### evidence_hub.sql — Tables in `evidence_hub.db`
- `evidence` — Core canonical evidence records (one row per unique message/record)
  - **Required fields**: `canonical_id` (UNIQUE dedup key), `case_id`, `client_id`, `source_type`, `start_timestamp`
  - **canonical_id format**: Use the source system's native ID (rfc822_id for email, message_guid for iMessage)
- `evidence_origins` — Which sources contributed each evidence record
- `participants` — Normalized people (email/phone identifiers)
- `entities` — Consolidated real-world identities
- `participant_entities` — Mapping participants → entities
- `evidence_participants` — Junction: evidence ↔ participants (many-to-many)
- `evidence_fts` — FTS5 full-text search (auto-synced via triggers)

### mbox_metadata.sql — Tables in `gmail_master_index.db`
- `emails` — Full index of all Gmail MBOX exports
  - **Dedup key**: `UNIQUE(rfc822_id, account)`
  - **Provenance**: `locker_source`, `zip_source`, `mbox_source`
- `drive_links` — Google Drive URLs found in emails
- `emails_fts` — FTS5 search (auto-synced via triggers)

### players.sql — Tables in `players.db`
- `players` — Person profiles (slug, display_name, aliases, emails, phones)
- `player_files` — Attached documents (images, resumes, etc.)

### financials.sql — Tables in `workbench.db`
- `accounts` — Financial account definitions
- `transactions` — Standardized transaction records
  - **Sources**: 'RBC', 'PRINTAVO', 'QUICKBOOKS'
  - **evidence_id**: Links to `evidence_hub.db` for significant transactions

### tax_returns.sql — Tables in `workbench.db`
- `tax_returns` — Annual filing data (1120-S forms)
- `tax_k1_details` — Partner K-1 breakdowns

### workbench.sql — Tables in `workbench.db`
- `coc_notes_audit` — Chain of custody audit trail

### evidence_annotations.sql — Tables in `workbench.db`
- `evidence_annotations` — Highlights, flags, notes, tags on evidence

### missing_schemas.sql — Tables in `workbench.db`
- `exhibit_sections` — Exhibit organization for workbench
- `evidence_assignments` — Evidence → exhibit section assignments
- `workbench_audit` — Audit trail for workbench actions
- `timeline_events` — Chronological event entries
- `claims` — Legal claims tracking
- `claim_notes` — Notes on claims
- `claim_evidence` — Evidence linked to claims

### RULE: New Table Checklist
Before creating ANY new table:
1. ✅ Check if an existing table already handles this data
2. ✅ Write the schema in `schemas/[name].sql` FIRST
3. ✅ Add the schema file to the appropriate `db.ts` initializer
4. ✅ Include proper indexes, foreign keys, and `created_at` timestamps
5. ✅ Use ISO8601 for all date/time fields
6. ✅ Use JSON-as-TEXT for array/object fields (with clear column naming)
7. ✅ Add the table to this governance document

---

## 4. Evidence Path Rules

Every piece of evidence MUST follow this path:

```
RAW SOURCE → INGEST SCRIPT → SOURCE DATABASE → EVIDENCE CARDS → EVIDENCE HUB
                                                     ↓
                                              API ROUTE → UI PAGE
```

### Canonical ID Formats

| Source Type | canonical_id Format | Example |
|:---|:---|:---|
| Email | `rfc822_id` | `<CABx...@mail.gmail.com>` |
| iMessage | `message_guid` | `p:0/...` or `GUID` |
| Financial | `txn_{source}_{id}` | `txn_RBC_2020-05-26-001` |
| Tax | `tax_{year}_{form}` | `tax_2020_1120S` |
| Legal Doc | `legal_{bates_prefix}_{id}` | `legal_RBC_0001` |
| Memo | `memo_{date}_{slug}` | `memo_2023-03-14_incident` |

### Evidence Source Types (Enum)

Only these values are valid for `evidence.source_type`:
- `imessage`
- `email`
- `financial`
- `tax`
- `legal`
- `memo`
- `transcript`
- `profile`

### Provenance Requirements

Every record in `evidence_hub.db` MUST have:
1. At least one row in `evidence_origins` linking back to the source file/database
2. At least one participant linked via `evidence_participants`
3. A valid `start_timestamp` (ISO8601 or Apple Core Data timestamp)
4. `case_id` = `'RC-2026'` and `client_id` = `'rowboat-creative'`

---

## 5. Data Locker Standards

Data lockers in `data/` follow this naming convention:

```
data/{CATEGORY}_LOCKER/
```

### Current Lockers

| Locker | Contents |
|:---|:---|
| `MBOX_LOCKER/` | Gmail MBOX exports (4 date-stamped sub-lockers) |
| `AMAZON_LOCKER/` | Amazon purchase history |
| `COURT_LOCKER/` | Court filings and orders |
| `DRAWS_LOCKER/` | Draw account records |
| `ETHICS_LOCKER/` | Ethics complaints |
| `FINANCIAL_LOCKER/` | Bank statements, ledgers |
| `FLIGHTS_LOCKER/` | Flight records |
| `INVESTIGATION_LOCKER/` | Active investigation files |
| `LINKED_IN_PROFILE_LOCKER/` | LinkedIn profile PDFs |
| `OWNER_CASH_INFUSION_LOCKER/` | Owner capital contributions |
| `PPP_FIFTH_THIRD_BANK_LEONARD_MAYERSKY_BNI_LOCKER/` | PPP loan + bank evidence |
| `RALLY_LOCKER/` | Rally event evidence |
| `RECEIVERSHIP FRAUD/` | Receivership documentation |
| `ROWBOAT_CREATIVE_LOCKER/` | Core Rowboat Creative files |
| `ROWBOAT_CREATIVE_PDF_BY_YEAR/` | Organized by year |
| `SALES_LOCKER/` | Sales records |
| `STATEMENTS_LOCKER/` | Financial statements |
| `TAXES_LOCKER/` | Tax returns and K-1s |
| `TRANSCRIPTS_LOCKER/` | Call/meeting recordings |
| `CALENDARS/` | Calendar exports |

### Creating a New Locker
1. Use `SCREAMING_SNAKE_CASE` with `_LOCKER` suffix
2. Add it to this governance document
3. Create a corresponding gem definition in `gems/`

---

## 6. Chain of Custody Requirements

For evidence to be court-admissible:

1. **Source Provenance**: Every evidence record tracks its origin:
   - `evidence_origins.origin_system` — Which system produced it
   - `evidence_origins.source_file` — Exact file path
   - `evidence_origins.source_rowid` — Original row ID in source DB

2. **Hash Verification**: Critical evidence files should have SHA-256 hashes recorded

3. **Audit Trail**: All workbench actions logged via:
   - `workbench_audit` table
   - `coc_notes_audit` table
   - `evidence_annotations` with `created_by` and `created_at`

4. **No Direct Modification**: Raw evidence databases (`gmail_master_index.db`, `evidence_hub.db`) 
   are READ-ONLY from the UI/API layer. All annotations, assignments, and notes go into 
   `workbench.db` as a separate overlay.

---

## 7. API Route Standards

### Naming Convention
- Routes: `/api/{resource-name}` (kebab-case)
- Query params: `mode`, `id`, `q`, `page`, `limit`, `source_type`
- Response format: `{ data: [...], total: number, page: number }`

### Current API Routes (22)

| Route | Database(s) | Purpose |
|:---|:---|:---|
| `/api/evidence-hub` | evidence_hub.db | Browse/search canonical evidence |
| `/api/communications` | gmail_master_index.db | Email search and viewer |
| `/api/workbench` | workbench.db | Exhibit assignments |
| `/api/correlator` | evidence_hub.db + gmail_master_index.db | Cross-source patterns |
| `/api/players` | players.db | Person profiles |
| `/api/timeline` | workbench.db | Timeline events |
| `/api/financials` | workbench.db | Financial transactions |
| `/api/coc` | gmail_master_index.db + workbench.db | Chain of custody |
| `/api/case-corner` | workbench.db | Claims management |
| `/api/transcripts` | workbench.db | Transcript viewer |
| `/api/briefing` | evidence_hub.db + workbench.db | Case briefing |
| `/api/imessages` | chat.db decoded | iMessage search |
| `/api/search` | gmail_master_index.db | Full-text email search |
| `/api/legal` | chroma_db + bm25 | Legal document search |
| `/api/ai` | Ollama (qwen2.5-32b-forensic) | AI analysis |
| `/api/stats` | Multiple | Dashboard statistics |
| `/api/entities` | evidence_hub.db | Entity management |
| `/api/export` | Multiple | Export evidence packages |
| `/api/files` | Filesystem | File serving |
| `/api/calendar` | workbench.db | Calendar data |
| `/api/auth` | N/A | Authentication |
| `/api/match-eml` | gmail_master_index.db | EML file matching |

---

## 8. Model Architecture

### Single Model, Dual Persona
- **Model**: `qwen2.5-32b-forensic` (derived from `qwen2.5:32b-instruct`)
- **Parameters**: `num_ctx=8192`, `temperature=0.2`, `top_p=0.9`, `repeat_penalty=1.05`
- **Embedding**: `mxbai-embed-large` (primary), `nomic-embed-text` (secondary)

### Personas
1. **Synthesizer** — Short, citation-heavy answers for UI (512-1024 output tokens)
2. **Analyst** — Deep multi-step reasoning for investigation (1500-2500 output tokens)

### Retrieval Pipeline
1. Convert query → embedding
2. Hybrid search: BM25 + vector similarity (RRF fusion)
3. Re-rank with FlashRank cross-encoder
4. Build evidence cards from top 5-10 results
5. LLM receives ONLY evidence cards + question (never raw data)

---

## 9. Gem System Overview

Gems are modular evidence pipeline definitions stored in `gems/`. Each gem declares:
- Inputs (raw data sources)
- Processing scripts
- Output databases and tables
- Dependencies on other gems
- API routes and UI pages that consume the data

See `gems/registry.json` for the full manifest.

### Gem Dependency Order
```
gem-players (no deps)
gem-email-mbox (no deps)
gem-imessage-chatdb (no deps)
gem-legal-docs (no deps)
gem-transcripts (no deps)
gem-financial-txns (no deps)
gem-tax-returns → gem-financial-txns
gem-evidence-cards → gem-email-mbox, gem-imessage-chatdb, gem-financial-txns, gem-players
gem-rag-search → gem-evidence-cards, gem-legal-docs
gem-chain-of-custody → gem-email-mbox, gem-imessage-chatdb, gem-financial-txns
```

---

## 10. Cross-Reference Checklist

Before declaring any pipeline "complete," verify:

- [ ] Every evidence record has a `canonical_id` matching the format rules above
- [ ] Every record has at least one `evidence_origins` row
- [ ] Every record has at least one participant linked
- [ ] `source_type` is one of the allowed enum values
- [ ] `case_id` = `'RC-2026'` and `client_id` = `'rowboat-creative'`
- [ ] All timestamps are ISO8601
- [ ] Financial records over $5k are promoted to the Evidence Hub
- [ ] New schemas are registered in `schemas/` and added to `db.ts`
- [ ] New API routes follow the naming and response format standards
- [ ] Chain of custody metadata is preserved (never overwrite raw evidence)
