#!/usr/bin/env bash
# Ensure ffmpeg and ffprobe are on PATH. Prefers system package; falls back to user-local static build.
set -euo pipefail

_ffmpeg_ok() {
  command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1
}

if _ffmpeg_ok; then
  echo "[init] ffmpeg: $(command -v ffmpeg) ($("ffmpeg" -version 2>&1 | head -n1))" >&2
  exit 0
fi

_link_into_local_bin() {
  local bin_dir="${HOME}/.local/bin"
  mkdir -p "$bin_dir"
  ln -sf "$1/ffmpeg" "$bin_dir/ffmpeg"
  ln -sf "$1/ffprobe" "$bin_dir/ffprobe"
  export PATH="$bin_dir:$PATH"
}

_install_via_apt() {
  if ! command -v apt-get >/dev/null 2>&1; then
    return 1
  fi
  if [[ "$(id -u)" -eq 0 ]]; then
    apt-get update -qq
    env DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg
    return 0
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    return 1
  fi
  if ! sudo -n true 2>/dev/null; then
    return 1
  fi
  sudo apt-get update -qq
  sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg
}

_install_static_linux() {
  local arch raw_arch install_dir tmp
  raw_arch="$(uname -m)"
  case "$raw_arch" in
    x86_64|amd64) arch="amd64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)
      echo "[init] FAILED: unsupported architecture for static ffmpeg: $raw_arch" >&2
      return 1
      ;;
  esac

  install_dir="${HOME}/.local/share/social_media_app/ffmpeg-static-${arch}"
  if [[ -x "$install_dir/ffmpeg" && -x "$install_dir/ffprobe" ]]; then
    _link_into_local_bin "$install_dir"
    return 0
  fi

  echo "[init] installing ffmpeg static build to $install_dir (no sudo) ..." >&2
  mkdir -p "$install_dir"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  local url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${arch}-static.tar.xz"
  curl -fsSL "$url" -o "$tmp/ffmpeg.tar.xz"
  tar -xJf "$tmp/ffmpeg.tar.xz" -C "$tmp"
  local extracted
  extracted="$(find "$tmp" -maxdepth 1 -type d -name 'ffmpeg-*-static' | head -n1)"
  if [[ -z "$extracted" || ! -x "$extracted/ffmpeg" ]]; then
    echo "[init] FAILED: unexpected layout in static ffmpeg archive" >&2
    return 1
  fi
  cp -f "$extracted/ffmpeg" "$extracted/ffprobe" "$install_dir/"
  chmod +x "$install_dir/ffmpeg" "$install_dir/ffprobe"
  _link_into_local_bin "$install_dir"
}

echo "[init] ffmpeg not on PATH; installing ..." >&2

if _install_via_apt 2>/dev/null && _ffmpeg_ok; then
  echo "[init] ffmpeg installed via apt: $(command -v ffmpeg)" >&2
  exit 0
elif command -v apt-get >/dev/null 2>&1 && ! _ffmpeg_ok; then
  echo "[init] skip apt ffmpeg (sudo password required); trying user-local install ..." >&2
fi

if [[ "$(uname -s)" == "Linux" ]]; then
  _install_static_linux
fi

if command -v brew >/dev/null 2>&1; then
  brew install ffmpeg
fi

if _ffmpeg_ok; then
  echo "[init] ffmpeg ready: $(command -v ffmpeg)" >&2
  if [[ -d "${HOME}/.local/bin" ]]; then
    printf 'export PATH=%q:$PATH\n' "${HOME}/.local/bin"
  fi
  exit 0
fi

echo "[init] FAILED: ffmpeg not on PATH after install attempts" >&2
echo "[init] try: sudo apt install ffmpeg   or re-run ./rinit.sh" >&2
exit 1
