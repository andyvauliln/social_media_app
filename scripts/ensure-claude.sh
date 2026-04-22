#!/usr/bin/env bash
# Ensure Claude Code `claude` CLI exists. Stdout: optional single `export PATH=...` for the parent to eval; messages on stderr only.
set -euo pipefail
set -o pipefail

_hom="${HOME:-}"
_local_bin="${_hom}/.local/bin"
_npm_global="${_hom}/.npm-global/bin"
_parent_path="${PATH:-}"

emit_path_if_needed() {
  local found dir
  found="$(command -v claude 2>/dev/null || true)"
  [[ -z "${found}" ]] && return 1
  dir="$(dirname "${found}")"
  case ":${_parent_path}:" in *":${dir}:"*) return 0 ;; esac
  printf 'export PATH=%q:$PATH\n' "${dir}"
  return 0
}

export PATH="${_local_bin}:${_npm_global}:${PATH:-}"

if command -v claude >/dev/null 2>&1; then
  emit_path_if_needed
  exit 0
fi

if [[ -x "${_local_bin}/claude" ]]; then
  printf 'export PATH=%q:$PATH\n' "${_local_bin}"
  exit 0
fi

if command -v curl >/dev/null 2>&1; then
  echo "[init] claude CLI not found; running native installer ..." >&2
  if curl -fsSL https://claude.ai/install.sh | bash 1>&2; then
    :
  else
    echo "[init] WARN: native Claude installer failed; will try npm if available" >&2
  fi
fi

export PATH="${_local_bin}:${_npm_global}:${PATH:-}"
if command -v claude >/dev/null 2>&1; then
  emit_path_if_needed
  exit 0
fi
if [[ -x "${_local_bin}/claude" ]]; then
  printf 'export PATH=%q:$PATH\n' "${_local_bin}"
  exit 0
fi

if command -v npm >/dev/null 2>&1; then
  echo "[init] installing @anthropic-ai/claude-code via npm ..." >&2
  npm install -g @anthropic-ai/claude-code 1>&2
  _pfx="$(npm prefix -g 2>/dev/null || true)"
  export PATH="${_local_bin}:${_npm_global}:${_pfx:+$_pfx/bin:}${PATH:-}"
fi

if command -v claude >/dev/null 2>&1; then
  emit_path_if_needed
  exit 0
fi

echo "[init] FAILED: claude CLI still not available after install attempts" >&2
exit 1
