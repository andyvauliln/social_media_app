---
name: validate-skills-metadata
description: Scan all agents/**/.claude/skills/**/SKILL.md files, enforce default Claude Code frontmatter, and patch files that drift. Use when syncing skill metadata or before release.
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

# validate-skills-metadata

## Goal

Every `SKILL.md` under `agents/**/.claude/skills/` must share the same **standard metadata** (below). If a file is missing keys, has wrong values, malformed YAML, or empty frontmatter, **fix it** while preserving `name`, `description`, and `argument-hint` content whenever they already exist.

---

## Canonical defaults (target state)

| Key | Required value / shape |
|-----|-------------------------|
| `user-invocable` | `true` |
| `model` | `claude-haiku-4-6` (Haiku tier; shorthand “haiku”) |
| `effort` | `low` |
| `context` | `fork` |
| `agent` | `""` (empty string) |
| `paths` | `[]` (empty sequence) |
| `shell` | `bash` |
| `hooks` | `{}` (empty mapping) |
| `allowed-tools` | **absent** (do not add an empty key) |

Always keep existing **`name`**, **`description`**, and **`argument-hint`** unless they are missing or invalid (then derive from folder name or body).

Frontmatter key order (for consistency when rewriting):

1. `name`
2. `description`
3. `argument-hint` (include as `""` when the skill takes no arguments)
4. `user-invocable`
5. `model`
6. `effort`
7. `context`
8. `agent`
9. `paths`
10. `shell`
11. `hooks`

---

## Discovery

```bash
ROOT=$(git rev-parse --show-toplevel)
find "$ROOT/agents" -path '*/.claude/skills/*/SKILL.md' -type f | sort
```

---

## Validation rules (check in order)

1. **Readable file** — UTF-8 text; must start with `---` YAML frontmatter closed by a second `---` on its own line before markdown body.
2. **Single frontmatter block** — No stray `---` inside the YAML block; fix duplicated terminators (common bug: `description` + blank lines + `---` still inside frontmatter).
3. **Required keys present** — `name`, `description`, and every canonical key in the table above. `argument-hint` should exist; use `""` if none.
4. **Value match** — Normalize `hooks:` from empty/null to `{}`. Normalize `paths:` from `./` or other defaults to `[]` unless the user’s active spec says otherwise (this project standard is empty list). Set `agent` to `""` if it was another string (e.g. `Explore`) for alignment with repo policy.
5. **No empty `allowed-tools`** — Remove key entirely if “empty”.
6. **Body** — If the body is empty or only whitespace after frontmatter, add a minimal `# {name}` heading and one line telling maintainers to define the workflow (do not delete rare content).
7. **`name` vs directory** — The `name` field SHOULD equal the parent folder of `SKILL.md` (kebab-case). If they differ, prefer fixing `name` to match the directory unless that would break a documented slash command; then note the exception in the PR/commit message.

---

## Fix procedure

For each file:

1. Parse existing frontmatter; copy `name`, `description`, `argument-hint` if valid.
2. Merge in missing canonical keys with default values.
3. Rewrite the opening of the file: new YAML block + remainder of file unchanged (preserve all markdown body content below the closing `---`).
4. If YAML was broken, repair structure first, then merge.

After edits, mentally re-run checks 1–7.

---

## Reporting

When done, summarize:

- Files changed (paths)
- Files that already matched
- Any `name`/directory mismatches left intentional

---

## Related

- **Authoring new skills**: `agents/agent.dev/.claude/skills/create-skill/SKILL.md`
- **Context-heavy commands**: use `!` prefix on basename under `.claude/commands/` (see create-skill skill)
