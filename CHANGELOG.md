# Changelog

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
