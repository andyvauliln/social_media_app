#!/usr/bin/env bash
# Kill Telegram poller PIDs recorded in envs/*telegram*/bot.pid (project state dirs).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(git -C "${SCRIPT_DIR}/.." rev-parse --show-toplevel 2>/dev/null)" || ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT="$(cd "$ROOT" && pwd)"
shopt -s nullglob
for d in "${ROOT}/envs"/*telegram*; do
  [[ -d "$d" ]] || continue
  f="${d}/bot.pid"
  [[ -f "$f" ]] || continue
  pid="$(tr -d ' \n\t' <"$f")"
  [[ -n "${pid}" ]] || continue
  if kill -0 "${pid}" 2>/dev/null; then
    echo "kill pid=${pid} (${f})"
    kill "${pid}" 2>/dev/null || true
  else
    echo "skip stale pid=${pid} (${f})"
  fi
done
