---
name: create-task
description: Create a new task with sub-tasks and save it to tasks/tasks.index.jsonc. Use when starting new work or capturing an idea.
argument-hint: "[prompt] [@user_name, @ai optional] [@when optional] [@priority optional] [@type optional] [@scope optional] [@no_plan optional]
user-invocable: true
model: haiku
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# create-task

Creates a structured task entry in `tasks/tasks.index.jsonc` from a natural language prompt.

# Examples:
```
/create-task "I need create skill for the merging @andrei @week @dev.agent" 
/create-task "Create sync with a main for tasks @ai @today" 
/create-task 12
```

---

## Steps

### 1. Read context

```bash
ROOT=$(git rev-parse --show-toplevel)
TASKS_FILE="$ROOT/agents/agent.manager/tasks/tasks.index.jsonc"
CONFIG_PATH="$ROOT/agents/agent.manager/config.manager.jsonc"
MANAGER_TASKS="$ROOT/agents/agent.manager/tasks"
```

Read CONFIG `team` to know valid `assigned_user` names and github emails and current user focus.


### 3. Analyze the prompt

From the user's `{prompt}`

- **title** — concise task title (≤ 80 chars)
- **description** — 2-4 sentence description of what needs to be done and why
- **type** — one of: `research`, `bug`, `feature`, `enhancement`, `idea`
- **scope** — best matching scope: `main`, a project name, app name, or agent name (e.g. `app.dashboard`, `agent.manager`)
- **priority** — `low`, `medium`, `high`, or `urgent` based on context clues
- **when** — `@now`, `@today`, `@tomorrow`, `@week`, `@month`, or `@next_phase` or `@23.02.2026 specific date` 
- **estimated_time** — AI estimate as a string: `"2h"`, `"30m"`, `"1d"`
- **tags** — 2-5 relevant tags (e.g. `["upload", "s3", "media"]`)
- **branch_name** — `{type}/{github_issue_id}-{slug}` (e.g. `feature/12-user-profile-photo`)
- **sub_tasks** — 1 sub ask on task on creation to make plan another will be made after that

# IF YOU HAVE QUESTION OR NOT SURE ASK USER QUESTIONS TO MAKE TASK CORRECTLY


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
    "user input": "<prompt>", // user orinianl prompt or text from AI_TODO 
    "sub_tasks": [
        { //  always create only one task for plan another will be made after plan
            "sub_task_id": 1,
            "commit_id": "",
            "session_id": "",
            "title": "Plan and tests for the build",
            "type": "plan",
            "changed_files_relative_paths": [],
            "is_need_human": true,
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

### 6. Create Github Issue and paste all needed information

- Create github issue with all available information for now
- Read the existing array, append the new task object on top of the queany. Preserve JSONC formatting. Include github id

### 7. Add task to plan

 Let `SLUG="{github_issue_id}.{scope}.{type}"` 


```bash
mkdir -p "$MANAGER_TASKS/in_plan/$SLUG/"
```

Create file and insert there task object

- `$MANAGER_TASKS/in_plan/$SLUG/plan.md` — 


**If `@no_plan` was not present:** 
Create a plan by running skill /create-plan {task-id} with a new session and cleared context




### 9. Output example

```
✓ Task #12 created
  title:    Add user profile photo upload
  type:     feature | priority: high | when: @week
  scope:    app.dashboard | est: 4h
  branch:   feature/12-user-profile-photo
  tags:     user, profile, photo
  assigned: "ai"
  sub-tasks:
    1. [ID: 1]  Plan and define tests for the build   (type: plan, needs human)

  Implementation sub-tasks are added after you confirm the plan in /start-task 12.

  Next: /start-task 12   (or, if @plan: run planning session first, then /start-task 12)
```

---

## Rules

- If no human assignee is implied and the prompt does not name a user, prefer assigning to `ai` per existing team rules.
- `branch_name` must be git-safe (lowercase, hyphens, no spaces)
- Don't remove comments if they exist; `.jsonc` allows comments

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-task/SKILL.md",
    "description": "Skill: create a structured task entry in tasks/tasks.index.jsonc from a natural language prompt.",
    "tags": ["skill", "tasks", "create"],
} }
```
