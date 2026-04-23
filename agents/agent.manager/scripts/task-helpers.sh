#!/usr/bin/env bash
# Sourced by agent.manager skills (e.g. sync-tasks). Caller may set ROOT first.
: "${ROOT:=$(git rev-parse --show-toplevel 2>/dev/null)}"
MANAGER_TASKS="${ROOT}/agents/agent.manager/tasks"

today_iso() {
  date -u +%Y-%m-%d
}

export MANAGER_TASKS
