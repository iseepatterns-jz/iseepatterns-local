#!/usr/bin/env python3
import json

f=open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json')
data=json.load(f)

s2items = data["stages"]["02-email-paralegal"]["items"]
s3items = data["stages"]["03-email-attorney"]["items"]

s2_ids = sorted([i["item_id"] for i in s2items])
s3_ids = sorted([i["item_id"] for i in s3items])

print("Stage 02-email-paralegal items:", len(s2_ids))
for i in s2_ids:
    print(f"  {i}")

print("\nStage 03-email-attorney items:", len(s3_ids))
for i in s3_ids:
    print(f"  {i}")

# Check if any are missing
s2_set = set(s2_ids)
s3_set = set(s3_ids)

missing_from_s3 = s2_set - s3_set
extra_in_s3 = s3_set - s2_set

if missing_from_s3:
    print(f"\nItems in S2 but NOT in S3: {missing_from_s3}")
if extra_in_s3:
    print(f"\nItems in S3 but NOT in S2: {extra_in_s3}")
if not missing_from_s3 and not extra_in_s3:
    print("\nAll S2 email items are fully processed through S3. No work needed.")
