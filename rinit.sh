#!/usr/bin/env bash
set -euo pipefail

# install everyting
# run symlink script ai_todo: "make symlink script"
# deal with a local db ai_todo: "deal with a local db"
# make file CLAUDE.local.md in a root ai_todo: "make file CLAUDE.local.md in a root @ai"
# make folder main in a root ai_todo: "make folder main in a root" @ai

ROOT="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$ROOT/start.config.jsonc"
ENVIRONMENT="${ENVIRONMENT:-development}"

if [[ ! -f "$CONFIG" ]]; then
  echo "[init] error: $CONFIG not found" >&2
  exit 1
fi

echo "[init] --- local root scaffolding ---"
mkdir -p "$ROOT/!MINE/rot/claude"
mkdir -p "$ROOT/.claude"
touch "$ROOT/!MINE/rot/claude/local.md"
if [[ ! -f "$ROOT/.claude/settings.local.json" ]]; then
  printf "{}\n" > "$ROOT/.claude/settings.local.json"
fi

echo "[init] --- shell aliases ---"
if [[ -f "$ROOT/scripts/install-shell-aliases.sh" ]]; then
  chmod +x "$ROOT/scripts/install-shell-aliases.sh"
  if ! bash "$ROOT/scripts/install-shell-aliases.sh"; then
    echo "[init] WARN: shell alias setup failed; continuing" >&2
  fi
else
  echo "[init] WARN: alias installer not found; skipping" >&2
fi

echo "[init] --- root common (bun) ---"
if [[ -f "$ROOT/scripts/ensure-bun.sh" ]]; then
  _bun_env="$(bash "$ROOT/scripts/ensure-bun.sh")" || exit 1
  [[ -n "${_bun_env:-}" ]] && eval "$_bun_env"
fi
echo "[init] root: bun install"
if ! (cd "$ROOT" && bun install); then
  echo "[init] FAILED: root bun install" >&2
  exit 1
fi

echo "[init] --- root common (claude code) ---"
if [[ -f "$ROOT/scripts/ensure-claude.sh" ]]; then
  _claude_env="$(bash "$ROOT/scripts/ensure-claude.sh")" || exit 1
  [[ -n "${_claude_env:-}" ]] && eval "$_claude_env"
fi

echo "[init] --- plugins ---"
plugins_dir="$ROOT/plugins"
if [[ -d "$plugins_dir" ]]; then
  while IFS= read -r package_json; do
    plugin_dir="$(dirname "$package_json")"
    plugin_name="${plugin_dir#"$ROOT/"}"
    echo "[init] $plugin_name: bun install"
    if ! (cd "$plugin_dir" && bun install); then
      echo "[init] FAILED: $plugin_name" >&2
      failed=1
    fi
  done < <(find "$plugins_dir" -type f -name package.json | sort)
else
  echo "[init] skip plugins: directory $plugins_dir not found" >&2
fi

parse_services() {
  # Parse JSONC config and flatten service init metadata.
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
        str(s.get('developmentEnabled', False)).lower(),
        s.get('path', ''),
        s.get('init', ''),
        s.get('start', ''),
        str(s.get('productionEnabled', False)).lower(),
    ]))
" "$1"
}

parse_common() {
  # Parse optional shared/common init tasks.
  python3 -c "
import json, re, sys

raw = open(sys.argv[1]).read()
raw = re.sub(r'//.*', '', raw)
raw = re.sub(r'/\\*.*?\\*/', '', raw, flags=re.DOTALL)
config = json.loads(raw)

for s in config.get('common', []):
    print('\\t'.join([
        s.get('name', ''),
        s.get('path', ''),
        s.get('init', ''),
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
while IFS=$'\t' read -r name type development_enabled svc_path init_cmd start_cmd production_enabled; do
  # Development: init services flagged for dev. Production: init services flagged for prod.
  if [[ "$ENVIRONMENT" == "production" ]]; then
    [[ "$production_enabled" != "true" ]] && continue
  else
    [[ "$development_enabled" != "true" ]] && continue
  fi
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

echo "[init] --- cron supervisor service ---"
chmod +x "$ROOT/apps/cron-supervisor/acron.sh"
chmod +x "$ROOT/apps/cron-supervisor/scripts/setup-service.sh"
chmod +x "$ROOT/apps/cron-supervisor/scripts/cron-edit.mjs"

if ! bash "$ROOT/apps/cron-supervisor/scripts/setup-service.sh"; then
  echo "[init] WARN: cron supervisor service setup failed; continuing" >&2
fi

echo "[init] --- acron CLI ---"
if ln -sf "$ROOT/apps/cron-supervisor/acron.sh" /usr/local/bin/acron; then
  echo "[init] acron linked: /usr/local/bin/acron"
else
  echo "[init] WARN: could not link /usr/local/bin/acron; continuing" >&2
fi

echo "[init] done"
