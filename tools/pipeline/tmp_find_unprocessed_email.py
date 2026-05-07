#!/usr/bin/env python3
import json

f=open('/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/state/pipeline-state.json')
data=json.load(f)

stage_02_name = "02-email-paralegal"
stage_03_name = "03-email-attorney"
intake_name = "01-intake"

s2items = data["stages"][stage_02_name]["items"]
s3items = data["stages"].get(stage_03_name, {}).get("items", [])
intake_items = data["stages"].get(intake_name, {}).get("items", [])

s3_ids = set(i["item_id"] for i in s3items)
unproc = [i for i in s2items if i["status"] == "completed" and i["item_id"] not in s3_ids]
unproc.sort(key=lambda x: x.get("completed_at", ""))

print(f"Unprocessed: {len(unproc)}")

intake_by_id = {i["item_id"]: i for i in intake_items}
for i in unproc:
    ii = intake_by_id.get(i["item_id"], {})
    src_type = ii.get("source_type", "?")
    exh = ii.get("exhibit_id", i.get("exhibit_id", "?"))
    print(f'{i["item_id"]:45s} | EXH={exh:8s} | type={src_type:10s}')
