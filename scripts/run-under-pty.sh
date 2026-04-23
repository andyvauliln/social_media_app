#!/usr/bin/env bash
# Run a shell one-liner under a pseudo-TTY so `claude` sees a TTY under nohup/systemd.
set -euo pipefail
cd "${1:?}" || exit 1
_start_cmd="${2:?}"
# Do not printf %q here: script(1) passes -c to a shell; extra backslashes become literal and break.

# Interactive mode: use script(1) directly.
if [ -t 0 ]; then
  exec script -q -e -c "$_start_cmd" /dev/null
fi

# Headless mode: use Python's pty module to spawn with a real PTY and
# auto-confirm the --dangerously-load-development-channels warning prompt
# by watching for the prompt text and injecting Enter only when it appears.
if command -v python3 >/dev/null 2>&1; then
  python3 - "$_start_cmd" <<'PYEOF'
import pty, os, sys, time, re

ANSI_RE = re.compile(rb'\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

cmd = sys.argv[1]
confirmed = False
buf = b''

def master_read(fd):
    global confirmed, buf
    data = os.read(fd, 4096)
    buf += data
    if not confirmed and b'2026l' in buf:
        confirmed = True
        buf = b''
        time.sleep(0.05)
        try:
            os.write(fd, b'\r')
        except OSError:
            pass
    return ANSI_RE.sub(b'', data)

try:
    pty.spawn(['sh', '-c', cmd], master_read)
except OSError:
    pass
PYEOF
  exit $?
fi

# Fallback: FIFO with a delay, hoping claude has shown the prompt by then.
_fifo="$(mktemp -u /tmp/pty-input-XXXXXX)"
mkfifo "$_fifo"
{ sleep 5; printf '\r'; exec tail -f /dev/null; } >"$_fifo" &
_writer_pid=$!
trap "kill $_writer_pid 2>/dev/null; rm -f '$_fifo'" EXIT
script -q -e -c "$_start_cmd" /dev/null <"$_fifo"
