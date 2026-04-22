#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$ROOT/start.config.jsonc"
LOGS_DIR="$ROOT/logs/start"

if [[ -f "$ROOT/envs/root.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/envs/root.env"
  set +a
fi
ENVIRONMENT="${ENVIRONMENT:-development}"

if [[ ! -f "$CONFIG" ]]; then
  echo "[start] error: $CONFIG not found" >&2
  exit 1
fi

mkdir -p "$LOGS_DIR"

if [[ ! -f "$ROOT/envs/root.env" ]]; then
  echo "[start] warning: ${ROOT}/envs/root.env missing; nohup children will not load API keys from that file." >&2
fi
echo "[start] ENVIRONMENT=${ENVIRONMENT} config=${CONFIG}" >&2

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
        str(s.get('developmentEnabled', False)).lower(),
        s.get('path', ''),
        s.get('init', ''),
        s.get('start', ''),
        str(s.get('serviceManaged', False)).lower(),
        str(s.get('productionEnabled', False)).lower(),
        ';'.join(env_files),
    ]))
" "$1"
}

started_count=0
while IFS=$'\t' read -r name type development_enabled svc_path init_cmd start_cmd service_managed production_enabled env_files; do
  # Development: start services flagged for dev. Production: start services flagged for prod.
  if [[ "$ENVIRONMENT" == "production" ]]; then
    if [[ "$production_enabled" != "true" ]]; then
      echo "[start] skip ${name}: productionEnabled is not true (ENVIRONMENT=production)" >&2
      continue
    fi
  else
    if [[ "$development_enabled" != "true" ]]; then
      echo "[start] skip ${name}: developmentEnabled is not true (ENVIRONMENT=development)" >&2
      continue
    fi
  fi
  # Externally managed services are not started by this script.
  if [[ "$service_managed" == "true" ]]; then
    echo "[start] skip ${name}: serviceManaged=true (use systemd/launchd, not rstart.sh)" >&2
    continue
  fi
  if [[ -z "$start_cmd" ]]; then
    echo "[start] skip ${name}: no start command in config" >&2
    continue
  fi

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
  env_args=()
  if [[ -f "$ROOT/envs/root.env" ]]; then
    env_args+=("$ROOT/envs/root.env")
  fi
  if [[ -n "$env_files" ]]; then
    IFS=';' read -r -a service_env_files <<< "$env_files"
    for env_rel in "${service_env_files[@]}"; do
      [[ -z "$env_rel" ]] && continue
      env_args+=("$ROOT/$env_rel")
    done
  fi

  # Build a shell snippet that exports variables from each env file in order (skip missing files quietly).
  env_load_cmd=""
  for env_file in "${env_args[@]}"; do
    _efq="$(printf '%q' "$env_file")"
    env_load_cmd+="if [[ -f ${_efq} ]]; then set -a; source ${_efq}; set +a; fi; "
  done

  echo "[start] launching ${name}: ${start_cmd} (cwd=${cwd}, log=${log_file})" >&2
  _pty="${ROOT}/scripts/run-under-pty.sh"
  if [[ "${type}" == "agent" ]] && [[ -f "${_pty}" ]] && command -v script >/dev/null 2>&1; then
    # Interactive `claude` needs a TTY; nohup has none. PTY wrapper avoids --print / stdin errors.
    _inv="$(printf 'exec bash %q %q %q' "${_pty}" "${cwd}" "${start_cmd}")"
    nohup bash -c "${env_load_cmd}${_inv}" >> "$log_file" 2>&1 &
  else
    if [[ "${type}" == "agent" ]]; then
      if ! command -v script >/dev/null 2>&1; then
        echo "[start] WARN: ${name}: install 'script' (bsdutils/util-linux) for PTY-wrapped agents, or run ./ragent*.sh in tmux/screen." >&2
      elif [[ ! -f "${_pty}" ]]; then
        echo "[start] WARN: ${name}: missing ${_pty}; starting without PTY." >&2
      fi
    fi
    nohup bash -c "${env_load_cmd}cd $(printf '%q' "$cwd") && ${start_cmd}" >> "$log_file" 2>&1 &
  fi
  started_count=$((started_count + 1))
done < <(parse_config "$CONFIG")

if [[ "${started_count}" -eq 0 ]]; then
  echo "[start] no services were started (every row was skipped by environment flags, serviceManaged, missing path, or empty start)." >&2
fi
echo "[start] done (${started_count} background service(s) started)"
