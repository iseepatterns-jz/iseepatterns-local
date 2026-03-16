#!/usr/bin/env python3
"""
notebooklm_deepdive.py — gem-notebooklm Orchestrator
══════════════════════════════════════════════════════
Fires during `save_ready_bag.py` or standalone to:
  1. Query the evidence_hub.db for new/recent evidence
  2. Generate a case-context brief (markdown source)
  3. Create a timestamped NotebookLM notebook
  4. Upload the brief as a source
  5. Generate audio overviews using one or more templates
  6. Download the resulting MP3s to AUDIO_OVERVIEW_LOCKER/

Usage:
  python scripts/notebooklm_deepdive.py                     # All templates
  python scripts/notebooklm_deepdive.py --template full-case-overview
  python scripts/notebooklm_deepdive.py --template new-evidence-spotlight
  python scripts/notebooklm_deepdive.py --days 7            # Last 7 days of new evidence
  python scripts/notebooklm_deepdive.py --dry-run            # Show brief only, don't open NotebookLM
"""

import os
import sys
import json
import argparse
import sqlite3
import subprocess
import shutil
import hashlib
from pathlib import Path
from datetime import datetime, timedelta, timezone

# ──────────────── PATHS ────────────────
BASE_DIR       = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
EVIDENCE_HUB   = BASE_DIR / "data" / "evidence_hub.db"
CHAT_DB        = BASE_DIR / "data" / "chat_master.db"
LOCKER         = BASE_DIR / "data" / "AUDIO_OVERVIEW_LOCKER"
TEMPLATES_FILE = BASE_DIR / "prompts" / "notebooklm_templates.json"
SKILL_DIR      = BASE_DIR / ".agent" / "skills" / "notebooklm" / "scripts"
BRIEFINGS_DIR  = BASE_DIR / "data" / "AUDIO_OVERVIEW_LOCKER" / "briefings"
INDEX_FILE     = LOCKER / "index.json"

# notebooklm skill runner
NLM_RUNNER     = SKILL_DIR / "run.py"

# ──────────────── LOGGING ────────────────
def log(msg, level="INFO"):
    icon = {"INFO": "[*]", "OK": "[✓]", "WARN": "[!]", "ERR": "[✗]"}.get(level, "[*]")
    print(f"{icon} {msg}")


# ──────────────── EVIDENCE DIGEST ────────────────
def get_new_evidence(days: int = 30) -> list[dict]:
    """Pull evidence_hub.db records created in the last N days."""
    if not EVIDENCE_HUB.exists():
        log(f"evidence_hub.db not found at {EVIDENCE_HUB}", "WARN")
        return []

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows = []

    try:
        with sqlite3.connect(EVIDENCE_HUB) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                """
                SELECT e.id, e.title, e.description, e.evidence_date,
                       e.source_type, e.significance_score, e.tags,
                       e.created_at, e.summary
                FROM evidence e
                WHERE e.created_at >= ?
                ORDER BY e.evidence_date DESC
                LIMIT 100
                """,
                (cutoff,)
            )
            rows = [dict(r) for r in cur.fetchall()]
            log(f"Found {len(rows)} evidence records created in last {days} days", "OK")
    except Exception as ex:
        log(f"Error querying evidence_hub.db: {ex}", "WARN")

    return rows


def get_evidence_stats() -> dict:
    """Get overall evidence hub statistics."""
    if not EVIDENCE_HUB.exists():
        return {}
    try:
        with sqlite3.connect(EVIDENCE_HUB) as conn:
            stats = {}
            # Total counts by type
            rows = conn.execute(
                "SELECT source_type, COUNT(*) as cnt FROM evidence GROUP BY source_type ORDER BY cnt DESC"
            ).fetchall()
            stats["by_type"] = {r[0]: r[1] for r in rows}
            stats["total"] = sum(stats["by_type"].values())

            # Most recent entry
            row = conn.execute("SELECT MAX(created_at) FROM evidence").fetchone()
            stats["last_ingested"] = row[0] if row else "unknown"

            # High-significance items
            row = conn.execute(
                "SELECT COUNT(*) FROM evidence WHERE significance_score >= 7"
            ).fetchone()
            stats["high_significance"] = row[0] if row else 0

        return stats
    except Exception:
        return {}


# ──────────────── BRIEF GENERATOR ────────────────
def generate_brief(new_evidence: list[dict], template_id: str, templates: dict) -> str:
    """Build a markdown context brief to upload as a NotebookLM source."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    stats = get_evidence_stats()

    # Find the template
    template = next(
        (t for t in templates["templates"] if t["id"] == template_id),
        templates["templates"][0]
    )

    preamble = templates.get("case_context_preamble", "")
    prompt   = template["audio_overview_prompt"]

    lines = [
        f"# Rowboat Creative Case — NotebookLM Briefing Package",
        f"## Session: {now} | Template: {template['name']}",
        "",
        "---",
        "",
        preamble,
        "",
        "## Evidence Repository Status",
        f"- **Total evidence items:** {stats.get('total', 'unavailable')}",
        f"- **High-significance items (score >= 7):** {stats.get('high_significance', 'unavailable')}",
        f"- **Last ingested:** {stats.get('last_ingested', 'unknown')}",
        "",
    ]

    if stats.get("by_type"):
        lines.append("### Evidence by Type")
        for src_type, cnt in stats["by_type"].items():
            lines.append(f"- {src_type}: {cnt} records")
        lines.append("")

    if new_evidence:
        lines += [
            f"## New Evidence (Last Session)",
            f"The following {len(new_evidence)} evidence items were recently added or discovered:",
            "",
        ]
        for i, ev in enumerate(new_evidence[:50], 1):  # cap at 50
            tags = ev.get("tags", "") or ""
            significance = ev.get("significance_score", "?")
            ev_date = ev.get("evidence_date", "")[:10] if ev.get("evidence_date") else "unknown"
            lines += [
                f"### {i}. [{ev.get('source_type','?').upper()}] {ev.get('title', 'Untitled')}",
                f"**Date:** {ev_date} | **Significance:** {significance}/10 | **Tags:** {tags}",
                "",
                ev.get("summary") or ev.get("description") or "(No summary available)",
                "",
            ]
    else:
        lines += [
            "## Evidence Summary",
            "No new evidence was flagged in the last session. This overview covers the full case file.",
            "",
        ]

    lines += [
        "---",
        "",
        "## Audio Overview Instructions",
        "",
        "**Use the following prompt for the NotebookLM Audio Overview generation:**",
        "",
        "---",
        "",
        prompt,
        "",
        "---",
        "",
        f"*Generated by gem-notebooklm | {now} | case_id: RC-2026*",
    ]

    return "\n".join(lines)


# ──────────────── NOTEBOOKLM INTEGRATION ────────────────
def create_notebook_via_nlm(title: str, brief_path: Path) -> str | None:
    """
    Use the notebooklm skill CLI to create a notebook and upload the brief.
    Returns the notebook URL if successful, else None.
    
    NOTE: The notebooklm skill uses browser automation. This creates the notebook
    interactively via ask_question.py / browser_session.py CLI.
    """
    if not NLM_RUNNER.exists():
        log(f"NotebookLM skill runner not found at {NLM_RUNNER}", "ERR")
        return None

    skill_cwd = SKILL_DIR.parent  # /Volumes/.../notebooklm/

    # Step 1: Check auth status
    log("Checking NotebookLM authentication status...")
    result = subprocess.run(
        [sys.executable, str(NLM_RUNNER), "auth_manager.py", "status"],
        capture_output=True, text=True, cwd=str(skill_cwd)
    )
    log(f"Auth status: {result.stdout.strip()[:200]}")

    # Step 2: We output instructions for the agent to follow interactively
    # The notebooklm skill requires manual browser interaction for notebook creation
    # We'll provide the complete ready-to-use brief path and instructions
    log("", "OK")
    log("NotebookLM notebook creation requires an agent browser session.", "WARN")
    log("The brief has been prepared and is ready to upload.", "OK")
    log(f"  Brief location: {brief_path}", "OK")
    log("  Notebook title: " + title, "OK")

    return None  # Will be registered manually or via agent


def generate_audio_via_browser(notebook_url: str, template: dict, session_dir: Path) -> bool:
    """
    Use the notebooklm browser skill to navigate to the notebook and trigger
    Audio Overview generation. Uses ask_question.py as the entry point.
    """
    if not NLM_RUNNER.exists():
        return False

    skill_cwd = SKILL_DIR.parent

    question = (
        f"Please trigger Audio Overview generation for this notebook. "
        f"The template is: {template['name']}. "
        f"If the Audio Overview panel shows 'Generate' or 'Customize', click it and select "
        f"the longest/most detailed option available. "
        f"After generation, download the audio file and save it."
    )

    log(f"Requesting audio overview via NLM browser: {template['name']}")
    result = subprocess.run(
        [sys.executable, str(NLM_RUNNER), "ask_question.py",
         "--question", question,
         "--notebook-url", notebook_url],
        capture_output=True, text=True, cwd=str(skill_cwd),
        timeout=300
    )

    if result.returncode == 0:
        log(f"Audio overview initiated: {template['name']}", "OK")
        return True
    else:
        log(f"Audio overview error: {result.stderr[:300]}", "WARN")
        return False


# ──────────────── INDEX MANAGEMENT ────────────────
def load_index() -> dict:
    """Load the AUDIO_OVERVIEW_LOCKER index."""
    if INDEX_FILE.exists():
        with open(INDEX_FILE) as f:
            return json.load(f)
    return {"sessions": []}


def save_index(index: dict):
    """Save the AUDIO_OVERVIEW_LOCKER index."""
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)


def register_session(session_id: str, notebook_title: str, brief_path: Path, 
                     templates_used: list[str], notebook_url: str = None):
    """Register a new deepdive session in the locker index."""
    index = load_index()
    session = {
        "session_id": session_id,
        "created_at": datetime.now().isoformat(),
        "notebook_title": notebook_title,
        "notebook_url": notebook_url,
        "brief_path": str(brief_path),
        "templates": templates_used,
        "audio_files": [],
        "status": "brief_ready"
    }
    index["sessions"].append(session)
    save_index(index)
    log(f"Session registered: {session_id}", "OK")
    return session


# ──────────────── MAIN ORCHESTRATOR ────────────────
def run(args):
    # Load templates
    if not TEMPLATES_FILE.exists():
        log(f"Templates file not found: {TEMPLATES_FILE}", "ERR")
        sys.exit(1)

    with open(TEMPLATES_FILE) as f:
        templates = json.load(f)

    # Determine which templates to use
    if args.template:
        selected = [t for t in templates["templates"] if t["id"] == args.template]
        if not selected:
            log(f"Template '{args.template}' not found. Available: {[t['id'] for t in templates['templates']]}", "ERR")
            sys.exit(1)
    else:
        selected = sorted(templates["templates"], key=lambda t: t["priority"])

    log(f"Selected {len(selected)} template(s): {[t['name'] for t in selected]}")

    # Ensure locker directories exist
    LOCKER.mkdir(parents=True, exist_ok=True)
    BRIEFINGS_DIR.mkdir(parents=True, exist_ok=True)

    # Session ID
    session_id = datetime.now().strftime("%Y-%m-%d_%H-%M")
    session_dir = LOCKER / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    # Get new evidence
    new_evidence = get_new_evidence(days=args.days)

    # Build briefs for each template
    notebook_title = f"RC-2026 Deepdive — {session_id}"
    log(f"Notebook title: {notebook_title}")

    brief_paths = []
    for template in selected:
        log(f"Generating brief for template: {template['name']}")
        brief_content = generate_brief(new_evidence, template["id"], templates)

        brief_name = f"{session_id}_{template['id']}.md"
        brief_path = BRIEFINGS_DIR / brief_name
        with open(brief_path, "w") as f:
            f.write(brief_content)
        brief_paths.append((template, brief_path))
        log(f"Brief saved: {brief_path}", "OK")

    # Dry run — just show the briefs
    if args.dry_run:
        log("─── DRY RUN COMPLETE ───", "OK")
        log(f"Generated {len(brief_paths)} brief(s). Review them at:")
        for _, bp in brief_paths:
            log(f"  {bp}")
        return

    # Register session in index
    templates_used = [t["id"] for t, _ in brief_paths]
    session = register_session(
        session_id=session_id,
        notebook_title=notebook_title,
        brief_path=brief_paths[0][1] if brief_paths else None,
        templates_used=templates_used,
        notebook_url=args.notebook_url if hasattr(args, "notebook_url") else None
    )

    # Print the agent action summary
    print()
    print("═" * 70)
    print("  gem-notebooklm — READY BAG DEEPDIVE")
    print("═" * 70)
    print()
    print(f"  Session ID   : {session_id}")
    print(f"  Notebook     : {notebook_title}")
    print(f"  New Evidence : {len(new_evidence)} items (last {args.days} days)")
    print(f"  Templates    : {len(selected)}")
    print()
    print("  NEXT STEPS FOR AGENT:")
    print()
    print("  1. Open NotebookLM: https://notebooklm.google.com/")
    print(f"  2. Create notebook titled: '{notebook_title}'")
    print(f"  3. Upload these briefs as sources:")
    for template, bp in brief_paths:
        print(f"     → [{template['id']}] {bp}")
    print()
    print("  4. For EACH brief source, generate Audio Overview:")
    print("     - Click 'Audio Overview' in the sidebar")
    print("     - Click 'Customize' → paste the template prompt from the brief")
    print("     - Select 'Long, detailed discussion'")
    print("     - Click Generate")
    print()
    print("  5. Download all audio files to:")
    print(f"     {session_dir}/")
    print()
    print("  6. Update the session record with the notebook URL:")
    print(f"     Edit: {INDEX_FILE}")
    print()
    print("═" * 70)
    print()

    # If a notebook URL was provided, attempt browser-based generation
    if hasattr(args, "notebook_url") and args.notebook_url:
        log("Notebook URL provided — attempting browser-based audio generation...")
        for template, _ in brief_paths:
            success = generate_audio_via_browser(args.notebook_url, template, session_dir)
            if success:
                log(f"Audio generation started: {template['name']}", "OK")

    log(f"Session complete. Locker: {LOCKER}", "OK")


# ──────────────── CLI ────────────────
def main():
    parser = argparse.ArgumentParser(
        description="gem-notebooklm — Generate NotebookLM deep-dive audio overviews"
    )
    parser.add_argument(
        "--template",
        help="Template ID to use (default: all). Options: full-case-overview, new-evidence-spotlight, financial-crimes, sg-employment-timeline, agency-referral-brief",
        default=None
    )
    parser.add_argument(
        "--days",
        type=int,
        default=30,
        help="Number of days of new evidence to include (default: 30)"
    )
    parser.add_argument(
        "--notebook-url",
        help="Existing NotebookLM notebook URL (skips creation step)",
        default=None
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate briefs only; do not open NotebookLM"
    )
    parser.add_argument(
        "--list-templates",
        action="store_true",
        help="List available templates and exit"
    )

    args = parser.parse_args()

    if args.list_templates:
        with open(TEMPLATES_FILE) as f:
            templates = json.load(f)
        print("\nAvailable Templates:")
        for t in templates["templates"]:
            print(f"  {t['id']:35s} — {t['name']}")
        print()
        return

    run(args)


if __name__ == "__main__":
    main()
