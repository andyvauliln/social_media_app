#!/usr/bin/env bash
# Print an export line to stdout when PATH must be updated; messages on stderr only.
set -euo pipefail

_bun_home="${BUN_INSTALL:-${HOME:-}/.bun}"
_bun_bin="$_bun_home/bin"

if command -v bun >/dev/null 2>&1; then
  exit 0
fi

if [[ -x "$_bun_bin/bun" ]]; then
  printf 'export PATH=%q:$PATH\n' "$_bun_bin"
  exit 0
fi

install_bun_official() {
  echo "[init] bun not found; installing to $_bun_home (official script) ..." >&2
  curl -fsSL https://bun.sh/install | bash
}

# When unzip is missing, the official installer fails; use Python stdlib instead.
install_bun_python() {
  echo "[init] bun not found; installing to $_bun_home (python zipfile, no unzip) ..." >&2
  BUN_INSTALL="$_bun_home" python3 - <<'PY'
import io
import json
import os
import pathlib
import shutil
import stat
import sys
import tempfile
import urllib.request
import zipfile

import platform

UA = {"User-Agent": "social_media_app-scripts-ensure-bun"}

def fail(msg: str) -> None:
    print(msg, file=sys.stderr)
    sys.exit(1)

bun_home = pathlib.Path(os.environ["BUN_INSTALL"]).expanduser()
bin_dir = bun_home / "bin"
machine = platform.machine().lower()
aliases = {"x86_64": "x64", "amd64": "x64", "aarch64": "aarch64", "arm64": "aarch64"}
arch = aliases.get(machine)
if not arch:
    fail(f"[init] FAILED: unsupported CPU {machine!r} for bundled Bun install")

asset_name = f"bun-linux-{arch}.zip"
api = "https://api.github.com/repos/oven-sh/bun/releases/latest"
with urllib.request.urlopen(urllib.request.Request(api, headers=UA), timeout=120) as r:
    release = json.load(r)

url = None
for a in release.get("assets", []):
    if a.get("name") == asset_name:
        url = a["browser_download_url"]
        break
if not url:
    fail(f"[init] FAILED: no {asset_name} in latest Bun release")

with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
    zdata = r.read()

zf = zipfile.ZipFile(io.BytesIO(zdata))
with tempfile.TemporaryDirectory() as td:
    td_path = pathlib.Path(td)
    zf.extractall(td_path)
    inner = td_path / f"bun-linux-{arch}" / "bun"
    if not inner.is_file():
        candidates = [p for p in td_path.rglob("bun") if p.is_file()]
        if len(candidates) == 1:
            inner = candidates[0]
        else:
            fail("[init] FAILED: could not locate bun binary inside release zip")

    bin_dir.mkdir(parents=True, exist_ok=True)
    dest = bin_dir / "bun"
    shutil.copyfile(inner, dest)
    mode = dest.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
    dest.chmod(mode)
PY
}

if command -v unzip >/dev/null 2>&1; then
  install_bun_official
elif command -v python3 >/dev/null 2>&1; then
  install_bun_python
else
  echo "[init] FAILED: need unzip or python3 to install bun, or install bun yourself and re-run." >&2
  exit 1
fi

if [[ -x "$_bun_bin/bun" ]]; then
  printf 'export PATH=%q:$PATH\n' "$_bun_bin"
  exit 0
fi

echo "[init] FAILED: bun not found after install (expected $_bun_bin/bun)" >&2
exit 1
