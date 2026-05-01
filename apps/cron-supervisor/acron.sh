#!/usr/bin/env bash
set -euo pipefail

REAL_SCRIPT="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(cd "$(dirname "$REAL_SCRIPT")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG="$REPO_ROOT/configs/config.crons.jsonc"
LOGS_DIR="$REPO_ROOT/logs/crons"

SERVICE_NAME="com.socialmedia.cron-supervisor"
PLIST="$HOME/Library/LaunchAgents/$SERVICE_NAME.plist"
SYSTEMD_UNIT="cron-supervisor"

os_type() {
  if [[ "$(uname)" == "Darwin" ]]; then echo "macos"; else echo "linux"; fi
}

# kickstart alone does NOT re-read the plist. bootstrap must succeed — do not hide failures
# with `|| true` or kickstart revives the old registration (old stdio paths keep writing).
reload_macos_launchagent() {
  launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
  sleep 1
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  launchctl kickstart -k "gui/$(id -u)/$SERVICE_NAME"
  rm -f "$LOGS_DIR/launchd.stdout.log" "$LOGS_DIR/launchd.stderr.log"
}

svc_start() {
  if [[ "$(os_type)" == "macos" ]]; then
    if [[ ! -f "$PLIST" ]]; then
      echo "[acron] plist not found — running setup first"
      bash "$SCRIPT_DIR/scripts/setup-service.sh"
      return
    fi
    launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || true
    launchctl kickstart -k "gui/$(id -u)/$SERVICE_NAME"
  else
    sudo systemctl start "$SYSTEMD_UNIT"
  fi
  echo "[acron] started"
}

svc_stop() {
  if [[ "$(os_type)" == "macos" ]]; then
    launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
  else
    sudo systemctl stop "$SYSTEMD_UNIT"
  fi
  echo "[acron] stopped"
}

svc_restart() {
  if [[ "$(os_type)" == "macos" ]]; then
    reload_macos_launchagent
  else
    sudo systemctl restart "$SYSTEMD_UNIT"
  fi
  echo "[acron] restarted"
}

svc_update() {
  # config.crons.jsonc is auto-reloaded by chokidar on save; this also reloads
  # the LaunchAgent plist (stdio paths, env) — kickstart-only does not.
  if [[ "$(os_type)" == "macos" ]]; then
    reload_macos_launchagent
  else
    sudo systemctl restart "$SYSTEMD_UNIT"
  fi
  echo "[acron] reloaded with latest config"
}

svc_status() {
  echo "[acron] service:"
  if [[ "$(os_type)" == "macos" ]]; then
    launchctl print "gui/$(id -u)/$SERVICE_NAME" 2>/dev/null \
      | grep -E "state =|pid =|runs =|last exit code =" \
      || echo "  not loaded"
  else
    systemctl status "$SYSTEMD_UNIT" --no-pager 2>/dev/null || echo "  not found"
  fi
  echo ""
  echo "[acron] crons (from config):"
  bun "$SCRIPT_DIR/scripts/cron-edit.mjs" list "$CONFIG"
}

svc_enable() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    echo "Usage: acron enable <cron-name>" >&2; exit 1
  fi
  bun "$SCRIPT_DIR/scripts/cron-edit.mjs" enable "$CONFIG" "$name"
  svc_update
}

svc_disable() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    echo "Usage: acron disable <cron-name>" >&2; exit 1
  fi
  bun "$SCRIPT_DIR/scripts/cron-edit.mjs" disable "$CONFIG" "$name"
  svc_update
}

svc_logs() {
  local name="${1:-}"
  local file
  if [[ -n "$name" ]]; then
    file="$LOGS_DIR/$name.log"
  else
    file="$LOGS_DIR/supervisor.log"
  fi
  if [[ ! -f "$file" ]]; then
    echo "[acron] log not found: $file" >&2; exit 1
  fi
  echo "[acron] tailing $file (Ctrl+C to stop)"
  tail -f "$file"
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  start)    svc_start ;;
  stop)     svc_stop ;;
  restart)  svc_restart ;;
  update)   svc_update ;;
  status)   svc_status ;;
  enable)   svc_enable "${1:-}" ;;
  disable)  svc_disable "${1:-}" ;;
  logs)     svc_logs "${1:-}" ;;
  setup)    bash "$SCRIPT_DIR/scripts/setup-service.sh" ;;
  help|*)
    cat <<'HELP'
Usage: acron <command> [args]

Commands:
  start                 Start the cron supervisor service
  stop                  Stop the cron supervisor service
  restart               Restart the cron supervisor service
  update                Boot out/in LaunchAgent + restart (config + plist; not kickstart-only)
  status                Show service state + list crons (production/development flags)
  enable  <name>        Set production+development true for a cron, then reload
  disable <name>        Set production+development false for a cron, then reload
  logs    [name]        Tail supervisor.log or a specific cron log (e.g. health-check)
  setup                 (Re)install the background service (launchd / systemd)

Notes:
  - Config auto-reloads on file save via chokidar — no restart needed for most changes.
  - Use 'update' to re-bootstrap the LaunchAgent (applies plist changes) and restart the supervisor.
  - enable/disable toggles both production and development in configs/config.crons.jsonc and reloads.
HELP
    ;;
esac
