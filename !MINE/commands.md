## Claude CLI (verified from `claude --help`)

### Real command list (`claude [command]`)

- `agents`
- `auth`
- `auto-mode`
- `doctor`
- `install`
- `mcp`
- `plugin` / `plugins`
- `setup-token`
- `update` / `upgrade`

### Common flags with real use examples

| Flag | Meaning | Real usage |
| --- | --- | --- |
| `--add-dir <directories...>` | Allow extra directories for tool access | `claude --add-dir ../apps ../lib` |
| `--agent <agent>` | Use a configured agent for session | `claude --agent reviewer` |
| `--agents <json>` | Define custom agents inline (JSON object) | `claude --agents '{"reviewer":{"description":"Reviews code","prompt":"You are a code reviewer"}}'` |
| `-p, --print` | Run non-interactive and print response | `claude -p "review this function"` |
| `-c, --continue` | Continue latest conversation in directory | `claude -c` |
| `-r, --resume [value]` | Resume by session id or picker | `claude -r` |
| `-n, --name <name>` | Set session display name | `claude -n "feature-auth-work"` |
| `--permission-mode <mode>` | Set permission mode (`default`, `plan`, etc.) | `claude --permission-mode plan` |
| `--dangerously-skip-permissions` | Bypass permission checks | `claude --dangerously-skip-permissions` |
| `--allowedTools <tools...>` | Allow listed tools | `claude --allowedTools "Read" "Bash(git:*)"` |
| `--disallowedTools <tools...>` | Block listed tools | `claude --disallowedTools "Edit"` |
| `--tools <tools...>` | Restrict built-in tool set | `claude --tools "Bash,Edit,Read"` |
| `--output-format <format>` | Print output as `text`, `json`, `stream-json` | `claude -p "query" --output-format json` |
| `--input-format <format>` | Input format in print mode | `claude -p --input-format stream-json --output-format stream-json` |
| `--json-schema <schema>` | Enforce structured JSON output | `claude -p --json-schema '{"type":"object"}' "return structured output"` |
| `--max-budget-usd <amount>` | Cap print-mode spend | `claude -p --max-budget-usd 5 "analyze repo"` |
| `--model <model>` | Select model or alias | `claude --model sonnet` |
| `--fallback-model <model>` | Fallback model in print mode | `claude -p --model sonnet --fallback-model opus "summarize"` |
| `--settings <file-or-json>` | Load settings from file or JSON | `claude --settings ./settings.json` |
| `--setting-sources <sources>` | Choose setting layers | `claude --setting-sources user,project` |
| `--mcp-config <configs...>` | Load MCP config(s) | `claude --mcp-config ./mcp.json` |
| `--strict-mcp-config` | Use only passed MCP config | `claude --strict-mcp-config --mcp-config ./mcp.json` |
| `-d, --debug [filter]` | Enable debug logs | `claude --debug "api,mcp"` |
| `--debug-file <path>` | Write debug logs to file | `claude --debug-file /tmp/claude.log` |
| `--system-prompt <prompt>` | Replace system prompt | `claude --system-prompt "You are a Python expert"` |
| `--append-system-prompt <prompt>` | Append to default system prompt | `claude --append-system-prompt "Prefer Bun over Node"` |
| `-w, --worktree [name]` | Create/use git worktree | `claude -w feature-auth` |
| `--tmux` | Use tmux session with worktree | `claude -w feature-auth --tmux` |
| `--ide` | Auto-connect to IDE if available | `claude --ide` |
| `--chrome` | Enable Claude in Chrome integration | `claude --chrome` |
| `--no-chrome` | Disable Claude in Chrome integration | `claude --no-chrome` |
| `-v, --version` | Show CLI version | `claude -v` |
| `-h, --help` | Show help | `claude --help` |

### JSON array field example (real command use)

Use a JSON array field with `--mcp-config` (it accepts multiple configs):

```bash
claude --mcp-config ./mcp/base.json ./mcp/github.json ./mcp/browser.json -p "list connected MCP servers"
```

Equivalent JSON shape (array field):

```json
{
  "mcpConfigFiles": [
    "./mcp/base.json",
    "./mcp/github.json",
    "./mcp/browser.json"
  ]
}
```

### Quick checks

```bash
claude --help
claude auth --help
claude mcp --help
```