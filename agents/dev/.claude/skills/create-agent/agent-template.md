# Full directory structure

```md
`agents/{agent-name}/`
├── `CLAUDE.md`                      # Main project memory (team-shared, in git)
├── `CLAUDE.local.md`                # Personal overrides (gitignored)
├── `scripts.agent.{agent-name}/`
│   └──` index.js`                   # any python,js, sh or
├── `docs.agent.{agent-name}/`
│   └── `examples.jsonc`             # all working prompts and flows
│   └── db-scheme.{agent-name}.symlink.md                    # structure of documentation
│   └── !INDEX.md                    # structure of documentation
└── db.{agent-name}.db               # Agent db
└── db-scheme.{agent-name}.db        # Shema for db
├── .mcp.json                        # MCP server config (GitHub, JIRA, DBs)
├── config.{agent-name}.jsonc        # Agent Config
└── .claude/
    ├── settings.json                # Team permissions + hooks (in git)
    ├── settings.local.json          # Personal overrides (gitignored)
    ├── .gitignore                   # Ignores *.local.* files
    ├── .worktreeinclude                   # Ignores *.local.* files
    ├── agents/
    │   └── code-reviewer.md         # Specialist AI agent
    ├── commands/
    │   ├── commit.md                # /commit slash command
    │   └── pr-review.md             # /pr-review slash command
    ├── skills/
    │   └── get-statistic/
    │       └── SKILL.md             # Multi-step workflow
    ├── rules/
    │   ├── code-style.md            # Applied by glob pattern
    │   └── security.md
```

---

## CLAUDE `CLAUDE.md` — agent global memory (ll go to every ai request)

```md
# Purpose of this agent
```


## SETTINGS `~/.claude/settings.json` — global security (full)

Deny wins over project `allow`.

```json
{
  "permissions": {
    "deny": [
      "Bash(sudo:*)",
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
      "Read(.env)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)"
    ]
  }
}
```

---

## RULE `.claude/rules/code-style.md` (short)

```yaml
---
description: TypeScript/JS coding rules
globs: "*.ts,*.tsx,*.js,*.jsx"
---

# Code style
- Absolute imports only · no `any` · async: try/catch + typed errors
```

---

## SKILL `.claude/skills/implement/SKILL.md`

```yaml
---
  name: deploy
  description: Deploy the app to production. Use when deploying, releasing, or pushing to prod.
  argument-hint: "[environment] [version]"
  disable-model-invocation: true
  user-invocable: true
  allowed-tools: Bash(gh *) Bash(npm *) Read
  model: claude-sonnet-4-6
  effort: high
  context: fork
  agent: Explore
  paths:
    - "src/**/*.ts"
    - "*.config.js"
  shell: bash
  hooks:
    PreToolUse:
      - matcher: "Bash"
        hooks:
          - type: command
            command: "./scripts/safety-check.sh"
---

  Deploy $ARGUMENTS to production:

  1. Run `npm test`
  2. Run `npm run build`
  3. Run `gh release create $0`
```

---

## COMMAND `.claude/commands/commit.md`

```yaml
---
name: template
description: Deploy the app to production. Use when deploying or releasing.
argument-hint: "[environment]"
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(npm *)
context: fork
---
BODY
---

## `.claude/agents/code-reviewer.md` (short)

```yaml
---
name: code-reviewer
description: Proactive reviewer — types, security, dead code, errors
---

# Code reviewer
Review staged/changed files: (1) types (2) security (3) dead code (4) async error handling. Output numbered CRITICAL / WARNING / INFO.
```

---

## `.mcp.json` (short)

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": { "DATABASE_URL": "${DATABASE_URL}" }
    }
  }
}
```

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-agent/agent-template.md",
    "description": "Claude project layout, full team/global settings.json, short examples for rules/skills/commands/agents/MCP.",
    "auto_update_settings": { "on_command": { "name": "" }, "task_is_done": true },
    "tags": ["template", "agents", "claude"],
    "developer_notes": [""],
    "notes_for_ai": ["Keep tree aligned with create-agent SKILL; examples stay minimal."]
} }
```
