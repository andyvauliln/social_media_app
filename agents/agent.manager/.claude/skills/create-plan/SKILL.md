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

## Path Setup

```bash
!ROOT_PROJECT_PATH="$(pwd)" && \
export ROOT_PROJECT_PATH && \
export ALL_TASKS_PATH="$ROOT_PROJECT_PATH/agents/agent.manager/tasks" && \
export TASK_LIST_PATH="$ALL_TASKS_PATH/tasks.index.jsonc" && \
export DOCS_AGENT_MANAGER_PATH="$ROOT_PROJECT_PATH/agents/agent.manager/docs.agent.manager/!index.md" && \
echo "ROOT_PROJECT_PATH=$ROOT_PROJECT_PATH" && \
echo "ALL_TASKS_PATH=$ALL_TASKS_PATH" && \
echo "TASK_LIST_PATH=$TASK_LIST_PATH" && \
echo "MAIN_DOCUMENTATION_FILE=$(cat "$DOCS_AGENT_MANAGER_PATH")"
```

## Steps

1. Find task by `task_id` in `tasks/tasks.index.jsonc` if not provided with a prompt
2. If not found or not provided — say so and stop
3. Read task details, related files, and context
4. Generate plan and save to `tasks/in_plan/{assigned_user}.{type}.{github_issue_id}.{status}/{github_issue_id}.plan.md`
5. after finishe update task object in a tasks.index.jsonc inlcude new subtasks if they exist and update related fields.

## Plan Structure

Every plan must include:

- **goal** — one sentence what this task achieves
- **description** - shortly describe what we need to do to achieve the goal
- **reasons** - reasoning why we have this set of task and why we choose current flow to solve the task
- **subtasks** — list of subtasks
    - **scope** — files/modules affected
    - **steps** — ordered list of concrete actions (create, modify, delete)
    - **dependencies** — what must exist or be done first
    - **risks** — anything that could break or needs attention
    - **acceptance** — how to know the task is done
    - **How we know that it's done** — how to know that the task is done
    - **tests** — list of tests or actions to check
- **alternatives** - list of altenative solutions

## Rules

- Keep plans short and actionable, no fluff
- Each step = one clear action
- Reference real file paths, not vague descriptions
- If task is ambiguous — list assumptions
- Version with `@v` if plan already exist and it's new one


```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-plan/SKILL.md",
    "description": "Skill: create a structured plan for a task in plan mode.",
    "tags": ["skill", "tasks", "plan"],
} }
```
