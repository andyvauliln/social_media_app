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
}

AI_TODO_MARKER = re.compile(r"(?i)\bai_todo\s*:")
# Double-quoted prompt; supports one physical line only (C/JSONC-style).
PROMPT_QUOTED = re.compile(r'(?i)\bai_todo\s*:\s*"([^"]*)"')
# Block or multiline string: allows escapes and newlines inside quotes.
PROMPT_QUOTED_ML = re.compile(r'(?is)\bai_todo\s*:\s*"((?:\\.|[^"\\])*)"')
BLOCK_COMMENT = re.compile(r"/\*[\s\S]*?\*/")


def innermost_block_containing(text: str, pos: int):
    hits = [m for m in BLOCK_COMMENT.finditer(text) if m.start() <= pos < m.end()]
    if not hits:
        return None
    return min(hits, key=lambda m: m.end() - m.start())


def extend_line_comment_forward(text: str, line_end: int, line_pat: re.Pattern) -> int:
    end = line_end
    while end < len(text):
        if text[end] != "\n":
            break
        next_start = end + 1
        next_nl = text.find("\n", next_start)
        if next_nl == -1:
            next_nl = len(text)
        nxt = text[next_start:next_nl]
        if nxt.strip() == "":
            break
        if not line_pat.match(nxt):
            break
        end = next_nl
    return end


def snippet_for_match(text: str, m: re.Match) -> str:
    pos = m.start()
    line_start = text.rfind("\n", 0, pos) + 1
    line_end = text.find("\n", pos)
    if line_end == -1:
        line_end = len(text)
    line = text[line_start:line_end]

    blk = innermost_block_containing(text, pos)
    if blk is not None:
        return blk.group(0).strip()

    if re.match(r"(?i)^\s*//.*\bai_todo\s*:", line):
        ext = extend_line_comment_forward(text, line_end, re.compile(r"^\s*//"))
        return text[line_start:ext].strip()

    if re.match(r"(?i)^\s*#(?!\!).*\bai_todo\s*:", line):
        ext = extend_line_comment_forward(text, line_end, re.compile(r"^\s*#"))
        return text[line_start:ext].strip()

    return line.strip()


def log_ai_todo_payload(snippet: str) -> str:
    mq = PROMPT_QUOTED_ML.search(snippet)
    if mq:
        return " ".join(mq.group(1).split())

    s = snippet.strip()
    if s.startswith("/*"):
        inner = s[2:]
        if inner.rstrip().endswith("*/"):
            inner = inner.rstrip()[:-2]
        lines = [re.sub(r"^\s*\*\s?", "", ln) for ln in inner.splitlines()]
        body = "\n".join(lines)
    elif all(
        re.match(r"^\s*//", ln) or not ln.strip()
        for ln in snippet.splitlines()
    ):
        lines = [re.sub(r"^\s*//\s?", "", ln) for ln in snippet.splitlines() if ln.strip()]
        body = "\n".join(lines)
    elif all(
        re.match(r"^\s*#", ln) or not ln.strip()
        for ln in snippet.splitlines()
    ):
        lines = [re.sub(r"^\s*#\s?", "", ln) for ln in snippet.splitlines() if ln.strip()]
        body = "\n".join(lines)
    else:
        body = snippet

    mq1 = PROMPT_QUOTED.search(body)
    if mq1:
        return mq1.group(1)

    mr = re.search(r"(?is)\bai_todo\s*:\s*(.*)", body)
    if mr:
        return " ".join(mr.group(1).split()).strip()
    return snippet


def raw_record_field(snippet: str) -> str:
    return snippet.replace("\\", "\\\\").replace("\n", "\\n")


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

    for m in AI_TODO_MARKER.finditer(text):
        line_no = text.count("\n", 0, m.start()) + 1
        snippet = snippet_for_match(text, m)
        matches.append((rel_posix, line_no, snippet))

if not matches:
    print("NO_MATCHES")
else:
    for rel_posix, line_no, snippet in matches:
        log_prompt = log_ai_todo_payload(snippet)
        print(rel_posix)
        print(f'ai_todo: {log_prompt!r}')
        print("")
    print("__COLLECT_INLINE_RAW__")
    for rel_posix, line_no, snippet in matches:
        print(f"{rel_posix}:{line_no}:{raw_record_field(snippet)}")
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

if [[ "${COLLECT_INLINE_TASKS_DRY_RUN:-0}" == "1" ]]; then
  echo "[collect-inline-tasks-if-needed] summary: matches=$MATCH_COUNT, agent=not_started (dry-run)"
  exit 0
fi

echo "[collect-inline-tasks-if-needed] summary: matches=$MATCH_COUNT, agent=starting ($COLLECT_AGENT)"

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
  exec bash "$REPO_ROOT/agents/manager/ragent.claude.sh" -p "/collect-inline-tasks"
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
exec agent --workspace "$REPO_ROOT" --print --trust --model auto /collect-inline-tasks.manager
