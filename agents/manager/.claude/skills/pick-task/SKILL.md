---
name: pick-task
description: handling any requests about tasks from file tasks/tasks.index.jsonc with tag filters and AI recommendation on what to pick. Use when a developer wants to pick what to work on.
argument-hint: prompt @tags
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# Pick a task

Reads `tasks/tasks.index.jsonc` and displays filtered tasks with a pick recommendation.

## Invocation

```
/pick-task [tags...]
```

Known Filters but could be any:
- `@top5` — top 5 by priority (urgent > high > medium > low)
- `@today` — tasks with `when` = `"today"`
- `@week` — tasks with `when` = `"week"` or `"today"`
- `@project <name>` — tasks matching `scope: "<name>"`
- `@short` — tasks with `estimated_time` ≤ 2h
- `@pending` — `status` is `"pending"`
- `@planned` — `status` is `"planned"`
- `@in_progress` — `status` is `"in_progress"`
- `@blocked` — `status` is `"blocked"`
- `@mine` — `assigned_user` matched current github email

Multiple tags combine with AND logic: `/pick-task @today @short`

---

## Steps

### 1. Read tasks file

```bash
ROOT=$(git rev-parse --show-toplevel)
TASKS_FILE="$ROOT/agents/agent.manager/tasks/tasks.index.jsonc"
CONFIG_PATH="$ROOT/agents/agent.manager/config.manager.jsonc"
```

If file does not exist, print:
```
No tasks found. Run /create-task to add your first task.
```
and stop.

### 2. Parse and filter

Read the JSON array. Strip `//` comments before parsing (JSONC format). Apply tag filters:

| Tag | Filter |
|-----|--------|
| `@top5priority` | Sort by priority rank, take top 5 |
| `@today` | `when` is `"today"` |
| `@week` | `when` is `"week"` or `"today"` |
| `@project <name>` | `scope` equals `<name>` |
| `@short` | `estimated_time` ≤ 2h |
| `@pending` | `status` is `"pending"` |
| `@planned` | `status` is `"planned"` |
| `@in_progress` | `status` is `"in_progress"` |
| `@blocked` | `status` is `"blocked"` |
| `@mine` | `assigned_user` matches team.jsonc entry |

Default (no tags): all non-done, non-cancelled tasks sorted by priority.

Priority rank: `urgent(1) > high(2) > medium(3) > low(4)`

Always exclude `status` of `"done"`, `"cancelled"` unless explicitly filtered.

### 3. Display results

```
─────────────────────────────────────────────
 TASKS  [filter: @today @short]   2026-04-08
─────────────────────────────────────────────

#1  [URGENT] Fix login crash on mobile         (#12)
    scope: app.mobile | when: today | est: 1h
    status: pending | assigned: —

#2  [HIGH]   Add push notification opt-in       (#9)
    scope: app.mobile | when: today | est: 2h
    status: pending | assigned: andrei

─────────────────────────────────────────────
  2 tasks shown
─────────────────────────────────────────────
```

Show `—` for null/empty fields. Use today's date from `currentDate` in context.

### 4. AI Recommendation

Always append after the list:

```
★ Recommendation
  Pick task #1 — urgent, unassigned, fits today, estimated 1h.
  If low on focus, #2 is lighter with no blocking dependencies.

  To start: /do-task 12
```

Base on: priority, `when` vs today, unassigned preferred, shortest task as tiebreaker.

---

## Rules

- Always read `tasks/tasks.index.jsonc` fresh — never use cached data
- JSONC — strip `//` comments before parsing
- Do not modify any files during this command

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/pick-task/SKILL.md",
    "description": "Skill: filter tasks from tasks/tasks.index.jsonc and recommend what to pick.",
    "tags": ["skill", "tasks", "pick", "planning"],
    "notes_for_ai": ["Strip JSONC comments before parsing. Always add recommendation block."]
} }
```
