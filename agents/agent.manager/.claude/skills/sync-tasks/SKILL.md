---
name: sync-tasks
description: Rebuild ai.today.jsonc and week.jsonc from tasks.index, then git pull/push the tasks folder.
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

Rebuilds scheduling files from `tasks.index.jsonc` (source of truth), then syncs with remote.

```
/sync-tasks
```

---

## Step 0 — Setup

```bash
ROOT=$(git rev-parse --show-toplevel)
source "$ROOT/agents/agent.manager/scripts/task-helpers.sh"
TASKS_FILE="$MANAGER_TASKS/tasks.index.jsonc"
PLAN_DIR="$MANAGER_TASKS/in_plan"
```

If `tasks.index.jsonc` is empty or missing → print `No tasks to sync.` and stop.

---

## Step 1 — Rebuild {assigned_user}.today.jsonc

could be script that will filter tasks from `tasks.index.jsonc` that have when field today or now 

---

## Step 2 — Rebuild week.jsonc


could be script that will filter tasks from `tasks.index.jsonc` that have when field week

---

## Step 3 — Git pull & push tasks folder

```bash
CURRENT_BRANCH=$(git branch --show-current)

git add "$MANAGER_TASKS/"
if git diff --cached --quiet "$MANAGER_TASKS/"; then
    echo "✓ sync-tasks: nothing changed"
    exit 0
fi

git commit -m "sync-tasks: $(today_iso)"
git pull --rebase origin "$CURRENT_BRANCH" 2>/dev/null || true
git push origin HEAD 2>/dev/null || true
```

---

## Output

```
✓ sync-tasks done
  today: {count} tasks
  week:  {count} tasks
  pushed: yes/no
```

---

## Rules

- `tasks.index.jsonc` is the only source of truth — scheduling files are always rebuilt, never merged
- Use `parse_jsonc` from `task-helpers.sh` for all reads
- Never modify task content — only rebuild derived views and sync git
