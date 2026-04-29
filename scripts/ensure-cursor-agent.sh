#!/usr/bin/env bash
# Ensure Cursor CLI `agent` exists and is logged in. Stdout: optional single `export PATH=...` for eval; messages on stderr only.
# Installer: https://cursor.com/docs/cli/overview
set -euo pipefail
set -o pipefail

_hom="${HOME:-}"
_local_bin="${_hom}/.local/bin"
_parent_path="${PATH:-}"

emit_path_if_needed() {
  local found dir
  found="$(command -v agent 2>/dev/null || true)"
  [[ -z "${found}" ]] && return 1
  dir="$(dirname "${found}")"
  case ":${_parent_path}:" in *":${dir}:"*) return 0 ;; esac
  printf 'export PATH=%q:$PATH\n' "${dir}"
  return 0
}

agent_logged_in() {
  PATH="${_local_bin}:${PATH:-}"
  command -v agent >/dev/null 2>&1 || return 1
  agent status --format json 2>/dev/null | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    sys.exit(0 if d.get("isAuthenticated") else 1)
except Exception:
    sys.exit(1)
'
}

ensure_binary() {
  export PATH="${_local_bin}:${PATH:-}"

  if command -v agent >/dev/null 2>&1; then
    return 0
  fi

  if [[ -x "${_local_bin}/agent" ]] || [[ -L "${_local_bin}/agent" ]]; then
    return 0
  fi

  if command -v curl >/dev/null 2>&1; then
    echo "[init] Cursor Agent CLI not found; running installer ..." >&2
    if curl -fsSL https://cursor.com/install | bash 1>&2; then
      :
    else
      echo "[init] WARN: Cursor Agent CLI installer failed" >&2
    fi
  fi

  export PATH="${_local_bin}:${PATH:-}"
  if command -v agent >/dev/null 2>&1; then
    return 0
  fi

  if [[ -x "${_local_bin}/agent" ]] || [[ -L "${_local_bin}/agent" ]]; then
    return 0
  fi

  echo "[init] FAILED: agent CLI still not available after install attempts" >&2
  return 1
}

maybe_login() {
  export PATH="${_local_bin}:${PATH:-}"
  command -v agent >/dev/null 2>&1 || return 1

  if agent_logged_in; then
    return 0
  fi

  if [[ "${CURSOR_AGENT_SKIP_LOGIN:-}" == "1" ]]; then
    echo "[init] WARN: Cursor Agent not authenticated (CURSOR_AGENT_SKIP_LOGIN=1); run: agent login" >&2
    return 0
  fi

  echo "[init] Cursor Agent: authentication required" >&2
  if [[ -t 0 ]] && [[ -t 1 ]]; then
    echo "[init] Running agent login ..." >&2
    agent login 1>&2 || echo "[init] WARN: agent login did not complete successfully" >&2
  else
    echo "[init] WARN: non-interactive shell — run: agent login when ready" >&2
  fi
  return 0
}

if ! ensure_binary; then
  exit 1
fi

maybe_login

emit_path_if_needed || true
exit 0
