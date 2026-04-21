#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/repo"
REPO_URL="https://github.com/brightbeanxyz/brightbean-studio"

if [[ ! -d "$REPO_DIR" ]]; then
  if [[ -z "$REPO_URL" ]]; then
    echo "[init] error: missing repo URL for brightbean-studio" >&2
    exit 1
  fi
  echo "[init] cloning $REPO_URL -> $REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
elif [[ -d "$REPO_DIR/.git" ]]; then
  echo "[init] pulling latest in $REPO_DIR"
  (cd "$REPO_DIR" && git pull --ff-only)
else
  echo "[init] warning: $REPO_DIR exists but is not a git repo; skipping pull" >&2
fi

cd "$REPO_DIR"
python3.12 -m pip install -r requirements.txt && python3.12 manage.py migrate
