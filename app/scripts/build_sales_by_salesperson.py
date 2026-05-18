#!/usr/bin/env python3
"""
Build pre-aggregated sales-by-salesperson JSON files for the lawmodel1 API.

Inputs:
  - QBO Invoice → Salesperson Crosswalk Bridge (7,486 rows)
  - Unallocated Recovery CSV (Joseph's identified assignments)

Outputs:
  - public/data/sales_by_salesperson_monthly.json
  - public/data/sales_by_salesperson_yearly.json
  - public/data/salesperson_list.json
"""

import csv
import json
import os
from collections import defaultdict
from datetime import datetime

ROOT = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER"

CROSSWALK_PATH = os.path.join(
    ROOT,
    "_analysis_outputs/rosettastone_business_context_map",
    "qbo_invoice_salesperson_crosswalk_printavo_deconetwork_bridge.csv",
)

RECOVERY_PATH = os.path.join(
    ROOT,
    "_analysis_outputs/qbo_unallocated_all_pdf_index_matches",
    "qbo_unallocated_true_remaining_after_joseph_identified.csv",
)

OUTPUT_DIR = os.path.join(ROOT, "lawmodel1/app/public/data")
MONTHLY_PATH = os.path.join(OUTPUT_DIR, "sales_by_salesperson_monthly.json")
YEARLY_PATH = os.path.join(OUTPUT_DIR, "sales_by_salesperson_yearly.json")
SALESPEOPLE_PATH = os.path.join(OUTPUT_DIR, "salesperson_list.json")


def main():
    # --- Step 1: Build recovery lookup (doc_number -> recovered_salesperson_name) ---
    recovery_lookup = {}
    with open(RECOVERY_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("recovery_status", "").strip() == "joseph_identified":
                dn = row.get("doc_number", "").strip()
                name = row.get("recovered_salesperson_name", "").strip()
                if dn and name:
                    recovery_lookup[dn] = name

    print(f"Recovery lookup: {len(recovery_lookup)} doc_number -> salesperson mappings")

    # --- Step 2: Read crosswalk, resolve salesperson ---
    # Structures for aggregation
    # monthly:  sp -> year -> month -> customer -> { total_amount, order_count }
    # yearly:   sp -> year -> customer -> { total_amount, order_count }
    monthly = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"total_amount": 0.0, "order_count": 0}))))
    yearly = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"total_amount": 0.0, "order_count": 0})))
    # sp_total: salesperson -> total_all_time
    sp_total = defaultdict(float)

    row_count = 0
    assigned_count = 0
    recovered_count = 0
    still_blank_count = 0
    min_date = None
    max_date = None

    with open(CROSSWALK_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row_count += 1

            # Extract fields
            salesperson = row.get("normalized_salesperson", "").strip()
            doc_number = row.get("qbo_doc_number", "").strip()
            txn_date_str = row.get("qbo_txn_date", "").strip()
            customer = row.get("qbo_customer_ref_name", "").strip()
            total_amt_str = row.get("qbo_total_amt", "").strip()

            if not customer:
                customer = "Unknown"

            # Parse date
            if not txn_date_str:
                continue
            try:
                txn_date = datetime.strptime(txn_date_str, "%Y-%m-%d")
            except ValueError:
                continue

            year = str(txn_date.year)
            month = str(txn_date.month).zfill(2)

            # Parse amount
            try:
                total_amt = float(total_amt_str)
            except (ValueError, TypeError):
                total_amt = 0.0

            # Track date range
            if min_date is None or txn_date < min_date:
                min_date = txn_date
            if max_date is None or txn_date > max_date:
                max_date = txn_date

            # Resolve salesperson
            if not salesperson:
                # Try recovery lookup
                recovered_name = recovery_lookup.get(doc_number, "")
                if recovered_name:
                    salesperson = recovered_name
                    recovered_count += 1
                else:
                    still_blank_count += 1
                    continue  # Skip rows we can't assign
            else:
                assigned_count += 1

            # Aggregate
            monthly[salesperson][year][month][customer]["total_amount"] += total_amt
            monthly[salesperson][year][month][customer]["order_count"] += 1
            yearly[salesperson][year][customer]["total_amount"] += total_amt
            yearly[salesperson][year][customer]["order_count"] += 1
            sp_total[salesperson] += total_amt

            # Also aggregate "all"
            monthly["all"][year][month][customer]["total_amount"] += total_amt
            monthly["all"][year][month][customer]["order_count"] += 1
            yearly["all"][year][customer]["total_amount"] += total_amt
            yearly["all"][year][customer]["order_count"] += 1

    sp_total["all"] = sum(sp_total.values())

    # --- Step 3: Convert defaultdicts to regular dicts for JSON serialization ---
    def to_dict(d):
        if isinstance(d, defaultdict):
            d = {k: to_dict(v) for k, v in d.items()}
        return d

    monthly_out = to_dict(monthly)
    yearly_out = to_dict(yearly)

    # --- Step 4: Build salesperson_list ---
    salesperson_list = []
    for name in sorted(sp_total.keys()):
        if name == "all":
            continue
        salesperson_list.append({
            "name": name,
            "total_gross_all_time": round(sp_total[name], 2),
        })
    salesperson_list.sort(key=lambda x: x["total_gross_all_time"], reverse=True)

    # --- Step 5: Write JSON files ---
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(MONTHLY_PATH, "w", encoding="utf-8") as f:
        json.dump(monthly_out, f, ensure_ascii=False)

    with open(YEARLY_PATH, "w", encoding="utf-8") as f:
        json.dump(yearly_out, f, ensure_ascii=False)

    with open(SALESPEOPLE_PATH, "w", encoding="utf-8") as f:
        json.dump(salesperson_list, f, ensure_ascii=False, indent=2)

    # --- Step 6: Report ---
    def file_info(path):
        size = os.path.getsize(path)
        with open(path, "r") as f:
            data = json.load(f)
        if isinstance(data, list):
            return size, len(data)
        else:
            # Count top-level keys
            return size, len(data)

    monthly_size, _ = file_info(MONTHLY_PATH)
    yearly_size, _ = file_info(YEARLY_PATH)
    sp_size, sp_count = file_info(SALESPEOPLE_PATH)

    print()
    print("=" * 60)
    print("BUILD COMPLETE: sales_by_salesperson")
    print("=" * 60)
    print(f"Total crosswalk rows processed:  {row_count}")
    print(f"  Assigned from crosswalk:      {assigned_count}")
    print(f"  Recovered via Joseph lookup:  {recovered_count}")
    print(f"  Still unassigned (skipped):   {still_blank_count}")
    print(f"  Total assigned + recovered:   {assigned_count + recovered_count}")
    print()
    print(f"Date range: {min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}")
    print()
    print(f"Output files:")
    print(f"  {MONTHLY_PATH}")
    print(f"    Size: {monthly_size:>10,} bytes")
    print(f"  {YEARLY_PATH}")
    print(f"    Size: {yearly_size:>10,} bytes")
    print(f"  {SALESPEOPLE_PATH}")
    print(f"    Size: {sp_size:>10,} bytes  |  {sp_count} salespeople")
    print()
    print("Top salespeople by all-time gross:")
    for i, sp in enumerate(salesperson_list[:10]):
        print(f"  {i+1:>2}. {sp['name']:<25} ${sp['total_gross_all_time']:>12,.2f}")
    print(f"       {'ALL COMBINED':<25} ${sp_total.get('all', 0):>12,.2f}")
    print()


if __name__ == "__main__":
    main()
