#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$ROOT/start.config.jsonc"
LOGS_DIR="$ROOT/logs/start"
ENVIRONMENT="${ENVIRONMENT:-development}"

if [[ ! -f "$CONFIG" ]]; then
  echo "[start] error: $CONFIG not found" >&2
  exit 1
fi

mkdir -p "$LOGS_DIR"

parse_config() {
  # Parse JSONC config and flatten each service into a tab-delimited row.
  python3 -c "
import json, re, sys

raw = open(sys.argv[1]).read()
raw = re.sub(r'//.*', '', raw)
raw = re.sub(r'/\*.*?\*/', '', raw, flags=re.DOTALL)
config = json.loads(raw)

for s in config.get('services', []):
    env_files = s.get('envFiles', [])
    if isinstance(env_files, str):
        env_files = [env_files]
    env_files = [str(x) for x in env_files]
    print('\t'.join([
        s.get('name', ''),
        s.get('type', ''),
        str(s.get('enabled', False)).lower(),
        s.get('path', ''),
        s.get('init', ''),
        s.get('start', ''),
        str(s.get('serviceManaged', False)).lower(),
        str(s.get('productionEnabled', False)).lower(),
        ';'.join(env_files),
    ]))
" "$1"
}

while IFS=$'\t' read -r name type enabled svc_path init_cmd start_cmd service_managed production_enabled env_files; do
  # Start only explicitly enabled services.
  [[ "$enabled" != "true" ]] && continue
  # In production, only services marked as productionEnabled are allowed.
  if [[ "$ENVIRONMENT" == "production" && "$production_enabled" != "true" ]]; then
    continue
  fi
  # Agents and externally managed services are not started by this script.
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

  # Load base env first, then service-specific env files so service values can override base values.
  env_args=("$ROOT/envs/root.env")
  if [[ -n "$env_files" ]]; then
    IFS=';' read -r -a service_env_files <<< "$env_files"
    for env_rel in "${service_env_files[@]}"; do
      [[ -z "$env_rel" ]] && continue
      env_args+=("$ROOT/$env_rel")
    done
  fi

  # Build a shell snippet that exports variables from each env file in order.
  env_load_cmd=""
  for env_file in "${env_args[@]}"; do
    env_load_cmd+="if [[ -f \\\"$env_file\\\" ]]; then set -a; source \\\"$env_file\\\"; set +a; else echo \\\"[start] warning: env file not found: $env_file\\\"; fi; "
  done

  echo "[start] $name: $start_cmd -> $log_file"
  nohup bash -c "$env_load_cmd cd \"$cwd\" && $start_cmd" >> "$log_file" 2>&1 &
done < <(parse_config "$CONFIG")

echo "[start] done"
