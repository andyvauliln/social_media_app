---
name: create-skill
description: Scaffold agents/{name}/.claude/skills/{skill}/SKILL.md with standard metadata and optional dev command. Use when the user runs /create-skill with a prompt and @agent.
argument-hint: '"[prompt]" [@agent-name]'
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# create-skill

## Invocation

```
/create-skill "…natural-language prompt for what the skill should do…" @{agent-name}
```

- **Quoted prompt** — required. Describes purpose, steps, constraints, and when the skill applies (becomes the body and informs `description`).
- **`@{agent-name}`** — required short agent id (no `agent.` prefix). Examples: `@dev` → `agents/dev/`, `@manager` → `agents/manager/`.

---

## Naming and layout

| Piece | Rule |
|--------|------|
| Agent root | `agents/{agent-name}/` |
| Skill folder | `agents/{agent-name}/.claude/skills/{skill-slug}/` |
| Main file | `SKILL.md` inside that folder (required) |
| `name` (YAML) | Same as `{skill-slug}`: lowercase, digits, hyphens only; max 64 characters; match directory name |
| `description` (YAML) | Third person, **what** + **when**; max 1024 characters; derived from the prompt |
| Extra files | Optional: `reference.md`, `scripts/`, etc., one level deep from `SKILL.md` |

Derive `{skill-slug}` from the prompt (concise, action-oriented, e.g. `deploy-preview`, `parse-invoices`). If the user gave an explicit name, use that (normalized to kebab-case).

---

## Commands that require context (`!`)

Slash commands that expect **user-supplied context** (quoted prompts, `@` mentions, attachments, or heavy reliance on prior conversation) should use a **`!` prefix on the command file basename** so they are easy to spot and group:

- Example: `.claude/commands/dev/!create-skill.dev.md` (this workflow).
- Commands that only trigger a fixed skill with no extra user payload can omit `!` (e.g. a simple `/sync-project` wrapper).

When you add a new context-heavy command for this skill, use `!{command-name}.dev.md` under `.claude/commands/dev/` unless the team places commands on another agent suffix.

---

## Default `SKILL.md` frontmatter (always use unless the user explicitly overrides in the prompt)

Every new skill MUST open with:

```yaml
---
name: {skill-slug}
description: {third-person what + when, from prompt}
argument-hint: ""
user-invocable: true
model: haiku
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---
```

Notes:

- **`model: claude-haiku-4-6`** is the project default for the Haiku tier (“model: haiku” in shorthand).
- **`agent: ""`** means no dedicated sub-agent string; leave empty unless the prompt asks otherwise.
- **`paths: []`** means no path restrictions; omit path globs unless the prompt requires scoping.
- **`hooks: {}`** means no hooks; use a mapping only when the prompt defines hook entries.
- **`allowed-tools`**: do **not** add the key when there is no allowlist (empty / unrestricted).

---

## Steps

### 1. Resolve paths

```bash
ROOT=$(git rev-parse --show-toplevel)
AGENT="agent.{agent-name}"   # from @token without @
SKILL_SLUG="{skill-slug}"    # derived from prompt
SKILL_DIR="$ROOT/agents/$AGENT/.claude/skills/$SKILL_SLUG"
```

Fail fast if `agents/{agent-name}/` does not exist (suggest `/create-agent`).

### 2. Create the skill directory

```bash
mkdir -p "$SKILL_DIR"
```

If `SKILL.md` already exists, stop and ask whether to overwrite or pick a new slug.

### 3. Write `SKILL.md`

- Insert the **default frontmatter** block above with concrete `name`, `description`, and `argument-hint` if the workflow takes arguments.
- Body: structured sections (invocation, steps, examples) implied by the user’s quoted prompt.
- Match tone and depth of other skills in `agents/dev/.claude/skills/`.

### 4. Optional dev command

If the user should invoke this skill via slash command, add `.claude/commands/dev/!{skill-slug}.dev.md` (context-heavy) or `{skill-slug}.dev.md` (not context-heavy) with:

```markdown
---
name: {skill-slug}.dev
description: {short}
argument-hint: {if needed}
---

Run this skill in agents/{agent-name}/.claude/skills/{skill-slug}/SKILL.md
```

---

## Project root

Use repository root `social_media_app` (where `.claude/` lives).


