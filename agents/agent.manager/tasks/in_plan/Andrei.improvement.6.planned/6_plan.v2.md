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
      "title": "Rewrite SKILL.md — add EXAMPLES, CONTEXT !bash with rg scan + excludes, STEPS with reasoning, RULES",
      "type": "implementation",
      "model": "haiku",
      "platform": "claude",
      "is_need_human_confirmation": true,
      "status": "pending"
    },
    {
      "sub_task_id": 3,
      "title": "Create test fixture + test runner: agent.manager.tests/collect-inline-tasks.test.js",
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

1. `collect-inline-tasks/SKILL.md` is a good spec but not an executable agent prompt — missing CONTEXT `!bash`, EXAMPLES, STEPS with reasoning, RULES, OUTPUT sections.
2. Pattern from `do-task` / `create-task`: use `!bash` blocks to bootstrap env paths + inject relevant data at load time.
3. **Line removal approach (user-defined)**: don't delete lines wholesale. Instead read the `ai_todo` line + a few lines above/below for context, then let the AI surgically remove just the `ai_todo:` marker and its params while keeping surrounding code intact — then write back using the Edit tool.
4. **`@c` / `@context` in ai_todo** means: set the `context` field of the created task to the source file path + line number. It does NOT trigger `/create-task @context` param.
5. **Dependency for JSONC parsing**: use `jsonc-parser` from `packages/node.common` — not `scripts/task-helpers.sh`.
6. **CONTEXT `!bash`** should pre-run `rg -n -i 'ai_todo:'` and inject matches directly — but exclude paths: all `SKILL.md` files (used as examples) and `agent.manager.tests/` fixture files.
7. **No `@scope` param** — removed from plan.
8. Test strategy is integration-style: a real fixture file with diverse `ai_todo` styles (including multiline), run skill scoped to fixture, verify task created + comment removed, restore fixture for repeatability.

---

## SUBTASK: 2.

### STEPS PLAN BREAKDOWN

**Goal**: Rewrite `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md` to be fully executable by an AI agent.

1. **Keep frontmatter** — already correct (model: haiku, effort: low, context: fork, shell: bash)

2. **Add EXAMPLES section at top** — concrete invocations:
   ```
   /collect-inline-tasks
   /collect-inline-tasks src/
   /collect-inline-tasks @andrei
   ```

3. **Add CONTEXT `!bash` block** — runs at skill load time:
   - Set `ROOT_PROJECT_PATH`, `TASK_LIST_PATH`
   - Run `rg -n -i 'ai_todo:'` with explicit `--glob '!**/SKILL.md'` and `--glob '!**/agent.manager.tests/**'` excludes
   - Output the match list directly into context so agent can start processing immediately
   - Why: pre-injecting matches avoids an extra tool call in STEPS and keeps the scan centralized with correct excludes

4. **Rewrite STEPS** with reasoning:
   - Step 1: Parse args — extract optional `[path]` to scope the search (why: user may only want to collect from a subfolder)
   - Step 2: Read CONTEXT match list — if empty → report "No ai_todo comments found" and stop (why: fail fast, no wasted iterations)
   - Step 3: For each match:
     a. Read the `ai_todo` line + 3 lines above and below using Read tool (why: need surrounding code to safely edit without breaking formatting)
     b. Parse prompt text and `@params` from the `ai_todo` line
     c. If `@c` or `@context` in params → set `context` field = `"<file>:<line>"` in the create-task call
     d. Call `/create-task "<prompt>" @params`
     e. On success → use Edit tool to remove just the `ai_todo:` marker and its params from the line, keeping any surrounding code. If the entire line is only the comment, remove the line.
     f. On failure → log error, leave comment intact, continue
   - Step 4: Print summary report

5. **Add RULES section**:
   - Never remove comment before task is confirmed created
   - Use Edit tool for file mutation (not sed/fs write)
   - `@c`/`@context` → task `context` field = file:line, not a create-task flag
   - Exclude `SKILL.md` files and `agent.manager.tests/` from scan (they use `ai_todo:` as examples)
   - `jsonc-parser` from `packages/node.common` for any JSONC manipulation — not task-helpers.sh

6. **Add OUTPUT section** — final report format

### CURRENT STATE ANALYSIS

File: `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md`

**What exists (keep)**:
- Frontmatter: correct and complete
- `ai_todo:` syntax table: accurate
- 3-phase workflow shape: scan → process → report
- Comment style examples: comprehensive (`//`, `/* */`, `#`, raw)
- `rg -n -i 'ai_todo:'` detection: keyword-only, correct

**What changes**:
- Add EXAMPLES section at top
- Replace "Setup" prose with `!bash` CONTEXT block that pre-runs `rg` with excludes
- Rewrite STEPS with "why" reasoning
- Change line removal: read context lines → Edit tool (not delete whole line)
- Add `@c`/`@context` → task `context` field clarification
- Add RULES section
- Add OUTPUT section
- Remove `@scope` param (not needed)

### QUESTIONS

1. Should the `!bash` CONTEXT block inject `rg` results even when a `[path]` arg is given?
**ai_answer**: Yes — pre-inject with full-scope scan. In STEPS, if `[path]` arg exists, filter the injected list to only that path prefix. Avoids needing two different `!bash` blocks.

---

### TESTS

Covered by subtask 3 — integration test runs the skill against the fixture file.

---

## SUBTASK: 3.

### STEPS PLAN BREAKDOWN

**Goal**: Create `agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js` — a self-resetting integration-style test that exercises the real skill workflow.

1. **Create the directory** `agents/agent.manager/agent.manager.tests/`

2. **Create fixture file** `agent.manager.tests/fixtures/collect-inline-tasks.fixture.js`:
   - Contains diverse `ai_todo:` styles in realistic code, spread across the file:
     ```js
     // ai_todo: "fix login validation" @ai @today
     
     function login() { /* ... */ }
     
     # ai_todo: "migrate config to YAML" @context
     
     /* ai_todo: "add input validation for email" @ai @week */
     
     ai_todo: "raw style task @andrei"
     
     // ai_todo: "Create new architecture:"
     // 1) Create picture of db schema
     // 2) Create view on API
     // 3) Multiline continuation
     ```
   - This fixture is the "source of truth" — restored after each test run

3. **Create test file** `agent.manager.tests/collect-inline-tasks.test.js`:
   - Step 1: Snapshot fixture file content (to restore later)
   - Step 2: Note current task count in `tasks.index.jsonc`
   - Step 3: Print instructions for the agent running the test:
     - "Run `/collect-inline-tasks agents/agent.manager/agent.manager.tests/fixtures/`"
     - "Then run this script again to verify"
   - Step 4: After skill runs — check:
     - New tasks were created in `tasks.index.jsonc` (count increased)
     - `ai_todo:` lines no longer appear in fixture file
     - Fixture file still has non-todo lines intact
   - Step 5: Restore fixture file from snapshot so test is repeatable

4. **Exit behavior**: exit 0 on all assertions pass, non-zero on first failure with clear message

### CURRENT STATE ANALYSIS

**What needs to be created**:
- `agents/agent.manager/agent.manager.tests/` directory
- `agents/agent.manager/agent.manager.tests/fixtures/collect-inline-tasks.fixture.js`
- `agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js`

**Dependencies**:
- `jsonc-parser` from `packages/node.common` for reading `tasks.index.jsonc`
- Node built-ins (`fs`, `path`, `child_process`) for everything else

### QUESTIONS

1. Should the test auto-run the skill or just verify post-run state?
**ai_answer**: Just verify post-run state. Auto-running would mean the test calls Claude recursively. Instead: test prints what to do, verifies results, restores fixture.

---

### TESTS

Self-validating: `node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js` exits 0 after skill has been run against the fixture.

---

## DEV NOTES

- Use `jsonc-parser` (from `packages/node.common`) for all JSONC reading — not task-helpers.sh
- Line removal via Edit tool (not fs.writeFileSync) — read ±3 lines for context, let AI surgically edit
- CONTEXT `!bash` must exclude `**/SKILL.md` and `**/agent.manager.tests/**` from `rg` scan
- Keep SKILL.md concise — shorter than v1, trim prose, replace with structured blocks
- Fixture file must be restorable — test saves snapshot at start, restores at end

Model: claude-sonnet-4-6 | Tokens: ~9,800 in / ~1,600 out. /create-plan skill version: v1.1
