#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"
BUN_BIN="$(command -v bun)"
LOGS_DIR="$REPO_ROOT/logs/crons"

SERVICE_NAME="com.socialmedia.cron-supervisor"
SYSTEMD_UNIT="cron-supervisor"

mkdir -p "$LOGS_DIR"

os_type() {
  if [[ "$(uname)" == "Darwin" ]]; then echo "macos"; else echo "linux"; fi
}

_can_sudo_without_password() {
  [[ "$(id -u)" -eq 0 ]] || sudo -n true 2>/dev/null
}

_run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo -n "$@"
  fi
}

setup_macos() {
  local plist="$HOME/Library/LaunchAgents/$SERVICE_NAME.plist"

  if launchctl print "gui/$(id -u)/$SERVICE_NAME" &>/dev/null; then
    echo "[setup] launchd service already loaded: $SERVICE_NAME"
    return 0
  fi

  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$SERVICE_NAME</string>

  <key>ProgramArguments</key>
  <array>
    <string>$BUN_BIN</string>
    <string>$APP_DIR/index.mjs</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$APP_DIR</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>NODE_ENV</key>
    <string>development</string>
  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
EOF

  echo "[setup] plist written: $plist"

  launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null || true
  sleep 1
  launchctl bootstrap "gui/$(id -u)" "$plist"
  launchctl kickstart -k "gui/$(id -u)/$SERVICE_NAME"
  rm -f "$LOGS_DIR/launchd.stdout.log" "$LOGS_DIR/launchd.stderr.log"
  echo "[setup] launchd service started: $SERVICE_NAME"
}

_write_systemd_unit() {
  local user_name="$1"
  local unit="$2"
  _run_root tee "$unit" > /dev/null <<EOF
[Unit]
Description=Social Media Cron Supervisor
After=network.target

[Service]
Type=simple
User=$user_name
WorkingDirectory=$APP_DIR
ExecStart=$BUN_BIN $APP_DIR/index.mjs
Restart=always
RestartSec=5
EnvironmentFile=-$REPO_ROOT/envs/root.env
Environment=NODE_ENV=development
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF
}

_install_systemd_unit() {
  local user_name unit
  user_name="$(id -un)"
  unit="/etc/systemd/system/$SYSTEMD_UNIT.service"

  _write_systemd_unit "$user_name" "$unit"
  _run_root systemctl daemon-reload
  _run_root systemctl enable "$SYSTEMD_UNIT"
  _run_root systemctl restart "$SYSTEMD_UNIT"
  echo "[setup] systemd service started: $SYSTEMD_UNIT"
}

setup_linux() {
  local unit="/etc/systemd/system/$SYSTEMD_UNIT.service"

  if systemctl is-active --quiet "$SYSTEMD_UNIT" 2>/dev/null; then
    echo "[setup] cron-supervisor already running (systemd: $SYSTEMD_UNIT)"
    return 0
  fi

  if [[ -f "$unit" ]]; then
    if _can_sudo_without_password; then
      echo "[setup] cron-supervisor unit exists; starting $SYSTEMD_UNIT ..."
      _run_root systemctl enable "$SYSTEMD_UNIT" 2>/dev/null || true
      _run_root systemctl restart "$SYSTEMD_UNIT"
      echo "[setup] systemd service started: $SYSTEMD_UNIT"
      return 0
    fi
    echo "[setup] skip: $SYSTEMD_UNIT is installed but not running (sudo password required to start)"
    echo "[setup] start manually: sudo systemctl start $SYSTEMD_UNIT"
    return 0
  fi

  if ! _can_sudo_without_password; then
    echo "[setup] skip: cron-supervisor not installed (sudo password required for systemd install)"
    echo "[setup] install manually once: bash apps/cron-supervisor/scripts/setup-service.sh"
    return 0
  fi

  _install_systemd_unit
}

if [[ "$(os_type)" == "macos" ]]; then
  setup_macos
else
  setup_linux
fi
