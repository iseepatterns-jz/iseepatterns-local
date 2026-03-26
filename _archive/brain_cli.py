#!/usr/bin/env python3
"""
brain_cli.py — Local Brain & Ready Bag Orchestrator for lawmodel1

- Parses brain/task.md markdown into brains.db (brains, tasks, subtasks)
- Wraps existing orchestrator scripts (ingest, cards, ready bag)
"""

import argparse
import json
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
DATA_DIR = BASE_DIR / "data"
BRAINS_DB = BASE_DIR / "brains.db"

# BRAIN_TASK_MD = Path(
#     "/Users/iseepatterns-ms-m4/.gemini/antigravity/brain/4c252e35-483e-4c03-9b23-7d6e23bae028/task.md"
# )
# BRAIN_TASK_METADATA = BRAIN_TASK_MD.with_name("task.md.metadata.json")

BRAIN_ROOT = Path("/Users/iseepatterns-ms-m4/.gemini/antigravity/brain")

def find_latest_task_md() -> Path:
    """Find the most recent task.md in the brain directories."""
    # List all dirs in BRAIN_ROOT, exclude _archive
    dirs = [d for d in BRAIN_ROOT.iterdir() if d.is_dir() and d.name != "_archive"]
    if not dirs:
        return None
    # Sort by modification time of the directory or task.md inside
    dirs.sort(key=lambda d: d.stat().st_mtime, reverse=True)
    
    for d in dirs:
        tm = d / "task.md"
        if tm.exists():
            return tm
    return None


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def db() -> sqlite3.Connection:
    conn = sqlite3.connect(BRAINS_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    schema = """
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS brains (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id       TEXT    NOT NULL,
        name          TEXT    NOT NULL,
        artifact_type TEXT    NOT NULL,
        summary       TEXT,
        version       INTEGER NOT NULL DEFAULT 1,
        updated_at    TEXT    NOT NULL,
        task_md_path  TEXT,
        UNIQUE(case_id, name)
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        brain_id   INTEGER NOT NULL REFERENCES brains(id) ON DELETE CASCADE,
        title      TEXT    NOT NULL,
        status     TEXT    NOT NULL,
        order_idx  INTEGER NOT NULL,
        created_at TEXT    NOT NULL,
        updated_at TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id      INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        description  TEXT    NOT NULL,
        done         INTEGER NOT NULL,
        linked_paths TEXT,
        category     TEXT,
        evidence_ids TEXT,
        order_idx    INTEGER NOT NULL
    );
    """
    with db() as conn:
        conn.executescript(schema)
    print("[*] brains.db initialized")


# ---------------------------------------------------------------------------
# Markdown parsing
# ---------------------------------------------------------------------------

def parse_task_markdown(md_text: str) -> Dict[str, Any]:
    """
    Parse your existing task.md format into a {tasks: [...]} structure.

    Heading example:
      # Task: Build Financial Hub + Evidence Cards [DONE]

    Subtasks:
      - [x] Do something
      - [ ] Do something else
    """
    tasks: List[Dict[str, Any]] = []
    current = None
    order_idx = 0
    sub_order = 0

    for line in md_text.splitlines():
        line = line.rstrip()
        if line.startswith("# Task:"):
            if current:
                tasks.append(current)

            header = line[len("# Task:"):].strip()
            status = "OPEN"
            if "[" in header and header.endswith("]"):
                title_part, status_part = header.rsplit("[", 1)
                title = title_part.strip()
                status_raw = status_part[:-1].strip()
                status = {
                    "DONE": "DONE",
                    "IN PROGRESS": "IN_PROGRESS",
                    "/": "IN_PROGRESS",
                }.get(status_raw, status_raw)
            else:
                title = header

            current = {
                "title": title,
                "status": status,
                "order_idx": order_idx,
                "subtasks": [],
            }
            order_idx += 1
            sub_order = 0

        elif line.strip().startswith("- ["):
            done = line.strip().startswith("- [x]")
            try:
                desc = line.split("]", 1)[1].strip()
            except IndexError:
                desc = ""
            if current is None:
                continue
            current["subtasks"].append(
                {
                    "description": desc,
                    "done": done,
                    "order_idx": sub_order,
                }
            )
            sub_order += 1

    if current:
        tasks.append(current)

    return {"tasks": tasks}


def refresh_brain_from_markdown(case_id: str = "rbc_v_lg"):
    def infer_task_category(title: str) -> str:
        t = title.lower()
        infra_keywords = ["hub", "pipeline", "reset", "clean", "rag", "filters", "ready bag", "synchronization", "github", "export", "package"]
        for kw in infra_keywords:
            if kw in t:
                return "infra"
        if "investigative" in t or "analysis" in t:
            return "investigative"
        return "other"


    """Parse task.md + metadata into brains.db."""
    task_md = find_latest_task_md()
    if not task_md or not task_md.exists():
        print(f"[!] No task.md found in {BRAIN_ROOT}")
        return

    md_text = task_md.read_text()
    parsed = parse_task_markdown(md_text)

    metadata_path = task_md.with_name("task.md.metadata.json")

    meta: Dict[str, Any] = {}
    if metadata_path.exists():
        meta = json.loads(metadata_path.read_text())

    summary = meta.get("summary", "")
    artifact_type = meta.get("artifactType", "ARTIFACT_TYPE_TASK")
    updated_at = meta.get("updatedAt") or datetime.utcnow().isoformat()
    version = int(meta.get("version", "1"))

    with db() as conn:
        conn.execute(
            """
            INSERT INTO brains (case_id, name, artifact_type, summary, version, updated_at, task_md_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(case_id, name) DO UPDATE SET
                artifact_type=excluded.artifact_type,
                summary=excluded.summary,
                version=excluded.version,
                updated_at=excluded.updated_at,
                task_md_path=excluded.task_md_path
            """,
            (
                case_id,
                "lawmodel1_main",
                artifact_type,
                summary,
                version,
                updated_at,
                str(task_md),
            ),
        )

        brain_id = conn.execute(
            "SELECT id FROM brains WHERE case_id=? AND name=?",
            (case_id, "lawmodel1_main"),
        ).fetchone()["id"]

        conn.execute(
            "DELETE FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE brain_id=?)",
            (brain_id,),
        )
        conn.execute("DELETE FROM tasks WHERE brain_id=?", (brain_id,))

        for t in parsed["tasks"]:
            category = infer_task_category(t["title"])
            cur = conn.execute(
                """
                INSERT INTO tasks (brain_id, title, status, order_idx, created_at, updated_at, category)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (brain_id, t["title"], t["status"], t["order_idx"], updated_at, updated_at, category),
            )
            task_id = cur.lastrowid
            for s in t["subtasks"]:
                conn.execute(
                    """
                    INSERT INTO subtasks (
                        task_id, description, done, linked_paths, category, evidence_ids, order_idx
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        task_id,
                        s["description"],
                        int(s["done"]),
                        None,
                        None,
                        None,
                        s["order_idx"],
                    ),
                )

    print("[*] Brain index refreshed from task.md")


def get_recent_readybag_runs(limit: int = 5) -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            """
            SELECT started_at, finished_at, status, notes
            FROM readybag_runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        {
            "started_at": r["started_at"],
            "finished_at": r["finished_at"],
            "status": r["status"],
            "notes": r["notes"],
        }
        for r in rows
    ]


def snapshot_brain(case_id: str = "rbc_v_lg", session_id: str = None) -> Dict[str, Any]:
    """Return a compact JSON-like snapshot of the brain for API/UI."""
    
    # If session_id is provided, try to find that specific task.md
    if session_id:
        session_path = BRAIN_ROOT / session_id / "task.md"
        if session_path.exists():
            md_text = session_path.read_text()
            parsed = parse_task_markdown(md_text)
            
            meta_json = session_path.with_name("task.md.metadata.json")
            summary = "Session snapshot"
            updated_at = datetime.fromtimestamp(session_path.stat().st_mtime).isoformat() + "Z"
            if meta_json.exists():
                import json
                meta = json.loads(meta_json.read_text())
                summary = meta.get("summary", summary)
                updated_at = meta.get("updatedAt", updated_at)
                
            return {
                "case_id": case_id,
                "summary": summary,
                "version": 1,
                "updated_at": updated_at,
                "tasks": parsed["tasks"],
                "readybag_runs": [] # runs are global to brains.db currently
            }

    with db() as conn:
        brain = conn.execute(
            """
            SELECT id, summary, version, updated_at
            FROM brains
            WHERE case_id=? AND name=?
            ORDER BY id
            LIMIT 1
            """,
            (case_id, "lawmodel1_main"),
        ).fetchone()

        if not brain:
            return {}

        rows = conn.execute(
            """
            SELECT t.id,
                   t.title,
                   t.status,
                   t.order_idx,
                   t.category,
                   s.description,
                   s.done,
                   s.order_idx AS s_order
            FROM tasks t
            LEFT JOIN subtasks s ON s.task_id = t.id
            WHERE t.brain_id=?
            ORDER BY t.order_idx, s.order_idx
            """,
            (brain["id"],),
        ).fetchall()

    tasks_struct: List[Dict[str, Any]] = []
    current = None
    last_tid = None

    for r in rows:
        if r["id"] != last_tid:
            if current:
                tasks_struct.append(current)
            current = {
                "title": r["title"],
                "status": r["status"],
                "order_idx": r["order_idx"],
                "category": r["category"],
                "subtasks": [],
            }
            last_tid = r["id"]
        if r["description"] is not None:
            current["subtasks"].append(
                {
                    "description": r["description"],
                    "done": bool(r["done"]),
                    "order_idx": r["s_order"],
                }
            )

    if current:
        tasks_struct.append(current)

    return {
        "summary": brain["summary"],
        "version": brain["version"],
        "updated_at": brain["updated_at"],
        "tasks": tasks_struct,
        "readybag_runs": get_recent_readybag_runs(),
    }


# ---------------------------------------------------------------------------
# Orchestration wrappers
# ---------------------------------------------------------------------------

def run_script(path: Path, args: List[str] = None):
    cmd = [sys.executable, str(path)]
    if args:
        cmd.extend(args)
    print(f"[*] Running: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def cmd_ready_bag(_args):
    """Run ingest + cards + ready bag, then refresh brain index."""
    started = datetime.utcnow().isoformat() + "Z"

    try:
        # 1) Financial truth ingest
        run_script(BASE_DIR / "scripts" / "ingest_financial_truth.py")

        # 2) Evidence card generation (package module)
        subprocess.run(
            [sys.executable, "-m", "ingest.generate_evidence_cards"],
            check=True,
            cwd=BASE_DIR,
        )

        # 3) iMessage ingest
        subprocess.run(
            [sys.executable, "-m", "ingest.imessage_ingest"],
            check=True,
            cwd=BASE_DIR,
        )

        # 4) Link evidence metadata
        run_script(BASE_DIR / "scripts" / "link_evidence_metadata.py")

        # 5) Final save / ready-bag orchestrator
        run_script(BASE_DIR / "scripts" / "save_ready_bag.py")

        # 6) Refresh brain index
        refresh_brain_from_markdown(case_id="rbc_v_lg")

        status = "success"
        notes = None
    except Exception as e:
        status = "error"
        notes = str(e)
        raise
    finally:
        finished = datetime.utcnow().isoformat() + "Z"
        with db() as conn:
            conn.execute(
                """
                INSERT INTO readybag_runs (started_at, finished_at, status, notes)
                VALUES (?, ?, ?, ?)
                """,
                (started, finished, status, notes),
            )


def cmd_show(_args):
    snap = snapshot_brain("rbc_v_lg")
    if not snap:
        print("No brain snapshot found. Run `brain_cli.py refresh` first.")
        return

    print(f"Case: rbc_v_lg")
    print(f"Summary: {snap['summary']}")
    print(f"Version: {snap['version']}, Updated: {snap['updated_at']}\n")

    for t in sorted(snap["tasks"], key=lambda x: x["order_idx"]):
        total = len(t["subtasks"])
        done = sum(1 for s in t["subtasks"] if s["done"])
        print(f"# [{t['status']}] {t['title']} ({done}/{total})")
        for s in sorted(t["subtasks"], key=lambda x: x["order_idx"]):
            mark = "x" if s["done"] else " "
            print(f"  - [{mark}] {s['description']}")
        print()


def cmd_refresh(_args):
    refresh_brain_from_markdown(case_id="rbc_v_lg")


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Local brain orchestrator for lawmodel1")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("init-db", help="Create brains.db tables")
    sub.add_parser("refresh", help="Parse task.md into brains.db")
    sub.add_parser("show", help="Show brain tasks from brains.db")
    sub.add_parser("readybag", help="Run ingest + ready bag + refresh brain")

    args = ap.parse_args()
    if args.cmd == "init-db":
        init_db()
    elif args.cmd == "refresh":
        cmd_refresh(args)
    elif args.cmd == "show":
        cmd_show(args)
    elif args.cmd == "readybag":
        cmd_ready_bag(args)


if __name__ == "__main__":
    main()
