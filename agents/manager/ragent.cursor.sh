#!/usr/bin/env bash
# Cursor Agent CLI (`agent`) — reference (see also `agent --help`).
# Docs: https://cursor.com/docs/cli/overview · https://cursor.com/docs/cli/using
#
# Entry: **cwd** and **--workspace** = this agent dir (same project root as `ragent.claude.sh`; uses this folder’s `.cursor` / `.claude`).
#   Shell alias when installed: sma.manager.cursor
#
# ----- Authentication & account -----
# login
#   Sign in to Cursor (opens browser unless NO_OPEN_BROWSER is set).
#   Use when `agent status` shows you are not authenticated.
# logout
#   Clear local Cursor CLI credentials.
# status | whoami [--format text|json]
#   See whether you are logged in; JSON is handy for scripts (`isAuthenticated`).
# about
#   Print CLI version, OS/arch, and account snapshot.
# update
#   Upgrade the `agent` binary to the latest published CLI release.
#
# ----- Sessions & chat history -----
# --resume [chatId]
#   Continue a specific saved conversation when you know its id (see `agent ls`).
# --continue
#   Resume the most recent session without picking an id (same shell UX as editor).
# ls (subcommand)
#   List prior chats so you can copy ids for `--resume`.
# resume (subcommand)
#   Resume the latest chat (shortcut vs bare `agent` + `--continue`).
# create-chat
#   Create an empty chat and print its id — useful for automation that attaches later.
#
# ----- Modes (align with Cursor editor: Agent / Plan / Ask) -----
# --mode ask | --mode plan   ·   shorthand: --plan  (= plan mode)
#   ask: read-only exploration — explanations, codebase questions, no file edits.
#   plan: design-first — analyze and propose plans without applying edits.
#   Default (no flag): full agent with tools (can edit, run shell, etc.).
#
# ----- Non-interactive / CI / scripting -----
# -p | --print
#   Run without TUI; writes the model’s final answer to stdout (exit codes for pipelines).
# --output-format text | json | stream-json
#   With `--print`: choose parse-friendly output (`json` / `stream-json` for machines).
# --stream-partial-output
#   With `--print` + `stream-json`: stream incremental text deltas.
# --trust
#   Mark the workspace trusted without an interactive prompt (typical with `--print`/headless).
#
# ----- Models -----
# --model <name>
#   Pick a model id (examples from help: gpt-5, sonnet-4, sonnet-4-thinking).
# --list-models
#   Print models available to your subscription and exit.
# models (subcommand)
#   Same intent — list models for the logged-in account.
#
# ----- Permissions & sandbox -----
# -f | --force   ·   --yolo (alias)
#   Reduce prompts by auto-approving command/tool runs unless explicitly denied.
# --sandbox enabled | disabled
#   Override whether shell commands run in the restricted sandbox for this invocation.
# --approve-mcps
#   Auto-approve MCP servers when they start (fewer interactive prompts).
#
# ----- Workspace & git worktrees -----
# --workspace <path>
#   Project root for `.cursor`, rules, MCP — **this launcher sets it to this agent directory** (not the monorepo root).
# -w | --worktree [name]
#   Clone/edit in an isolated git worktree under ~/.cursor/worktrees/<repo>/<name>/ (safe experiments).
# --worktree-base <branch-or-ref>
#   Parent ref when creating that worktree (defaults to current HEAD).
# --skip-worktree-setup
#   Skip hooks/scripts declared in `.cursor/worktrees.json` after worktree creation.
#
# ----- HTTP / automation headers -----
# --api-key <key>  (or env CURSOR_API_KEY)
#   Authenticate API-style where supported instead of interactive login.
# -H 'Name: Value'  (repeatable)
#   Attach extra HTTP headers to agent HTTP traffic (advanced integrations).
#
# ----- MCP & Cursor rules -----
# mcp …
#   Manage MCP servers (`agent mcp --help`). Uses `.cursor/mcp.json` when present.
# generate-rule | rule
#   Wizard to scaffold a new Cursor rule file (team/style conventions).
#
# ----- Shell integration (optional installer) -----
# install-shell-integration | uninstall-shell-integration
#   Adds/removes Cursor CLI shell helpers (upstream defaults target zsh snippets).
#
# ----- Practical combos -----
#   Interactive full agent on repo:        agent --workspace .
#   Plan-only refactor sketch:             agent --workspace . --plan "migrate auth to JWT"
#   Read-only architecture Q&A:           agent --workspace . --mode ask "how does billing work?"
#   CI one-shot summary:                   agent --workspace . --print --trust --output-format json -p "list risky deps"
#   Check login in scripts:                agent status --format json
#
# ----- Version -----
# -v | --version — print `agent` build/version and exit.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

export PATH="${HOME}/.local/bin:${PATH:-}"

if ! command -v agent >/dev/null 2>&1; then
  echo "ragent.cursor: agent CLI not found in PATH. Try: bash scripts/ensure-cursor-agent.sh" >&2
  exit 127
fi

cd "${SCRIPT_DIR}"
exec agent --workspace "${SCRIPT_DIR}" "$@"
