---
description: Generate NotebookLM deepdive audio overviews from new case evidence
---

# gem-notebooklm — NotebookLM Deepdive Audio Overviews

This workflow generates case-context briefs and launches NotebookLM deep-dive audio overviews from the latest evidence.

## Usage

### Quick: New Evidence Spotlight (default on ready_bag)
```bash
python scripts/notebooklm_deepdive.py --template new-evidence-spotlight
```

### All 5 templates at once
```bash
python scripts/notebooklm_deepdive.py
```

### Dry run (generate briefs only, no NotebookLM)
```bash
python scripts/notebooklm_deepdive.py --dry-run
```

### List available templates
```bash
python scripts/notebooklm_deepdive.py --list-templates
```

## Templates

| ID | Name | Duration |
|---|---|---|
| `full-case-overview` | Master litigation briefing | ~35 min |
| `new-evidence-spotlight` | War room review of new evidence | ~20 min |
| `financial-crimes` | PPP, draws, QuickBooks, K-1 fraud | ~30 min |
| `sg-employment-timeline` | The fake employee scheme | ~25 min |
| `agency-referral-brief` | FBI / IRS / SBA / State AG referrals | ~20 min |

## Workflow Steps

1. **Run the script** — it queries `evidence_hub.db`, builds timestamped briefs in `data/AUDIO_OVERVIEW_LOCKER/briefings/`

2. **Open NotebookLM** — https://notebooklm.google.com/

3. **Create a new notebook** — name it the timestamped title shown in the script output (e.g., `RC-2026 Deepdive — 2026-03-16_14-30`)

4. **Upload the brief(s)** — add each `.md` file from `data/AUDIO_OVERVIEW_LOCKER/briefings/` as a source

5. **Generate Audio Overviews** — for each source:
   - Click **Audio Overview** in the left sidebar
   - Click **Customize**
   - Paste the prompt from the "Audio Overview Instructions" section of the brief
   - Select **Detailed, long discussion**
   - Click **Generate**

6. **Download the MP3** — once generated, click the download icon and save to:
   ```
   data/AUDIO_OVERVIEW_LOCKER/{session_id}/
   ```

7. **Update the index** — the index is at `data/AUDIO_OVERVIEW_LOCKER/index.json`
   - Add the notebook URL to the session record

## Auto-triggers

### On ready_bag (automatic)
```bash
python scripts/save_ready_bag.py                    # fires new-evidence-spotlight
python scripts/save_ready_bag.py --all-nlm-templates  # fires all 5 templates
```

### On git push (install hook first)
```bash
# Install the hook (one-time setup):
cp gems/notebooklm_hook.sh .git/hooks/post-push
chmod +x .git/hooks/post-push

# Then every git push auto-fires the new-evidence spotlight
git push origin main

# To generate all 5 templates on this push:
ALL_NLM=1 git push origin main

# To skip NLM on a push:
SKIP_NLM=1 git push origin main
```

## Output Structure

```
data/AUDIO_OVERVIEW_LOCKER/
├── index.json                           # Session registry
├── briefings/                           # Auto-generated case briefs
│   ├── 2026-03-16_14-30_full-case-overview.md
│   ├── 2026-03-16_14-30_new-evidence-spotlight.md
│   └── ...
└── 2026-03-16_14-30/                    # Session folder for audio downloads
    ├── full-case-overview.mp3
    ├── new-evidence-spotlight.mp3
    └── ...
```
