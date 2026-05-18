#!/usr/bin/env python3
"""Add/update Jorge Gonzalez in LawModel1 players.db from whitelist XLSX.

Reads the whitelist XLSX as a source reference without modifying it. Writes only to
lawmodel1/data/players.db and a timestamped report under lawmodel1/reports/.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import logging
import re
import sqlite3
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

PROJECT_ROOT = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
XLSX_PATH = PROJECT_ROOT / "data/LINKED_IN_PROFILE_LOCKER/2026-05-12_whitelist-players-linkedIn-profiles.xlsx"
DB_PATH = PROJECT_ROOT / "data/players.db"
REPORT_DIR = PROJECT_ROOT / "reports"
SHEET_NAME = "linkedin profiles"
TARGET_FULL_NAME = "Jorge Gonzalez"
SLUG = "jorge-gonzalez"
NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def col_index(cell_ref: str) -> int:
    match = re.match(r"([A-Z]+)", cell_ref)
    if not match:
        raise ValueError(f"Cell reference lacks column letters: {cell_ref!r}")
    total = 0
    for ch in match.group(1):
        total = total * 26 + (ord(ch) - ord("A") + 1)
    return total - 1


def read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for si in root.findall("a:si", NS):
        strings.append("".join(t.text or "" for t in si.findall(".//a:t", NS)))
    return strings


def workbook_sheet_path(zf: zipfile.ZipFile, sheet_name: str) -> str:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall(f"{{{PKG_REL_NS}}}Relationship")}
    for sheet in workbook.find("a:sheets", NS) or []:
        if sheet.attrib.get("name") == sheet_name:
            rid = sheet.attrib[f"{{{REL_NS}}}id"]
            target = relmap[rid]
            return target if target.startswith("xl/") else "xl/" + target.lstrip("/")
    raise ValueError(f"Sheet not found: {sheet_name!r}")


def cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    if cell.attrib.get("t") == "inlineStr":
        return "".join(t.text or "" for t in cell.findall(".//a:t", NS)).strip()
    value_el = cell.find("a:v", NS)
    if value_el is None or value_el.text is None:
        return ""
    raw = value_el.text
    if cell.attrib.get("t") == "s":
        return shared_strings[int(raw)].strip()
    return raw.strip()


def read_rows(xlsx_path: Path, sheet_name: str) -> list[tuple[int, list[str]]]:
    with zipfile.ZipFile(xlsx_path) as zf:
        shared_strings = read_shared_strings(zf)
        sheet_path = workbook_sheet_path(zf, sheet_name)
        root = ET.fromstring(zf.read(sheet_path))
        rows: list[tuple[int, list[str]]] = []
        for row in root.findall(".//a:sheetData/a:row", NS):
            row_no = int(row.attrib["r"])
            values: dict[int, str] = {}
            max_idx = -1
            for cell in row.findall("a:c", NS):
                idx = col_index(cell.attrib["r"])
                values[idx] = cell_value(cell, shared_strings)
                max_idx = max(max_idx, idx)
            rows.append((row_no, [values.get(i, "") for i in range(max_idx + 1)]))
        return rows


def find_target_row(rows: list[tuple[int, list[str]]]) -> tuple[int, dict[str, str]]:
    if not rows:
        raise ValueError("No rows found in whitelist sheet")
    _, header_values = rows[0]
    headers = [h.strip() for h in header_values]
    for row_no, values in rows[1:]:
        record = {headers[i]: (values[i].strip() if i < len(values) else "") for i in range(len(headers)) if headers[i]}
        if record.get("Full Name", "").casefold() == TARGET_FULL_NAME.casefold():
            return row_no, record
    raise ValueError(f"Target full name not found in whitelist: {TARGET_FULL_NAME}")


def split_multi(value: str) -> list[str]:
    if not value:
        return []
    parts = [part.strip() for part in value.split(",")]
    return [part for part in parts if part]


def build_player_record(row_no: int, record: dict[str, str], source_hash: str) -> dict[str, str]:
    full_name = record.get("Full Name") or TARGET_FULL_NAME
    if full_name != TARGET_FULL_NAME:
        raise ValueError(f"Unexpected target row full name: {full_name!r}")
    source_ref = str(XLSX_PATH)
    notes = (
        f"Source: {source_ref}; sheet \"{SHEET_NAME}\" row {row_no}; sha256={source_hash}. "
        f"Row fields: Company={record.get('Company','')}; Role={record.get('Role','')}; "
        f"Last Name={record.get('Last Name','')}; First name={record.get('First name','')}; "
        f"Full Name={record.get('Full Name','')}; Nickname={record.get('Nickname','')}; "
        f"imessage={record.get('imessage','')}; Email={record.get('Email','')}."
    )
    return {
        "slug": SLUG,
        "display_name": full_name,
        "title": record.get("Role", ""),
        "company": record.get("Company", ""),
        "location": "",
        "profile_type": "person",
        "skills": "",
        "linkedin_url": record.get("LinkedIn Profile URL", ""),
        "aliases": json.dumps(split_multi(record.get("Nickname", ""))),
        "email_addresses": json.dumps(split_multi(record.get("Email", ""))),
        "phone_numbers": json.dumps(split_multi(record.get("imessage", ""))),
        "notes": notes,
        "summary": f"Whitelist LinkedIn profile row {row_no} identifies {full_name} as {record.get('Company','')} {record.get('Role','')}.",
        "role": record.get("Role", ""),
        "nickname": record.get("Nickname", ""),
        "imessage_handles": json.dumps(split_multi(record.get("imessage", ""))),
        "imessage_handle_ids": "",
        "bni_member": record.get("BNI Member", ""),
        "bni_notes": record.get("BNI Notes", ""),
    }


def upsert_player(db_path: Path, player: dict[str, str]) -> tuple[str, int, dict[str, object]]:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    try:
        before = con.execute("SELECT * FROM players WHERE slug = ?", (SLUG,)).fetchone()
        action = "updated_existing" if before else "inserted_new"
        columns = list(player.keys())
        insert_cols = ", ".join(columns)
        placeholders = ", ".join("?" for _ in columns)
        update_cols = ", ".join(f"{col}=excluded.{col}" for col in columns if col != "slug")
        sql = (
            f"INSERT INTO players ({insert_cols}, created_at, updated_at) "
            f"VALUES ({placeholders}, datetime('now'), datetime('now')) "
            f"ON CONFLICT(slug) DO UPDATE SET {update_cols}, updated_at=datetime('now')"
        )
        con.execute(sql, [player[col] for col in columns])
        con.commit()
        after = con.execute("SELECT * FROM players WHERE slug = ?", (SLUG,)).fetchone()
        if after is None:
            raise RuntimeError("Upsert completed but player row is missing")
        return action, int(after["id"]), dict(after)
    finally:
        con.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Parse source and report intended row without writing DB")
    args = parser.parse_args()

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = REPORT_DIR / f"add_jorge_gonzalez_player_{timestamp}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_path), logging.StreamHandler(sys.stdout)],
    )
    try:
        logging.info("Starting Jorge Gonzalez player upsert")
        logging.info("Source XLSX: %s", XLSX_PATH)
        logging.info("Target DB: %s", DB_PATH)
        if not XLSX_PATH.exists():
            raise FileNotFoundError(XLSX_PATH)
        if not DB_PATH.exists():
            raise FileNotFoundError(DB_PATH)
        source_hash = sha256_file(XLSX_PATH)
        rows = read_rows(XLSX_PATH, SHEET_NAME)
        row_no, source_record = find_target_row(rows)
        player = build_player_record(row_no, source_record, source_hash)
        logging.info("Source SHA-256: %s", source_hash)
        logging.info("Matched sheet=%r row=%s record=%s", SHEET_NAME, row_no, json.dumps(source_record, ensure_ascii=False, sort_keys=True))
        if args.dry_run:
            action, row_id, db_row = "dry_run", -1, player
        else:
            action, row_id, db_row = upsert_player(DB_PATH, player)
        report = {
            "action": action,
            "db_path": str(DB_PATH),
            "table": "players",
            "row_id": row_id,
            "slug": SLUG,
            "source_xlsx": str(XLSX_PATH),
            "source_sha256": source_hash,
            "source_sheet": SHEET_NAME,
            "source_row": row_no,
            "source_record": source_record,
            "db_row": db_row,
            "log_path": str(log_path),
        }
        report_path = REPORT_DIR / f"add_jorge_gonzalez_player_{timestamp}.json"
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        logging.info("Wrote report: %s", report_path)
        logging.info("Completed action=%s table=players row_id=%s slug=%s", action, row_id, SLUG)
        return 0
    except Exception as exc:
        logging.exception("Failed to add/update Jorge Gonzalez player: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
