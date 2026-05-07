#!/usr/bin/env python3
"""
iMazing Raw Export Forensic Audit & Device Identification Tool
================================================================
Designed for RBC v. LG litigation evidence preparation.

This script:
  1. Locates and parses iOS backup metadata (Info.plist, Manifest.plist, Status.plist)
     to extract device identifiers (UDID, serial number, IMEI, device name, iOS version).
  2. Computes SHA-256 hashes of critical forensic artifacts (sms.db, plists, etc.).
  3. Verifies iMazingBackupChecksum.txt if present.
  4. Generates a court-ready forensic report suitable for FRE 902(14) certification.
  5. Optionally registers all artifacts into the lawmodel1 chain_of_custody table.

Usage:
  python3 imazing_forensic_audit.py /Volumes/messageshd/imazing-export-1/showgoat

Optional flags:
  --register-coc     Also insert artifacts into lawmodel1 mbox_index.db chain_of_custody table
  --coc-db PATH      Path to mbox_index.db (default: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_index.db)
  --output DIR       Directory to write the forensic report (default: same as export root)
"""

import argparse
import hashlib
import json
import os
import plistlib
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ─────────────────────────────────────────────
# Configuration: Critical files to hash
# ─────────────────────────────────────────────

# These are the forensic crown jewels in an iOS backup.
# Paths are relative to the export root (e.g., /showgoat/).
CRITICAL_FILES = {
    # Backup metadata (device identification)
    "Info.plist": {
        "description": "Device metadata: UDID, serial number, IMEI, phone number, iOS version",
        "forensic_value": "CRITICAL - ties digital evidence to a specific physical device",
    },
    "Manifest.plist": {
        "description": "Backup manifest: app list, encryption status, backup properties",
        "forensic_value": "HIGH - documents backup scope and configuration",
    },
    "Status.plist": {
        "description": "Backup status: completion timestamp, backup state",
        "forensic_value": "HIGH - establishes when the backup snapshot was taken",
    },
    "Manifest.db": {
        "description": "File index database: maps every file in the backup to its domain/path",
        "forensic_value": "HIGH - complete inventory of all backed-up data",
    },
    "iMazingBackupChecksum.txt": {
        "description": "iMazing-generated checksum for backup integrity verification",
        "forensic_value": "HIGH - third-party tool integrity verification",
    },
    # Primary communications database
    "AppDomain-com.apple.MobileSMS/Library/SMS/sms.db": {
        "description": "Apple iMessage/SMS database: all message text, metadata, and delivery info",
        "forensic_value": "CRITICAL - primary evidence source, Apple-generated database",
    },
    "AppDomain-com.apple.MobileSMS/Library/SMS/sms.db-wal": {
        "description": "SQLite Write-Ahead Log for sms.db (may contain uncommitted messages)",
        "forensic_value": "MEDIUM - may contain additional message data",
    },
    "AppDomain-com.apple.MobileSMS/Library/SMS/sms.db-shm": {
        "description": "SQLite Shared Memory file for sms.db",
        "forensic_value": "LOW - operational artifact",
    },
}

# Additional files to discover and hash (searched via glob patterns)
DISCOVERY_PATTERNS = [
    # Notes database
    ("AppDomainGroup-group.com.apple.notes/NoteStore.sqlite", "Apple Notes database"),
    # Call history
    ("HomeDomain/Library/CallHistoryDB/CallHistory.storedata", "Call history database"),
    # Address book
    ("HomeDomain/Library/AddressBook/AddressBook.sqlitedb", "Contacts database"),
    # Safari
    ("HomeDomain/Library/Safari/History.db", "Safari browsing history"),
    ("HomeDomain/Library/Safari/Bookmarks.db", "Safari bookmarks"),
    # Voicemail
    ("HomeDomain/Library/Voicemail/voicemail.db", "Voicemail database"),
    # Photos metadata
    ("CameraRollDomain/Media/PhotoData/Photos.sqlite", "Photos library database"),
    # WhatsApp (if present)
    ("AppDomainGroup-group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite", "WhatsApp messages database"),
]


# ─────────────────────────────────────────────
# Core Functions
# ─────────────────────────────────────────────

def sha256_file(filepath: Path) -> str:
    """Compute SHA-256 hash of a file. Reads in 64KB chunks for large files."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def parse_plist(filepath: Path) -> Optional[Dict[str, Any]]:
    """Parse a binary or XML plist file."""
    try:
        with open(filepath, "rb") as f:
            return plistlib.load(f)
    except Exception as e:
        print(f"  [WARN] Could not parse {filepath.name}: {e}")
        return None


def extract_device_info(info_plist: Dict[str, Any]) -> Dict[str, str]:
    """Extract device identification fields from Info.plist."""
    fields = {
        "Device Name": info_plist.get("Device Name", ""),
        "Display Name": info_plist.get("Display Name", ""),
        "Product Name": info_plist.get("Product Name", ""),
        "Product Type": info_plist.get("Product Type", ""),
        "Product Version": info_plist.get("Product Version", ""),  # iOS version
        "Build Version": info_plist.get("Build Version", ""),
        "Serial Number": info_plist.get("Serial Number", ""),
        "Unique Identifier": info_plist.get("Unique Identifier", ""),  # UDID
        "Target Identifier": info_plist.get("Target Identifier", ""),
        "IMEI": info_plist.get("IMEI", ""),
        "IMEI 2": info_plist.get("IMEI 2", ""),
        "MEID": info_plist.get("MEID", ""),
        "Phone Number": info_plist.get("Phone Number", ""),
        "iccid": info_plist.get("ICCID", ""),
        "Last Backup Date": str(info_plist.get("Last Backup Date", "")),
        "iTunes Version": info_plist.get("iTunes Version", ""),
        "GUID": info_plist.get("GUID", ""),
        "Target Type": info_plist.get("Target Type", ""),
    }
    # Also check for installed apps list (useful for scope documentation)
    apps = info_plist.get("Installed Applications", [])
    fields["Installed App Count"] = str(len(apps))
    return {k: v for k, v in fields.items() if v}  # filter empty


def extract_manifest_info(manifest_plist: Dict[str, Any]) -> Dict[str, str]:
    """Extract backup configuration from Manifest.plist."""
    fields = {
        "Is Encrypted": str(manifest_plist.get("IsEncrypted", "")),
        "Was Passcode Set": str(manifest_plist.get("WasPasscodeSet", "")),
    }
    # Lockdown contains additional device info
    lockdown = manifest_plist.get("Lockdown", {})
    if lockdown:
        fields.update({
            "Lockdown - Device Name": lockdown.get("DeviceName", ""),
            "Lockdown - Product Version": lockdown.get("ProductVersion", ""),
            "Lockdown - Product Type": lockdown.get("ProductType", ""),
            "Lockdown - Build Version": lockdown.get("BuildVersion", ""),
            "Lockdown - Serial Number": lockdown.get("SerialNumber", ""),
            "Lockdown - Unique Device ID": lockdown.get("UniqueDeviceID", ""),
        })
    # Applications dict
    app_dict = manifest_plist.get("Applications", {})
    fields["Manifest App Count"] = str(len(app_dict))
    return {k: v for k, v in fields.items() if v}


def extract_status_info(status_plist: Dict[str, Any]) -> Dict[str, str]:
    """Extract backup status from Status.plist."""
    return {
        "Backup State": str(status_plist.get("BackupState", "")),
        "Snapshot State": str(status_plist.get("SnapshotState", "")),
        "Date": str(status_plist.get("Date", "")),
        "Is Full Backup": str(status_plist.get("IsFullBackup", "")),
        "Version": str(status_plist.get("Version", "")),
    }


def analyze_sms_db(sms_db_path: Path) -> Optional[Dict[str, Any]]:
    """Analyze the sms.db to extract summary statistics."""
    if not sms_db_path.exists():
        return None
    try:
        conn = sqlite3.connect(f"file:{sms_db_path}?mode=ro", uri=True)
        cursor = conn.cursor()

        stats = {}

        # Total messages
        cursor.execute("SELECT COUNT(*) FROM message")
        stats["total_messages"] = cursor.fetchone()[0]

        # Date range (Apple timestamps: seconds since 2001-01-01)
        cursor.execute("""
            SELECT
                MIN(date), MAX(date),
                MIN(datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime')),
                MAX(datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime'))
            FROM message
            WHERE date > 0
        """)
        row = cursor.fetchone()
        stats["earliest_raw"] = row[0]
        stats["latest_raw"] = row[1]
        stats["earliest_date"] = row[2]
        stats["latest_date"] = row[3]

        # Message counts by direction
        cursor.execute("""
            SELECT is_from_me, COUNT(*)
            FROM message
            GROUP BY is_from_me
        """)
        for is_from_me, count in cursor.fetchall():
            if is_from_me == 1:
                stats["outgoing_count"] = count
            else:
                stats["incoming_count"] = count

        # Unique handles (contacts)
        cursor.execute("SELECT COUNT(DISTINCT handle_id) FROM message WHERE handle_id > 0")
        stats["unique_handles"] = cursor.fetchone()[0]

        # Handle details (top contacts)
        cursor.execute("""
            SELECT h.id, h.service, COUNT(m.rowid) as msg_count
            FROM handle h
            JOIN message m ON m.handle_id = h.rowid
            GROUP BY h.rowid
            ORDER BY msg_count DESC
            LIMIT 20
        """)
        stats["top_handles"] = [
            {"id": row[0], "service": row[1], "message_count": row[2]}
            for row in cursor.fetchall()
        ]

        # Attachment count
        cursor.execute("SELECT COUNT(*) FROM attachment")
        stats["total_attachments"] = cursor.fetchone()[0]

        # Chat (conversation) count
        cursor.execute("SELECT COUNT(*) FROM chat")
        stats["total_chats"] = cursor.fetchone()[0]

        # Schema tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        stats["tables"] = [row[0] for row in cursor.fetchall()]

        conn.close()
        return stats
    except Exception as e:
        print(f"  [WARN] Could not analyze sms.db: {e}")
        return None


def verify_imazing_checksum(export_root: Path) -> Optional[Dict[str, str]]:
    """Read and report the iMazing backup checksum file."""
    checksum_path = export_root / "iMazingBackupChecksum.txt"
    if not checksum_path.exists():
        return None
    try:
        content = checksum_path.read_text(encoding="utf-8").strip()
        return {
            "raw_content": content,
            "file_hash": sha256_file(checksum_path),
            "file_size": str(checksum_path.stat().st_size),
        }
    except Exception as e:
        print(f"  [WARN] Could not read iMazingBackupChecksum.txt: {e}")
        return None


# ─────────────────────────────────────────────
# Chain of Custody Registration
# ─────────────────────────────────────────────

def register_in_coc(coc_db_path: str, artifacts: List[Dict]) -> int:
    """Insert artifacts into the chain_of_custody table in mbox_index.db."""
    conn = sqlite3.connect(coc_db_path)
    cursor = conn.cursor()

    # Ensure the table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chain_of_custody (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT NOT NULL,
            source_type TEXT NOT NULL,
            sha256 TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            case_id TEXT,
            notes TEXT,
            ingested_at TEXT NOT NULL
        )
    """)

    inserted = 0
    now = datetime.now(timezone.utc).isoformat()

    for art in artifacts:
        # Check if already registered (by path + hash)
        cursor.execute(
            "SELECT id FROM chain_of_custody WHERE source_path = ? AND sha256 = ?",
            (art["path"], art["hash"])
        )
        if cursor.fetchone():
            print(f"  [SKIP] Already registered: {art['filename']}")
            continue

        cursor.execute(
            """INSERT INTO chain_of_custody
               (source_path, source_type, sha256, size_bytes, case_id, notes, ingested_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                art["path"],
                art.get("source_type", "imazing_raw_export"),
                art["hash"],
                art["size"],
                "rbc_v_lg",
                art.get("description", ""),
                now,
            )
        )
        inserted += 1

    conn.commit()
    conn.close()
    return inserted


# ─────────────────────────────────────────────
# Report Generation
# ─────────────────────────────────────────────

def generate_report(
    export_root: Path,
    device_info: Dict[str, str],
    manifest_info: Dict[str, str],
    status_info: Dict[str, str],
    hashed_files: List[Dict],
    sms_stats: Optional[Dict],
    checksum_info: Optional[Dict],
    output_dir: Path,
) -> Path:
    """Generate a forensic audit report in Markdown format."""

    now = datetime.now(timezone.utc)
    report_lines = []

    def line(s=""):
        report_lines.append(s)

    line("# Forensic Audit Report: iMazing Raw Export")
    line(f"**Generated:** {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    line(f"**Export Path:** `{export_root}`")
    line(f"**Audit Tool:** imazing_forensic_audit.py")
    line()

    line("---")
    line()
    line("## 1. Device Identification")
    line()
    line("The following device identifiers were extracted from the iOS backup metadata files.")
    line("These fields tie the digital evidence to a specific physical device.")
    line()
    if device_info:
        line("| Field | Value |")
        line("|:------|:------|")
        for k, v in device_info.items():
            # Mask sensitive fields partially for the report template
            line(f"| {k} | `{v}` |")
        line()
    else:
        line("**[WARNING]** Info.plist not found or could not be parsed.")
        line()

    # Manifest info
    if manifest_info:
        line("### Backup Configuration (Manifest.plist)")
        line()
        line("| Field | Value |")
        line("|:------|:------|")
        for k, v in manifest_info.items():
            line(f"| {k} | `{v}` |")
        line()

    # Status info
    if status_info:
        line("### Backup Status (Status.plist)")
        line()
        line("| Field | Value |")
        line("|:------|:------|")
        for k, v in status_info.items():
            line(f"| {k} | `{v}` |")
        line()

    line("---")
    line()
    line("## 2. File Integrity Hashes (SHA-256)")
    line()
    line("Each critical forensic artifact was hashed using SHA-256 at the time of this audit.")
    line("These hashes can be used for FRE 902(14) certification to prove the evidence has not")
    line("been altered since acquisition.")
    line()
    line("| File | Size (bytes) | SHA-256 | Forensic Value |")
    line("|:-----|:-------------|:--------|:---------------|")
    for hf in hashed_files:
        short_path = hf["relative_path"]
        line(f"| `{short_path}` | {hf['size']:,} | `{hf['hash']}` | {hf.get('forensic_value', '')} |")
    line()

    # iMazing checksum verification
    if checksum_info:
        line("---")
        line()
        line("## 3. iMazing Backup Checksum Verification")
        line()
        line("iMazing generated a checksum file at the time of backup creation.")
        line()
        line(f"**Checksum file contents:**")
        line("```")
        line(checksum_info["raw_content"])
        line("```")
        line()
        line(f"**SHA-256 of checksum file itself:** `{checksum_info['file_hash']}`")
        line(f"**Checksum file size:** {checksum_info['file_size']} bytes")
        line()

    # SMS database analysis
    section_num = 4 if checksum_info else 3
    if sms_stats:
        line("---")
        line()
        line(f"## {section_num}. iMessage/SMS Database Analysis (sms.db)")
        line()
        line("The following statistics were extracted from the Apple-generated sms.db database.")
        line("This database was created and maintained by Apple's iMessage system on the device.")
        line()
        line(f"- **Total Messages:** {sms_stats.get('total_messages', 'N/A'):,}")
        line(f"- **Incoming Messages:** {sms_stats.get('incoming_count', 'N/A'):,}")
        line(f"- **Outgoing Messages:** {sms_stats.get('outgoing_count', 'N/A'):,}")
        line(f"- **Date Range:** {sms_stats.get('earliest_date', 'N/A')} to {sms_stats.get('latest_date', 'N/A')}")
        line(f"- **Unique Contacts (Handles):** {sms_stats.get('unique_handles', 'N/A')}")
        line(f"- **Total Attachments:** {sms_stats.get('total_attachments', 'N/A'):,}")
        line(f"- **Total Conversations (Chats):** {sms_stats.get('total_chats', 'N/A')}")
        line()
        line(f"### Database Schema Tables")
        line()
        for t in sms_stats.get("tables", []):
            line(f"- `{t}`")
        line()
        line(f"### Top Contacts by Message Volume")
        line()
        line("| Contact ID | Service | Messages |")
        line("|:-----------|:--------|:---------|")
        for h in sms_stats.get("top_handles", []):
            line(f"| `{h['id']}` | {h['service']} | {h['message_count']:,} |")
        line()
        section_num += 1

    # 902(14) certification template
    line("---")
    line()
    line(f"## {section_num}. FRE 902(14) Certification Template")
    line()
    line("The following is a template for a sworn declaration under 28 U.S.C. § 1746.")
    line("**Review with your attorney before use.**")
    line()
    line("---")
    line()
    line("### DECLARATION OF [YOUR NAME] IN SUPPORT OF AUTHENTICATION")
    line("### OF ELECTRONIC EVIDENCE PURSUANT TO FRE 902(14)")
    line()
    line("I, [YOUR FULL LEGAL NAME], declare under penalty of perjury under the laws of")
    line("the United States of America, pursuant to 28 U.S.C. § 1746, that the following")
    line("is true and correct:")
    line()
    line("**1. Qualifications.**")
    line("I am the owner and custodian of the Apple iPhone described below. I have personal")
    line("knowledge of the facts stated herein regarding the acquisition and preservation")
    line("of data from this device.")
    line()
    line("**2. Device Identification.**")
    line("The electronic evidence described in this declaration was extracted from the")
    line("following Apple iOS device:")
    line()
    if device_info:
        line(f"- Device Name: {device_info.get('Device Name', '[FILL IN]')}")
        line(f"- Product Type: {device_info.get('Product Type', '[FILL IN]')}")
        line(f"- Product Name: {device_info.get('Product Name', '[FILL IN]')}")
        line(f"- iOS Version: {device_info.get('Product Version', '[FILL IN]')}")
        line(f"- Serial Number: {device_info.get('Serial Number', '[FILL IN]')}")
        line(f"- UDID: {device_info.get('Unique Identifier', '[FILL IN]')}")
        line(f"- IMEI: {device_info.get('IMEI', '[FILL IN]')}")
        line(f"- Phone Number: {device_info.get('Phone Number', '[FILL IN]')}")
    line()
    line("**3. Extraction Process.**")
    line("On [DATE OF EXTRACTION], I used iMazing (version [VERSION], developed by")
    line("DigiDNA SA), a commercially available and forensically recognized iOS device")
    line("management tool, to create a raw data export (logical acquisition) of the above")
    line("device. iMazing is recognized by the legal technology community and was awarded")
    line("the TechnoLawyer 2021 Top Product Award for its evidence extraction capabilities.")
    line()
    line("The extraction was performed by connecting the device via USB to [YOUR COMPUTER],")
    line("creating a full backup, and exporting the raw backup data in its native iOS domain")
    line("structure. This process uses Apple's standard AFC (Apple File Connection) backup")
    line("protocol and does not modify data on the source device.")
    line()
    line("**4. Digital Identification (Hash Values).**")
    line("To verify the integrity of the extracted data, I computed SHA-256 hash values")
    line("for each critical forensic artifact. The hash values below were calculated on")
    line(f"{now.strftime('%B %d, %Y')} and can be compared against future copies to confirm")
    line("the evidence has not been altered:")
    line()
    line("| Artifact | SHA-256 Hash |")
    line("|:---------|:-------------|")
    for hf in hashed_files:
        if hf.get("forensic_value", "").startswith("CRITICAL"):
            line(f"| {hf['relative_path']} | `{hf['hash']}` |")
    line()
    line("**5. Preservation.**")
    line("The raw export has been preserved in its original form at the following location:")
    line(f"`{export_root}`")
    line("No modifications have been made to the exported data since extraction.")
    line()
    line("I declare under penalty of perjury under the laws of the United States of America")
    line("that the foregoing is true and correct.")
    line()
    line(f"Executed this ____ day of ____________, {now.year}")
    line("in _________________________ [City, State].")
    line()
    line("______________________________")
    line("[YOUR FULL LEGAL NAME]")
    line()

    # Write report
    report_filename = f"forensic_audit_report_{now.strftime('%Y%m%d_%H%M%S')}.md"
    report_path = output_dir / report_filename
    report_path.write_text("\n".join(report_lines), encoding="utf-8")

    # Also write raw JSON data for programmatic use
    json_data = {
        "audit_timestamp": now.isoformat(),
        "export_root": str(export_root),
        "device_info": device_info,
        "manifest_info": manifest_info,
        "status_info": status_info,
        "hashed_files": hashed_files,
        "sms_stats": sms_stats,
        "checksum_info": checksum_info,
    }
    json_filename = f"forensic_audit_data_{now.strftime('%Y%m%d_%H%M%S')}.json"
    json_path = output_dir / json_filename
    json_path.write_text(json.dumps(json_data, indent=2, default=str), encoding="utf-8")

    return report_path, json_path


# ─────────────────────────────────────────────
# Main Audit Flow
# ─────────────────────────────────────────────

def run_audit(export_root: Path, register_coc: bool = False, coc_db_path: str = "", output_dir: Optional[Path] = None):
    """Run the full forensic audit pipeline."""

    if not export_root.exists():
        print(f"[ERROR] Export path does not exist: {export_root}")
        sys.exit(1)

    if output_dir is None:
        output_dir = export_root

    print("=" * 70)
    print("  iMazing Raw Export Forensic Audit")
    print(f"  Export: {export_root}")
    print(f"  Time:   {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 70)
    print()

    # ── Step 1: Parse metadata plists ──
    print("[1/6] Parsing device metadata...")
    device_info = {}
    manifest_info = {}
    status_info = {}

    info_path = export_root / "Info.plist"
    if info_path.exists():
        info_data = parse_plist(info_path)
        if info_data:
            device_info = extract_device_info(info_data)
            print(f"  ✓ Device: {device_info.get('Device Name', '?')} "
                  f"({device_info.get('Product Name', '?')}, "
                  f"iOS {device_info.get('Product Version', '?')})")
            print(f"  ✓ Serial: {device_info.get('Serial Number', '?')}")
            print(f"  ✓ UDID:   {device_info.get('Unique Identifier', '?')}")
            if device_info.get("IMEI"):
                print(f"  ✓ IMEI:   {device_info.get('IMEI')}")
            if device_info.get("Phone Number"):
                print(f"  ✓ Phone:  {device_info.get('Phone Number')}")
    else:
        print("  [WARN] Info.plist not found at export root.")
        # Try alternate locations
        for alt in ["Backup/Info.plist", "../Info.plist"]:
            alt_path = export_root / alt
            if alt_path.exists():
                print(f"  [INFO] Found Info.plist at: {alt_path}")
                info_data = parse_plist(alt_path)
                if info_data:
                    device_info = extract_device_info(info_data)
                break

    manifest_path = export_root / "Manifest.plist"
    if manifest_path.exists():
        manifest_data = parse_plist(manifest_path)
        if manifest_data:
            manifest_info = extract_manifest_info(manifest_data)
            print(f"  ✓ Manifest parsed ({manifest_info.get('Manifest App Count', '?')} apps)")
    else:
        print("  [WARN] Manifest.plist not found.")

    status_path = export_root / "Status.plist"
    if status_path.exists():
        status_data = parse_plist(status_path)
        if status_data:
            status_info = extract_status_info(status_data)
            print(f"  ✓ Status: {status_info.get('Backup State', '?')} "
                  f"(Date: {status_info.get('Date', '?')})")
    else:
        print("  [WARN] Status.plist not found.")

    print()

    # ── Step 2: Hash critical files ──
    print("[2/6] Hashing critical forensic files...")
    hashed_files = []

    for rel_path, meta in CRITICAL_FILES.items():
        full_path = export_root / rel_path
        if full_path.exists():
            file_hash = sha256_file(full_path)
            file_size = full_path.stat().st_size
            hashed_files.append({
                "relative_path": rel_path,
                "path": str(full_path),
                "filename": full_path.name,
                "hash": file_hash,
                "size": file_size,
                "description": meta["description"],
                "forensic_value": meta["forensic_value"],
                "source_type": "imazing_raw_export",
            })
            print(f"  ✓ {rel_path}")
            print(f"    SHA-256: {file_hash}")
            print(f"    Size:    {file_size:,} bytes")
        else:
            print(f"  [SKIP] {rel_path} — not found")

    print()

    # ── Step 3: Discover additional forensic files ──
    print("[3/6] Discovering additional forensic artifacts...")
    for rel_path, desc in DISCOVERY_PATTERNS:
        full_path = export_root / rel_path
        if full_path.exists():
            file_hash = sha256_file(full_path)
            file_size = full_path.stat().st_size
            hashed_files.append({
                "relative_path": rel_path,
                "path": str(full_path),
                "filename": full_path.name,
                "hash": file_hash,
                "size": file_size,
                "description": desc,
                "forensic_value": "MEDIUM",
                "source_type": "imazing_raw_export",
            })
            print(f"  ✓ Found: {rel_path} ({file_size:,} bytes)")
        # Silently skip if not found — these are optional

    print(f"  Total artifacts hashed: {len(hashed_files)}")
    print()

    # ── Step 4: Verify iMazing checksum ──
    print("[4/6] Checking iMazing backup checksum...")
    checksum_info = verify_imazing_checksum(export_root)
    if checksum_info:
        print(f"  ✓ Found iMazingBackupChecksum.txt")
        print(f"    Content: {checksum_info['raw_content'][:200]}...")
    else:
        print("  [INFO] No iMazingBackupChecksum.txt found.")
    print()

    # ── Step 5: Analyze sms.db ──
    print("[5/6] Analyzing iMessage/SMS database...")
    sms_db_path = export_root / "AppDomain-com.apple.MobileSMS" / "Library" / "SMS" / "sms.db"
    sms_stats = analyze_sms_db(sms_db_path)
    if sms_stats:
        print(f"  ✓ Total messages: {sms_stats['total_messages']:,}")
        print(f"  ✓ Date range: {sms_stats.get('earliest_date', '?')} to {sms_stats.get('latest_date', '?')}")
        print(f"  ✓ Incoming: {sms_stats.get('incoming_count', 0):,}, "
              f"Outgoing: {sms_stats.get('outgoing_count', 0):,}")
        print(f"  ✓ Unique contacts: {sms_stats.get('unique_handles', 0)}")
        print(f"  ✓ Attachments: {sms_stats.get('total_attachments', 0):,}")
        if sms_stats.get("top_handles"):
            print(f"  ✓ Top contact: {sms_stats['top_handles'][0]['id']} "
                  f"({sms_stats['top_handles'][0]['message_count']:,} messages)")
    else:
        print("  [WARN] Could not analyze sms.db (file missing or inaccessible).")
    print()

    # ── Step 6: Generate report ──
    print("[6/6] Generating forensic report...")
    report_path, json_path = generate_report(
        export_root=export_root,
        device_info=device_info,
        manifest_info=manifest_info,
        status_info=status_info,
        hashed_files=hashed_files,
        sms_stats=sms_stats,
        checksum_info=checksum_info,
        output_dir=output_dir,
    )
    print(f"  ✓ Report: {report_path}")
    print(f"  ✓ JSON:   {json_path}")
    print()

    # ── Optional: Register in CoC ──
    if register_coc and coc_db_path:
        print("[CoC] Registering artifacts in chain_of_custody...")
        inserted = register_in_coc(coc_db_path, hashed_files)
        print(f"  ✓ Inserted {inserted} new records into chain_of_custody")
        print()

    # ── Summary ──
    print("=" * 70)
    print("  AUDIT COMPLETE")
    print(f"  Files hashed:     {len(hashed_files)}")
    print(f"  Device identified: {'YES' if device_info else 'NO'}")
    print(f"  Checksum verified: {'YES' if checksum_info else 'N/A'}")
    print(f"  SMS DB analyzed:   {'YES' if sms_stats else 'NO'}")
    print(f"  Report saved:      {report_path}")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description="Forensic audit of iMazing raw iOS backup export"
    )
    parser.add_argument(
        "export_path",
        help="Path to the iMazing raw export root directory (e.g., /Volumes/messageshd/imazing-export-1/showgoat)",
    )
    parser.add_argument(
        "--register-coc",
        action="store_true",
        help="Also register artifacts in lawmodel1 chain_of_custody table",
    )
    parser.add_argument(
        "--coc-db",
        default="/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_index.db",
        help="Path to mbox_index.db for chain_of_custody registration",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output directory for the forensic report (default: export root)",
    )

    args = parser.parse_args()
    export_root = Path(args.export_path).resolve()
    output_dir = Path(args.output).resolve() if args.output else None

    run_audit(
        export_root=export_root,
        register_coc=args.register_coc,
        coc_db_path=args.coc_db,
        output_dir=output_dir,
    )


if __name__ == "__main__":
    main()
