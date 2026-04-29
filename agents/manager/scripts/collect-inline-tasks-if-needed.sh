#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"

SCAN_RESULT="$(
python3 - "$REPO_ROOT" <<'PYEOF'
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()

exclude_dirs = {
    ".git",
    "node_modules",
    ".cursor",
    ".claude",
    ".vscode",
    "logs",
    "agent.manager.tests",
}
exclude_suffixes = {
    ".json",
}
exclude_filenames = {
}
exclude_relative_paths = {
    "/scripts/collect-inline-tasks-if-needed.sh",
    "!KNOWLEDGE_BASE/CODE_GUIDANCE.md",
    "agents/manager/.claude/skills/collect-inline-tasks/SKILL.md",
}

matches = []

for path in root.rglob("*"):
    if not path.is_file():
        continue

    rel = path.relative_to(root)
    rel_posix = rel.as_posix()
    parts = set(rel.parts)
    if parts & exclude_dirs:
        continue
    if rel_posix in exclude_relative_paths:
        continue
    if path.name in exclude_filenames:
        continue
    if path.suffix.lower() in exclude_suffixes:
        continue

    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue

    lines = text.splitlines()
    for idx, line in enumerate(lines, start=1):
        if "ai_todo" in line.lower():
            matches.append(f"{rel}:{idx}:{line.strip()}")

if not matches:
    print("NO_MATCHES")
else:
    print("\n".join(matches))
PYEOF
)"

if [[ "$SCAN_RESULT" == "NO_MATCHES" ]]; then
  echo "[collect-inline-tasks-if-needed] no ai_todo entries found; skipping"
  exit 0
fi

echo "[collect-inline-tasks-if-needed] ai_todo entries detected; running Cursor agent"
echo "$SCAN_RESULT"

if [[ "${COLLECT_INLINE_TASKS_DRY_RUN:-0}" == "1" ]]; then
  echo "[collect-inline-tasks-if-needed] dry-run enabled; skipping agent execution"
  exit 0
fi

if [[ -f "$REPO_ROOT/scripts/ensure-cursor-agent.sh" ]]; then
  _cursor_agent_env="$(bash "$REPO_ROOT/scripts/ensure-cursor-agent.sh")" || exit 1
  [[ -n "${_cursor_agent_env:-}" ]] && eval "$_cursor_agent_env"
fi

export PATH="${HOME}/.local/bin:${PATH:-}"

if ! command -v agent >/dev/null 2>&1; then
  echo "[collect-inline-tasks-if-needed] error: Cursor agent CLI not found in PATH" >&2
  exit 1
fi

cd "$REPO_ROOT" || exit 1
exec agent --workspace "$REPO_ROOT" --print --trust --model auto /collect-inline-tasks.manager


