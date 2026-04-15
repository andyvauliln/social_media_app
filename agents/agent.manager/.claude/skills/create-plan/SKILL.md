---
name: create-plan
description: create plan for a task in plan mode
argument-hint: "[task id] [prompt optional] [@v - version of the plan optional]"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
paths: []
shell: bash
hooks: {}
------

## Setup

```bash
ROOT=$(git rev-parse --show-toplevel)
TASKS_FILE="$ROOT/agents/agent.manager/tasks/tasks.index.jsonc"
CONFIG_PATH="$ROOT/agents/agent.manager/config.manager.jsonc"
MANAGER_TASKS="$ROOT/agents/agent.manager/tasks"
```

## Steps

1. Find task by `task_id` in `tasks/tasks.index.jsonc`
2. If not found — say so and stop
3. Read task details, related files, and context
4. Generate plan and save to `tasks/in_plan/{assigned_user}.{github_issue_id}.{status}.{v?}.jsonc`
5. Confirm plan created with path

## Plan Structure

Every plan must include:

- **goal** — one sentence what this task achieves
- **subtasks** — list of subtasks if needs or same for main task
    - **scope** — files/modules affected
    - **steps** — ordered list of concrete actions (create, modify, delete)
    - **dependencies** — what must exist or be done first
    - **risks** — anything that could break or needs attention
    - **acceptance** — how to know the task is done
    - **tests** — list of tests to be passed

## Rules

- Keep plans short and actionable, no fluff
- Each step = one clear action
- Reference real file paths, not vague descriptions
- If task is ambiguous — list assumptions
- Version with `@v` param when iterating on same task
- list all subtask

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-plan/SKILL.md",
    "description": "Skill: create a structured plan for a task in plan mode.",
    "tags": ["skill", "tasks", "plan"],
} }
```
