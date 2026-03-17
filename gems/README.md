# LawModel1 Gem Registry

Gems are modular evidence pipeline definitions. Each gem declares its inputs, outputs, processing scripts, schemas, dependencies, and downstream consumers (API routes + UI pages).

## Active Gems

| Gem | Description | Dependencies |
|:----|:-----------|:-------------|
| `gem-email-mbox` | Gmail MBOX ingest → mbox_metadata.db | — |
| `gem-imessage-chatdb` | iMessage chat.db → chat_master.db | — |
| `gem-financial-txns` | Bank/Printavo/Amazon → workbench.db | — |
| `gem-tax-returns` | 1120-S + K-1 → workbench.db | gem-financial-txns |
| `gem-players` | LinkedIn/profiles → players.db | — |
| `gem-legal-docs` | Court PDFs → ChromaDB + BM25 | — |
| `gem-transcripts` | Call recordings → workbench.db | — |
| `gem-evidence-cards` | All sources → evidence_hub.db | email, imessage, financial, players |
| `gem-rag-search` | ChromaDB + BM25 → LLM answers | evidence-cards, legal-docs |
| `gem-chain-of-custody` | Provenance + audit tracking | email, imessage, financial |
| `gem-paralegal-exports` | Attorney export packages → exhibits + letters | evidence-cards, players, chain-of-custody |

## How It Works

1. **Read `registry.json`** to understand all pipeline connections
2. Before modifying any gem's scripts/schemas, check its dependencies and dependents
3. If a change affects outputs, trace all downstream gems that consume that output
4. Consult `.agent/skills/lawmodel1-governance/SKILL.md` for naming and schema rules

## Adding a New Gem

1. Add the gem definition to `registry.json`
2. Register any new schemas in `schemas/`
3. Update the governance SKILL.md database/schema registry
4. Update `docs/evidence_flow.html` with the new pipeline node
