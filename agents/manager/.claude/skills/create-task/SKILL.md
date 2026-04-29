---
name: create-task
description: Create a new task with sub-tasks and save it to agents/manager/data/tasks/tasks.index.jsonc. Branches on assignment (AI vs human) to decide execution depth.
argument-hint: "[prompt] [@ai|@user_name|@agent_name] [@today|@tomorrow|@week|@phase_N|@DD.MM.YYYY] [@research|@bug|@idea|@update|@self_improvement|@improvement|@feature] [@no_plan] [@agent_name assigned_agent] [@c or @context ./path]"
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

Creates a structured task entry in `agents/manager/data/tasks/tasks.index.jsonc` from a natural-language prompt.
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
| **assigned_agent** | See Step 3 |

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
| `@ai` | `"ai"` | **A** (AI) ||
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

No branch creation, no execution — human reviews and runs `/do-task` when ready.

### 5b. `@now` or `@today` WITH `@no_plan`

```
1. SLUG=$(task_slug <tmp_id> <scope> <type>)
2. create_task_folder "$SLUG"                         # folder + empty plan.md
```

### 5c. Other `@when`

Metadata only — task is registered for future scheduling.

---

## Step 6 — Build task object base on example and rules in a   MAIN_DOCUMENTATION_FILE context
- Always create exactly **one** sub-task at creation time. Additional sub-tasks are added by `/do-task` after plan confirmation.

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
**Assigned Agent:** $ASSIGNED_AGENT

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

## Step 9 — Sync

Always run at the end, regardless of branch:
run `agents/manager  /sync-tasks skill`

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

  Next: /do-task {id}
```

## Rules

- If anything is ambiguous, **ask the user** before creating the task
- If no human assignee is implied and prompt doesn't name a user, assign to `ai`
- `branch_name` must be git-safe: lowercase, hyphens, no spaces
- Preserve JSONC comments when reading/writing `.jsonc` files
- GitHub issue must be created before saving to `tasks.index.jsonc` (ID is required)
- Allowed file writes: `agents/manager/data/tasks/tasks.index.jsonc`, `agents/manager/data/tasks/in_plan/**`,

```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-task/SKILL.md",
    "description": "Skill: create a structured task with two-branch flow (AI vs human). AI tasks can self-execute; human tasks wait for /do-task.",
    "tags": ["skill", "tasks", "create", "planning", "git"]
} }
```
