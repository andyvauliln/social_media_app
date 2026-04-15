---
name: create-task
description: Create a new task with sub-tasks and save it to tasks/tasks.index.jsonc. Branches on assignment (AI vs human) to decide execution depth.
argument-hint: "[prompt] [@ai|@user_name|@agent_name] [@today|@tomorrow|@week|@phase_N|@DD.MM.YYYY] [@research|@bug|@idea|@update|@self_improvement|@improvement|@feature] [@no_plan] [@context ./path]"
user-invocable: true
model: haiku
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# create-task

Creates a structured task entry in `tasks/tasks.index.jsonc` from a natural-language prompt.
Behavior differs based on who the task is assigned to (AI vs human) and when it's scheduled.

# Examples

```
/create-task "Add profile photo upload to dashboard @andrei @week @feature"
/create-task "Fix crash on login screen @ai @today @bug @context logout.tsx login.tsx"
/create-task "Research caching strategies for feed @ai @today @research"
/create-task "Refactor DB connection pool @tomorrow @no_plan @improvement"
/create-task "Deploy new API endpoint @15.05.2026 @week @feature"
/create-task 12
```

---

## Step 0 — Path constants

```bash
ROOT=$(git rev-parse --show-toplevel)
source "$ROOT/agents/agent.manager/scripts/task-helpers.sh"
MANAGER_TASKS="$ROOT/agents/agent.manager/tasks"
TASKS_FILE="$MANAGER_TASKS/tasks.index.jsonc"
CONFIG_PATH="$ROOT/agents/agent.manager/config.manager.jsonc"
ROADMAP_PATH="$ROOT/agents/agent.manager/docs.agent.manager/ROAD_MAP.md"
```

---

## Step 1 — Load context (do all four before proceeding)

| What | How | Why |
|------|-----|-----|
| **Team config** | Read `CONFIG_PATH` → `team[]` | Know valid user names, emails, `current_focus` for assignment |
| **Roadmap** | Read `ROADMAP_PATH` (if it exists) | Align task with project phases; infer `@when` if omitted |
| **Current git user** | `GIT_EMAIL=$(get_git_email)` | Match to team member for `created_by` |
| **Context files** | If `@context` paths provided, read them | Attach relevant code/docs to the task description |

If `{prompt}` is a **number** (e.g. `/create-task 12`), treat it as an existing `github_issue_id` — fetch the issue with `gh issue view 12 --json title,body,labels` and use its content as the prompt source. Skip to Step 2.

---

## Step 2 — Parse the prompt

Extract from the user's `{prompt}` and `@` tags:

| Field | Rule |
|-------|------|
| **title** | Concise, ≤ 80 chars |
| **description** | 2–4 sentences: what needs to be done and why |
| **type** | `research`, `bug`, `feature`, `enhancement`, `idea`, `update`, `self_improvement`, `improvement` — pick from `@type` tag or infer |
| **scope** | Best-matching: `main`, project name, app name, or agent name (e.g. `app.dashboard`, `agent.manager`) |
| **priority** | `low`, `medium`, `high`, `urgent` — from `@priority` or infer from context |
| **when** | See resolution below |
| **estimated_time** | AI estimate: `"30m"`, `"2h"`, `"1d"` |
| **tags** | 2–5 relevant tags (e.g. `["upload", "s3", "media"]`) |
| **assigned_user** | See Step 3 |

### `@when` resolution (order of precedence)

`when` is a scheduling bucket field. It answers "when should this be worked on?" and can be promoted over time by `/sync-tasks`.

**Values (low → high urgency):** `phase_N`, `week`, `today`

Optional companion field `when_date` stores a specific date (`YYYY-MM-DD`) when one is provided.

| Tag in prompt | `when` | `when_date` |
|---------------|--------|-------------|
| `@now` | `"today"` | today's date |
| `@today` | `"today"` | today's date |
| `@tomorrow` | `"week"` | tomorrow's date |
| `@week` | `"week"` | `""` |
| `@month` | `"phase_1"` | `""` |
| `@phase_N` | `"phase_N"` (e.g. `"phase_1"`) | `""` |
| `@DD.MM.YYYY` | `"phase_1 or week or today base on date"`| the parsed date |
| No tag, assigned to **@ai** | `"today"` | today's date |
| No tag, assigned to **user** | `"phase_1"` | `""` |

**If anything is ambiguous or unclear, ask the user before proceeding.**

---

## Step 3 — Resolve assignment

| Prompt contains | `assigned_user` value | Branch |
|-----------------|----------------------|--------|
| `@ai` | `"ai"` | **A** (AI) |
| `@agent_name` (e.g. `@agent.dev`) | `"ai"` (agent = AI) | **A** (AI) |
| `@user_name` (e.g. `@andrei`) | that user name | **B** (Human) |
| None of the above | Match `GIT_EMAIL` to `team[].email`; if match → that user (**B**), else → `"ai"` (**A**) |

---

## Step 4 — Branch A: AI / Agent assignment

### 4a. `@now` or `@today` WITHOUT `@no_plan`

Full autonomous execution:

```
1. SLUG=$(task_slug <tmp_id> <scope> <type>)
2. create_task_folder "$SLUG"                         # mkdir + plan.md stub
3. Generate plan → write to $MANAGER_TASKS/in_plan/$SLUG/plan.md
4. Create worktree and branch:
     git worktree add -b <branch_name> ".claude/worktrees/<branch_name>" main
   OR if worktrees not available:
     git checkout -b <branch_name> main
5. Execute the plan (work through the generated plan steps)
```

Set `PLAN_EXECUTED=true` — used in Step 9.

### 4b. `@now` or `@today` WITH `@no_plan`

```
1. SLUG=$(task_slug <tmp_id> <scope> <type>)
2. create_task_folder "$SLUG"                         # folder + empty plan.md
```

No plan generation, no execution.

### 4c. Other `@when` WITH `@no_plan`

```
1. Create worktree/branch:
     git checkout -b <branch_name> main
2. Apply prompt changes directly to files (if prompt implies specific edits)
```

### 4d. Other `@when` WITHOUT `@no_plan` (default)

Metadata only — no folder, no branch, no execution. Task is registered for future scheduling.

---

## Step 5 — Branch B: Human user assignment

### 5a. `@now` or `@today` WITHOUT `@no_plan`

```
1. SLUG=$(task_slug <tmp_id> <scope> <type>)
2. create_task_folder "$SLUG"
3. Generate plan → write to $MANAGER_TASKS/in_plan/$SLUG/plan.md
```

No branch creation, no execution — human reviews and runs `/start-task` when ready.

### 5b. `@now` or `@today` WITH `@no_plan`

```
1. SLUG=$(task_slug <tmp_id> <scope> <type>)
2. create_task_folder "$SLUG"                         # folder + empty plan.md
```

### 5c. Other `@when`

Metadata only — task is registered for future scheduling.

---

## Step 6 — Build task object

```jsonc
{
    "github_issue_id": null,       // set in Step 7
    "title": "<derived>",
    "description": "<derived>",
    "branch_name": "<type>/<github_issue_id>-<slug>",
    "branch_github_link": "",
    "pr_id": "",
    "pr_link": "",
    "estimated_time": "<ai estimate>",
    "status": "pending",           // lifecycle: pending | planned | in_progress | in_review | done | blocked | cancelled
    "when": "<derived>",           // scheduling bucket: phase_N | month | week | today
    "when_date": "",               // optional specific date YYYY-MM-DD (e.g. from @tomorrow, @DD.MM.YYYY)
    "blocked_reason": "",          // set when status is "blocked", cleared when unblocked
    "task_directory": "./tasks/in_plan/<SLUG>",
    "priority": "<derived>",       // urgency: low | medium | high | urgent
    "scope": "<derived>",
    "tags": ["<tag1>", "<tag2>"],
    "type": "<derived>",
    "context": "<@context paths or empty>",
    "user_input": "<original prompt>",
    "sub_tasks": [],               // built below
    "is_passed_tests": false,
    "run_test_command": "",
    "assigned_user": "<derived>",
    "is_need_human_confirmation": false,
    "notes": "",
    "platform": "claude",
    "created_at": "<YYYY-MM-DDThh:mm:ssZ>",  // UTC ISO 8601
    "created_by": "<git user or ai>",
    "updated_at": "<YYYY-MM-DDThh:mm:ssZ>",  // UTC ISO 8601
    "closed_at": ""
}
```

### Sub-tasks construction

Always create exactly **one** sub-task at creation time. Additional sub-tasks are added by `/start-task` after plan confirmation.

> **Note for AI:** The absence of `@no_plan` does **not** mean a plan sub-task must always be created. Use judgment — if the task is trivial, purely metadata, or clearly does not require planning (e.g. a simple config change or label update), skip plan generation even without `@no_plan`. Only create a plan sub-task when the task genuinely benefits from upfront planning.

| Condition | sub_task status | `is_need_human_confirmation` |
|-----------|----------------|------------------------------|
| Plan was generated AND executed (4a) | `"done"` | `false` |
| Plan was generated, NOT executed (4b, 5a) | `"awaiting_review"` | `true` (human), `false` (ai) |
| No plan (`@no_plan` or deferred) | `"pending"` | per assignment |

```jsonc
{
    "sub_task_id": 1,
    "commit_id": "",
    "session_id": "",
    "title": "Plan and define tests for the build",
    "type": "plan",
    "model": "haiku",
    "platform": "claude",
    "changed_files_relative_paths": [],
    "is_need_human_confirmation": false,
    "blocked_reason": "",          // set when status is "blocked", cleared when unblocked
    "notes": "",
    "status": "pending"            // lifecycle: pending | in_progress | awaiting_review | done | blocked | cancelled
}
```

---

## Step 7 — Create GitHub issue

```bash
ISSUE_ID=$(gh issue create \
  --title "$TITLE" \
  --body "$(cat <<EOF
## Description
$DESCRIPTION

**Type:** $TYPE | **Priority:** $PRIORITY | **When:** $WHEN
**Scope:** $SCOPE | **Estimated:** $ESTIMATED_TIME
**Assigned:** $ASSIGNED_USER
**Branch:** $BRANCH_NAME

## Tags
$TAGS_FORMATTED

## Context
$CONTEXT
EOF
)" \
  --label "$TYPE" \
  | grep -oE '[0-9]+$')
```

After creation:
- Set `github_issue_id` on the task object
- Set `branch_name` to `{type}/{ISSUE_ID}-{slug}` (now that ID is known)
- If a folder was already created with a temp slug, rename it: `mv "$MANAGER_TASKS/in_plan/$OLD_SLUG" "$MANAGER_TASKS/in_plan/$NEW_SLUG"`

---

## Step 8 — Save to tasks.index.jsonc

Read the existing array from `TASKS_FILE`, prepend the new task object at the top. Preserve JSONC formatting and any existing comments.

```bash
# Validate before write
EXISTING=$(parse_jsonc "$TASKS_FILE")
# Prepend new task, write back preserving JSONC structure
```

---

## Step 9 — Auto-close (AI branch 4a only)

If `PLAN_EXECUTED=true` (the plan was generated and fully executed in Step 4a):

```
run /close-task $ISSUE_ID
```

This updates status, generates reports, closes the GitHub issue, and handles PR/merge.

---

## Step 10 — Sync

Always run at the end, regardless of branch:

```
run /sync-tasks
```

This updates `[assigned_user].today.jsonc`, `week.jsonc`, reconciles GitHub issue state, and commits metadata if on main.

---

## Output

```
✓ Task #{github_issue_id} created
  title:    {title}
  type:     {type} | priority: {priority} | when: {when}
  scope:    {scope} | est: {estimated_time}
  branch:   {branch_name}
  tags:     {tags joined}
  assigned: {assigned_user}
  sub-tasks:
    1. [ID: 1]  Plan and define tests for the build   (type: plan, status: {sub_task_status})

  {next_action_hint}
```

### Next-action hints by branch

| Case | Hint |
|------|------|
| AI 4a (executed) | `Task completed and closed. See /pick-task for next work.` |
| AI 4b/4d or Human 5b/5c | `Next: /start-task {id}` |
| Human 5a (plan ready) | `Plan ready for review: {plan_path}. Next: /start-task {id}` |

---

## File structure reference

```
tasks/
├── tasks.index.jsonc
├── in_plan/
│   ├── week.jsonc
│   ├── ai.today.jsonc
│   └── <slug>/                    # slug = "{assigned_user}.{github_issue_id}.{type}.{status}"
│       ├── plan.md
│       ├── report.md
│       ├── sub-task-id.report.md
│       └── attached_file_*.jpeg
└── done/
    └── <github_issue_id>/
```

---

## Status enums

Three orthogonal dimensions — never overlap:

**Task `status` (lifecycle):** `pending`, `planned`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled`

**Task `when` (scheduling bucket):** `phase_N`, `month`, `week`, `today`  
**Task `when_date` (optional):** `YYYY-MM-DD` — specific date, set alongside `when` when a date tag is used

**Task `priority` (urgency):** `low`, `medium`, `high`, `urgent`

**Sub-task `status` (lifecycle):** `pending`, `in_progress`, `awaiting_review`, `done`, `blocked`, `cancelled`

### Task status derivation from sub-tasks

| Rule (checked in order) | Task status |
|--------------------------|-------------|
| All sub-tasks `done` or `cancelled` | `in_review` (if PR exists) or `done` |
| Any sub-task `in_progress` | `in_progress` |
| Any sub-task `awaiting_review` and none `in_progress` | `in_progress` |
| All non-cancelled sub-tasks `blocked` | `blocked` |
| All sub-tasks `pending` and plan confirmed | `planned` |
| All sub-tasks `pending` and no plan | `pending` |

Manual override: a user or skill can force `blocked` or `cancelled` regardless of sub-task states.

---

## Rules

- If anything is ambiguous, **ask the user** before creating the task
- If no human assignee is implied and prompt doesn't name a user, assign to `ai`
- `branch_name` must be git-safe: lowercase, hyphens, no spaces
- Preserve JSONC comments when reading/writing `.jsonc` files
- GitHub issue must be created before saving to `tasks.index.jsonc` (ID is required)
- Never force-push or delete existing branches
- Use `source "$ROOT/agents/agent.manager/scripts/task-helpers.sh"` for shared utilities
- Allowed file writes: `tasks/tasks.index.jsonc`, `tasks/in_plan/**`, `tasks/done/**`

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-task/SKILL.md",
    "description": "Skill: create a structured task with two-branch flow (AI vs human). AI tasks can self-execute; human tasks wait for /start-task.",
    "tags": ["skill", "tasks", "create", "planning", "git"]
} }
```
