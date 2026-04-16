# Plan - Task #5

## Task Object (jsonc)
```jsonc
{
  "github_issue_id": 5,
  "title": "Finish collect-inline-tasks skill",
  "status": "in_plan",
  "scope": "agent.manager",
  "type": "feature",
  "context": "agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md",
  "plan_path": "agents/agent.manager/tasks/in_plan/ai.5.agent.manager/5_plan.md",
  "sub_tasks": [
    {
      "sub_task_id": 1,
      "title": "Plan and define completion criteria for collect-inline-tasks skill",
      "type": "plan",
      "status": "completed"
    },
    {
      "sub_task_id": 2,
      "title": "Implement missing workflow and edge-case handling in collect-inline-tasks skill",
      "type": "implementation",
      "status": "pending"
    },
    {
      "sub_task_id": 3,
      "title": "Validate collect-inline-tasks behavior on representative ai_todo comment styles",
      "type": "test",
      "status": "pending"
    }
  ]
}
```

## Short description
- We need to finalize `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md` so inline `ai_todo` comments can be converted into tasks reliably.
- We need to define deterministic parsing and comment-removal behavior to avoid corrupting source lines.
- We need a clear and executable `/create-task` integration path so task creation is consistent per match.
- We need explicit argument behavior for `[path]` and `@scope` to avoid ambiguous search boundaries.
- We need error-handling and continuation rules to prevent partial failures from stopping the batch.
- We need validation coverage across comment styles (`//`, `/* */`, `#`, `<!-- -->`) and mixed inline code+comment cases.

## Questions to better specify approach
- Should `@scope` override `[path]` when both are provided, or should scope be interpreted as a secondary filter within `[path]`?
- For block comments containing multiple `ai_todo` markers, should each marker become a separate task or only one per matched line?
- If `/create-task` returns a non-standard success response, what minimum signal is acceptable before removing a comment?

## Best practices
- Keep scan and processing idempotent: successful entries are removed, failed entries remain for reruns.
- Parse first, mutate later; source edits happen only after confirmed task creation.
- Normalize path handling relative to repository root before building context strings.
- Use precise matching to remove only the processed todo fragment when inline code exists.
- Keep output concise and machine-readable enough for follow-up automation.

## Key Decisions
- Use `rg -n -i 'ai_todo:'` as the canonical discovery mechanism for performance and consistent line capture.
- Process matches strictly one-by-one to preserve clear failure boundaries and deterministic reporting.
- Gate deletion behind success of `/create-task`; never remove comments on parse or execution error.
- Keep the skill itself as the source of truth for syntax, examples, and operational constraints.

## Assumptions
- The environment supports `rg` and can run slash-command workflows in the same session.
- Existing manager skill conventions (`EXAMPLES`, `CONTEXT`, `STEPS`, `RULES`, `OUTPUT`) should be followed.
- Source files can contain different comment styles and mixed formatting that must be preserved.

## Approach
Revise the skill into a strict execution spec: add explicit examples, define runtime context setup, formalize argument and parsing rules, specify `/create-task` invocation behavior, and codify mutation safeguards. Then validate against representative comment forms to ensure no regressions in task creation or file formatting.

## Constraints
- Only task `#5` plan artifacts and task index metadata should change in this planning step.
- Keep instructions short, actionable, and aligned with existing manager skill style.
- Do not introduce unrelated refactors or documentation outside this task workflow.

## Risks
- Overly broad regex/comment stripping can remove real code when comment syntax appears inline.
- Ambiguous `/create-task` invocation semantics may cause inconsistent behavior across agents.
- Mixed multiline comments may produce duplicate or malformed prompts if parsing is not bounded.

## Validation
- Verify the revised skill has all required sections and concrete execution steps.
- Run dry parsing scenarios for each comment style and ensure extracted prompt/params are correct.
- Confirm removal rules preserve non-comment code when comment appears at end-of-line.
- Confirm report output includes both success list and failure list with file references.

## Alternatives
- Implement an external script for scanning and mutation, then keep the skill as a thin wrapper; not chosen to avoid splitting logic across files.
- Remove only full comment lines and skip inline comment fragments; not chosen because it misses valid inline `ai_todo` usage.

## Edge Cases
- Inline code followed by `// ai_todo: ...` on the same line.
- Block comment with trailing code or mixed whitespace.
- Prompt text containing `@` symbols that are part of message text, not params.
- HTML comment todos in template files.
- Duplicate todo content across files in the same run.

