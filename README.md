# Legal & Forensic RAG Assistant v2.0

A local AI-powered legal and financial forensic assistant with **hybrid search** (BM25 + vector), **cross-encoder reranking**, and a **unified evidence hub** tying together legal PDFs, emails, iMessages, Printavo, QuickBooks, and bank/credit-card data — all running on your Apple M4 Max using a single `qwen2.5-32b-forensic` model.

- **Workflow-Driven UI**: Reorganized into logical investigation stages:
  - **Recon**: Evidence Hub & Communications.
  - **Analyze**: Correlator & Player Profiles.
  - **Strategize**: Case Corner & Legal Library.
  - **Present**: Briefing Room.
- **Consolidated Dashboard Hubs**: Unified entry points for "Discovery Hub" (Emails/Texts/Transcripts) and "Strategy Hub" (Claims/Legal).
- [x] **Unified Financial Hub**: Consolidation of ~24k RBC and Printavo records with **forensic governance enhancements**:
  - **SQLite System of Record**: Moved 22,000+ Master records into `master_transactions` for indexed, high-performance matching.
  - **Audit Logging & Chain of Custody**: Mandatory `master_audit_log` tracks every manual adjustment or forensic verification.
  - **Account & Player Pre-filling**: Automatically maps bank account numbers and Rosetta users (JZ, LG, PH) to transactions.
  - **Evidence Tracing (DOC Column)**: Direct clickable links to invoices and receipts from the master sheet.
  - **Forensic Finalization**: Atomic "Dual-Write" model updates the DB and auto-exports a synced Master CSV for the accountant.
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

## Case Management & Governance

### 1. Starting a New Case (Reset Procedure)
To begin a fresh investigation while preserving original data repositories, use the standardized reset procedure:
```bash
# 1. Reset Evidence Hub (Drops and recreates schema)
python3 -m ingest.evidence_hub_init --reset

# 2. Clear Player & Brain Hubs
sqlite3 data/players.db "DELETE FROM players; DELETE FROM player_files;"
sqlite3 brains.db "DELETE FROM tasks; DELETE FROM subtasks; DELETE FROM brains;"
```
*Note: This process strictly preserves `/data/MBOX_LOCKER` and `/data/IMESSAGE_LOCKER` forensic sources.*

### 2. Governance Architecture
This project uses a three-pillar governance framework to ensure unity and harmony across all evidence pipelines:

#### A. Governance Agent
**`.agent/skills/lawmodel1-governance/SKILL.md`** — The single source of truth for project standards.
- **Forensic Security**: All evidence-heavy root directories (e.g., `legal_docs_business/`) are strictly ignored by Git to prevent data leakage.
- **Canonical IDs**: Strict mapping rules for `message_id`, `nexus_uuid`, and `txn_id`.

#### B. Gem Registry
**`gems/registry.json`** — 10 modular evidence pipeline definitions. All core utility scripts (e.g., `extract_per_contact_dbs.py`) must be registered in the registry to maintain architectural integrity.

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
│   ├── app/api/                           # 24 API route directories
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
│   ├── FORENSIC_VERIFICATION_LOCKER/        # Archived reconciliation audit results
│   ├── evidence_hub.db                    # Canonical evidence store (643k+ records)
│   ├── players.db                         # Person Intelligence (44 profiles)
│   ├── chat_master.db                     # Consolidated iMessages (186k+)
│   └── *_LOCKER/                          # 20+ organized evidence lockers
├── chatdb_storage/                        # iMessage forensic storage (raw — NEVER MODIFY)
│   ├── imac_2025-06-01.../                # iMac backup (603k msgs, 57 GB attachments)
│   │   ├── chat.db                        # Original raw DB
│   │   ├── Attachments/                   # 33k files (photos, videos, docs)
│   │   └── CloudKitMetaData/, StickerCache/
│   ├── m1studio_2025-05-31.../            # M1 Studio backup (501k msgs, 72 GB attachments)
│   │   ├── db/decoded/...db               # Decoded DB (has decodedBody column)
│   │   ├── Attachments/                   # 41k files
│   │   └── CloudKitMetaData/, StickerCache/, NickNameCache/, Caches/
│   └── consolidated_investigation.db      # Merged investigation DB
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
