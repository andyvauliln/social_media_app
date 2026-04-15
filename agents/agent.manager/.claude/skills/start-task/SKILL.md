---
name: start-task
description: Starting task by it id or sub id
argument-hint: "{id} {sub-task-id optional} {prompt optional}"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# Examples:
```
/start-task 12 2
/start-task 12 2 Lets' try do instead....
/start-task 12
```
---

## Steps

### 1. Read task

```bash
ROOT=$(git rev-parse --show-toplevel)
TASKS_FILE="$ROOT/agents/agent.manager/tasks/tasks.index.jsonc"
CONFIG_PATH="$ROOT/agents/agent.manager/config.manager.jsonc"
MANAGER_TASKS="$ROOT/agents/agent.manager/tasks"
```

Find the task in `tasks.index.jsonc` where `github_issue_id` equals `{id}`.

If not found, print:
```
Task #{id} not found. Run /pick-task to see available tasks.
```
and stop.

If task `status` is `"done"` or `"cancelled"`, warn the user and ask to confirm before proceeding.

### 2. Resolve planning directory (`in_plan` vs `done`)

Let `ASSIGNED` be `assigned_user` if non-empty, else `unassigned`.

**Slug** (matches `mine/I_WANT.md`):

`SLUG="{github_issue_id}.{scope}.{type}.{ASSIGNED}"`

- If `tags` contains `"@plan"` **or** `in_plan/$SLUG/` already exists on disk → **planning root** is  
  `PLAN_ROOT="$MANAGER_TASKS/in_plan/$SLUG"`
- Else → **planning root** is  
  `PLAN_ROOT="$MANAGER_TASKS/done/$SLUG"`

If `PLAN_ROOT` does not exist but `in_plan/{id}.{scope}.{type}.unassigned` exists and `ASSIGNED` is now a real user (not `unassigned`), **rename** that directory to `PLAN_ROOT` so the planning session’s files stay attached to the task.

```bash
mkdir -p "$PLAN_ROOT/sessions"
```

Primary plan file: `$PLAN_ROOT/plan.md`.

### 3. Plan document and mandatory human confirmation

- If `$PLAN_ROOT/plan.md` is missing or empty/stub-only, generate it (see §6 template) from `title`, `description`, `type`, and the **first two** sub-tasks.
- If `@plan` was used, the user should have filled `plan.md` (and test notes) in a **separate session**; if still missing, generate a draft and ask them to review.

**Stop and ask explicitly:** show the path to `plan.md` (relative to repo) and ask the user to **confirm** they accept the plan (and test approach) before any git branch work.

If they do **not** confirm, stop without changing `status` or creating a branch.

### 4. Expand implementation sub-tasks (after confirmation)

If `sub_tasks` has **exactly two** entries (the standard plan + proposals slice from create-task):

- Append new `sub_task_id` values starting at **3**, derived from the task `description`, `type`, and the agreed `plan.md`.
- Typical pattern for **feature** / **enhancement**: one or more `build` steps, then optional `report`.
- For **bug**: reproduce/verify → `build` (fix) → `build` (regression test) → optional `report`.
- For **research** / **idea**: further `research` and/or a closing `report`.

Set each new sub-task to `status`: `"pending"`, `is_need_human`: `true` when review is needed.

If `sub_tasks` has more than two entries (legacy or manually edited tasks), **skip** expansion and leave `sub_tasks` unchanged.

The expanded rows are persisted together with §7 (single write). Preserve JSONC comments if present.

### 5. Determine current user

Read `team` from `CONFIG_PATH`. Match current GitHub email to assign `assigned_user` when appropriate.

### 6. Create git branch

Check current git status — if there are uncommitted changes, warn the user.

Create and switch to the task branch from main:
Where `{branch_name}` comes from the task object (e.g. `feature/12-user-profile-photo`).

If branch already exists:
```bash
git checkout {branch_name}
```

Print:
```
✓ Switched to branch: feature/12-user-profile-photo
```

Always create the git branch **after** plan confirmation (§3).

### 7. Update task in tasks.index.jsonc

Update the task object in **one** write (merge with §4):

- `sub_tasks` — include any new rows appended in §4
- `status` → `"planned"`
- `when` → `"today"` (task is being started)
- `assigned_user` → set from team match when applicable
- `updated_at` → today's date (YYYY-MM-DD)
- `task_directory` → keep or set to `"./tasks/{github_issue_id}"` as in the index convention

Write back to `TASKS_FILE`.

### 8. Ensure `plan.md` is complete

If not already filled in §3, build a focused work plan based on the task's `title`, `description`, `type`, and **all** `sub_tasks` (including newly added ones).

```markdown
# Plan: {title}

**Task:** #{github_issue_id}
**Branch:** {branch_name}
**Type:** {type} | **Priority:** {priority} | **Est:** {estimated_time}
**Date:** {today}
**Plan folder:** {PLAN_ROOT relative to repo}

---

## Goal

{description}

---

## Sub-tasks

### 1. {sub_task_1 title} [{type}]
- [ ] {concrete step}
- [ ] {concrete step}

### 2. {sub_task_2 title} [{type}]
- [ ] {concrete step}
- [ ] {concrete step}

...

---

## Definition of Done

- [ ] All sub-tasks completed
- [ ] Tests passing (if applicable)
- [ ] PR ready for review

---

## Notes

<!-- Add notes, blockers, decisions as you go -->
```

Fill in concrete checklist steps under each sub-task based on the task's scope and type. Keep steps actionable and specific.

### 9. Confirm output

```
✓ Task #12 started

  branch:   feature/12-user-profile-photo  (created & checked out)
  assigned: Andrei
  status:   planned
  when:     today
  plan:     agents/agent.manager/tasks/in_plan/12.agent.manager.feature.andrei/plan.md
            (or .../tasks/done/... when not @plan)

  Sub-tasks:
    1. [ ] Plan and define tests for the build     [plan]
    2. [ ] Proposals and alternatives              [research]
    3. [ ] … (implementation added after plan confirm) [build]
    …

  Update plan.md and sessions/*.log as you work.
```

---

## Rules

- **Plan confirmation (§3) is mandatory** before branch checkout and before setting `planned`.
- After confirmation, expand `sub_tasks` in §4 only when **exactly two** entries exist; then persist with §7.
- Create the git branch only after confirmation; refresh `plan.md` in §8 so it lists all sub-tasks including new ones.
- Never force-push or delete existing branches
- `plan.md` must have concrete checklist items — not just sub-task titles
- Allowed writes: `tasks/tasks.index.jsonc`, `tasks/in_plan/**`, `tasks/done/**`
- Strip `//` JSONC comments before parsing tasks file; preserve structure when writing back

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/start-task/SKILL.md",
    "description": "Skill: start a task with plan confirmation, sub-task expansion, git branch, and plan.md under in_plan or done.",
    "tags": ["skill", "tasks", "start", "planning", "git"],
    "notes_for_ai": ["Confirm plan.md with the user first. If only two sub_tasks, append implementation sub_tasks after confirm. Use in_plan when @plan tag or folder exists."]
} }
```
