#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-3847}"

kill_port() {
  local port=$1
  if ! command -v lsof >/dev/null 2>&1; then
    echo "[github-oss] warn: lsof not found; cannot free port ${port}" >&2
    return 0
  fi
  local pids
  pids="$(lsof -ti ":${port}" 2>/dev/null || true)"
  [[ -z "$pids" ]] && return 0
  echo "[github-oss] freeing port ${port} (pids: $(echo "$pids" | tr '\n' ' '))" >&2
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    kill "$pid" 2>/dev/null || true
  done <<< "$pids"
  sleep 0.5
  pids="$(lsof -ti ":${port}" 2>/dev/null || true)"
  [[ -z "$pids" ]] && return 0
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    kill -9 "$pid" 2>/dev/null || true
  done <<< "$pids"
}

kill_port "$PORT"
cd "$ROOT"
exec npm run dev
