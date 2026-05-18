#!/usr/bin/env bash
# Print export PATH=... for nvm-managed Node (default major 22) on stdout; logs on stderr.
set -euo pipefail

NVM_DIR="${NVM_DIR:-${HOME:-}/.nvm}"
NODE_VERSION="${NODE_VERSION:-22}"

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "[init] FAILED: nvm not found at $NVM_DIR (install nvm or set NVM_DIR)" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"

if ! nvm use "$NODE_VERSION" >/dev/null 2>&1; then
  echo "[init] installing Node $NODE_VERSION via nvm ..." >&2
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION"
fi

node_bin="$(command -v node)"
node_ver="$("$node_bin" -v)"
echo "[init] using Node $node_ver from $(dirname "$node_bin")" >&2
printf 'export PATH=%q:$PATH\n' "$(dirname "$node_bin")"
