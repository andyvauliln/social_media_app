#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export START_ROOT="$ROOT"

exec node "$ROOT/scripts/run-start-config.mjs" start
