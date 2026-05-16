#!/usr/bin/env bash
# Stop hook: run turn audit. Never block the turn — always exit 0.
set +e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ERR_DIR="$REPO_ROOT/logs/claude/_meta"
mkdir -p "$ERR_DIR" 2>/dev/null

# Source root env (TELEGRAM_AUDIT_REPLY etc.)
if [ -f "$REPO_ROOT/envs/root.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/envs/root.env"
  set +a
fi

# Hook receives JSON on stdin with transcript_path
python3 "$REPO_ROOT/scripts/turn_audit.py" 2>>"$ERR_DIR/audit-errors.log"
exit 0
