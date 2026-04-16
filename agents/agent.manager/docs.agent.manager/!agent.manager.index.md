# Task Structure

```jsonc
{
    // GitHub issue ID — set after `gh issue create` set when task is created.
    // null until then; becomes an integer once created.
    "github_issue_id": null,

    // Concise task title, ≤ 80 chars.
    "title": "",

    // 2–4 sentences: what needs to be done and why.
    "description": "",

    // Git branch name — format: {type}/{github_issue_id}-{slug}
    // Must be git-safe: lowercase, hyphens, no spaces.
    // Derived once github_issue_id is known.
    "branch_name": "",

    // URL to the branch on GitHub (populated when task is created).
    "branch_github_link": "",

    // Pull request number (set when PR is opened).
    "pr_id": "",

    // URL to the pull request on GitHub. (set when PR is opened).
    "pr_link": "",

    // AI time estimate for completing the task.
    // Format: "30m" | "2h" | "1d"
    "estimated_time": "",

    // Task lifecycle stage.
    // pending       — created, not yet planned or started
    // planned       — plan task's field when: @today @week
    // in_progress   — at least one sub-task is in_progress
    // in_review     — any sub-task that waiting confirmation
    // done          — fully completed (no open PR or PR merged)
    // blocked       — all active sub-tasks are blocked
    // cancelled     — task abandoned
    "status": "pending",

    // Scheduling bucket — answers "when should this be worked on?"
    // Promoted over time by /sync-tasks as deadlines approach.
    // phase_N  — future phase (e.g. "phase_1", "phase_2")
    // week     — this week
    // today    — must be done today
    // set base on create task params or by week or day scheduled ai manager planing
    //
    "when": "",

    // Optional specific date alongside `when`.
    // Format: YYYY-MM-DD. Set when user provides @tomorrow or @DD.MM.YYYY.
    // Empty string when no specific date is given.
    "when_date": "",

    // Reason the task is blocked. Set when status is "blocked".
    // Cleared (set to "") when the task is unblocked.
    "blocked_reason": "",

    // Relative path to the task folder under tasks/in_plan/.
    // Folder exists only when a plan or report is created.
    // Format: "./tasks/in_plan/{slug}"
    // Slug format: "{assigned_user}.{type}.{github_issue_id}.{status}"
    "in_plan_task_directory": "",

    // Urgency level.
    // low | medium | high | urgent
    "priority": "",

    // Best-matching project/app/agent scope.
    // Examples: "main" - entrire project, "app.dashboard", "agent.manager", "app.mobile"
    "scope": "",

    // 2–5 short descriptive tags.
    "tags": [],

    // Task category — determines label on the GitHub issue.
    // research | bug | feature | enhancement | idea | update | self_improvement | improvement
    "type": "",

    // @context paths provided by the user, or empty string.
    // Example: "./apps/mobile/src/login.tsx @logout.tsx"
    "context": "",

    // Original prompt exactly as the user typed it.
    "user_input": "",

    // Ordered list of sub-tasks.
    // Exactly one sub-task is created at task creation time.
    // Additional sub-tasks are appended by /start-task after plan confirmation.
    "sub_tasks": [
        {
            // Sequential integer ID within this task (starts at 1).
            "sub_task_id": 1,

            // Git commit hash produced by this sub-task (empty until committed).
            "commit_id": "",

            // AI/agent session ID that executed this sub-task (empty until started).
            "session_id": "",

            // Short description of what this sub-task does.
            "title": "",

            // Sub-task category.
            // plan | research | implementation | review | test | fix | chore
            "type": "plan",

            // AI model used to execute this sub-task.
            // Examples: "haiku", "sonnet", "opus"
            "model": "haiku",

            // Platform that ran this sub-task.
            // claude | cursor | github-actions
            "platform": "claude",

            // Relative paths of files modified by this sub-task.
            "changed_files_relative_paths": [],

            // Whether a human must review and approve before this sub-task is closed.
            // true for human-assigned tasks with generated plans (awaiting review)
            // false for AI tasks or tasks with @no_plan
            "is_need_human_confirmation": true,

            // Reason this sub-task is blocked. Cleared when unblocked.
            "blocked_reason": "",

            // Free-form notes about this sub-task.
            "notes": "",

            // Sub-task lifecycle stage.
            // pending         — not yet started
            // in_progress     — currently being worked on
            // in_review — done but needs human approval
            // done            — completed and accepted
            // blocked         — cannot proceed, reason in blocked_reason
            // cancelled       — abandoned
            "status": "pending"
        }
    ],

    // Whether all automated tests for the task have passed.
    "is_passed_tests": false,

    // Shell command used to run tests for this task.
    // Example: "bun test apps/mobile/src/login.test.ts"
    "run_test_command": "",

    // Who is responsible for executing this task.
    // "ai"          — if tag @ai, it's mean will be done automaticly without user
    // "<user_name>" — a specific human team member (must match team[].name in config)
    "assigned_user": "",
    // Agent that will execute this task
    // "main"          — root AI agent will pick it up
    // "<user_name>" — a specific human team member (must match team[].name in config)
    // "specifi ai agent" — agent.dev if it's development task, agent.db, agent.knowledgebase, agent.logs,
    //                      if research assigned agent agent.knowledgebase 
    "assigned_agent": "",

    // Whether this task requires human confirmation at any point.
    // true  — assigned to a human user (not ai), OR any sub-task has is_need_human_confirmation: true
    // false — assigned_user is "ai" AND all sub-tasks are fully automated (no confirmation needed)
    // Meaning: even if sub-tasks are not yet defined, set true for human-assigned tasks.
    // A fully automated AI task (no human touchpoints anywhere) is the only case for false.
    "is_need_human_confirmation": false,

    // Free-form notes about the task (decisions, caveats, links).
    "notes": "",

    // Platform that created the task.
    // claude | cursor | github-actions
    "platform": "claude",

    // UTC ISO 8601 timestamp when the task was created.
    // Format: YYYY-MM-DDThh:mm:ssZ
    "created_at": "",

    // Git user name (or "ai") who created the task.
    // Matched from git config user.email against team[].email in config.manager.jsonc.
    "created_by": "",

    // UTC ISO 8601 timestamp of the last modification.
    "updated_at": "",

    // UTC ISO 8601 timestamp when the task was closed (status → done or cancelled).
    // Empty string while the task is still open.
    "closed_at": ""
}
```

## File structure reference

```
tasks/
├── tasks.index.jsonc
├── in_plan/
│   ├── week.jsonc
│   ├── ai.today.jsonc
│   ├── andrei.today.jsonc
│   └── <slug>/                    # slug = "{assigned_user}.{github_issue_id}.{type}.{status}"
│       ├── plan.md
│       ├── {github_issue_id}.report.md
│       ├── {sub-task-id}.report.md
│       └── attached_file_*.jpeg
└── done/
    └── <github_issue_id>/
```
