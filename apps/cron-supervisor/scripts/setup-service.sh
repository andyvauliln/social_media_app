#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"
BUN_BIN="$(which bun)"
LOGS_DIR="$REPO_ROOT/logs/crons"

SERVICE_NAME="com.socialmedia.cron-supervisor"
SYSTEMD_UNIT="cron-supervisor"

mkdir -p "$LOGS_DIR"

os_type() {
  if [[ "$(uname)" == "Darwin" ]]; then echo "macos"; else echo "linux"; fi
}

setup_macos() {
  local plist="$HOME/Library/LaunchAgents/$SERVICE_NAME.plist"

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

  <key>StandardOutPath</key>
  <string>$LOGS_DIR/launchd.stdout.log</string>

  <key>StandardErrorPath</key>
  <string>$LOGS_DIR/launchd.stderr.log</string>
</dict>
</plist>
EOF

  echo "[setup] plist written: $plist"

  launchctl bootout "gui/$(id -u)" "$SERVICE_NAME" 2>/dev/null || true
  sleep 1
  launchctl bootstrap "gui/$(id -u)" "$plist"
  launchctl kickstart -k "gui/$(id -u)/$SERVICE_NAME"
  echo "[setup] launchd service started: $SERVICE_NAME"
}

setup_linux() {
  local user_name
  user_name="$(id -un)"
  local unit="/etc/systemd/system/$SYSTEMD_UNIT.service"

  sudo tee "$unit" > /dev/null <<EOF
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

  sudo systemctl daemon-reload
  sudo systemctl enable "$SYSTEMD_UNIT"
  sudo systemctl restart "$SYSTEMD_UNIT"
  echo "[setup] systemd service started: $SYSTEMD_UNIT"
}

if [[ "$(os_type)" == "macos" ]]; then
  setup_macos
else
  setup_linux
fi
