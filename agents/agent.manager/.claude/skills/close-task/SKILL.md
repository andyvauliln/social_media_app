---
name: close-task
description: close task by changing status, update related documentations and files, close issue, merge main and sending pull request to main
argument-hint: "task-id {prompt optional}"
user-invocable: true
model: haiku
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# close-task

Closes a task by transitioning its status through `in_review` → `done`, creating a PR, closing the GitHub issue, and archiving task files.

# Examples

```
/close-task 12
/close-task 12 "All changes tested and ready"
```

---

## Step 0 — Path constants

```bash
ROOT=$(git rev-parse --show-toplevel)
source "$ROOT/agents/agent.manager/scripts/task-helpers.sh"
MANAGER_TASKS="$ROOT/agents/agent.manager/tasks"
TASKS_FILE="$MANAGER_TASKS/tasks.index.jsonc"
```

---

## Step 1 — Read and validate task

Find the task in `tasks.index.jsonc` where `github_issue_id` equals `{task-id}`.

If not found → print `Task #{task-id} not found.` and stop.

If `status` is already `"done"` or `"cancelled"` → print `Task #{task-id} is already {status}.` and stop.

---

## Step 2 — Verify all sub-tasks are finished

Check that every sub-task has `status` of `"done"` or `"cancelled"`.

If any sub-task is still `"pending"`, `"in_progress"`, `"awaiting_review"`, or `"blocked"`:
- Print a warning listing unfinished sub-tasks
- Ask the user to confirm they want to close anyway
- If not confirmed → stop

---

## Step 3 — Create pull request (status → `in_review`)

If `pr_id` is empty (no PR yet):

```bash
PR_URL=$(gh pr create \
  --title "$TITLE (#$ISSUE_ID)" \
  --body "Closes #$ISSUE_ID" \
  --base main \
  --head "$BRANCH_NAME")
PR_ID=$(echo "$PR_URL" | grep -oE '[0-9]+$')
```

Update the task object:
- `status` → `"in_review"`
- `pr_id` → `$PR_ID`
- `pr_link` → `$PR_URL`
- `updated_at` → today's date

If `pr_id` already exists, skip PR creation and proceed.

---

## Step 4 — Merge and finalize (status → `done`)

If the task was assigned to AI and all sub-tasks are done:

```bash
gh pr merge "$PR_ID" --merge --delete-branch
```

If assigned to a human, print:
```
PR #{pr_id} created and ready for review.
Merge when ready, then run /close-task {task-id} again to finalize.
```
and stop (leave status as `in_review`).

After merge:
- `status` → `"done"`
- `closed_at` → today's date
- `updated_at` → today's date

---

## Step 5 — Close GitHub issue

```bash
gh issue close "$ISSUE_ID" --comment "Closed via /close-task. PR: #$PR_ID"
```

---

## Step 6 — Archive task folder

If `$MANAGER_TASKS/in_plan/$SLUG` exists:

```bash
mv "$MANAGER_TASKS/in_plan/$SLUG" "$MANAGER_TASKS/done/$SLUG"
```

Update `task_directory` on the task object.

---

## Step 7 — Save and sync

Write updated task back to `TASKS_FILE`. Then run `/sync-tasks`.

---

## Output

```
✓ Task #{task-id} closed
  status:   done
  pr:       #{pr_id} (merged)
  issue:    #{task-id} (closed)
  archived: tasks/done/{slug}/
```

---

## Rules

- Never force-push or delete branches that others may depend on
- If PR has merge conflicts, report them and stop — do not auto-resolve
- Allowed writes: `tasks/tasks.index.jsonc`, `tasks/in_plan/**`, `tasks/done/**`
- Use `parse_jsonc` from `task-helpers.sh` for all reads
- Always run `/sync-tasks` at the end

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/close-task/SKILL.md",
    "description": "Skill: close a task through in_review → done, create PR, close issue, archive files.",
    "tags": ["skill", "tasks", "close", "pr", "git"]
} }
```
