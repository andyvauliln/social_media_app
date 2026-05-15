#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"

# Optional: --cursor (default) or --claude selects the agent CLI.
COLLECT_AGENT="cursor"
_seen_claude=0
_seen_cursor=0
for _arg in "$@"; do
  case "$_arg" in
    --claude) _seen_claude=1 ;;
    --cursor) _seen_cursor=1 ;;
    *)
      echo "[collect-inline-tasks-if-needed] unknown option: $_arg (expected --claude or --cursor)" >&2
      exit 2
      ;;
  esac
done
if [[ "$_seen_claude" -eq 1 && "$_seen_cursor" -eq 1 ]]; then
  echo "[collect-inline-tasks-if-needed] use only one of --claude or --cursor" >&2
  exit 2
fi
if [[ "$_seen_claude" -eq 1 ]]; then
  COLLECT_AGENT="claude"
fi

# Scan logic and excludes must stay aligned with
# agents/manager/.claude/skills/collect-inline-tasks/SKILL.md (CONTEXT + RULES).

SCAN_OUT="$(
python3 - "$REPO_ROOT" <<'PYEOF'
import re
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()

exclude_dirs = {
    ".git",
    "node_modules",
    ".vscode",
    "logs",
    "agent.manager.tests",
}
exclude_suffixes = {
    ".json",
}
exclude_filenames = set()
exclude_relative_paths = {
    "agents/manager/scripts/collect-inline-tasks-if-needed.sh",
    "!KNOWLEDGE_BASE/CODE_GUIDANCE.md",
    "agents/manager/.claude/skills/collect-inline-tasks/SKILL.md",
    ".cursor/skills/collect-inline-tasks.manager/SKILL.md",
    "agents/manager/docs/AI_TODO_INLINE_TASKS.md",
}
worktree_container_prefixes = (
    ("!WORKTREES",),
    (".claude", "worktrees"),
    (".cursor", "worktrees"),
)

AI_TODO_MARKER_LAST = re.compile(r"(?i)@ai_todo\s*$")
TODO_AI_START = re.compile(r"(?i)@todo_ai\b\s*")


def normalize_ws(text: str) -> str:
    return " ".join(text.split()).strip()


def remove_ai_todo_suffix(text: str) -> str:
    return re.sub(r"(?i)@ai_todo\s*$", "", text.rstrip()).rstrip()


def extract_payload_from_snippet(snippet: str) -> str:
    body = remove_ai_todo_suffix(snippet.strip())
    start = TODO_AI_START.search(body)
    if start:
        body = body[start.end() :]
    return normalize_ws(body)


def raw_record_field(snippet: str) -> str:
    return snippet.replace("\\", "\\\\").replace("\n", "\\n")


def project_relative_path(rel: Path):
    parts = rel.parts
    for prefix in worktree_container_prefixes:
        prefix_len = len(prefix)
        if tuple(parts[:prefix_len]) == prefix and len(parts) > prefix_len + 1:
            return Path(*parts[prefix_len + 1 :]), parts[prefix_len]
    return rel, ""


def path_or_ancestor_is_symlink(path: Path, root: Path) -> bool:
    """Skip symlinks: never scan symlink targets or anything inside symlink dirs."""
    try:
        rel = path.relative_to(root)
    except ValueError:
        return True
    cur = root
    for part in rel.parts:
        cur = cur / part
        try:
            if cur.is_symlink():
                return True
        except OSError:
            return True
    return False


matches_by_key = {}

for path in root.rglob("*"):
    if not path.is_file():
        continue
    if path_or_ancestor_is_symlink(path, root):
        continue

    raw_rel = path.relative_to(root)
    rel, worktree_name = project_relative_path(raw_rel)
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
    idx = 0
    while idx < len(lines):
        line = lines[idx]
        ml = TODO_AI_START.search(line)

        if ml:
            start_idx = idx
            chunk = [line]
            while idx + 1 < len(lines) and not AI_TODO_MARKER_LAST.search(lines[idx]):
                idx += 1
                chunk.append(lines[idx])

            if AI_TODO_MARKER_LAST.search(lines[idx]):
                snippet = "\n".join(chunk).strip()
                line_no = start_idx + 1
                match_key = (rel_posix, line_no, snippet)
                existing = matches_by_key.get(match_key)
                if existing is None or (not existing[3] and worktree_name):
                    matches_by_key[match_key] = (
                        rel_posix,
                        line_no,
                        snippet,
                        worktree_name,
                        raw_rel.as_posix(),
                    )
            idx += 1
            continue

        if AI_TODO_MARKER_LAST.search(line):
            snippet = line.strip()
            line_no = idx + 1
            match_key = (rel_posix, line_no, snippet)
            existing = matches_by_key.get(match_key)
            if existing is None or (not existing[3] and worktree_name):
                matches_by_key[match_key] = (
                    rel_posix,
                    line_no,
                    snippet,
                    worktree_name,
                    raw_rel.as_posix(),
                )

        idx += 1

matches = list(matches_by_key.values())
if not matches:
    print("NO_MATCHES")
else:
    for rel_posix, line_no, snippet, worktree_name, raw_rel_posix in matches:
        log_prompt = extract_payload_from_snippet(snippet)
        print(rel_posix)
        print(f'ai_todo: {log_prompt!r}')
        if worktree_name:
            print(f"source: worktree branch: {worktree_name}")
        print("")
    print("__COLLECT_INLINE_RAW__")
    for rel_posix, line_no, snippet, worktree_name, raw_rel_posix in matches:
        print(
            f"{rel_posix}:{line_no}:"
            f"worktree={worktree_name}:raw={raw_rel_posix}:"
            f"{raw_record_field(snippet)}"
        )
PYEOF
)"

if [[ "$SCAN_OUT" == "NO_MATCHES" ]]; then
  echo "[collect-inline-tasks-if-needed] no ai_todo entries found; skipping"
  echo "[collect-inline-tasks-if-needed] summary: matches=0, agent=not_started"
  exit 0
fi

RAW_LINES="$(printf '%s\n' "$SCAN_OUT" | awk '/^__COLLECT_INLINE_RAW__$/ {p=1; next} p')"
HUMAN_LINES="$(printf '%s\n' "$SCAN_OUT" | awk '/^__COLLECT_INLINE_RAW__$/ {exit} {print}')"
MATCH_COUNT="$(printf '%s\n' "$RAW_LINES" | grep -c . || true)"

echo "[collect-inline-tasks-if-needed] scan ($MATCH_COUNT match(es)):"
printf '%s\n' "$HUMAN_LINES"

export COLLECT_INLINE_TASKS_SCAN_OUT="$SCAN_OUT"
export COLLECT_INLINE_TASKS_RAW_LINES="$RAW_LINES"

if [[ "${COLLECT_INLINE_TASKS_DRY_RUN:-0}" == "1" ]]; then
  echo "[collect-inline-tasks-if-needed] summary: matches=$MATCH_COUNT, agent=not_started (dry-run)"
  exit 0
fi

echo "[collect-inline-tasks-if-needed] summary: matches=$MATCH_COUNT, agent=starting ($COLLECT_AGENT)"

COLLECT_PROMPT="$(cat <<EOF
/collect-inline-tasks.manager

Use this scan output from agents/manager/scripts/collect-inline-tasks-if-needed.sh as authoritative. Do not run a separate raw repository scan for actionable matches; process exactly these $MATCH_COUNT normalized, de-duplicated match(es). If a match has "source: worktree branch: <branch>", create the task with notes "Inline collected from worktree branch: <branch>" and remove the comment from the raw worktree path listed under __COLLECT_INLINE_RAW__.

$SCAN_OUT
EOF
)"

if [[ "$COLLECT_AGENT" == "claude" ]]; then
  export PATH="${HOME}/.local/bin:${HOME}/.bun/bin:${PATH:-}"
  if [[ ! -f "$REPO_ROOT/agents/manager/ragent.claude.sh" ]]; then
    echo "[collect-inline-tasks-if-needed] error: agents/manager/ragent.claude.sh not found" >&2
    echo "[collect-inline-tasks-if-needed] summary: matches=$MATCH_COUNT, agent=failed (no launcher)" >&2
    exit 1
  fi
  if ! command -v claude >/dev/null 2>&1; then
    echo "[collect-inline-tasks-if-needed] error: claude CLI not found in PATH" >&2
    echo "[collect-inline-tasks-if-needed] summary: matches=$MATCH_COUNT, agent=failed (no CLI)" >&2
    exit 1
  fi
  cd "$REPO_ROOT" || exit 1
  exec bash "$REPO_ROOT/agents/manager/ragent.claude.sh" -p "$COLLECT_PROMPT"
fi

if [[ -f "$REPO_ROOT/scripts/ensure-cursor-agent.sh" ]]; then
  _cursor_agent_env="$(bash "$REPO_ROOT/scripts/ensure-cursor-agent.sh")" || exit 1
  [[ -n "${_cursor_agent_env:-}" ]] && eval "$_cursor_agent_env"
fi

export PATH="${HOME}/.local/bin:${PATH:-}"

if ! command -v agent >/dev/null 2>&1; then
  echo "[collect-inline-tasks-if-needed] error: Cursor agent CLI not found in PATH" >&2
  echo "[collect-inline-tasks-if-needed] summary: matches=$MATCH_COUNT, agent=failed (no CLI)" >&2
  exit 1
fi

cd "$REPO_ROOT" || exit 1
exec agent --workspace "$REPO_ROOT" --print --trust --model auto "$COLLECT_PROMPT"
