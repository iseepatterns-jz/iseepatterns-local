# Changelog

## 2026-03-26 — Evidence Hub: Playlist Decommissioning, Pivot Filters & Workbench Stabilization

### Critical Fixes
- **Workbench Key Collision Fix** — Resolved a React "duplicate key" error that caused UI instability in `app/workbench/page.tsx`. Implemented `GROUP BY rfc822_id` in the API and transitioned to composite keys in the frontend.
- **SyntaxError Resolution** — Removed orphaned fetch calls to `/api/conversations` that caused JSON parsing errors in the Evidence Hub. The page now loads correctly.
- **Icon Regression Fix** — Restored `Trash2` and `Plus` icons unintentionally removed during cleanup.

### Features
- **Context Menu Pivot Filter** — Implemented a right-click menu for email results. Users can now pivot search results to a specific account or domain within a ±3 day window of the selected record, with automatic state synchronization.

### Decommissioning
- **Conversation Playlists** — Fully removed the playlist sidebar and picker modal.
- **Agent History UI** — Removed residual agent history UI from the sidebar and dashboard.

### Files Changed
- `app/app/evidence-hub/page.tsx` — Cleanup of playlist state; implementation of Pivot Context Menu.
- `app/app/workbench/page.tsx` — Robustified React keys for evidence items.
- `app/app/api/workbench/evidence/route.ts` — Added de-duplication for email queries.
- `app/components/Sidebar.tsx` — Removed agent history navigation.
- `api_server.py` — Removed old conversation routes.

---


## 2026-03-24 — Workbench: Evidence Persistence, Preview & Cleaning Flags

### Critical Fixes
- **Evidence Display** — Rewrote `GET /api/workbench/evidence` to query `evidence_assignments` from workbench.db, then join with `mbox_metadata.db` for email metadata. Previously the endpoint only scanned the filesystem for `.eml` files and never read DB assignments.
- **Preview Rendering** — Fixed `GET /api/workbench/preview` column mapping: `msg_id`→`rfc822_id`, `sender`→`from_addr`, `date`→`date_sent`. Added `to_addr` and `cc_addr` for complete header rendering.
- **Section Item Counts** — Updated `GET /api/workbench/sections` to include DB assignment counts (not just physical file counts), so sections correctly show "3 items" instead of "0 items".
- **Assignment Route** — Fixed `POST /api/workbench/assign` to query the `emails` table (not `messages`) with correct columns (`rfc822_id`, `zip_source`, `mbox_source`).
- **Unique Index** — Added `idx_evidence_assignments_unique` on `(evidence_id, evidence_type, target_section)` for `ON CONFLICT` upsert support.

### Features
- **Flag for Cleaning** — Wired the "Flag for Cleaning" button to `POST /api/workbench/cleaning`. Captures detected cleaning issues (signatures, quoted replies, encoding) and stores them in `cleaning_overrides` with full audit trail. Button shows green "✓ Flagged" state after click.
- **cleaning_overrides Table** — Created versioned cleaning override table with supersede chains for tracking cleanup decisions.

### Files Changed
- `app/api/workbench/evidence/route.ts` — Rewritten email branch to query assignments
- `app/api/workbench/preview/route.ts` — Fixed column names, added To/CC headers
- `app/api/workbench/sections/route.ts` — Added assignment count to totalItems
- `app/api/workbench/assign/route.ts` — Fixed table and column references
- `app/workbench/page.tsx` — Wired Flag for Cleaning with state, handler, visual feedback
- `app/globals.css` — Added `.flagged-active` and `:disabled` styles
- `schemas/missing_schemas.sql` — Added unique index and cleaning_overrides table

---

## 2026-03-24 — Evidence Hub: Workbench Integration & Thread Enhancements

### Features
- **Workbench Section Assignment** — New yellow `📁 Section` button in Evidence Hub detail header assigns any evidence item to a Workbench exhibit section via `POST /api/workbench/assign`
- **Thread-Level Bulk Assign** — Select individual or all emails in a thread and assign them to Workbench sections in one click
- **Playlist Unlocked for All Types** — Green `+ Playlist` button now appears for all source types (email, financial, court), not just iMessage
- **Thread Checkboxes** — Per-email checkboxes in thread view with Select All / Deselect All toggle

### Performance
- **Thread Resolution Optimization** — Removed `refs LIKE '%..%'` full table scans; thread resolution now uses indexed lookups exclusively (`rfc822_id`, `in_reply_to`)
- **Recursive Thread Expansion** — 3-pass recursive expansion algorithm discovers messages via `References` / `In-Reply-To` chains, matching Apple Mail behavior
- **FTS5 Search Guard** — 3-character minimum query length prevents server-blocking full-table scans

### UI Fixes
- **Detail Panel Overflow** — Applied `minWidth: 0` and `overflow: hidden` to flex containers, preventing thread content from pushing outside viewport
- **Tab Bar Responsive** — Detail tab bar wraps and scrolls horizontally when panel is narrow
- **Action Button Wrapping** — Header action buttons (Ask AI, Playlist, Section, Thread) wrap responsively instead of clipping

### Files Changed
- `app/evidence-hub/page.tsx` — UI: section picker, thread checkboxes, playlist unlock, layout fixes
- `app/api/communications/[id]/thread/route.ts` — Recursive thread resolution, body cleaning
- `app/api/evidence-hub/route.ts` — FTS5 search guard
