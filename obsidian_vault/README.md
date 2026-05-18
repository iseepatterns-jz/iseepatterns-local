# Rowboat Creative LLC — Case Knowledge Graph

Obsidian vault for Guariglia v. Zangrilli, Case 2024CH00720 (Cook County Chancery Division).

## Structure

| Directory | What |
|---|---|
| `entities/` | People, banks, companies, law firms — one note each |
| `claims/` | 11 claims with legal elements, evidence tables, gap analysis |
| `timeline/` | Master chronology 2014-2026 with Dataview query |
| `dashboards/` | Claim status tracker, evidence tracker, witness binder template |
| `templates/` | Entity and claim note templates |
| `.obsidian/` | Plugin config: Dataview, Calendar, Kanban, Excalidraw, Git |

## Quick Links

- [[dashboards/Claim-Status]] — all 11 claims at a glance
- [[timeline/00-Master-Timeline]] — full case chronology
- [[entities/Rowboat-Creative-LLC]] — entity overview

## Plugins to Enable

First launch: Settings → Community Plugins → Enable all 8:
- Dataview (query-driven dashboards)
- Templater (note templates)
- Calendar (timeline visualization)
- Kanban (claim workflow tracking)
- Excalidraw (visual timelines)
- Obsidian Git (auto-commit to iseepatterns-local)
- Tag Wrangler (tag management)
- Linter (note consistency)

## SSOT References

This vault is a THIN LAYER on the authoritative databases. Evidence links use these formats:

- Email: `evidence_hub.db:email:ID`
- iMessage: `chat_case_only.db:Chat3:YYYY-MM-DD`
- Transcript: `Transcript: YYYY-MM-DD`
- Forensic analysis: `_analysis_outputs/...`

Full text always lives in the SSOT — this vault carries metadata and relationships.
