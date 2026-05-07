# Pipeline README — Rowboat Creative Evidence Pipeline

## Architecture

```
pipeline/
├── work-queue/
│   ├── inbox/          ← Drop evidence here to trigger intake
│   ├── in-progress/    ← Worker claims item by moving it here
│   ├── completed/      ← Intake worker moves here after cataloging
│   └── failed/         ← Errors: original + .error log
├── artifacts/
│   ├── 01-intake/      ← Intake Worker output (.json catalog entries)
│   ├── 02-paralegal/   ← Paralegal Worker output (.md 7-part analyses)
│   ├── 03-attorney/    ← Attorney Worker output (admissions library, etc.)
│   ├── 04-accounting/  ← Accountant Worker output (financial cross-refs)
│   └── 05-packaging/   ← Final court-ready package
├── state/
│   └── pipeline-state.json   ← Master state file
└── logs/
    └── YYYY-MM-DD_<worker>.log
```

## Work Item Format (inbox drop)

Place a JSON file in `work-queue/inbox/`:

```json
{
  "source_path": "/absolute/path/to/evidence",
  "source_type": "transcript|email|financial|imessage|document",
  "priority": "normal|high|low",
  "notes": "Optional context for intake worker"
}
```

Filename convention: `{YYYY-MM-DD}_{source_type}_{slug}.json`

## Queue Protocol

1. **Drop**: JSON placed in `inbox/`
2. **Claim**: Intake worker moves to `in-progress/`, writes `.claimed_by` marker
3. **Process**: Intake worker catalogs, hashes, extracts metadata
4. **Complete**: Output written to `artifacts/01-intake/`, item moved to `completed/`
5. **Promote**: Pipeline state updated — Stage 02 unblocks when Stage 01 completes

## Stage Progression

```
01-intake (para_01_bot) → 02-paralegal (para_02_bot) → 03-attorney → 04-accounting → 05-packaging
```

Each stage auto-unblocks when its upstream stage completes all items. Downstream workers poll `pipeline-state.json` or cron triggers when `blocked → ready`.
