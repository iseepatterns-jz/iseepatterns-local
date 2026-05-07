#!/bin/bash
# gems/notebooklm_hook.sh — git post-push / post-commit hook for gem-notebooklm
# ──────────────────────────────────────────────────────────────────────────────
# Fires when new evidence is committed to GitHub.
# Automatically generates a "New Evidence Spotlight" NotebookLM brief.
#
# INSTALLATION (one-time):
#   cp gems/notebooklm_hook.sh .git/hooks/post-push
#   chmod +x .git/hooks/post-push
#
# Or for post-commit:
#   cp gems/notebooklm_hook.sh .git/hooks/post-commit
#   chmod +x .git/hooks/post-commit
#
# SKIP for a single commit:
#   SKIP_NLM=1 git push origin main
#
# GENERATE ALL 5 TEMPLATES on this push:
#   ALL_NLM=1 git push origin main

set -e

# Skip if disabled
if [ "${SKIP_NLM:-0}" = "1" ]; then
  echo "[gem-notebooklm] Skipped (SKIP_NLM=1)"
  exit 0
fi

BASE_DIR="/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1"
SCRIPT="$BASE_DIR/scripts/notebooklm_deepdive.py"

# Detect Python in virtual environment
if [ -f "$BASE_DIR/.venv-3.14/bin/python" ]; then
  PYTHON="$BASE_DIR/.venv-3.14/bin/python"
elif [ -f "$BASE_DIR/.venv/bin/python" ]; then
  PYTHON="$BASE_DIR/.venv/bin/python"
else
  PYTHON="python3"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  gem-notebooklm | POST-PUSH DEEPDIVE HOOK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$SCRIPT" ]; then
  echo "[gem-notebooklm] Script not found: $SCRIPT"
  exit 0
fi

# Determine mode
if [ "${ALL_NLM:-0}" = "1" ]; then
  echo "[gem-notebooklm] Generating ALL 5 audio overview templates..."
  "$PYTHON" "$SCRIPT" --days 30
else
  echo "[gem-notebooklm] Generating New Evidence Spotlight brief..."
  "$PYTHON" "$SCRIPT" --template new-evidence-spotlight --days 30
fi

echo ""
echo "  Check AUDIO_OVERVIEW_LOCKER for your briefing:"
echo "  $BASE_DIR/data/AUDIO_OVERVIEW_LOCKER/"
echo ""
echo "  Next step: Open NotebookLM and upload the brief."
echo "  See: data/AUDIO_OVERVIEW_LOCKER/briefings/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
