#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKER_START="# >>> social_media_app aliases >>>"
MARKER_END="# <<< social_media_app aliases <<<"

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  shift
fi

default_aliases=(
  "sma.root=cd \"$ROOT_DIR\""
  "sma.shell=bash \"$ROOT_DIR/scripts/install-shell-aliases.sh\""
  "sma.init=bash \"$ROOT_DIR/rinit.sh\""
  "sma.start=bash \"$ROOT_DIR/rstart.sh\""
  "sma.main=bash \"$ROOT_DIR/ragent.sh\""
  "sma.dev=bash \"$ROOT_DIR/agents/agent.dev/ragent.dev.sh\""
  "sma.manager=bash \"$ROOT_DIR/agents/agent.manager/ragent.manager.sh\""
  "sma.dante=bash \"$ROOT_DIR/agents/agent.dante/ragent.dante.sh\""
  "sma.knowledge-base=bash \"$ROOT_DIR/agents/agent.knowledge-base/ragent.knowledge-base.sh\""
  "sma.db=bash \"$ROOT_DIR/agents/agent.db/ragent.db.sh\""
  "sma.logs=bash \"$ROOT_DIR/agents/agent.logs/ragent.logs.sh\""

)

aliases_to_install=("$@")
if [[ "${#aliases_to_install[@]}" -eq 0 ]]; then
  aliases_to_install=("${default_aliases[@]}")
fi

build_alias_block() {
  printf "%s\n" "$MARKER_START"
  for entry in "${aliases_to_install[@]}"; do
    if [[ "$entry" != *=* ]]; then
      echo "Invalid alias format: $entry (expected name=command)" >&2
      exit 1
    fi
    alias_name="${entry%%=*}"
    alias_command="${entry#*=}"
    printf "alias %s='%s'\n" "$alias_name" "$alias_command"
  done
  printf "%s\n" "$MARKER_END"
}

upsert_alias_block() {
  local rc_file="$1"
  local block_content="$2"

  mkdir -p "$(dirname "$rc_file")"
  touch "$rc_file"

  python3 - "$rc_file" "$MARKER_START" "$MARKER_END" "$block_content" "$DRY_RUN" <<'PY'
import pathlib
import re
import sys

rc_file = pathlib.Path(sys.argv[1])
start = sys.argv[2]
end = sys.argv[3]
block = sys.argv[4]
dry_run = sys.argv[5] == "1"

content = rc_file.read_text(encoding="utf-8")
pattern = re.compile(rf"(?ms)^{re.escape(start)}\n.*?^{re.escape(end)}\n?")

if pattern.search(content):
    new_content = pattern.sub(block + "\n", content, count=1)
    action = "would update" if dry_run else "updated"
else:
    suffix = "" if content.endswith("\n") or not content else "\n"
    new_content = f"{content}{suffix}\n{block}\n"
    action = "would append to" if dry_run else "updated"

if dry_run:
    print(f"[dry-run] {action}: {rc_file}")
else:
    rc_file.write_text(new_content, encoding="utf-8")
    print(f"{action}: {rc_file}")
PY
}

ALIAS_BLOCK="$(build_alias_block)"

rc_files=(
  "$HOME/.bashrc"
  "$HOME/.bash_profile"
  "$HOME/.zshrc"
  "$HOME/.profile"
  "$HOME/.kshrc"
)

for file in "${rc_files[@]}"; do
  upsert_alias_block "$file" "$ALIAS_BLOCK"
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] no files modified"
else
  echo "done. restart your shell or run: source ~/.zshrc (or ~/.bashrc)"
fi
