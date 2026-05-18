#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/repo"
REPO_URL="https://github.com/badlogic/pi-mono"

if [[ ! -d "$REPO_DIR" ]]; then
  if [[ -z "$REPO_URL" ]]; then
    echo "[init] error: missing repo URL for pi-mono" >&2
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

cd "$REPO_DIR"
npm install
