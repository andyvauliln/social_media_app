---
name: make-today-plan
description: make today plan from agents/manager/data/tasks/tasks.index.jsonc and save it to agents/manager/data/tasks/in_plan/{assigned_user}.today.jsonc
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
2) Read all tasks where when status is `today` and not finished and `week` by every user from the team for get ai tasks 
4) get
3) base on that info make today list of tasks for each assigned_user and put it in a file agents/manager/data/tasks/in_plan/{assigned_user}.today.md

4) Make plan with using skill /create-plan {task_id}

when works with task use task-management
```bash
!bun task-management get-task "$0"
````

remove all canseled tasks or done task

FORMAT:
6. Title `` 
- (tags,priority, type, ...)
- description 
-

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/make-today-plan/SKILL.md",
    "description": "Skill: create a structured task entry in agents/manager/data/tasks/tasks.index.jsonc from a natural language prompt.",
    "tags": ["skill", "tasks", "create"],
} }
```
