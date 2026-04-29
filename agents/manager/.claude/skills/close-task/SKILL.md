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
# Examples

```
/close-task 12 @skip-pr
/close-task 12 "don't send pr"
```

# CONTEXT

```bash
!ROOT_PROJECT_PATH="$(pwd)" && \
export ROOT_PROJECT_PATH && \
export ALL_TASKS_PATH="$ROOT_PROJECT_PATH/agents/manager/tasks" && \
export TASK_LIST_PATH="$ALL_TASKS_PATH/tasks.index.jsonc" && \
export AGENT_CONFIG_PATH="$ROOT_PROJECT_PATH/agents/manager/configs/config.manager.jsonc" && \
export DOCS_AGENT_MANAGER_PATH="$ROOT_PROJECT_PATH/agents/manager/docs/!index.md" && \
echo "ROOT_PROJECT_PATH=$ROOT_PROJECT_PATH" && \
echo "ALL_TASKS_PATH=$ALL_TASKS_PATH" && \
echo "TASK_LIST_PATH=$TASK_LIST_PATH" && \
echo "AGENT_CONFIG_PATH=$AGENT_CONFIG_PATH"
echo "AGENT_CONFIG_CONTENT=$(cat "$AGENT_CONFIG_PATH")"
echo "MAIN_DOCUMENTATION_FILE=$(cat "$DOCS_AGENT_MANAGER_PATH")"
```


---
# STEPS

## Step 0 Check if you are in a right worktree and branch if not switch
- worktrees are in a folder !WORKTREES/branch-name

## Step 1 — Read and validate task
- Find the task in `tasks.index.jsonc` where `github_issue_id` equals `{task-id}`. if not provided with a prompt.
- If not found → print `Task #{task-id} not found.` and stop.
- If `status` is already `"done"` or `"cancelled"` → print `Task #{task-id} is already {status}.` and stop.

---

## Step 2 — Verify all sub-tasks are finished
- Check that every sub-task has `status` of `"done"` or `"cancelled"`.
- If any sub-task is still `"pending"`, `"in_progress"`, `"awaiting_review"`, or `"blocked"`:
- Print a warning listing unfinished sub-tasks
- Ask the user to confirm they want to close anyway
- If not confirmed → stop

---

## Step 2.1 — Merge main to current branch

- Resolve the task branch/worktree from the task object's `branch_name`.
- Run `agent.dev /merge-and_solve {task-id}` from the task worktree/branch before creating or updating the PR.
- If conflicts happen, `/merge-and_solve` must resolve them automatically. When the agent is not \
- Continue only when `git status --short` has no unmerged paths.

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


If `pr_id` already exists, skip PR creation and proceed.
attach final report.md to the pr from agents/manager/data/tasks/in_plan/{assigned_user}.{type}.{github_issue_id}.{status}/{github_issue_id}.report.md
---

## Step 4 — Merge and finalize (status → `done`)

- if @skip-pr flag exist:

  ```bash
  gh pr merge "$PR_ID" --merge --delete-branch

  ```

  move  task folder from ./agents/manager/data/tasks/in_plan/{assigned_user}.{type}.{github_issue_id}.{status} 
  to ./agents/manager/data/tasks/done/{github_issue_id} 
  close github issue `gh issue close "$ISSUE_ID" --comment "Closed via /close-task. PR: #$PR_ID"`
- else 
  print `PR #{pr_id} created and ready for review. Merge when ready...\n PR link: #{pr_link}`
```

---


## Step 5 — Update task object

- Update current state for the task object in a tasks.index.jsonc


## Step 6 — Save and sync

Write updated task back to `TASKS_FILE`. Then run `agent.manager /sync-tasks skill`.

---

## Output

```
✓ Task #{task-id} closed
  status:   done
  pr:       #{pr_id} (merged)
  issue:    #{task-id} (closed)
  archived: agents/manager/data/tasks/done/{slug}/
```

---

## Rules

- Never force-push or delete branches that others may depend on
- Resolve merge conflicts through `agent.dev /merge-and_solve`; stop only if that skill reports unresolved unmerged paths
- Allowed writes: `agents/manager/data/tasks/tasks.index.jsonc`, `agents/manager/data/tasks/in_plan/**`, `agents/manager/data/tasks/done/**`
- Use `parse_jsonc` from `task-helpers.sh` for all reads
- Always run `/sync-tasks` at the end

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/close-task/SKILL.md",
    "description": "Skill: close a task through in_review → done, create PR, close issue, archive files.",
    "tags": ["skill", "tasks", "close", "pr", "git"]
} }
```
