---
name: list-task-main
description:  [NATIVE PROGECT] [Skill]  List tasks from tasks/tasks.index.jsonc with tag filters and AI recommendation on what to pick. Use when a developer wants to see what to work on.
---

# list-task

Reads `tasks/tasks.index.jsonc` and displays filtered tasks with a pick recommendation.

## Invocation

```
/list-task [tags...]
```

Known Filters but could be any:
- `@top5priority` — top 5 by priority (urgent > high > medium > low)
- `@today` — tasks with `when: "@today"` or `when: "@now"`
- `@week` — tasks with `when: "@week"`, `"@today"`, or `"@now"`
- `@project <name>` — tasks matching `scope: "<name>"`
- `@short` — tasks with `estimated_time` ≤ 2h
- `@pending` — status is `"pending"`
- `@blocked` — status is `"blocked"`
- `@mine` — `assigned_user` matches current user from `agents/agent.manager/docs.agent.manager/team.jsonc`

Multiple tags combine with AND logic: `/list-task @today @short`

---

## Steps

### 1. Read tasks file

```bash
ROOT=$(git rev-parse --show-toplevel)
TASKS_FILE="$ROOT/tasks/tasks.index.jsonc"
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
| `@today` | `when` is `"@today"` or `"@now"` |
| `@week` | `when` is `"@week"`, `"@today"`, or `"@now"` |
| `@project <name>` | `scope` equals `<name>` |
| `@short` | `estimated_time` ≤ 2h |
| `@pending` | `status` is `"pending"` |
| `@blocked` | `status` is `"blocked"` |
| `@mine` | `assigned_user` matches team.jsonc entry |

Default (no tags): all non-done, non-canceled tasks sorted by priority.

Priority rank: `urgent(1) > high(2) > medium(3) > low(4)`

Always exclude `status` of `"done"`, `"canceled"`, `"merged"` unless explicitly filtered.

### 3. Display results

```
─────────────────────────────────────────────
 TASKS  [filter: @today @short]   2026-04-08
─────────────────────────────────────────────

#1  [URGENT] Fix login crash on mobile         (#12)
    scope: app.mobile | when: @today | est: 1h
    status: pending | assigned: —

#2  [HIGH]   Add push notification opt-in       (#9)
    scope: app.mobile | when: @week | est: 2h
    status: pending | assigned: Andrei

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

  To start: /start-task 12
```

Base on: priority, `when` vs today, unassigned preferred, shortest task as tiebreaker.

---

## Rules

- Always read `tasks/tasks.index.jsonc` fresh — never use cached data
- JSONC — strip `//` comments before parsing
- Do not modify any files during this command

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/list-task/SKILL.md",
    "description": "Skill: list and filter tasks from tasks/tasks.index.jsonc with AI pick recommendation.",
    "tags": ["skill", "tasks", "list", "planning"],
    "notes_for_ai": ["Strip JSONC comments before parsing. Always add recommendation block."]
} }
```
