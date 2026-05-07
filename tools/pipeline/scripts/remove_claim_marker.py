import os

marker = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/artifacts/03-attorney/2026-05-06T0303-36Z.claimed_by"
if os.path.exists(marker):
    os.remove(marker)
    print(f"Claim marker removed: {marker}")
else:
    print(f"Claim marker not found (already removed)")
