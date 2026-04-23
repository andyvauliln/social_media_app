#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

MAIN_BRANCH="${GIT_SYNC_MAIN_BRANCH:-main}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "[git-sync] not a git repository" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[git-sync] skip: working tree or index has local changes"
  exit 0
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "[git-sync] skip: no origin remote" >&2
  exit 0
fi

git fetch origin "$MAIN_BRANCH"

current="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "${current}" ]]; then
  echo "[git-sync] skip: detached HEAD" >&2
  exit 0
fi

if [[ "$current" == "$MAIN_BRANCH" ]]; then
  if ! git pull --rebase origin "$MAIN_BRANCH"; then
    echo "[git-sync] pull --rebase failed" >&2
    exit 1
  fi
else
  if ! git merge "origin/$MAIN_BRANCH" --no-edit; then
    echo "[git-sync] merge origin/$MAIN_BRANCH failed" >&2
    exit 1
  fi
fi

if ! git push origin "$current"; then
  echo "[git-sync] push failed" >&2
  exit 1
fi

echo "[git-sync] ok branch=$current"
