#!/usr/bin/env python3
import csv
from pathlib import Path

ROSETTA_CSV = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv")

def debug():
    if not ROSETTA_CSV.exists():
        print("File not found")
        return

    with open(ROSETTA_CSV, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        print(f"Fields: {reader.fieldnames}")
        for i, row in enumerate(reader):
            if i >= 5: break
            print(f"\nRow {i}:")
            for k, v in row.items():
                if v and len(str(v)) > 0:
                    print(f"  {k}: {v}")

if __name__ == "__main__":
    debug()
