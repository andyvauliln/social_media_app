---
name: create-agent
description: Scaffold a new agent folder with all default files and structure.
---

# create-agent

Creates `agents/agent.{name}/` with all standard defaults. Skips files/folders that already exist.

## Invocation

```
/create-agent {agent_name} [description]
```

- `{agent_name}` — required, the agent name (becomes `agents/agent.{name}/`)
- `[description]` — optional, one-line description of what the agent does

Examples:
```
/create-agent telegram
/create-agent telegram Handles Telegram bot messaging and notifications
```

---

## Project Root

Use project root social_media_app/..

---

## Standard Agent Structure

```
agents/agent.{name}/
├── CLAUDE.md
├── .claude/
│   └── skills/
│       └── defaults/
│           └── SKILL.md          # only if no other **/SKILL.md under skills/
├── docs.agent.{name}/
│   └── !INDEX.md
└── {name}.db
```

**Non-empty directories:** Each directory in this template must contain at least one default file (or, for `skills/`, at least one `**/SKILL.md`). If `skills/` has no `SKILL.md` yet, create `defaults/SKILL.md`.

Plus in knowledge base:
- Symlink: `agents/agent.knowledge-base/KNOWLEDGE/docs/docs.agent.{name}.symlink` → `../../../../agent.{name}/docs.agent.{name}/`
- Entry in: `agents/agent.knowledge-base/KNOWLEDGE/all-agents/ALL_AGENTS.md`

---

## Steps

Given `{name}` and optional `{description}` from arguments.
If `{description}` is not provided, use `<!-- fill in -->` as placeholder.

### 1. Create directories (skip if exist)

```bash
ROOT=$(git rev-parse --show-toplevel)
AGENT_DIR="$ROOT/agents/agent.{name}"

mkdir -p "$AGENT_DIR/.claude/skills"
mkdir -p "$AGENT_DIR/docs.agent.{name}"
```

### 2. Default skill (create if no `**/SKILL.md` under `.claude/skills/`)

If `find "$AGENT_DIR/.claude/skills" -name SKILL.md` finds nothing, run `mkdir -p "$AGENT_DIR/.claude/skills/defaults"` and create `defaults/SKILL.md` if that file is missing:

```markdown
---
name: {name}-defaults
description: Placeholder skill for agents/agent.{name}. Add more folders under .claude/skills/<skill-name>/SKILL.md.
---

# Skills — {name}

Optional agent-specific workflows. Claude Code loads skills from `.claude/skills/<name>/SKILL.md`.
```

### 3. CLAUDE.md (create if missing)

```markdown
# Agent: {name}

## Purpose
{description if provided, otherwise: <!-- Describe this agent's role and responsibilities -->}

## Workspace
Root: `agents/agent.{name}/`

## Key Files
- `.claude/skills/` — agent skills (`defaults/SKILL.md` or `<skill-name>/SKILL.md`)
- `docs.agent.{name}/!INDEX.md` — documentation index
- `{name}.db` — agent database

## Notes
<!-- Add operational notes, coordination points, dependencies -->
```

### 4. docs.agent.{name}/!INDEX.md (create if missing)

```markdown
# {name} — Documentation Index

## Overview
{description if provided, otherwise: <!-- Brief description of this agent -->}

## Sections
<!-- Add links to documentation files as they are created -->
```

### 5. {name}.db (create if missing)

```bash
touch "$AGENT_DIR/{name}.db"
```

### 6. Knowledge base symlink (create if missing)

```bash
SYMLINK="$ROOT/agents/agent.knowledge-base/KNOWLEDGE/docs/docs.agent.{name}.symlink"
TARGET="../../../../agent.{name}/docs.agent.{name}"

[ ! -e "$SYMLINK" ] && ln -s "$TARGET" "$SYMLINK"
```

Symlink uses a **relative path** (relative to the `KNOWLEDGE/docs/` directory).

### 7. Register in ALL_AGENTS.md (append if not already listed)

File: `agents/agent.knowledge-base/KNOWLEDGE/all-agents/ALL_AGENTS.md`

```markdown
## agent.{name}
- **Path**: `agents/agent.{name}/`
- **Docs**: `agents/agent.knowledge-base/KNOWLEDGE/docs/docs.agent.{name}.symlink/`
- **DB**: `agents/agent.{name}/{name}.db`
- **Description**: {description if provided, otherwise: <!-- fill in -->}
```

---

## Rules

- **Never overwrite** existing files — only create missing ones
- **Never delete** anything
- Symlinks use relative paths
- Report what was created vs skipped after completion
- Do not add `defaults/SKILL.md` if any `**/SKILL.md` already exists under `.claude/skills/`

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-agent/SKILL.md",
    "description": "Skill: scaffold agents/agent.{name}/ with defaults and knowledge-base registration.",
    "auto_update_settings": { "on_command": { "name": "create-agent" }, "task_is_done": true },
    "tags": ["skill", "agents", "scaffold"],
    "developer_notes": [""],
    "notes_for_ai": ["Keep steps aligned with agent-template.md and ALL_AGENTS_LIST registration."]
} }
```
