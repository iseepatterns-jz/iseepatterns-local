#!/usr/bin/env python3
"""Ingest Rowboat Creative tax pipeline intake artifacts into evidence_hub.db.

This script reads derived JSON artifacts from the 01-taxes-intake pipeline stage and
indexes them into the LawModel1 evidence hub. It does not modify files in
TAXES_LOCKER.
"""
from __future__ import annotations

import json
import re
import sqlite3
from collections import Counter
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

PROJECT_ROOT = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
ARTIFACT_DIR = PROJECT_ROOT / "tools/pipeline/artifacts/01-taxes-intake"
TAX_LOCKER_PREFIX = str(PROJECT_ROOT / "data/TAXES_LOCKER")
DB_PATH = PROJECT_ROOT / "data/evidence_hub.db"
ITEM_RE = re.compile(r"^tax-\d+(?:_intake)?\.json$")
VALID_STATUSES = {"completed", "duplicate"}


def load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise ValueError("top-level JSON is not an object")
    return data


def artifact_paths() -> List[Path]:
    return sorted(p for p in ARTIFACT_DIR.glob("tax-*.json") if ITEM_RE.match(p.name))


def metadata_richness(data: Dict[str, Any]) -> int:
    meta = data.get("metadata")
    score = 0
    if isinstance(meta, dict):
        score += len(meta)
        score += sum(1 for v in meta.values() if v not in (None, "", [], {}))
    for key in ("summary", "sha256", "full_path", "classification", "tags", "processed_at", "processed_by"):
        if data.get(key) not in (None, "", [], {}):
            score += 1
    return score


def selection_score(path: Path, data: Dict[str, Any]) -> Tuple[int, int, int, int, str]:
    full_path = str(data.get("full_path") or "")
    status = str(data.get("status") or "").lower()
    valid_source = int(full_path.startswith(TAX_LOCKER_PREFIX))
    valid_status = int(status in VALID_STATUSES)
    non_intake = int(not path.name.endswith("_intake.json"))
    rich = metadata_richness(data)
    # Sort ascending and keep max: valid current source/status, non _intake, richer metadata, stable path.
    return (valid_source, valid_status, non_intake, rich, str(path))


def select_artifacts(paths: Iterable[Path]) -> Tuple[Dict[str, Tuple[Path, Dict[str, Any]]], List[Dict[str, str]], int]:
    selected: Dict[str, Tuple[Path, Dict[str, Any]]] = {}
    candidates: Dict[Path, Tuple[str, Dict[str, Any]]] = {}
    skipped: List[Dict[str, str]] = []
    scanned = 0

    for path in paths:
        scanned += 1
        try:
            data = load_json(path)
        except Exception as exc:  # report and skip malformed derived artifact
            skipped.append({"artifact": str(path), "reason": f"json_load_error: {exc}"})
            continue

        item_id = data.get("item_id")
        if not isinstance(item_id, str) or not item_id:
            skipped.append({"artifact": str(path), "reason": "missing_item_id"})
            continue

        candidates[path] = (item_id, data)
        full_path = str(data.get("full_path") or "")
        status = str(data.get("status") or "").lower()
        if not full_path.startswith(TAX_LOCKER_PREFIX):
            skipped.append({"artifact": str(path), "item_id": item_id, "reason": "full_path_not_current_tax_locker"})
            # Keep as candidate only if there is no better valid artifact for the item.
        if status and status not in VALID_STATUSES:
            skipped.append({"artifact": str(path), "item_id": item_id, "reason": f"status_not_selected: {status}"})
            # Keep as fallback only if no valid-status artifact exists.

        current = selected.get(item_id)
        if current is None or selection_score(path, data) > selection_score(current[0], current[1]):
            selected[item_id] = (path, data)

    # Drop any item whose selected fallback still does not meet the minimum provenance/status requirements.
    final: Dict[str, Tuple[Path, Dict[str, Any]]] = {}
    selected_paths = set()
    for item_id, (path, data) in selected.items():
        full_path = str(data.get("full_path") or "")
        status = str(data.get("status") or "").lower()
        if not full_path.startswith(TAX_LOCKER_PREFIX):
            skipped.append({"artifact": str(path), "item_id": item_id, "reason": "selected_artifact_missing_current_tax_locker_full_path"})
            continue
        if status not in VALID_STATUSES:
            skipped.append({"artifact": str(path), "item_id": item_id, "reason": f"selected_artifact_invalid_status: {status}"})
            continue
        final[item_id] = (path, data)
        selected_paths.add(path)

    for path, (item_id, _data) in candidates.items():
        if path not in selected_paths and item_id in final:
            skipped.append({"artifact": str(path), "item_id": item_id, "reason": "deduplicated_preferred_other_artifact"})

    return final, skipped, scanned


def json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def tax_year_value(data: Dict[str, Any]) -> Any:
    meta = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
    return meta.get("tax_year") or data.get("tax_year")


def int_tax_year(value: Any) -> Optional[int]:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and re.fullmatch(r"\d{4}", value.strip()):
        return int(value.strip())
    return None


def build_evidence_fields(item_id: str, artifact_path: Path, data: Dict[str, Any]) -> Dict[str, Any]:
    meta = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
    exhibit_id = data.get("exhibit_id") or item_id
    classification = data.get("classification") or meta.get("classification")
    form_type = meta.get("form_type") or data.get("form_type") or classification or "unknown"
    entity = meta.get("entity") or data.get("entity")
    tax_year = tax_year_value(data)
    tax_year_label = str(tax_year) if tax_year not in (None, "") else "unknown"
    summary = data.get("summary") or ""
    full_path = str(data.get("full_path") or "")
    sha256 = data.get("sha256")

    year_int = int_tax_year(tax_year)
    start_ts = f"{year_int:04d}-01-01T00:00:00Z" if year_int else None
    end_ts = f"{year_int:04d}-12-31T23:59:59Z" if year_int else None

    raw_tags = data.get("tags") if isinstance(data.get("tags"), list) else []
    tags: List[str] = []
    seen = set()
    for tag in list(raw_tags) + ["TAX", classification]:
        if tag in (None, ""):
            continue
        tag_s = str(tag)
        key = tag_s.upper()
        if key not in seen:
            seen.add(key)
            tags.append(tag_s)

    primary_ids = {
        "item_id": item_id,
        "exhibit_id": data.get("exhibit_id"),
        "tax_year": tax_year,
        "form_type": form_type,
        "entity": entity,
        "classification": classification,
        "sha256": sha256,
        "full_path": full_path,
    }

    body_lines = [
        f"Source path: {full_path}",
        f"SHA-256: {sha256 or ''}",
        f"Classification: {classification or ''}",
        f"Form type: {form_type or ''}",
        f"Entity: {entity or ''}",
        f"Tax year: {tax_year_label}",
        f"Artifact summary: {summary}",
    ]

    extra = dict(data)
    extra["artifact_path"] = str(artifact_path)

    return {
        "canonical_id": item_id,
        "source_type": "tax",
        "title": f"Tax Evidence: {exhibit_id} — {form_type or classification or 'unknown'} — {tax_year_label}",
        "summary": summary,
        "body_snippet": "\n".join(body_lines),
        "start_timestamp": start_ts,
        "end_timestamp": end_ts,
        "tags": json_dumps(tags),
        "primary_ids": json_dumps(primary_ids),
        "extra": json_dumps(extra),
        "card_id": exhibit_id,
        "source_file": full_path,
        "source_rowid": item_id,
        "card_file": str(artifact_path),
        "entity": entity,
    }


def normalize_identifier(identifier: str) -> str:
    return re.sub(r"\s+", " ", identifier.strip()).lower()


def get_or_create_participant(cur: sqlite3.Cursor, identifier: str) -> Tuple[int, bool]:
    normalized = normalize_identifier(identifier)
    cur.execute("SELECT id FROM participants WHERE normalized_identifier = ?", (normalized,))
    row = cur.fetchone()
    if row:
        return int(row[0]), False
    cur.execute(
        "INSERT INTO participants (identifier, normalized_identifier, display_name) VALUES (?, ?, ?)",
        (identifier, normalized, identifier),
    )
    return int(cur.lastrowid), True


def origin_exists(cur: sqlite3.Cursor, evidence_id: int, source_file: str) -> bool:
    cur.execute(
        "SELECT 1 FROM evidence_origins WHERE evidence_id=? AND origin_system=? AND source_file=?",
        (evidence_id, "TAX_LOCKER", source_file),
    )
    return cur.fetchone() is not None


def participant_link_exists(cur: sqlite3.Cursor, evidence_id: int, participant_id: int, role: str) -> bool:
    cur.execute(
        "SELECT 1 FROM evidence_participants WHERE evidence_id=? AND participant_id=? AND role=?",
        (evidence_id, participant_id, role),
    )
    return cur.fetchone() is not None


def ingest() -> Dict[str, Any]:
    paths = artifact_paths()
    selected, skipped, scanned = select_artifacts(paths)

    summary: Dict[str, Any] = {
        "scanned_artifacts": scanned,
        "selected_item_count": len(selected),
        "inserted_or_updated_evidence_rows": 0,
        "origins_inserted": 0,
        "participants_linked": 0,
        "skipped_count": len(skipped),
        "skipped_reasons": dict(Counter(s.get("reason", "unknown") for s in skipped)),
        "skipped_samples": skipped[:25],
        "post_run_counts": {},
    }

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    try:
        for item_id in sorted(selected):
            artifact_path, data = selected[item_id]
            fields = build_evidence_fields(item_id, artifact_path, data)
            cur.execute(
                """
                INSERT INTO evidence (
                    canonical_id, source_type, title, summary, body_snippet,
                    start_timestamp, end_timestamp, tags, primary_ids, extra, card_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(canonical_id) DO UPDATE SET
                    source_type=excluded.source_type,
                    title=excluded.title,
                    summary=excluded.summary,
                    body_snippet=excluded.body_snippet,
                    start_timestamp=excluded.start_timestamp,
                    end_timestamp=excluded.end_timestamp,
                    tags=excluded.tags,
                    primary_ids=excluded.primary_ids,
                    extra=excluded.extra,
                    card_id=excluded.card_id,
                    updated_at=datetime('now')
                """,
                (
                    fields["canonical_id"],
                    fields["source_type"],
                    fields["title"],
                    fields["summary"],
                    fields["body_snippet"],
                    fields["start_timestamp"],
                    fields["end_timestamp"],
                    fields["tags"],
                    fields["primary_ids"],
                    fields["extra"],
                    fields["card_id"],
                ),
            )
            summary["inserted_or_updated_evidence_rows"] += 1

            cur.execute("SELECT id FROM evidence WHERE canonical_id=?", (item_id,))
            evidence_id = int(cur.fetchone()[0])

            existed = origin_exists(cur, evidence_id, fields["source_file"])
            cur.execute(
                """
                INSERT INTO evidence_origins (evidence_id, origin_system, source_file, source_rowid, card_file)
                VALUES (?, 'TAX_LOCKER', ?, ?, ?)
                ON CONFLICT(evidence_id, origin_system, source_file) DO UPDATE SET
                    source_rowid=excluded.source_rowid,
                    card_file=excluded.card_file
                """,
                (evidence_id, fields["source_file"], fields["source_rowid"], fields["card_file"]),
            )
            if not existed:
                summary["origins_inserted"] += 1

            entity = fields.get("entity")
            if entity:
                participant_id, _ = get_or_create_participant(cur, str(entity))
                linked = participant_link_exists(cur, evidence_id, participant_id, "entity")
                cur.execute(
                    "INSERT OR IGNORE INTO evidence_participants (evidence_id, participant_id, role) VALUES (?, ?, 'entity')",
                    (evidence_id, participant_id),
                )
                if not linked:
                    summary["participants_linked"] += 1

        conn.commit()
        cur.execute("SELECT COUNT(*) FROM evidence WHERE source_type='tax'")
        tax_count = int(cur.fetchone()[0])
        cur.execute("SELECT COUNT(*) FROM evidence_origins WHERE origin_system='TAX_LOCKER'")
        origin_count = int(cur.fetchone()[0])
        summary["post_run_counts"] = {
            "evidence_source_type_tax": tax_count,
            "evidence_origins_tax_locker": origin_count,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return summary


if __name__ == "__main__":
    print(json.dumps(ingest(), ensure_ascii=False, indent=2, sort_keys=True))
