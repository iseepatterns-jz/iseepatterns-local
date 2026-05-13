#!/usr/bin/env python3
"""Read pipeline-state.json and print it."""
import json, sys

STATE_FILE = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/tools/pipeline/pipeline-state.json"

with open(STATE_FILE, 'r') as f:
    data = json.load(f)

print(json.dumps(data, indent=2))
