#!/usr/bin/env python3
"""Move EXH-0138 inbox item to completed."""
import shutil, os

inbox_path = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/work-queue/inbox/2026-05-06T04-24-18.126929Z_EXH-0138.json'
completed_dir = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/work-queue/completed/'
completed_path = os.path.join(completed_dir, '2026-05-06T04-24-18.126929Z_EXH-0138.json')

# Ensure completed dir exists
os.makedirs(completed_dir, exist_ok=True)

# Copy then remove
shutil.copy2(inbox_path, completed_path)
os.remove(inbox_path)

# Verify
if os.path.exists(completed_path) and not os.path.exists(inbox_path):
    print(f"SUCCESS: moved to {completed_path}")
    print(f"Inbox item removed: {not os.path.exists(inbox_path)}")
else:
    print(f"ERROR: inbox at {os.path.exists(inbox_path)}, completed at {os.path.exists(completed_path)}")
