#!/usr/bin/env bash
# Run a shell one-liner under a pseudo-TTY so `claude` sees a TTY under nohup/systemd.
# script(1) creates its own PTY and keeps the child attached to it even when
# our own stdin is /dev/null (headless). The earlier Python pty.spawn path
# killed the child after ~30s whenever stdin hit EOF — script(1) doesn't.
set -euo pipefail
cd "${1:?}" || exit 1
_start_cmd="${2:?}"
# Do not printf %q here: script(1) passes -c to a shell; extra backslashes become literal and break.

if command -v script >/dev/null 2>&1; then
  # util-linux script: -q quiet, -e return child exit code. Works for both
  # interactive and headless (nohup/systemd) callers because script creates
  # its own pty regardless of whether our stdin is a tty.
  exec script -q -e -c "$_start_cmd" /dev/null
fi

# Fallback when script(1) is not installed — Python pty. Only meant for
# foreground use; under nohup this tends to exit early. Prefer installing
# `util-linux` so script(1) is available.
if command -v python3 >/dev/null 2>&1; then
  python3 - "$_start_cmd" <<'PYEOF'
import pty, os, sys, re

ANSI_RE = re.compile(rb'\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
RAW_FILE = os.environ.get('PTY_RAW_DUMP')
raw_fd = open(RAW_FILE, 'ab') if RAW_FILE else None

cmd = sys.argv[1]

def master_read(fd):
    data = os.read(fd, 4096)
    if raw_fd:
        raw_fd.write(data)
        raw_fd.flush()
    return ANSI_RE.sub(b'', data)

try:
    pty.spawn(['sh', '-c', cmd], master_read)
except OSError:
    pass
if raw_fd:
    raw_fd.close()
PYEOF
  exit $?
fi

echo "run-under-pty.sh: need script(1) (util-linux) or python3" >&2
exit 127
