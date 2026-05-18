#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/repo"
REPO_URL="https://github.com/calesthio/OpenMontage"

if [[ ! -d "$REPO_DIR" ]]; then
  if [[ -z "$REPO_URL" ]]; then
    echo "[init] error: missing repo URL for OpenMontage" >&2
    exit 1
  fi
  echo "[init] cloning $REPO_URL -> $REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
elif [[ ! -d "$REPO_DIR/.git" ]]; then
  if [[ -z "$(ls -A "$REPO_DIR" 2>/dev/null)" ]]; then
    echo "[init] removing empty placeholder at $REPO_DIR"
    rmdir "$REPO_DIR"
    echo "[init] cloning $REPO_URL -> $REPO_DIR"
    git clone "$REPO_URL" "$REPO_DIR"
  else
    echo "[init] error: $REPO_DIR exists but is not a git repository (refusing to overwrite)" >&2
    exit 1
  fi
fi

REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# HyperFrames requires Node >= 22 and ffmpeg on PATH (see tools/video/hyperframes_compose.py).
if [[ -f "$REPO_ROOT/scripts/ensure-nvm-node.sh" ]]; then
  # shellcheck disable=SC1090
  eval "$(bash "$REPO_ROOT/scripts/ensure-nvm-node.sh")"
fi
if [[ -f "$REPO_ROOT/scripts/ensure-ffmpeg.sh" ]]; then
  # shellcheck disable=SC1090
  eval "$(bash "$REPO_ROOT/scripts/ensure-ffmpeg.sh")"
fi

cd "$REPO_DIR"
# Upstream Makefile invokes `python`; Ubuntu often provides only python3.
if ! command -v python >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
  init_bin="$SCRIPT_DIR/.init-bin"
  mkdir -p "$init_bin"
  ln -sf "$(command -v python3)" "$init_bin/python"
  export PATH="$init_bin:$PATH"
fi
make setup
