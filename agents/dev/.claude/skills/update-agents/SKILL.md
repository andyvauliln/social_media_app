---
name: update-agents
description: Audit all existing agents against the standard template and add any missing files, folders, symlinks, or ALL_AGENTS.md entries. Use when syncing agents, checking agent structure, or ensuring all agents are up to date with the template.
argument-hint: ""
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# update-agents

Audits every `agents/*/` directory and brings each one up to the standard template. Only adds missing items — never overwrites or deletes.

## Invocation

```
/update-agents
```

---

## Project Root

Use the current project root (the repository root where `.claude/` lives). All paths below are relative to it.

---

## Reference: full `.claude` layout (project + related root files)

Claude Code loads config from **`.claude/`** at the repo root and from **`~/.claude/`** globally. Commit project files you want shared; keep secrets in `settings.local.json` or global config.

### Tree (everything the project may use by default)

**Repository — shared team config**

```
<repo>/
├── CLAUDE.md                      # project instructions (every session)
├── CLAUDE.local.md                # optional; private; gitignore; loaded with CLAUDE.md
├── .mcp.json                      # team MCP server definitions (not under .claude/)
├── .worktreeinclude               # optional; gitignored paths to copy into new worktrees
└── .claude/
    ├── settings.json              # permissions, hooks, env, model defaults
    ├── settings.local.json        # personal overrides; auto-gitignored
    ├── rules/
    │   └── *.md                   # topic-scoped / path-gated rules
    ├── skills/
    │   └── <skill-name>/
    │       └── SKILL.md           # /name or auto-invoked skills
    ├── commands/
    │   └── *.md                   # slash commands (same mechanism as skills)
    ├── output-styles/
    │   └── *.md                   # custom system-prompt sections
    ├── agents/
    │   └── *.md                   # subagent definitions (prompt + tools)
    └── agent-memory/
        └── <agent-id>/            # persistent memory for subagents (if enabled)
```

**Global only (not in the repo)** — for completeness:

```
~/.claude/
├── settings.json
├── rules/
├── skills/
├── commands/
├── output-styles/
├── agents/
├── agent-memory/
├── projects/<slug>/memory/        # auto memory across sessions
├── keybindings.json
└── (see also ~/.claude.json — app state, OAuth, personal MCP)
```

### Quick map (what each primitive is for)

| Location | Purpose |
|----------|---------|
| `CLAUDE.md`, `CLAUDE.local.md` | Base project memory and private overrides |
| `.mcp.json` | MCP servers (scopes: see Claude Code MCP docs) |
| `.claude/settings.json` | Permissions, hooks, env vars, defaults |
| `.claude/settings.local.json` | Local-only settings overrides |
| `.claude/rules/*.md` | Extra rules (optionally path-scoped) |
| `.claude/skills/**/SKILL.md` | Reusable workflows; frontmatter `name`, `description` |
| `.claude/commands/*.md` | Slash commands (same loading as skills) |
| `.claude/output-styles/*.md` | Output / system-prompt style chunks |
| `.claude/agents/*.md` | **Subagents** (built-in Claude Code feature), not `agents/*` in this repo |
| `.claude/agent-memory/**/` | Stored memory for those subagents |

**Enterprise / system (not under `<repo>/`):** `managed-settings.json` (path varies by OS) — org-enforced settings that override local choices. See Claude Code “server-managed settings”.

### Verify what loaded (Claude Code session)

Use `/context`, `/memory`, `/skills`, `/agents`, `/hooks`, `/mcp`, `/permissions`, `/doctor` as needed.

**Naming note:** This repo’s `agents/{name}/` directories are **project agents** (your convention). **`.claude/agents/*.md`** are **Claude Code subagents** — different feature, different folder.

---

## Standard Agent Template

Every agent must have:

```
agents/{name}/
├── CLAUDE.md
├── .claude/
│   └── skills/
│       └── defaults/
│           └── SKILL.md          # only if no other **/SKILL.md under skills/
├── docs.agent.{name}/
│   └── !INDEX.md
└── {name}.db
```

**Non-empty directories:** No template folder may stay empty. If `docs.agent.{name}/` or `.claude/skills/` exists, it must contain at least the default file below (or for `skills/`, any `**/SKILL.md` counts). If `.claude/skills/` has no `SKILL.md` anywhere under it, create `defaults/SKILL.md`.

Knowledge base:
- Symlink: `agents/knowledge-base/KNOWLEDGE/docs/docs.agent.{name}.symlink` → `../../../../agent.{name}/docs.agent.{name}/`
- Entry in: `agents/knowledge-base/KNOWLEDGE/all-agents/ALL_AGENTS.md` with a name and description

---

## Steps

### 1. Discover all agents

List all directories matching `agents/*/`. Derive `{name}` from the folder name.

### 2. For each agent, check and fix

For each agent `{name}`:

**Directories** — create with `mkdir -p` if missing:
- `agents/{name}/.claude/skills/`
- `agents/{name}/docs.agent.{name}/`

**Default skill** — if no `SKILL.md` exists under `agents/{name}/.claude/skills/` (any depth), run `mkdir -p .../.claude/skills/defaults` and create `defaults/SKILL.md` only if that path is still missing:

```markdown
---
name: {name}-defaults
description: Placeholder skill for agents/{name}. Add more folders under .claude/skills/<skill-name>/SKILL.md.
argument-hint: ""
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# Skills — {name}

Optional agent-specific workflows. Claude Code loads skills from `.claude/skills/<name>/SKILL.md`.
```

**CLAUDE.md** — create if missing:
```markdown
# Agent: {name}

## Purpose
<!-- Describe this agent's role and responsibilities -->

## Workspace
Root: `agents/{name}/`

## Key Files
- `.claude/skills/` — agent skills (`defaults/SKILL.md` or `<skill-name>/SKILL.md`)
- `docs.agent.{name}/!INDEX.md` — documentation index
- `{name}.db` — agent database

## Notes
<!-- Add operational notes, coordination points, dependencies -->
```

**docs.agent.{name}/!INDEX.md** — create if missing:
```markdown
# {name} — Documentation Index

## Overview
<!-- Brief description of this agent -->

## Sections
<!-- Add links to documentation files as they are created -->
```

**{name}.db** — `touch` if missing.

**Knowledge base symlink** — create if missing:
```bash
SYMLINK="$ROOT/agents/knowledge-base/KNOWLEDGE/docs/docs.agent.{name}.symlink"
TARGET="../../../../agent.{name}/docs.agent.{name}"
[ ! -e "$SYMLINK" ] && ln -s "$TARGET" "$SYMLINK"
```
Symlink uses a **relative path** (relative to `KNOWLEDGE/docs/`).

**ALL_AGENTS.md entry** — append if `agent.{name}` not already present:
```markdown
## agent.{name}
- **Path**: `agents/{name}/`
- **Docs**: `agents/knowledge-base/KNOWLEDGE/docs/docs.agent.{name}.symlink/`
- **DB**: `agents/{name}/{name}.db`
- **Description**: <!-- fill in -->
```

### 3. Report

After processing all agents, output a summary table:

| Agent | CLAUDE.md | skills default | docs/ | !INDEX.md | .db | KB symlink | ALL_AGENTS |
|-------|-----------|----------------|-------|-----------|-----|------------|------------|
| agent.foo | ✓ existed | ✓ created | ✓ existed | ✓ created | ✓ existed | ✓ created | ✓ appended |

Use ✓ existed / ✓ created for each item. For **skills default**: ✓ existed if any `**/SKILL.md` exists under that agent’s `.claude/skills/`; otherwise ✓ created when `defaults/SKILL.md` was added, or ✓ existed if `defaults/SKILL.md` was already present.

---

## Rules

- **Never overwrite** existing files — only create missing ones
- **Never delete** anything
- Symlinks use relative paths
- For ALL_AGENTS.md: check if the agent name appears before appending (grep for `agent.{name}`)
- `agent.knowledge-base` itself does NOT need a self-referential entry in ALL_AGENTS.md — skip it or include with a note
- **Skills folder:** never leave `.claude/skills/` without at least one `SKILL.md`; add `defaults/SKILL.md` only when no other `**/SKILL.md` exists under `skills/`
