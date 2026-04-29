---
name: develope-task
description: Implement a specific sub-task from the task plan. Reads the task and sub-task context, executes the development work (code changes, file edits, etc.), and produces a commit + report. Use when a task sub-task is ready to be built.
argument-hint: "<task-id> <sub-task-id>"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# EXAMPLES

```
/develope-task 12 2
/develope-task 12 2 "Focus on the edge case with empty arrays"
```

---

# CONTEXT

## Path Setup

```bash
!ROOT_PROJECT_PATH="$(pwd)" && \
export ROOT_PROJECT_PATH && \
export TASK_LIST_PATH="$ROOT_PROJECT_PATH/agents/manager/data/tasks/tasks.index.jsonc" && \
export IN_PLAN_PATH="$ROOT_PROJECT_PATH/agents/manager/data/tasks/in_plan" && \
echo "ROOT=$ROOT_PROJECT_PATH" && echo "TASKS=$TASK_LIST_PATH"
```

## Task + Sub-task Context

```bash
!node -e "
const fs = require('fs');
const path = require('path');
const taskId = process.argv[1];
const subTaskId = process.argv[2];
const raw = fs.readFileSync(process.env.TASK_LIST_PATH, 'utf8')
  .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const tasks = JSON.parse(raw);
const task = tasks.find(t => String(t.github_issue_id) === String(taskId));
if (!task) { console.log('Task not found:', taskId); process.exit(1); }
const sub = task.sub_tasks && task.sub_tasks.find(s => String(s.sub_task_id) === String(subTaskId));
console.log('=== TASK ===');
console.log(JSON.stringify(task, null, 2));
console.log('=== SUB-TASK ===');
console.log(sub ? JSON.stringify(sub, null, 2) : 'Sub-task ' + subTaskId + ' not found');

// Load plan file if exists
const planDir = path.join(process.env.IN_PLAN_PATH, 'ai.' + taskId + '.' + (task.scope || 'main'));
const planFile = path.join(planDir, taskId + '_plan.md');
if (fs.existsSync(planFile)) {
  console.log('=== PLAN ===');
  console.log(fs.readFileSync(planFile, 'utf8'));
}
// Load previous sub-task report if exists
const reportFile = path.join(planDir, subTaskId + '.report.md');
if (fs.existsSync(reportFile)) {
  console.log('=== PREVIOUS REPORT ===');
  console.log(fs.readFileSync(reportFile, 'utf8'));
}
" -- "$TASK_ID" "$SUB_TASK_ID"
```

---

# STEPS

1. **Parse args** — extract `task-id`, `sub-task-id`, and optional prompt override.
   - If no sub-task-id given, find the first `pending` sub-task in the task object.

2. **Load context** — inject task, sub-task JSON, plan file, and previous sub-task report using the `!` block above.
   - Understand: what this sub-task must build, acceptance criteria, related files.

3. **Read relevant files** — before writing any code, read all files the sub-task touches.
   - Use `scope`, `tags`, and `context` fields from the task to find related files.
   - Read the plan for architectural decisions that must be respected.

4. **Implement** — make the code changes described by the sub-task.
   - Follow existing code patterns in the file you are editing.
   - Prefer editing existing files over creating new ones.
   - Keep changes scoped to what the sub-task specifies — no extra refactoring.

5. **Verify** — run any relevant tests or check commands from `run_test_command` in the task.
   - Fix failures before proceeding.

6. **Write sub-task report** — save a short report to:
   `agents/manager/data/tasks/in_plan/ai.{task-id}.{scope}/{sub-task-id}.report.md`
   Report must include: what was done, files changed, result, any blockers or follow-up notes.

7. **Commit** — stage only the changed files and commit with a message:
   `[#{task-id}.{sub-task-id}] {sub-task title}`

8. **Update task** in `tasks.index.jsonc`:
   - Set sub-task `status` to `"done"` and fill `commit_id` with the commit hash.
   - If all sub-tasks are done, set parent task `status` to `"in_review"`.

---

# RULES

- Never commit unrelated files — stage only what the sub-task changed.
- If `is_need_human_confirmation: true` on the sub-task, show a diff summary and wait for user approval before committing.
- Do not create new sub-tasks during implementation — note them in the report instead.
- If the sub-task requires a plan that does not exist yet, stop and ask the user to run `/do-task {task-id}` first.

---

# OUTPUT

```
✓ Sub-task #12.2 complete

  title:    "Implement X feature"
  files:    apps/social/views.py, templates/base.html
  commit:   a1b2c3d  [#12.2] Implement X feature
  report:   agents/manager/data/tasks/in_plan/ai.12.social/2.report.md
  next:     sub-task 3 — "Write unit tests"
```
