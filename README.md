# Legal & Forensic RAG Assistant v2.0

A local AI-powered legal and financial forensic assistant with **hybrid search** (BM25 + vector), **cross-encoder reranking**, and a **unified evidence hub** tying together legal PDFs, emails, iMessages, Printavo, QuickBooks, and bank/credit-card data — all running on your Apple M4 Max using a single `qwen2.5-32b-forensic` model.

## Features

- **Unified Financial Hub**: Consolidation of ~24k RBC and Printavo records with cross-linking to evidence.
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

## Project Structure

```text
lawmodel1/
├── app/                                   # Next.js Application (Evidence Hub UI)
├── scripts/                               # Functional Utilities & One-time Scripts
│   ├── rag_law_assistant.py               # CLI RAG Companion
│   ├── update_chain_of_custody.py         # Evidence hashing/tracking
│   └── ...
├── data/                                  # Current "Source of Truth" Data
│   ├── MBOX_LOCKER/                       # 8GB mbox_metadata.db
│   ├── transcripts/                       # Extracted message log CSVs
│   ├── players.db                         # Person Intelligence profiles
│   └── ...
├── chatdb_storage/                        # iMessage forensic storage
│   └── m1studio_2025-05-31.../db/decoded/ # Official 18k LG/JZ thread
├── ingest/                                # Forensic Ingestion Layer
└── ...
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