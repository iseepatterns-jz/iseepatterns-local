#!/usr/bin/env python3
import re
import csv
import os
from pathlib import Path

# Paths
BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
TIMELINE_PATH = BASE_DIR / "data/transcripts/narrative_timeline.md"
LEDGER_PATH = BASE_DIR / "data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_QUICKBOOKS_EXPORT/general_ledger.csv"
REPORT_PATH = BASE_DIR / "data/transcripts/discrepancy_report.md"

def parse_admissions(timeline_content):
    """
    Extracts potential financial admissions from the narrative timeline.
    Looks for dollar amounts and dates.
    """
    admissions = []
    # Match pattern like: **March 2021** ... $23,419 ... Cresco
    # Using a simpler line-by-line or paragraph-based approach
    
    current_month = None
    for line in timeline_content.split('\n'):
        # Match pattern like: ## 2021-03
        month_match = re.search(r'## (202\d)-(\d{2})', line)
        if month_match:
            current_month = f"{month_match.group(1)}-{month_match.group(2)}"
            continue
            
        # Look for dollar amounts (handling optional 'k' suffix)
        amt_matches = re.findall(r'\$[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?k?', line)
        if amt_matches and current_month:
            for amt in amt_matches:
                # Extract context (e.g., words around the amount)
                context = line.strip()
                raw_val = amt.replace('$', '').replace(',', '')
                if raw_val.endswith('k'):
                    raw_val = float(raw_val[:-1]) * 1000
                admissions.append({
                    "month": current_month,
                    "amount": amt,
                    "raw_amount": str(raw_val),
                    "context": context
                })
    return admissions

def check_ledger(admission):
    """
    Searches the ledger for a matching transaction.
    """
    matches = []
    # search_month is YYYY-MM
    date_prefix = admission["month"] + "-"
    
    val = admission["raw_amount"]
    
    if not LEDGER_PATH.exists():
        return "LEDGER_MISSING"

    with open(LEDGER_PATH, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row or len(row) < 15: continue
            row_date = row[0] # YYYY-MM-DD
            row_amt = row[14].replace(',', '')
            
            # Match date and approximate amount
            if row_date.startswith(date_prefix):
                # Check for exact or close match (sometimes taxes have small fees or discounts)
                try:
                    target = float(val)
                    actual = abs(float(row_amt))
                    # Allow 2% variance for "discounts" or "fees"
                    if abs(target - actual) / target < 0.05:
                        matches.append(row)
                except:
                    pass
                    
    return matches

def generate_report():
    print(f"[*] Starting Discrepancy Matching...")
    
    if not TIMELINE_PATH.exists():
        print(f"[!] Timeline not found at {TIMELINE_PATH}")
        return

    with open(TIMELINE_PATH, 'r') as f:
        content = f.read()

    admissions = parse_admissions(content)
    print(f"[*] Found {len(admissions)} financial mentions in narrative.")

    mod_time = str(os.path.getmtime(TIMELINE_PATH)) if TIMELINE_PATH.exists() else 'N/A'
    mod_time_clean = re.sub(r'\..*', '', mod_time)
    report = [
        "# Financial Discrepancy Report",
        f"Generated: {mod_time_clean}",
        "\n## Summary of Discrepancies\n",
        "| Month | Admission | Context | Ledger Status | Details |",
        "|-------|-----------|---------|---------------|---------|"
    ]

    for adm in admissions:
        ledger_matches = check_ledger(adm)
        
        details = ""
        if ledger_matches == "LEDGER_MISSING":
            status = "⚠️ Ledger Missing"
        elif not ledger_matches:
            status = "❌ PHANTOM (No Match Found)"
        else:
            status = f"✅ Confirmed ({len(ledger_matches)} matches)"
            # Show first 2 matches summary
            summaries = []
            for m in ledger_matches[:2]:
                summaries.append(f"{m[0]} | {m[1]} | {m[14]} | {m[6] or m[5]}")
            details = "<br>".join(summaries)
        
        report.append(f"| {adm['month']} | {adm['amount']} | {adm['context'][:100]}... | {status} | {details} |")

    with open(REPORT_PATH, 'w') as f:
        f.write('\n'.join(report))
    
    print(f"[*] Report generated at {REPORT_PATH}")

if __name__ == "__main__":
    generate_report()
