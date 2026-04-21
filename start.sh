#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$ROOT/start.config.jsonc"
LOGS_DIR="$ROOT/logs/start"

if [[ ! -f "$CONFIG" ]]; then
  echo "[start] error: $CONFIG not found" >&2
  exit 1
fi

mkdir -p "$LOGS_DIR"

parse_config() {
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
        str(s.get('serviceManaged', False)).lower(),
    ]))
" "$1"
}

while IFS=$'\t' read -r name type enabled svc_path init_cmd start_cmd service_managed; do
  [[ "$enabled" != "true" ]] && continue
  [[ "$type" == "agent" ]] && continue
  [[ "$service_managed" == "true" ]] && continue
  [[ -z "$start_cmd" ]] && continue

  cwd="$ROOT/$svc_path"
  if [[ ! -d "$cwd" ]]; then
    echo "[start] skip $name: directory $cwd not found" >&2
    continue
  fi

  log_file="$LOGS_DIR/$name.log"
  stamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "" >> "$log_file"
  echo "--- $stamp starting $name ($start_cmd) cwd=$cwd ---" >> "$log_file"

  echo "[start] $name: $start_cmd -> $log_file"
  nohup sh -c "cd \"$cwd\" && $start_cmd" >> "$log_file" 2>&1 &
done < <(parse_config "$CONFIG")

echo "[start] done"
