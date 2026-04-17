## TASK

```jsonc
{
  "github_issue_id": 6,
  "title": "Finish collect-inline-tasks skill",
  "status": "planned",
  "type": "improvement",
  "scope": "agent.manager",
  "priority": "medium",
  "assigned_user": "Andrei",
  "assigned_agent": "agent.dev",
  "branch_name": "improvement/6-finish-collect-inline-tasks-skill",
  "in_plan_task_directory": "agents/agent.manager/tasks/in_plan/Andrei.improvement.6.planned",
  "run_test_command": "node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js",
  "sub_tasks": [
    {
      "sub_task_id": 1,
      "title": "Plan and define improvements for collect-inline-tasks skill",
      "type": "plan",
      "status": "done"
    },
    {
      "sub_task_id": 2,
      "title": "Rewrite SKILL.md to match project skill format with CONTEXT, STEPS, RULES, EXAMPLES sections",
      "type": "implementation",
      "model": "haiku",
      "platform": "claude",
      "is_need_human_confirmation": true,
      "status": "pending"
    },
    {
      "sub_task_id": 3,
      "title": "Create test file: agent.manager.tests/collect-inline-tasks.test.js",
      "type": "implementation",
      "model": "haiku",
      "platform": "claude",
      "is_need_human_confirmation": true,
      "status": "pending"
    }
  ]
}
```

---

## RESEARCH REASONING REPORT

1. Read `collect-inline-tasks/SKILL.md` — the current file is a good **spec** but not an executable agent prompt. It documents the `ai_todo:` syntax and a 3-step workflow, but is missing:
  - A `!`-injected CONTEXT block (environment paths, ROOT, etc.)
  - An EXAMPLES section with real invocations
  - A STEPS section with reasoning ("why" not just "what")
  - A RULES section
  - OUTPUT format definition
2. Compared against `do-task/SKILL.md` and `create-task/SKILL.md` — both use:
  - `!bash` blocks to inject `ROOT_PROJECT_PATH`, `TASK_LIST_PATH` etc into context at skill load time
  - Inline `node -e` scripts for task lookup/manipulation
  - Clear STEPS numbered list with actionable reasoning
  - EXAMPLES at the top, RULES at the bottom
3. Checked `scripts/task-helpers.sh` — has `parse_jsonc()` helper, git user detection, and JSONC stripping. The skill should reference this when removing `ai_todo` lines from files using a Node.js script rather than ad-hoc shell. 
  1. @notes don't use task-helper i have common dependensies
    ```json
     "dependencies": { "jsonc-parser": "^3.3.1" }
    ```
4. There is **no test file** at `agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js`. The directory doesn't even exist yet. Tests must be created.
5. The current skill's "detection" approach (`rg -i 'ai_todo:'`) is sound — it correctly uses keyword-only matching independent of comment style. This is good and should be preserved.
6. Key gap: after `/create-task` is called, the skill has no mechanism to wait for task ID confirmation and then do the file edit. The plan must clarify: use Claude's skill invocation result (task ID returned by `/create-task`) as the signal before removing the line.

---

## SUBTASK: 2.

### STEPS PLAN BREAKDOWN

**Goal**: Rewrite `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md` to match the project's established skill format, making it executable by an AI agent without ambiguity.

1. **Add frontmatter** — already correct, keep as-is (model: opus, effort: high, context: fork)
2. **Add EXAMPLES section** — move existing code examples to top, add invocation examples (`/collect-inline-tasks`, `/collect-inline-tasks src/`, `/collect-inline-tasks @andrei`)
3. **Add CONTEXT block** using `!` operator:
  - Set `ROOT_PROJECT_PATH`, `TASK_LIST_PATH`, `AGENT_CONFIG_PATH`
  - Run `rg` detection and output raw match list for the agent to parse
4. **Rewrite STEPS section** — each step must explain WHY:
  - Step 1: Bootstrap env paths (why: agent needs to know where tasks.index.jsonc lives to call /create-task correctly)
  - Step 2: Scan for `ai_todo:` matches (why: ripgrep gives file:line:content, all we need to parse)
  - Step 3: For each match — parse prompt + params, call `/create-task`, on success remove line (why: never remove before confirming task was persisted)
  - Step 4: Report summary
5. **Add RULES section** with edge cases: empty match, failure handling, preserve formatting
6. **Add OUTPUT section** — the final `✓ Collected inline tasks` format

### CURRENT STATE ANALYSIS

File: `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md`

**What exists (good — keep)**:

- Frontmatter is correct and complete (model, effort, context, shell)
- `ai_todo:` syntax table is accurate and well-documented
- Workflow has the right 3-phase shape (scan → process → report)
- Comment style examples are comprehensive (`//`, `/* */`, `#`, raw)
- Detection via `rg -n -i 'ai_todo'` is correct — keyword-only, not comment-syntax-tied

**What needs to change**:

- No `!`-injected CONTEXT block — agent must manually reconstruct env paths
- No EXAMPLES section at the top — agent doesn't see concrete invocations
- STEPS don't explain reasoning ("why") — only describe what to do
- No RULES section (currently mixed into prose)
- "Setup" section uses `ROOT=$(git rev-parse ...)` but doesn't inject it at load time
- File removal step doesn't specify the Node.js approach for safe line deletion

**What's possible to improve**:

- Add `@scope` parameter handling (e.g. `/collect-inline-tasks @andrei` only processes tasks for Andrei) @notes: no need
- Clarify that `/create-task` invocation must pass `@context` source info when `@context` param is in the `ai_todo`
- `@notes @context or just @c would mean that we need attach current file and line where is comment into the task context field`

### QUESTIONS

---

1. Should the CONTEXT `!bash` block pre-run `rg` to inject matches, or just set up env paths? 

**ai_answer**: Just set up env paths (like `do-task` does). Running `rg` in context is premature — the agent should run it in STEPS where it processes results. Pre-injecting all matches could be noisy and waste tokens on files with many hits.
**user_answer**: @notes: yes let's do in a !bash but let's include some files to excludes for example this one and add rule if it detect some file where ai_todo was used as example not task update create-plan skill that it's exlude this path from search

---

1. How should the line removal be implemented safely?

**ai_answer**: Use a Node.js one-liner: read the file, filter out the matching line (by line number from `rg` output), write back. This avoids sed quoting issues and handles all file encodings. Reference `scripts/task-helpers.sh` parse pattern for JSONC-strip as a model.
**user_answer**: @notes i would do it like this. so we find ai_todo and let's take this line and few up and down and when task created ai would just remove task and tag from this line and use tool to insert new updated code

---

1. Should `agent.manager.tests/` directory be created?

**ai_answer**: Yes. The test command in the task is `node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js` — this must exist. Create the dir and the test file.
**user_answer**:  yes

---

### TESTS

File to create: `agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js`
Run: `node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js`

**Pseudocode**:

1. create in a test file different styles of ai_todo in a different lines of code close to each other and far away
  - `// ai_todo: "fix login" @ai @today`
  - `# ai_todo: "migrate config" @context`
  - `ai_todo: "raw style" @andrei`
  - `ai_todo raw style @andrei`
  - `ai_todo Create new architecture:`
  - 1) Create picture of db schema
  - 2) Create view on a api
  - 3) So multiline ai todo
2. run agent with a skill explain him details that he need do search and exclude everything and left only test file
3. check created task if everythin created as expected
4. check if ai_todo was removed from test files
5. insert them again for feature test and that it poossible to run this test again
6. iterate this test untill you reach expected results, reading all types of comments, creating task works well, comments removed 

---

## SUBTASK: 3.

### STEPS PLAN BREAKDOWN

**Goal**: Create `agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js` with the test cases defined above, using Node.js built-ins only (no external test framework).

1. Create `agents/agent.manager/agent.manager.tests/` directory
2. Extract the pure parsing and file-manipulation logic from SKILL.md into testable helper functions (inline in the test file or via a small `lib/` module)
3. Implement test runner with pass/fail counts using `assert`
4. Cover: `parseAiTodo`, `removeLine`, no-match scan, multi-style detection
5. Exit with code 0 on all pass, non-zero on any failure

### CURRENT STATE ANALYSIS

**What exists**:

- No test directory at `agents/agent.manager/agent.manager.tests/`
- No test file

**What needs to be created**:

- `agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js`

### QUESTIONS

---

1. 

---

### TESTS

Self-validating: running `node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js` must exit 0.

---

## DEV NOTES

- Keep `!` context blocks minimal — only inject what the agent needs to start. Don't pre-run `rg` in context.
- The SKILL.md rewrite should be shorter than the current version, not longer — remove the "Setup" section prose and replace with a `!bash` block.
- TDD: test file (subtask 3) should ideally be written first to define the contract, then SKILL.md updated to match.
- The `removeLine` implementation in the skill should use `fs.readFileSync` + line-index splice + `fs.writeFileSync` — not `sed` — for cross-platform safety.

Model: claude-sonnet-4-6 | Tokens: ~8,200 in / ~2,100 out. /create-plan skill version: v1.1