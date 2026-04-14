#!/usr/bin/env bash
set -euo pipefail

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun is required (https://bun.sh)" >&2
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || true
if [[ -z "${ROOT:-}" ]]; then
  echo "error: run from inside the git repository (git rev-parse failed)" >&2
  exit 1
fi

export START_ROOT="$ROOT"
exec bun "$ROOT/scripts/init-apps.mjs"
