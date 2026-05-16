#!/usr/bin/env bash
# Run claude and cursor agents in parallel with a shared prompt.
# Output from both is safe-appended (line-by-line) to a shared log file.
# Usage: ./rparallel.sh "your prompt here"
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null || printf '%s' "${SCRIPT_DIR}")"
LOG_FILE="${ROOT_DIR}/logs/agents/main/parallel.log"
LOCK_FILE="${LOG_FILE}.lock"

mkdir -p "$(dirname "${LOG_FILE}")"

PROMPT="${*}"
if [[ -z "${PROMPT}" ]]; then
  echo "Usage: $0 <prompt>" >&2
  exit 1
fi

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

safe_append() {
  local prefix="$1"
  while IFS= read -r line; do
    {
      flock -x 200
      printf '[%s][%s] %s\n' "${TIMESTAMP}" "${prefix}" "${line}" >> "${LOG_FILE}"
    } 200>"${LOCK_FILE}"
  done
}

{
  flock -x 200
  printf '\n=== parallel run: %s ===\nprompt: %s\n' "${TIMESTAMP}" "${PROMPT}" >> "${LOG_FILE}"
} 200>"${LOCK_FILE}"

bash "${SCRIPT_DIR}/ragent.claude.sh" -p "${PROMPT}" 2>&1 | safe_append "claude" &
CLAUDE_PID=$!

bash "${SCRIPT_DIR}/ragent.cursor.sh" --print --trust "${PROMPT}" 2>&1 | safe_append "cursor" &
CURSOR_PID=$!

claude_exit=0
cursor_exit=0

wait "${CLAUDE_PID}" || claude_exit=$?
wait "${CURSOR_PID}" || cursor_exit=$?

{
  flock -x 200
  printf '[%s][claude] exit=%s\n' "${TIMESTAMP}" "${claude_exit}" >> "${LOG_FILE}"
  printf '[%s][cursor] exit=%s\n' "${TIMESTAMP}" "${cursor_exit}" >> "${LOG_FILE}"
  printf '=== done: %s ===\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "${LOG_FILE}"
} 200>"${LOCK_FILE}"

echo "Done. Log: ${LOG_FILE}"
