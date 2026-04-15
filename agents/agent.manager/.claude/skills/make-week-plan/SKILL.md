---
name: make-week-plan
description: make week plan from tasks/tasks.index.jsonc and save it to tasks/in_plan/{assigned_user}.week.jsonc
argument-hint: ""
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

1) get config.manager.jsonc
2) Read all tasks where when status is @week or @today
3) base on that info make today list of tasks for each assigned_user and put it in a file tasks/in_plan/{assigned_user}.today.jsonc
if some task from @today still not finsihed add them again to the list
4) Make plan with using skill /create-plan {task_id}