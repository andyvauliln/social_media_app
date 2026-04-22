#!/usr/bin/env bash
# Run a shell one-liner under a pseudo-TTY (util-linux `script -c`) so `claude` sees a TTY under nohup/systemd.
set -euo pipefail
cd "${1:?}" || exit 1
_start_cmd="${2:?}"
# Do not printf %q here: script(1) passes -c to a shell; extra backslashes become literal and break.
exec script -q -e -c "$_start_cmd" /dev/null
