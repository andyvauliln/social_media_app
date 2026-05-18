#!/usr/bin/env bash
# Ensure pnpm is on PATH (via corepack or npm -g). Requires a compatible Node on PATH first.
set -euo pipefail

PNPM_VERSION="${PNPM_VERSION:-10.6.1}"

if command -v pnpm >/dev/null 2>&1; then
  echo "[init] pnpm found: $(command -v pnpm) ($("$(command -v pnpm)" -v 2>/dev/null || true))" >&2
  exit 0
fi

if command -v corepack >/dev/null 2>&1; then
  echo "[init] enabling pnpm via corepack ($PNPM_VERSION) ..." >&2
  corepack enable 2>/dev/null || true
  corepack prepare "pnpm@${PNPM_VERSION}" --activate
fi

if command -v pnpm >/dev/null 2>&1; then
  exit 0
fi

echo "[init] installing pnpm@${PNPM_VERSION} via npm -g ..." >&2
npm install -g "pnpm@${PNPM_VERSION}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[init] FAILED: pnpm not found after install" >&2
  exit 1
fi
