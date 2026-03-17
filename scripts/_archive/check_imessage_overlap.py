import json
import os
from pathlib import Path

CARDS_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/evidence_cards")

m1_guids = set()
imac_guids = set()

for name in os.listdir(CARDS_DIR):
    if not (name.startswith("imsg_") and name.endswith(".json")):
        continue
    path = CARDS_DIR / name
    try:
        with open(path, "r") as f:
            card = json.load(f)
    except Exception:
        continue

    origin = card.get("origin_system")
    guid = (card.get("primary_ids") or {}).get("message_guid")
    if not guid:
        continue

    if origin == "CHAT_DB_M1STUDIO":
        m1_guids.add(guid)
    elif origin == "CHAT_DB_IMAC":
        imac_guids.add(guid)

overlap = m1_guids & imac_guids

print("M1STUDIO unique guids:", len(m1_guids))
print("IMAC unique guids:", len(imac_guids))
print("Overlap guids:", len(overlap))

# Optional: write a small sample of overlapping GUIDs
out_path = CARDS_DIR / "imessage_guid_overlap_sample.txt"
with open(out_path, "w") as f:
    for i, g in enumerate(sorted(overlap)):
        f.write(g + "\n")
        if i >= 99:
            break

print("Sample overlap written to:", out_path)
