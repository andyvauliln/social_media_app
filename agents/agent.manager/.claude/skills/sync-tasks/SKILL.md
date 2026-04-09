---
name: sync-tasks
description: Synchronize or reconcile manager tasks data. Use when the user runs sync-tasks from the manager agent.
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

# sync-tasks
collect all AI_TODO: "task" from the proejct files and make tasks for them
if @not_context don't attach source files to the task attach file path as param @context  
should be run every 1h by cron job
Update github-issues base on tasks.index.json object data
sync task folder between branch and main


### 8. Commit updated file tasks.index.jsonc to main if it's task with tag @ai that no need any human interaction and

```bash 
git add agents/agent.manager/tasks/tasks.index.jsonc
# If @plan scaffolding added files:
git add agents/agent.manager/tasks/in_plan 2>/dev/null || true
git commit -m "added task update tasks index"
git push origin HEAD:main
```