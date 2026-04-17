# Plan: Finish collect-inline-tasks skill
**Task ID:** 6  
**Branch:** `improvement/6-finish-collect-inline-tasks-skill`  
**Assigned to:** Andrei → agent.dev

---

## Task Object

```jsonc
{
  // GitHub issue ID — set after `gh issue create`
  "github_issue_id": 6,

  "title": "Finish collect-inline-tasks skill",

  "description": "Complete and finalize the collect-inline-tasks skill for agent.manager. The skill should reliably discover inline ai_todo comments, convert each into a structured manager task, and remove processed inline items from source files. Finalizing this workflow prevents task loss and keeps code clean after extraction.",

  // Git branch name — format: {type}/{github_issue_id}-{slug}
  "branch_name": "improvement/6-finish-collect-inline-tasks-skill",

  "branch_github_link": "",

  "pr_id": "",
  "pr_link": "",

  "estimated_time": "2h",

  // pending | planned | in_progress | in_review | done | blocked | cancelled
  "status": "planned",

  // phase_N | week | today
  "when": "phase_1",
  "when_date": "",

  "blocked_reason": "",

  // Folder created only when plan/report generation starts
  "in_plan_task_directory": "agents/agent.manager/tasks/in_plan/Andrei.improvement.6.pending",

  "priority": "medium",

  "scope": "agent.manager",

  "tags": ["skill", "collect", "inline-tasks", "agent.manager", "improvement"],

  // research | bug | feature | enhancement | idea | update | self_improvement | improvement
  "type": "improvement",

  "context": "agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md",

  "user_input": "Finish collect-inline-tasks skill",

  "sub_tasks": [
    {
      "sub_task_id": 1,
      "commit_id": "",
      "session_id": "",
      "title": "Plan and define improvements for collect-inline-tasks skill",
      "type": "plan",
      "model": "haiku",
      "platform": "claude",
      "changed_files_relative_paths": [],
      "is_need_human_confirmation": true,
      "blocked_reason": "",
      "notes": "",
      "status": "done"
    },
    {
      "sub_task_id": 2,
      "commit_id": "",
      "session_id": "",
      "title": "Rewrite SKILL.md to match project skill format",
      "type": "build",
      "model": "haiku",
      "platform": "claude",
      "changed_files_relative_paths": [
        "agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md"
      ],
      "is_need_human_confirmation": true,
      "blocked_reason": "",
      "notes": "Single file rewrite. Detailed guidance below in Sub-task 2.",
      "status": "pending"
    }
  ],

  "is_passed_tests": false,
  "run_test_command": "bun run test:collect-inline-tasks",

  "assigned_user": "Andrei",
  "assigned_agent": "agent.dev",

  "is_need_human_confirmation": true,

  "notes": "Plan at agents/agent.manager/tasks/in_plan/Andrei.improvement.6.pending/6_plan.md",

  "platform": "claude",

  "created_at": "2026-04-17T00:00:00Z",
  "created_by": "Andrei",
  "updated_at": "2026-04-17T00:00:00Z",
  "closed_at": ""
}
```

---

## Objective

Rewrite `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md` to conform with the project SKILL.md format (sections: `# EXAMPLES`, `# CONTEXT`, `# STEPS`, `# RULES`, `# OUTPUT`), while preserving and improving the existing logic for scanning, parsing, creating tasks, and removing processed comments.

---

## Current State Analysis

**File:** `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md`

**What exists (good — keep):**
- Frontmatter is correct and complete
- `ai_todo` syntax table with all supported params
- Ripgrep search command: `rg -n -i 'ai_todo:' "$SEARCH_PATH"`
- Workflow steps: search → parse → create-task → remove comment
- Support for all comment styles (`//`, `/* */`, `#`, `<!-- -->`)
- Line-preservation rules on comment removal

**What's missing (needs to be added/restructured):**
- `# EXAMPLES` section with annotated invocation examples
- `# CONTEXT` section using `!` bash injection pattern (root path, task list path)
- `# STEPS` section (numbered, with "why" and "how" per step)
- `# RULES` section (extracted from inline rules)
- `# OUTPUT` section (success/failure report format)
- No `@ai_file_metadata` block at the end

---

## Sub-task 2 — Rewrite SKILL.md

**File to modify:** `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md`

### Structure to produce

```
---
[frontmatter — keep as-is]
---

# collect-inline-tasks
[one-line description]

# EXAMPLES
[3-4 invocation examples with explanation]

# CONTEXT
[! bash injection block — export ROOT, TASK_LIST_PATH]

# STEPS
[numbered steps with why/how]

# RULES
[bullet list of rules]

# OUTPUT
[success/failure format]

[ai_file_metadata block]
```

### Step breakdown

**Step 1 — Gather context (bash injection)**
```bash
!ROOT=$(git rev-parse --show-toplevel) && \
export ALL_TASKS_PATH="$ROOT/agents/agent.manager/tasks" && \
export TASK_LIST_PATH="$ALL_TASKS_PATH/tasks.index.jsonc"
```
Why: Agent needs to know where to write tasks and what root to search from.

**Step 2 — Search**
- `SEARCH_PATH = arg[0] ?? $ROOT`
- Run: `rg -n -i 'ai_todo:' "$SEARCH_PATH"`
- If no matches → print "No ai_todo comments found" and stop.

**Step 3 — Parse each match**
For each match extract:
- `prompt` — text inside quotes (or full text after `ai_todo:`)
- `@params` — `@ai`, `@user`, `@context`, `@today`, `@week`, `@high`, etc.
- If `@context` → append `(source: <file>:<line>)` to prompt

**Step 4 — Create task**
- Call `/create-task "<prompt>" <@params>`
- Wait for successful task ID returned
- On failure → log error, keep comment, continue

**Step 5 — Remove comment**
- On success only: remove the `ai_todo` line from source file
- If comment is the only content on line → delete entire line
- If code precedes comment on same line → remove only the comment portion
- Support `//`, `/* */`, `#`, `<!-- -->` styles

**Step 6 — Report**
```
✓ Collected inline tasks

   * #12 "change this field name"
   * #13 "refactor auth logic"

✗ Failed (comment kept):
   * src/utils.ts:42 — create-task returned error
```

---

## TESTS

**Test file:** `agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js`  
**Run command:** `bun run test:collect-inline-tasks`

### Pseudocode

```
1. Create temp test files:
   - test_js.js     → with `// ai_todo: "test task A" @ai @context`
   - test_py.py     → with `# ai_todo: "test task B" @ai @week`
   - test_html.html → with `<!-- ai_todo: "test task C" @andrei @today -->`
   - test_inline.js → with `const x = 1; // ai_todo: "inline test" @ai`

2. Run: /collect-inline-tasks <temp_dir>

3. Assert:
   - Tasks were created in tasks.index.jsonc (check by title match)
   - Comment lines were removed from test_js.js, test_py.py, test_html.html
   - For test_inline.js: `const x = 1;` remains, comment portion removed
   - @context task has "(source: <file>:<line>)" in description

4. Cleanup: remove temp test files

5. Print PASS / FAIL per assertion
```

### Additional checks
- Test failure path: corrupt `ai_todo:` line (no prompt text) → task NOT created, comment NOT removed
- Test no-match path: file with no `ai_todo` → reports "No ai_todo comments found"

---

## Risks

- `/create-task` is a skill call, not a direct function — need to verify agent can invoke it mid-skill and receive a task ID back synchronously
- Line removal in files with mixed comment styles must be careful not to corrupt code
- Test setup requires write access to create temp files in the repo

---

## Questions for User

1. Should the skill support `ai_todo` in JSON/JSONC files (using `//` comments)? Current skill says yes — confirm.
2. After removing the comment, should the skill commit the file change, or leave it unstaged?
3. Is the test runner `bun` already configured in `package.json` for `test:collect-inline-tasks`, or does the test script need to be added?
4. Should `/create-task` failures abort the whole run, or silently continue to next comment?
5. What does a "finished" skill look like to you — is it passing the bun test, or also a manual walkthrough?

---

## APPROVED: TRUE
