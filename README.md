# Legal & Forensic RAG Assistant v2.0

A local AI-powered legal and financial forensic assistant with **hybrid search** (BM25 + vector), **cross-encoder reranking**, and a **unified evidence hub** tying together legal PDFs, emails, iMessages, Printavo, QuickBooks, and bank/credit-card data — all running on your Apple M4 Max using a single `qwen2.5-32b-forensic` model.

- **Workflow-Driven UI**: Reorganized into logical investigation stages:
  - **Recon**: Evidence Hub & Communications.
  - **Analyze**: Correlator & Player Profiles.
  - **Strategize**: Case Corner & Legal Library.
  - **Present**: Briefing Room.
- **Consolidated Dashboard Hubs**: Unified entry points for "Discovery Hub" (Emails/Texts/Transcripts) and "Strategy Hub" (Claims/Legal).
- **Unified Financial Hub**: Consolidation of ~24k RBC and Printavo records with **forensic review enhancements**:
  - **Account & Player Pre-filling**: Automatically maps bank account numbers and Rosetta users (JZ, LG, PH) to transactions.
  - **Evidence Tracing (DOC Column)**: Direct clickable links to invoices and receipts from the master sheet.
  - **Forensic Finalization**: Non-destructive updates to the master CSV with source PDF metadata, page numbers, and match hashes.
- **Evidence Hub (Backend)**: Master SQLite database linking emails, iMessages, and legal documents.
- **Hybrid Search**: BM25 keyword matching + vector similarity (RRF) over normalized “evidence cards.”
- **Cross-Encoder Reranking**: FlashRank reranker to eliminate false-positive chunks.
- **Category & Source Filtering**: Filter by document type (complaints, motions, receiver reports, etc.) and by evidence source (emails, iMessages, legal PDFs, tax-records, financials, Printavo, QuickBooks, bank/CC).
- **Source Attribution**: Every answer cites explicit IDs (Message-IDs, Bates, tax-years, invoice/PO numbers, ledger IDs, master sheet row IDs) and filenames/pages for traceability.
- **Unified Evidence Cards**: All raw data (PDFs, emails, tax returns, chat.db, CSVs, QuickBooks attachments) is normalized into structured `EvidenceCard` JSON with summaries, bullets, timestamps, participants, and IDs.
- **Dual Personas on One Model**:
  - **Analyst**: Deep forensic reasoning across evidence cards.
  - **Synthesizer**: Short, citation-heavy answers for UI.
- **Optimized for M4 Max**: Uses `qwen2.5-32b-forensic` (derived from `qwen2.5:32b-instruct`, `num_ctx=8192`, `temp=0.2`) for fast, high-quality local answers.

## Governance Architecture

This project uses a three-pillar governance framework to ensure unity and harmony across all evidence pipelines:

### 1. Governance Agent
**`.agent/skills/lawmodel1-governance/SKILL.md`** — The single source of truth for all project standards. Every agent working on this project must consult this skill before modifying schemas, databases, scripts, or API routes. Contains the full schema registry, canonical ID formats, evidence path rules, data locker standards, and chain of custody requirements.

### 2. Gem Registry
**`gems/registry.json`** — 10 modular evidence pipeline definitions ("gems") that can be snapped in and out. Each gem declares its inputs, outputs, processing scripts, schemas, dependencies, API routes, and UI pages. Gems ensure all processes follow the same patterns and no connections are missed.

| Gem | Purpose | Dependencies |
|:----|:--------|:-------------|
| `gem-email-mbox` | Gmail MBOX → mbox_metadata.db | — |
| `gem-imessage-chatdb` | iMessage chat.db → chat_master.db | — |
| `gem-financial-txns` | Bank/Printavo/Amazon → transactions | — |
| `gem-tax-returns` | 1120-S + K-1 → tax records | financial-txns |
| `gem-players` | Profiles → players.db | — |
| `gem-legal-docs` | Court PDFs → ChromaDB + BM25 | — |
| `gem-transcripts` | Call recordings → annotations | — |
| `gem-evidence-cards` | All sources → evidence_hub.db | email, imessage, financial, players |
| `gem-rag-search` | Hybrid search → LLM answers | evidence-cards, legal-docs |
| `gem-chain-of-custody` | Provenance + audit trails | email, imessage, financial |

### 3. Evidence Flow Visualization
**`docs/evidence_flow.html`** — Interactive, color-coded HTML diagram showing every evidence path across 6 architectural layers: Raw Sources → Processing → Databases → APIs → UI → Outputs. Open directly in a browser to explore.

## Project Structure

```text
lawmodel1/
├── .agent/skills/                         # Agent skills (governance, etc.)
│   └── lawmodel1-governance/              # Governance agent — single source of truth
├── app/                                   # Next.js Application (Evidence Hub UI)
│   ├── app/api/                           # 22 API route directories
│   └── app/[page]/                        # 15 UI pages
├── gems/                                  # Gem Registry (modular pipeline definitions)
│   ├── registry.json                      # Master manifest of all 10 gems
│   └── README.md                          # Quick reference
├── schemas/                               # SQL schema definitions (canonical)
├── scripts/                               # Functional Utilities & One-time Scripts
│   ├── rag_law_assistant.py               # CLI RAG Companion
│   ├── update_chain_of_custody.py         # Evidence hashing/tracking
│   └── ...
├── data/                                  # Current "Source of Truth" Data
│   ├── MBOX_LOCKER/                       # 8GB mbox_metadata.db (402k+ emails)
│   ├── evidence_hub.db                    # Canonical evidence store (643k+ records)
│   ├── players.db                         # Person Intelligence (44 profiles)
│   ├── chat_master.db                     # Consolidated iMessages (186k+)
│   └── *_LOCKER/                          # 20+ organized evidence lockers
├── chatdb_storage/                        # iMessage forensic storage
│   └── m1studio_2025-05-31.../db/decoded/ # Official 18k LG/JZ thread
├── ingest/                                # Forensic Ingestion Layer
├── docs/                                  # Documentation & evidence flow diagram
├── ...
```

## Setup

### 1. Pull Models
```bash
ollama pull qwen2.5:32b-instruct
ollama pull nomic-embed-text
```

### 2. Physical Ingestion
Run the scripts in `ingest/` to populate `data/evidence_cards.db` and the Vector index.

### 3. Start RAG
```bash
cd app && npm run dev
```
