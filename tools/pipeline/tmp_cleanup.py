#!/usr/bin/env python3
"""
Delete the tmp_state_update.py file from pipeline root.
This was a helper script for updating pipeline-state.json.
"""
import os
path = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/tmp_state_update.py"
if os.path.exists(path):
    os.remove(path)
    print("REMOVED")
else:
    print("NOT_FOUND")
