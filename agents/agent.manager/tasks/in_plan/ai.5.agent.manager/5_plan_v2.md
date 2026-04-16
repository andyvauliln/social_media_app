# Plan - Task #5 (v2)

## Task Object (jsonc)
```jsonc
{
  "github_issue_id": 5,
  "title": "Finish collect-inline-tasks skill",
  "description": "Complete the collect-inline-tasks skill for agent.manager. The skill file exists but needs to be reviewed, tested, and finished — verifying ai_todo scanning logic, /create-task integration, comment removal from source files, and handling all edge cases (multi-line comments, inline code + comment, all comment styles).",
  "branch_name": "feature/5-finish-collect-inline-tasks-skill",
  "branch_github_link": "https://github.com/andyvauliln/social_media_app/issues/5",
  "pr_id": "",
  "pr_link": "",
  "estimated_time": "2h",
  "status": "in_plan",
  "when": "week",
  "when_date": "",
  "blocked_reason": "",
  "task_directory": "agents/agent.manager/tasks/in_plan/ai.5.agent.manager",
  "priority": "medium",
  "scope": "agent.manager",
  "tags": ["collect-inline-tasks", "skill", "agent-manager", "workflow", "inline-tasks"],
  "type": "feature",
  "context": "agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md",
  "user_input": "finish collect inline task skill",
  "sub_tasks": [
    {
      "sub_task_id": 1,
      "commit_id": "",
      "session_id": "",
      "title": "Plan and define completion criteria for collect-inline-tasks skill",
      "type": "plan",
      "model": "haiku",
      "platform": "claude",
      "changed_files_relative_paths": [
        "agents/agent.manager/tasks/in_plan/ai.5.agent.manager/5_plan_v2.md"
      ],
      "is_need_human_confirmation": true,
      "blocked_reason": "",
      "notes": "v2 planning pass with explicit execution and validation details.",
      "status": "completed"
    },
    {
      "sub_task_id": 2,
      "commit_id": "",
      "session_id": "",
      "title": "Implement missing workflow and edge-case handling in collect-inline-tasks skill",
      "type": "implementation",
      "model": "haiku",
      "platform": "claude",
      "changed_files_relative_paths": [
        "agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md"
      ],
      "is_need_human_confirmation": true,
      "blocked_reason": "",
      "notes": "",
      "status": "pending"
    },
    {
      "sub_task_id": 3,
      "commit_id": "",
      "session_id": "",
      "title": "Validate collect-inline-tasks behavior on representative ai_todo comment styles",
      "type": "test",
      "model": "haiku",
      "platform": "claude",
      "changed_files_relative_paths": [],
      "is_need_human_confirmation": true,
      "blocked_reason": "",
      "notes": "",
      "status": "pending"
    }
  ],
  "is_passed_tests": false,
  "run_test_command": "",
  "assigned_user": "Andrei",
  "is_need_human_confirmation": true,
  "notes": "Plan v2 created to avoid overwriting existing non-empty 5_plan.md.",
  "platform": "claude",
  "created_at": "2026-04-16T00:00:00Z",
  "created_by": "Andrei",
  "updated_at": "2026-04-16T12:00:00Z",
  "closed_at": "",
  "approach": "Tighten the existing skill into a deterministic, parse-first and mutate-after workflow where every ai_todo match is processed individually and comment removal happens only after a successful /create-task call.",
  "current_behavior": "The skill defines a basic workflow and syntax but leaves important ambiguities in path scoping, parser tolerance, comment-removal behavior for inline code, and robust failure reporting across mixed comment styles.",
  "new_behavior": "The finalized skill will define explicit parsing rules, clear [path]/@scope precedence, strict success-gated comment removal (line delete vs inline fragment delete), and edge-case handling for //, /* */, #, and <!-- --> while continuing after per-item failures.",
  "questions": [
    "Should @scope narrow [path] or override it when both are provided?",
    "If one comment includes multiple ai_todo markers, should they become separate tasks?",
    "Should duplicate prompts across files be de-duplicated or kept as distinct tasks?",
    "For @context, should source references always be appended or only when missing in prompt?",
    "What exact create-task success signal should be required before source mutation?",
    "Should malformed ai_todo lines be reported as warnings or hard failures?",
    "Should block-comment ai_todo be normalized into single-line prompt text before create-task?",
    "How should escaped quotes inside prompt text be parsed and preserved?",
    "Is dry-run mode required for validation without mutating files?",
    "Should collected tasks be sorted by path/line before processing to guarantee stable order?"
  ],
  "changed_files": {
    "delted": [],
    "updated": [
      "agents/agent.manager/tasks/tasks.index.jsonc"
    ],
    "created": [
      "agents/agent.manager/tasks/in_plan/ai.5.agent.manager/5_plan_v2.md"
    ]
  },
  "best_practices": [
    "Use rg -n -i as canonical discovery and preserve file:line metadata.",
    "Keep processing idempotent: failed entries stay untouched for reruns.",
    "Parse first and stage source edits only after downstream success.",
    "Preserve formatting by deleting only the matched comment fragment when code precedes it.",
    "Produce concise machine-readable success/failure reporting."
  ],
  "key_decisions": [
    "Versioned plan file naming is used because 5_plan.md already exists and is non-empty.",
    "The plan keeps implementation centered in the skill file instead of adding external scripts.",
    "Validation targets representative comment styles and mixed inline/comment patterns.",
    "Failure handling is per-entry and non-blocking to maximize batch completion."
  ],
  "i_need_to_know": [
    "Final expected create-task command shape for prompt + params forwarding.",
    "Whether task creation responses are structured enough for deterministic success checks.",
    "Accepted parameter vocabulary and ownership/scheduling mapping rules."
  ],
  "assumptions": [
    "The runtime supports rg and repository-root path resolution.",
    "The manager workflow expects one create-task call per ai_todo item.",
    "Task #5 remains in planning state until implementation is approved."
  ],
  "constraints": [
    "Do not overwrite existing non-empty plan files.",
    "Keep scope limited to task #5 planning artifacts and index metadata.",
    "No implementation changes are made in this planning step."
  ],
  "risks": [
    "Over-aggressive comment stripping can remove adjacent code.",
    "Ambiguous parsing can mis-handle multiline or quoted prompt payloads.",
    "Inconsistent create-task success detection can lead to accidental comment deletion."
  ],
  "validation": [
    "Check each required skill section is explicit and executable.",
    "Dry-parse sample ai_todo lines across comment styles.",
    "Verify removal logic keeps non-comment code intact on inline matches.",
    "Ensure output reports both successes and failures with file references."
  ],
  "alternatives": [
    "Move scanning/mutation to standalone script and keep skill as wrapper (rejected for now to avoid split source of truth).",
    "Support only full-line comments and skip inline fragments (rejected because valid inline todo usage would be missed)."
  ],
  "edge_cases": [
    "Code + // ai_todo on the same line.",
    "Block comment containing ai_todo with surrounding non-todo text.",
    "Prompt text with embedded @ symbols not intended as params.",
    "HTML comment ai_todo markers in template files.",
    "Duplicate ai_todo prompts in different files."
  ],
  "improvement_ideas": [
    "Add optional dry-run mode for preview-only collection.",
    "Add summary counts by assignee/priority/time-window params.",
    "Add parser fixtures as examples directly in the skill for regression checking."
  ],
  "test_details": [
    {
      "path": "agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md",
      "goal": "Verify workflow instructions are complete and deterministic."
    },
    {
      "path": "agents/agent.manager/tasks/in_plan/ai.5.agent.manager/5_plan_v2.md",
      "goal": "Verify plan captures actionable implementation and validation steps."
    }
  ],
  "dependencies": [
    "ripgrep (rg) for discovery; existing repo dependency."
  ],
  "configuration": [
    {
      "file": "agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md",
      "change": "Clarify argument handling, parser rules, and success-gated mutation behavior."
    }
  ],
  "manual_checks": [
    "Run skill against a small fixture with //, /* */, #, and <!-- --> ai_todo forms.",
    "Confirm created tasks match expected prompt + params mapping.",
    "Confirm only successful entries are removed from sources.",
    "Confirm inline code remains untouched after comment-fragment removal."
  ],
  "extra": {
    "plan_version": 2,
    "reason_for_version_bump": "Existing 5_plan.md is non-empty and must not be overwritten."
  }
}
```

## Steps
1. Update `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md` to define strict argument behavior for `[path]` and optional `@scope`.
2. Add explicit parsing rules for prompt text, params extraction, escaped quotes, and multiline/block-comment handling.
3. Define deterministic `/create-task` invocation format (prompt + forwarded params + optional `@context` source suffix).
4. Define success criteria from `/create-task` output and gate source mutation strictly on success.
5. Specify removal behavior for full-line comments versus inline comment fragments while preserving code formatting.
6. Add failure-handling rules to continue processing and collect per-entry error details.
7. Add concise report contract listing created tasks and failed entries with source references.
8. Validate workflow against representative examples for all supported comment styles and inline code/comment combinations.

## Test Details
**path** - `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md`
## Pseudocode for test validation
```python
def test_validation(path):
    samples = [
        '// ai_todo: "rename field" @ai @context',
        'const x = 1; // ai_todo: "extract const" @week',
        '/* ai_todo: "add validation" @today */',
        '# ai_todo: "cleanup config" @andrei',
        '<!-- ai_todo: "remove dead markup" @high -->',
    ]
    for s in samples:
        parsed = parse_ai_todo(s)
        assert parsed.prompt
        assert isinstance(parsed.params, list)
```

**path** - `agents/agent.manager/tasks/in_plan/ai.5.agent.manager/5_plan_v2.md`
## Pseudocode for test validation
```python
def test_validation2(path):
    plan = read_plan(path)
    assert plan["github_issue_id"] == 5
    assert len(plan["sub_tasks"]) >= 3
    assert "manual_checks" in plan
```
