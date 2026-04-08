---
name: start-task-main
description: [NATIVE PROGECT] [Skill] Start working on a task by creating a git branch, setting assigned_user, and generating a plan. Use when a developer picks a task to work on.
---

# start-task

Activates a task: assigns it, creates a git branch, builds a work plan, and sets up the task folder.

## Invocation

```
/start-task {id}
```

Example:
```
/start-task 12
```

---

## Steps

### 1. Read task

```bash
ROOT=$(git rev-parse --show-toplevel)
TASKS_FILE="$ROOT/tasks/tasks.index.jsonc"
TEAM_FILE="$ROOT/agents/agent.manager/docs.agent.manager/team.jsonc"
```

Find the task in `tasks/tasks.index.jsonc` where `github_issue_id` equals `{id}`.

If not found, print:
```
Task #{id} not found. Run /list-task to see available tasks.
```
and stop.

If task `status` is `"done"` or `"canceled"`, warn the user and ask to confirm before proceeding.

### 2. Determine current user

Read `team.jsonc`. If only one team member exists, use them. If multiple exist, ask the user which one they are (show names from team.jsonc).

### 3. Create git branch

Check current git status — if there are uncommitted changes, warn the user.

Create and switch to the task branch:

```bash
git checkout -b {branch_name}
```

Where `{branch_name}` comes from the task object (e.g. `feature/12-user-profile-photo`).

If branch already exists:
```bash
git checkout {branch_name}
```

Print:
```
✓ Switched to branch: feature/12-user-profile-photo
```

### 4. Update task in tasks.index.jsonc

Update the task object:
- `status` → `"scheduled"`
- `assigned_user` → current user name from team.jsonc
- `updated_at` → today's date (YYYY-MM-DD)

Write back to `tasks/tasks.index.jsonc`.

### 5. Create task folder

```bash
mkdir -p "$ROOT/tasks/{github_issue_id}"
```

Create `tasks/{github_issue_id}/plan.md` with the plan (see step 6).

### 6. Generate plan.md

Build a focused work plan based on the task's `title`, `description`, `type`, and `sub_tasks`.

```markdown
# Plan: {title}

**Task:** #{github_issue_id}
**Branch:** {branch_name}
**Type:** {type} | **Priority:** {priority} | **Est:** {estimated_time}
**Date:** {today}

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

### 7. Confirm output

```
✓ Task #12 started

  branch:   feature/12-user-profile-photo  (created & checked out)
  assigned: Andrei
  status:   scheduled
  plan:     tasks/12/plan.md

  Sub-tasks:
    1. [ ] Define data model and API contract  [plan]
    2. [ ] Implement upload endpoint           [build]
    3. [ ] Add compression + S3 integration   [build]
    4. [ ] Write integration tests             [build]
    5. [ ] Document in report                  [report]

  Start building — update plan.md as you go.
```

---

## Rules

- Always create the git branch before updating the task file
- Never force-push or delete existing branches
- plan.md must have concrete checklist items — not just sub-task titles
- `task_directory` in the task object should be updated to `"./tasks/{github_issue_id}"`
- Do not modify any other files outside `tasks/tasks.index.jsonc` and `tasks/{id}/plan.md`
- Strip `//` JSONC comments before parsing tasks file; preserve structure when writing back

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/start-task/SKILL.md",
    "description": "Skill: start a task by creating git branch, assigning user, and generating plan.md.",
    "tags": ["skill", "tasks", "start", "planning", "git"],
    "notes_for_ai": ["Always create branch first. Generate concrete checklist steps in plan.md, not just sub-task titles."]
} }
```
