---
name: create-task-main
description:  [NATIVE PROGECT] [Skill]  Create a new task with sub-tasks and save it to tasks/tasks.index.jsonc. Use when starting new work or capturing an idea.
---

# create-task

Creates a structured task entry in `tasks/tasks.index.jsonc` from a natural language prompt.

## Invocation

```
/create-task-main {prompt}. {task configurations} @ai
```

Examples:
```
/create-task Add user profile photo upload with compression and S3 storage
```

---

## Steps

### 1. Read context

```bash
ROOT=$(git rev-parse --show-toplevel)
TASKS_FILE="$ROOT/tasks/tasks.index.jsonc"
TEAM_FILE="$ROOT/agents/agent.manager/docs.agent.manager/team.jsonc"
```

Read `team.jsonc` to know valid `assigned_user` values.

If `tasks/tasks.index.jsonc` does not exist, create it as `[]`.

### 2. Determine next github_issue_id

create github issue and get new id

### 3. Analyze the prompt

From the user's `{prompt}`, derive:

- **title** — concise task title (≤ 80 chars)
- **description** — 2-4 sentence description of what needs to be done and why
- **type** — one of: `research`, `bug`, `feature`, `enhancement`, `idea`
- **scope** — best matching scope: `main`, a project name, app name, or agent name (e.g. `app.dashboard`, `agent.manager`)
- **priority** — `low`, `medium`, `high`, or `urgent` based on context clues
- **when** — `@now`, `@today`, `@tomorrow`, `@week`, `@month`, or `@next_phase`
- **estimated_time** — AI estimate as a string: `"2h"`, `"30m"`, `"1d"`
- **tags** — 2-5 relevant tags (e.g. `["upload", "s3", "media"]`)
- **branch_name** — `{type}/{github_issue_id}-{slug}` (e.g. `feature/12-user-profile-photo`)
- **sub_tasks** — break work into 2-5 logical sub-tasks (see below)

### 4. Build sub-tasks

For each sub-task:
- `sub_task_id` — incremental from 1
- `title` — what this step does
- `type` — `plan`, `build`, `research`, or `report`
- `status` — always `"pending"`
- `is_need_human` — `true` if step needs human review/decision

Typical breakdown for **feature**: plan → build → build (tests) → report
For **bug**: research (reproduce) → build (fix) → build (regression test)
For **research**: research → report

### 5. Construct task object

```jsonc
{
    "github_issue_id": <next_id>,
    "title": "<derived>",
    "description": "<derived>",
    "branch_name": "<type>/<id>-<slug>",
    "branch_github_link": "",
    "pr_id": "",
    "pr_link": "",
    "estimated_time": "<ai estimate>",
    "status": "pending",
    "task_directory": "./tasks/<github_issue_id>",
    "priority": "<derived>",
    "scope": "<derived>",
    "when": "<derived>",
    "tags": ["<tag1>", "<tag2>"],
    "type": "<derived>",
    "sub_tasks": [
        {
            "sub_task_id": 1,
            "commit_id": "",
            "session_id": "",
            "title": "<sub-task title>",
            "type": "<plan|build|research|report>",
            "changed_files_relative_paths": [],
            "is_need_human": false,
            "status": "pending"
        }
    ],
    "is_passed_test": false,
    "run_test_command": "",
    "assigned_user": "",
    "ai_agents": "claude",
    "created_at": "<YYYY-MM-DD>",
    "created_by": "ai",
    "updated_at": "<YYYY-MM-DD>"
}
```

Use today's date from `currentDate` in context for `created_at` and `updated_at`.

### 6. Append to tasks.index.jsonc

Read the existing array, append the new task object, write back. Preserve JSONC formatting.

### 7. Confirm output

```
✓ Task #12 created
  title:    Add user profile photo upload
  type:     feature | priority: high | when: @week
  scope:    app.mobile | est: 4h
  branch:   feature/12-user-profile-photo
  sub-tasks: 4

  Next: /start-task 12
```

---

## Rules

- Never assign `assigned_user` — leave it `""`
- `github_issue_id` must be unique and incremental
- Always create at least 2 sub-tasks
- `branch_name` must be git-safe (lowercase, hyphens, no spaces)
- Do not create GitHub issues or git branches — only write to the local file
- Strip `//` JSONC comments before parsing; preserve structure when writing back

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-task/SKILL.md",
    "description": "Skill: create a structured task entry in tasks/tasks.index.jsonc from a natural language prompt.",
    "tags": ["skill", "tasks", "create", "planning"],
} }
```
