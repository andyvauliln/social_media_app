## TASK

```jsonc
{
  "github_issue_id": 6,
  "title": "Finish collect-inline-tasks skill",
  "status": "in_progress",
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
      "status": "done"
    },
    {
      "sub_task_id": 3,
      "title": "Create test file: agent.manager.tests/collect-inline-tasks.test.js",
      "type": "implementation",
      "model": "haiku",
      "platform": "claude",
      "is_need_human_confirmation": true,
      "status": "done"
    },
    {
      "sub_task_id": 4,
      "title": "Fix CONTEXT rg excludes (add *.md), run integration test end-to-end, validate skill works",
      "type": "validation",
      "model": "sonnet",
      "platform": "claude",
      "is_need_human_confirmation": true,
      "status": "pending"
    }
  ]
}
```

---

## RESEARCH REASONING REPORT

1. Read current `SKILL.md` - well-structured with EXAMPLES, CONTEXT `!bash`, ai_todo syntax table, STEPS with reasoning, RULES, OUTPUT. Matches project skill format from `do-task` and `create-task`.
2. Read current test file `collect-inline-tasks.test.js` - two-phase integration test (snapshot/verify). Logic is sound.
3. Read fixture file - contains 8 diverse `ai_todo` styles including multiline.
4. Ran `rg -n -i 'ai_todo'` on full codebase excluding SKILL.md, tests, jsonc, json - found 6 real matches in `script.init.sh`, `scripts/script.clone-github-projects.sh`, `apps/telegram-bot/main.py`.
5. Noticed the CONTEXT `!bash` block in SKILL.md does NOT exclude `*.md` files. This means plan docs containing `ai_todo` examples would show in the scan. Need to add `--glob '!**/*.md'` to the rg command.
6. All subtasks 1-3 marked done in tasks.index.jsonc, but `is_passed_tests: false` - the skill was never actually run end-to-end against the fixture to confirm it works.
7. The test runner (`phase 1`) confirms 8 ai_todo lines in fixture, 1 task in index. Ready for a real validation run.

---

## SUBTASK: 4.

### STEPS PLAN BREAKDOWN

**Goal**: Fix a minor gap in the rg exclude list, then run the full integration test to confirm the skill works end-to-end.

1. **Add `*.md` exclude to CONTEXT `!bash` block** in `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md`
   - Why: Plan docs (`6_plan.v1.md`, etc.) contain `ai_todo` as examples. Without this exclude, the skill would try to process plan documentation lines as real tasks.
   - Change: Add `--glob '!**/*.md'` to the rg command in the CONTEXT block.

2. **Run integration test Phase 1**:
   ```bash
   node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js
   ```
   - Why: Creates a snapshot of the fixture file and shows current task count - sets up the verification baseline.

3. **Run the skill scoped to fixture folder**:
   ```
   /collect-inline-tasks agents/agent.manager/agent.manager.tests/fixtures/
   ```
   - Why: Exercises the full workflow - scan, parse, create-task calls, line removal via Edit tool.

4. **Run integration test Phase 2**:
   ```bash
   node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js --verify
   ```
   - Why: Validates all ai_todo lines removed, non-todo lines preserved, fixture restored for repeatability.

5. **If test passes** -> set `is_passed_tests: true` in `tasks.index.jsonc`, mark subtask 4 as done, change task status to `in_review`.

### CURRENT STATE ANALYSIS

File: `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md`

**What exists (good - keep)**:
- Frontmatter: model: claude-haiku-4-6, effort: low, context: fork, shell: bash
- EXAMPLES section with 3 invocations
- CONTEXT `!bash` block that sets ROOT and runs rg with excludes for SKILL.md, tests, jsonc, json
- ai_todo syntax table with supported comment styles
- STEPS with reasoning (parse args, check matches, for-each with read/parse/create/remove, report)
- RULES section covering safety, Edit tool usage, @c/@context semantics, excludes, jsonc-parser
- OUTPUT section with expected format

**What needs to change**:
- CONTEXT `!bash` rg command missing `--glob '!**/*.md'` exclude
- That is the only code change needed

**What remains for task completion**:
- End-to-end validation run (never done yet)
- `is_passed_tests` still false

### QUESTIONS

---
1. Is `--glob '!**/*.md'` the right exclude or should specific plan paths be excluded?

**ai_answer**: `--glob '!**/*.md'` is correct. Markdown files should never contain real `ai_todo` tasks - they only reference it as documentation/examples. Excluding all `.md` is safe and forward-compatible.

---
2. Should the test verify exact task count increase?

**ai_answer**: No. The fixture has 8 ai_todo lines but some are multiline continuations (lines 24-27 are one logical todo). The exact count depends on how the skill handles multiline. The test correctly checks that `ai_todo` lines are gone and non-todo lines are preserved - that's sufficient.

---

### TESTS

File: `agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js`
Run: `node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js --verify`

**Pseudocode**:
1. Phase 1 creates snapshot, records task count
2. Skill runs against fixture (manual step between phases)
3. Phase 2 verifies:
   - All ai_todo lines removed from fixture (count 0)
   - Non-ai_todo lines identical to snapshot
   - Task count increased (logged for manual verification)
4. Fixture restored from snapshot for repeatability

---

## DEV NOTES

- Only 1 line of code needs changing in SKILL.md (add `--glob '!**/*.md'` to rg)
- The real work is the validation run - running the skill against the test fixture
- If the skill fails on multiline todos (lines 24-27 in fixture), that's a known edge case to document, not block on
- After validation passes, task can move to `in_review` -> `done`

Model: claude-opus-4-6 | Tokens: ~28,000 in / ~3,200 out. /create-plan skill version: v1.1
