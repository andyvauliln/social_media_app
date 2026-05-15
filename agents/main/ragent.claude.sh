#!/usr/bin/env bash
# Root-repo Claude session with envs/main.telegram (second bot). Same behavior as ./ragent.claude.sh from repo root.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel)"
exec bash "${ROOT_DIR}/ragent.claude.sh" "$@"
