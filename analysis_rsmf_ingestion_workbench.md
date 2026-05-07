# RSMF Ingestion & Workbench Verification — Analysis
**Date:** May 3, 2026  
**Case:** Rowboat Creative, LLC  

## Query 1: "Ingest RSMF to populate the lawmodel1 workbench UI"

### RSMF Ingestion
- **Source:** `exports/SHOWGOAT_RSMF_LOCKER/LUCAS_GUARIGLIA/Messages - Lucas Guariglia.rsmf` (5.27 GB)
- **Parser:** Custom Python converter `scripts/rsmf_to_workbench_v2.py` — parses MIME multipart (`--_RSMF_Boundary_Delimiter_`) with 3-line sliding window
- **Output:** `data/IMESSAGE_LOCKER/Messages/chat_case_only.db` (bridge DB)
- **Result:** 184,522 messages ingested into `messages` table
- **Schema:** ROWID, guid, text, contact_name, contact_phone, date, date_local, is_from_me, is_read, service

### App Server (critical finding)
Next.js 16 (Turbopack) cannot operate on external APFS volumes directly — permission denied errors. **Workaround:** copy app to internal SSD (`/tmp/lawmodel1-app`) and run with `--webpack` flag to avoid Turbopack.

**Working command:**
```bash
cd /tmp/lawmodel1-app
NEXT_TELEMETRY_DISABLED=1 npx next dev --webpack -p 3300
```
With data symlinked: `data/IMESSAGE_LOCKER/Messages/chat_case_only.db` → external volume.

### Verification
- `GET /workbench` → **HTTP 200**
- `GET /api/workbench/sections` → `{"sections":[],"totalSections":0,"totalItems":0}` (no sections created yet — UI shows "Loading…")
- `GET /api/workbench/evidence?type=text` → **50 messages returned**, including key Jan 5, 2024 exchange (Joseph confronting Lucas about unauthorized CC use, theft)

### Evidence Immediately Visible
The first page of text evidence (50 messages) already surfaces the partnership breakdown:
- Jan 5, 2024: Lucas blocked Joseph from seeing CC transactions. Joseph confronts Lucas about: unauthorized purchases, side deals with Analog Motorcycles, Lollapalooza tickets, Steely Dan concert, funeral/wedding trips, bachelorette party planes, wine shipments, gas fillups with no travel
- "You realize you are in prison area here right?" — Joseph to Lucas
- "I think you forget you are not sole owner" — Joseph to Lucas
- "Just because you live in NC entitles you to free airfare and weekend get aways?" — Joseph to Lucas

## Query 2: "How can we raise the iteration budget?"

### Current Architecture
- `delegate_task` spawns subagents; each is bounded by tool call limits
- Two-level delegation available (orchestrator role + `delegation.max_spawn_depth: 2`)
- Batch parallel execution: `delegate_task(tasks=[...])` runs up to `delegation.max_concurrent_children` tasks concurrently (default 3)

### Strategies Used in This Session
1. **Batch delegation:** Multiple independent subtasks run in parallel (e.g., file search + API testing)
2. **Non-interactive children:** Subagents are leaf workers (no clarify/memory) — zero user-interaction overhead
3. **Direct tool calls:** Single-tool operations bypass delegation overhead entirely
4. **Background processes:** Long-running tasks (server, data conversion) use `terminal(background=true, notify_on_complete=true)` to free up the main loop

### Tuning Knobs
| Parameter | What It Does |
|---|---|
| `delegation.max_concurrent_children` | How many parallel subagents can run (default 3) |
| `delegation.max_spawn_depth` | Nesting depth for subagent trees (default 2) |
| Tool call limits | Per-agent iteration caps (system-level, not exposed to subagents) |

## Status Summary

| Component | Status |
|---|---|
| RSMF ingested | ✓ 184,522 messages |
| Bridge DB populated | ✓ `chat_case_only.db` |
| Dev server running | ✓ port 3300, webpack mode |
| Workbench UI loads | ✓ HTTP 200 |
| Sections API | ✓ (empty — needs section creation) |
| Evidence API | ✓ 50/184,522 messages per page |
| Text message content | ✓ Verified — Jan 5 confrontation visible |

## Next Steps (not ordered)
1. Create exhibit sections in the workbench (currently 0)
2. Assign evidence items to sections
3. Bring up additional evidence types (Email, Transcript tabs)
4. Test the Correlator, Timeline, Financials, and Strategy pages
5. Monitor server stability on local SSD — restart required if machine reboots
