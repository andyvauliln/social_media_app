---
name: create-plan
description: create new plan base on task
argument-hint: "[task id] 
user-invocable: true
model: haiku
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---
```bash
ROOT=$(git rev-parse --show-toplevel)
TASKS_FILE="$ROOT/agents/agent.manager/tasks/tasks.index.jsonc"
CONFIG_PATH="$ROOT/agents/agent.manager/config.manager.jsonc"
MANAGER_TASKS="$ROOT/agents/agent.manager/tasks"
```

 Let `SLUG="{github_issue_id}.{scope}.{type}"`
 PLAN `$MANAGER_TASKS/in_plan/$SLUG/plan.md`  
0) Read plan
1) if there are not provided task objects get it from TASKS_FILE and insert at the begining
2) insert


```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-plan/SKILL.md",
    "description": "Skill: create a structured task entry in tasks/tasks.index.jsonc from a natural language prompt.",
    "tags": ["skill", "tasks", "plan"],
} }
```
