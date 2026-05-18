#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git -C "$(dirname "$0")/../../.." rev-parse --show-toplevel)"
cd "$ROOT"

ISSUE_URL=$(gh issue create \
  --title "Make create-github-repo-index skill" \
  --body "$(cat <<'EOF'
## Description
Implement the `create-github-repo-index` skill so it creates GitHub project index documentation about a project. The skill stub exists at `.claude/skills/create-github-repo-index/SKILL.md` but currently only contains a placeholder prompt; flesh out CONTEXT, STEPS, RULES, and working shell/scripts per project skill conventions.

**Type:** self_improvement | **Priority:** medium | **When:** today
**Scope:** main | **Estimated:** 2h
**Assigned:** ai
**Assigned Agent:** main

## Tags
skill, github, repo-index, documentation, self_improvement

## Context
.claude/skills/create-github-repo-index/SKILL.md:14
EOF
)" 2>&1) || true

if [[ "$ISSUE_URL" =~ https://github.com/.*/issues/([0-9]+) ]]; then
  ISSUE_ID="${BASH_REMATCH[1]}"
else
  ISSUE_ID=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$' || true)
fi

if [[ -z "${ISSUE_ID:-}" ]]; then
  echo "Failed to create GitHub issue. Output: $ISSUE_URL" >&2
  exit 1
fi

echo "github_issue_id=$ISSUE_ID"

WHEN_DATE="2026-05-18"
BRANCH_NAME="self_improvement/${ISSUE_ID}-make-create-github-repo-index-skill"
SLUG="ai.self_improvement.${ISSUE_ID}.planned"
PLAN_DIR="agents/manager/data/tasks/in_plan/${SLUG}"

TASK_JSON=$(cat <<EOF
{
  "github_issue_id": ${ISSUE_ID},
  "title": "Make create-github-repo-index skill",
  "description": "Implement the create-github-repo-index skill so it generates GitHub project index documentation for a repository. The skill file exists as a stub with only a placeholder line; complete CONTEXT, STEPS, RULES, EXAMPLES, and any supporting scripts so agents can invoke it reliably from the project root.",
  "branch_name": "${BRANCH_NAME}",
  "branch_github_link": "",
  "pr_id": "",
  "pr_link": "",
  "estimated_time": "2h",
  "status": "pending",
  "when": "today",
  "when_date": "${WHEN_DATE}",
  "blocked_reason": "",
  "in_plan_task_directory": "${PLAN_DIR}",
  "priority": "medium",
  "scope": "main",
  "tags": ["skill", "github", "repo-index", "documentation", "self_improvement"],
  "type": "self_improvement",
  "context": ".claude/skills/create-github-repo-index/SKILL.md:14",
  "user_input": "make this skill",
  "sub_tasks": [
    {
      "sub_task_id": 1,
      "commit_id": "",
      "session_id": "",
      "title": "Plan and define create-github-repo-index skill behavior",
      "type": "plan",
      "model": "haiku",
      "platform": "claude",
      "plan_path": "${PLAN_DIR}/${ISSUE_ID}_plan.v1.md",
      "is_need_human_confirmation": true,
      "blocked_reason": "",
      "notes": "",
      "status": "pending"
    }
  ],
  "is_passed_tests": false,
  "run_test_command": "",
  "assigned_user": "ai",
  "assigned_agent": "main",
  "is_need_human_confirmation": true,
  "notes": "Inline collected",
  "platform": "claude",
  "created_by": "ai",
  "closed_at": ""
}
EOF
)

npm run task-management -- create-task "$TASK_JSON"
npm run task-management -- sync-tasks

echo "TASK_TITLE=Make create-github-repo-index skill"
echo "DONE github_issue_id=${ISSUE_ID}"
