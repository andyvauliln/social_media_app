---
name: create-task
description: Create a new task with sub-tasks and save it to tasks/tasks.index.jsonc. Use when starting new work or capturing an idea.
argument-hint: "[prompt] [@user_name, @ai optional] [@when optional] [@priority optional] [@type optional] [@scope optional]
---

# create-task

Creates a structured task entry in `tasks/tasks.index.jsonc` from a natural language prompt.

---

## Steps

### 1. Read context

```bash
ROOT=$(git rev-parse --show-toplevel)
TASKS_FILE="$ROOT/agents/agent.research/tasks/tasks.index.jsonc"
CONFIG_PATH="$ROOT/agents/agent.manager/config.manager.jsonc"
```

read CONFIG team to know valid `assigned_user` values.

### 3. Analyze the prompt

From the user's `{prompt}`, derive:

- **title** — concise task title (≤ 80 chars)
- **description** — 2-4 sentence description of what needs to be done and why
- **type** — one of: `research`, `bug`, `feature`, `enhancement`, `idea`
- **scope** — best matching scope: `main`, a project name, app name, or agent name (e.g. `app.dashboard`, `agent.manager`)
- **priority** — `low`, `medium`, `high`, or `urgent` based on context clues
- **when** — `@now`, `@today`, `@tomorrow`, `@week`, `@month`, or `@next_phase` or `@23.02.2026 specific date` 
- **estimated_time** — AI estimate as a string: `"2h"`, `"30m"`, `"1d"`
- **tags** — 2-5 relevant tags (e.g. `["upload", "s3", "media"]`)
- **branch_name** — `{type}/{github_issue_id}-{slug}` (e.g. `feature/12-user-profile-photo`)
- **sub_tasks** — break work into 2-5 logical sub-tasks

# IF YOU HAVE QEUSTION OR NOT SURE ASK USER QUESTIONS TO MAKE TASK CORRECTLY
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
    "github_issue_id": <github-id>,
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
    "notes": "",
    "ai_agents": "claude",
    "created_at": "<YYYY-MM-DD>",
    "created_by": "ai",
    "updated_at": "<YYYY-MM-DD>"
}
Use today's date from `currentDate` in context for `created_at` and `updated_at`.
```

### 6. Create Github Issue and past all needed information
- create github issue
- Read the existing array, append the new task object, write back. Preserve JSONC formatting. inlcude github id

### 7 Commit updated file tasks.index.jsonc to main if it's task with tag @ai that no need any human interaction and

```bash 
git add agents/agent.manager/tasks/tasks.index.jsonc
git commit -m "added task update tasks index"
git push origin HEAD:main
```
### 8 Output Example

```
✓ Task #12 created
  title:    Add user profile photo upload
  type:     feature | priority: high | when: @week
  scope:    app.dashboard | est: 4h
  branch:   feature/12-user-profile-photo
  tags:     
  sub-tasks:
    1. [ID: 1]  Plan implementation steps          (type: plan)
    2. [ID: 2]  Build upload UI and backend logic  (type: build)
    3. [ID: 3]  Research secure storage options    (type: research)
    4. [ID: 4]  Test and report results            (type: report)

  Next: /start-task 12
```

---

## Rules

- if not need any user and not user provided with a prompt or provided ai than assign to ai
- `branch_name` must be git-safe (lowercase, hyphens, no spaces)
- Don't remove comments if they exist it's .jsonc file which allow comments

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-task/SKILL.md",
    "description": "Skill: create a structured task entry in tasks/tasks.index.jsonc from a natural language prompt.",
    "tags": ["skill", "tasks", "create"],
} }
```
