---
name: make-today-plan
description: make today plan from tasks/tasks.index.jsonc and save it to tasks/in_plan/{assigned_user}.today.jsonc
argument-hint: ""
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: "agent.manager"
paths: []
shell: bash
hooks: {}
---
1) get config.manager.jsonc  to get team and project data
2) Read all tasks where when status is @week and phase_1
3) base on that info make today list of tasks for each assigned_user and put it in a file tasks/in_plan/{assigned_user}.today.jsonc
if some task from @today still not finsihed add them again to the list
4) Make plan with using skill /create-plan {task_id}


```json
{ "ai_file_metadata": {
    "path": ".claude/skills/make-today-plan/SKILL.md",
    "description": "Skill: create a structured task entry in tasks/tasks.index.jsonc from a natural language prompt.",
    "tags": ["skill", "tasks", "create"],
} }
```
