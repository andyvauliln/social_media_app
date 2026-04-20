#!/usr/bin/env bash
set -euo pipefail

# install everyting
# run symlink script ai_todo: "make symlink script"
# deal with a local db ai_todo: "deal with a local db"
# make file CLAUDE.local.md in a root ai_todo: "make file CLAUDE.local.md in a root @ai"
# make folder main in a root ai_todo: "make folder main in a root" @ai

ROOT="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$ROOT/start.config.jsonc"

if [[ ! -f "$CONFIG" ]]; then
  echo "[init] error: $CONFIG not found" >&2
  exit 1
fi

echo "[init] --- root common (bun) ---"
echo "[init] root: bun install"
if ! (cd "$ROOT" && bun install); then
  echo "[init] FAILED: root bun install" >&2
  exit 1
fi

parse_services() {
  python3 -c "
import json, re, sys

raw = open(sys.argv[1]).read()
raw = re.sub(r'//.*', '', raw)
raw = re.sub(r'/\*.*?\*/', '', raw, flags=re.DOTALL)
config = json.loads(raw)

for s in config.get('services', []):
    print('\t'.join([
        s.get('name', ''),
        s.get('type', ''),
        str(s.get('enabled', False)).lower(),
        s.get('path', ''),
        s.get('init', ''),
        s.get('start', ''),
    ]))
" "$1"
}

failed=0

echo "[init] --- common ---"
while IFS=$'\t' read -r name svc_path init_cmd; do
  [[ -z "$init_cmd" ]] && continue

  cwd="$ROOT/$svc_path"
  if [[ ! -d "$cwd" ]]; then
    echo "[init] skip $name: directory $cwd not found" >&2
    continue
  fi

  echo "[init] $name: $init_cmd"
  if ! (cd "$cwd" && eval "$init_cmd"); then
    echo "[init] FAILED: $name" >&2
    failed=1
  fi
done < <(parse_common "$CONFIG")

echo "[init] --- services ---"
while IFS=$'\t' read -r name type enabled svc_path init_cmd start_cmd; do
  [[ "$enabled" != "true" ]] && continue
  [[ -z "$init_cmd" ]] && continue

  cwd="$ROOT/$svc_path"
  if [[ ! -d "$cwd" ]]; then
    echo "[init] skip $name: directory $cwd not found" >&2
    continue
  fi

  echo "[init] $name: $init_cmd"
  if ! (cd "$cwd" && eval "$init_cmd"); then
    echo "[init] FAILED: $name" >&2
    failed=1
  fi
done < <(parse_services "$CONFIG")

if [[ "$failed" -eq 1 ]]; then
  echo "[init] completed with errors" >&2
  exit 1
fi

echo "[init] done"
