# Legal & Forensic RAG Assistant v2.0

A local AI-powered legal and financial forensic assistant with **hybrid search** (BM25 + vector), **cross-encoder reranking**, and a **unified evidence hub** tying together legal PDFs, emails, iMessages, Printavo, QuickBooks, and bank/credit-card data — all running on your Apple M4 Max using a single `qwen2.5-32b-forensic` model.

## Features

- **Hybrid Search**: BM25 keyword matching + vector similarity (RRF) over normalized “evidence cards.”
- **Cross-Encoder Reranking**: FlashRank reranker to eliminate false-positive chunks.
- **Category & Source Filtering**: Filter by document type (complaints, motions, receiver reports, etc.) and by evidence source (emails, iMessages, legal PDFs, financials, Printavo, QuickBooks, bank/CC).
- **Source Attribution**: Every answer cites explicit IDs (Message-IDs, Bates, invoice/PO numbers, ledger IDs, master sheet row IDs) and filenames/pages for traceability.
- **Unified Evidence Cards**: All raw data (PDFs, emails, chat.db, CSVs, QuickBooks attachments) is normalized into structured `EvidenceCard` JSON with summaries, bullets, timestamps, participants, and IDs.
- **Dual Personas on One Model**:
  - **Analyst**: Deep forensic reasoning across evidence cards.
  - **Synthesizer**: Short, citation-heavy answers for UI.
- **Optimized for M4 Max**: Uses `qwen2.5-32b-forensic` (derived from `qwen2.5:32b-instruct`, `num_ctx=8192`, `temp=0.2`) for fast, high-quality local answers.

## Project Structure

```text
lawmodel1/
├── app/                                   # Next.js / RAG application (iseepatterns)
│   └── ...                                # API routes, UI, agents
├── rag_law_assistant.py                   # CLI legal RAG assistant (legacy/companion)
├── ingest/                                # Python Forensic Ingestion Layer
│   ├── evidence_card.py                   # Unified Schema
│   ├── pdf_ingest.py                      # OCR + Unstructured
│   ├── email_ingest.py                    # MBOX/EML Parser
│   ├── imessage_ingest.py                 # Chat.db Parser
│   └── load_to_sqlite.py                  # Normalization to DB
├── data/
│   ├── evidence_cards/                    # Normalized EvidenceCard JSON records
│   ├── financial/
│   │   ├── financial_hub.db               # SQLite hub for Printavo + master sheet
│   │   ├── ... (CSVs)
│   │   └── quickbooks/
│   │       ├── ... (CSVs)
│   │       └── attachments/              # Scanned QB receipts/invoices
│   └── chatdb/                            # iMessage chat.db source
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