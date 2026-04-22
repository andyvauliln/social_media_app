#!/usr/bin/env bash
# Claude Code CLI quick notes
# Docs: https://code.claude.com/docs/en/cli-reference
#
# LOGGING / DEBUG
# --verbose
#   Show full turn-by-turn output in terminal.
#   Example: claude --verbose
#
# --debug
#   Enable debug mode; can filter categories like "api,mcp,hooks"
#   or exclude categories like "!statsig,!file".
#   Example: claude --debug "api,mcp"
#
# --debug-file <path>
#   Write debug logs to a file and automatically enable debug mode.
#   Example: claude --debug-file /tmp/claude.log
#
# SESSION CONTROL
# -c, --continue
#   Continue the most recent conversation in the current directory.
#   Example: claude -c
#
# -r, --resume
#   Resume a session by ID/name, or open picker if no value given.
#   Example: claude -r auth-refactor
#
# --fork-session
#   When resuming, create a new session fork instead of continuing exact same one.
#   Example: claude --resume auth-refactor --fork-session
#
# -n, --name <name>
#   Give the session a friendly name.
#   Example: claude -n "bugfix-work"
#
# --session-id <uuid>
#   Force a specific UUID as the session ID.
#   Example: claude --session-id "550e8400-e29b-41d4-a716-446655440000"
#
# PERMISSIONS / SAFETY
# --permission-mode <mode>
#   Start in a chosen permission mode.
#   Modes: default, acceptEdits, plan, auto, dontAsk, bypassPermissions
#   Example: claude --permission-mode plan
#
# --dangerously-skip-permissions
#   Skip permission prompts; equivalent to bypassPermissions.
#   Use carefully.
#   Example: claude --dangerously-skip-permissions
#
# --allow-dangerously-skip-permissions
#   Allow bypassPermissions to appear in mode switching without starting in it.
#   Example: claude --permission-mode plan --allow-dangerously-skip-permissions
#
# --allowedTools <tool...>
#   Auto-approve selected tools without prompting.
#   Example: claude --allowedTools "Read" "Bash(git diff *)"
#
# --disallowedTools <tool...>
#   Remove selected tools from model context so they cannot be used.
#   Example: claude --disallowedTools "Edit"
#
# --tools <csv>
#   Restrict the total built-in tools available in the session.
#   Example: claude --tools "Bash,Edit,Read"
#
# MODEL / REASONING
# --model <name>
#   Select model for the session (for example sonnet, opus, or full model name).
#   Example: claude --model sonnet
#
# --fallback-model <name>
#   In print mode, allow fallback model if main model is unavailable/overloaded.
#   Example: claude -p --fallback-model sonnet "summarize repo"
#
# --effort <level>
#   Set reasoning effort: low, medium, high, max (max is Opus 4.6 only).
#   Example: claude --effort high
#
# --enable-auto-mode
#   Unlock auto mode in Shift+Tab cycle if your plan supports it.
#   Example: claude --enable-auto-mode
#
# FILES / WORKTREE
# --add-dir <path>
#   Add extra working directories Claude can access.
#   Example: claude --add-dir ../apps --add-dir ../shared
#
# -w, --worktree [name]
#   Start in isolated git worktree under .claude/worktrees/<name>.
#   Example: claude -w feature-auth
#
# --tmux
#   Create tmux session for the worktree; requires --worktree.
#   Example: claude -w feature-auth --tmux
#
# SETTINGS / ENVIRONMENT
# --settings <file-or-json>
#   Load extra settings from a JSON file or JSON string.
#   Example: claude --settings ./settings.json
#
# --setting-sources <csv>
#   Choose which setting sources to load: user, project, local
#   Example: claude --setting-sources user,project
#
# --bare
#   Minimal mode: skips hooks, skills, plugins, MCP servers, auto memory,
#   and CLAUDE.md discovery. Useful for isolating config issues.
#   Example: claude --bare
#
# --disable-slash-commands
#   Disable all slash commands and skills for this session.
#   Example: claude --disable-slash-commands
#
# PRINT MODE / AUTOMATION
# -p, --print
#   Run non-interactively and print the result.
#   Example: claude -p "summarize this codebase"
#
# --output-format <format>
#   Print mode output format: text, json, stream-json
#   Example: claude -p --output-format json "summarize repo"
#
# --input-format <format>
#   Print mode input format: text or stream-json
#   Example: claude -p --input-format stream-json --output-format json
#
# --json-schema <schema>
#   Validate structured JSON output against a schema in print mode.
#   Example: claude -p --output-format json --json-schema '{"type":"object"}'
#
# --include-partial-messages
#   Include partial streaming events in stream-json output.
#   Requires --print and --output-format stream-json.
#   Example: claude -p --output-format stream-json --include-partial-messages
#
# --include-hook-events
#   Include hook lifecycle events in stream-json output.
#   Requires --output-format stream-json.
#   Example: claude -p --output-format stream-json --include-hook-events
#
# --max-turns <n>
#   Limit number of agentic turns in print mode.
#   Example: claude -p --max-turns 3 "analyze auth flow"
#
# --max-budget-usd <amount>
#   Stop print-mode run when budget limit is reached.
#   Example: claude -p --max-budget-usd 5 "refactor tests"
#
# --no-session-persistence
#   Do not save print-mode session to disk.
#   Example: claude -p --no-session-persistence "quick question"
#
# IDE / BROWSER / REMOTE
# --ide
#   Auto-connect to IDE on startup if one valid IDE is detected.
#   Example: claude --ide
#
# --chrome
#   Enable Chrome integration.
#   Example: claude --chrome
#
# --no-chrome
#   Disable Chrome integration for this session.
#   Example: claude --no-chrome
#
# --remote <prompt>
#   Start a web session on claude.ai with your task.
#   Example: claude --remote "Fix this login issue"
#
# --remote-control, --rc
#   Start an interactive session with Remote Control enabled.
#   Example: claude --remote-control "My Project"
#
# --teleport
#   Resume a web session in local terminal.
#   Example: claude --teleport
#
# PROMPT CUSTOMIZATION
# --system-prompt <text>
#   Replace the default system prompt completely.
#   Example: claude --system-prompt "You are a Python expert"
#
# --system-prompt-file <file>
#   Replace the system prompt with file contents.
#   Example: claude --system-prompt-file ./prompt.txt
#
# --append-system-prompt <text>
#   Add extra instructions to the default system prompt.
#   Safer than replacing it completely.
#   Example: claude --append-system-prompt "Always use TypeScript"
#
# --append-system-prompt-file <file>
#   Append extra instructions from file.
#   Example: claude --append-system-prompt-file ./rules.txt
#
# MCP / PLUGINS
# --mcp-config <file-or-json>
#   Load MCP servers from JSON file or JSON string.
#   Example: claude --mcp-config ./mcp.json
#
# --strict-mcp-config
#   Only use MCP servers from --mcp-config; ignore all others.
#   Example: claude --strict-mcp-config --mcp-config ./mcp.json
#
# --plugin-dir <path>
#   Load plugins from a directory for this session only.
#   Repeat flag for multiple dirs.
#   Example: claude --plugin-dir ./my-plugins
#
# --channels <value>
#   Listen to selected MCP channel notifications (preview feature).
#   Example: claude --channels plugin:my-notifier@my-marketplace
#
# PRACTICAL COMBOS
# More terminal logs:
#   claude --verbose
#
# Deep troubleshooting:
#   claude --verbose --debug "api,mcp,hooks"
#
# Safe planning only:
#   claude --permission-mode plan --verbose
#
# Minimal clean environment:
#   claude --bare --debug
#
# JSON automation:
#   claude -p --output-format stream-json --include-partial-messages "query"




########## ENV LOADING ########## from root envs/ + telegram.manager.env override
ROOT_DIR="$(git rev-parse --show-toplevel)"
ENVS_DIR="${ROOT_DIR}/envs"

load_env_file() {
  local env_file="$1"

  if [[ -f "${env_file}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${env_file}"
    set +a
  fi
}

if [[ -d "${ENVS_DIR}" ]]; then
  load_env_file "${ENVS_DIR}/root.env"
  load_env_file "${ENVS_DIR}/telegram.manager.env"
fi

ACCESS_CONFIG_FILE="${ENVS_DIR}/manager.telegram/access.json"
if [[ -f "${ACCESS_CONFIG_FILE}" ]]; then
  if command -v node >/dev/null 2>&1; then
    TELEGRAM_STATE_DIR_FROM_CONFIG="$(
      node -e '
const fs = require("fs");
try {
  const raw = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (typeof raw.stateDir === "string" && raw.stateDir.trim()) {
    process.stdout.write(raw.stateDir.trim());
  }
} catch {}
' "${ACCESS_CONFIG_FILE}"
    )"
    TELEGRAM_BOT_TOKEN_FROM_CONFIG="$(
      node -e '
const fs = require("fs");
try {
  const raw = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (typeof raw.botToken === "string" && raw.botToken.trim()) {
    process.stdout.write(raw.botToken.trim());
  }
} catch {}
' "${ACCESS_CONFIG_FILE}"
    )"

    if [[ -n "${TELEGRAM_STATE_DIR_FROM_CONFIG}" ]]; then
      if [[ "${TELEGRAM_STATE_DIR_FROM_CONFIG}" = /* ]]; then
        export TELEGRAM_STATE_DIR="${TELEGRAM_STATE_DIR_FROM_CONFIG}"
      else
        export TELEGRAM_STATE_DIR="${ROOT_DIR}/${TELEGRAM_STATE_DIR_FROM_CONFIG#./}"
      fi
    fi
    if [[ -n "${TELEGRAM_BOT_TOKEN_FROM_CONFIG}" ]]; then
      export TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN_FROM_CONFIG}"
    fi
  fi
fi

TELEGRAM_CHANNEL="${TELEGRAM_CHANNEL:-plugin:telegram@inline}"

AGENT_DIR="${ROOT_DIR}/agents/agent.manager"

########## STALE SESSION CLEANUP ##########
# kill stale telegram bot process so a fresh instance can bind cleanly.
TELEGRAM_BOT_PID_FILE="${TELEGRAM_BOT_PID_FILE:-${ENVS_DIR}/manager.telegram/bot.pid}"
if [[ -f "${TELEGRAM_BOT_PID_FILE}" ]]; then
  _OLD_BOT_PID="$(<"${TELEGRAM_BOT_PID_FILE}")"
  if [[ -n "${_OLD_BOT_PID}" ]] && kill -0 "${_OLD_BOT_PID}" 2>/dev/null; then
    echo "ragent.manager: killing stale telegram bot (pid=${_OLD_BOT_PID})" >&2
    kill "${_OLD_BOT_PID}" 2>/dev/null || true
  fi
fi

# --plugin-dir sync with /sync-plugins dev agent  before every pr and with a command /sync-plugins.dev on a root
args=(
  --verbose
  --plugin-dir "${ROOT_DIR}/plugins/telegram"
  --debug
  --dangerously-skip-permissions
  --dangerously-load-development-channels server:plugin:fakechat:fakechat "${TELEGRAM_CHANNEL}"
  --permission-mode bypassPermissions

)
cd "${AGENT_DIR}" && exec claude "${args[@]}" "$@"
