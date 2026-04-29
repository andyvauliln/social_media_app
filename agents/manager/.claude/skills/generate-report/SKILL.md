---
name: generate-report
description: Generate report for a task in report mode
argument-hint: "[task id] [sub-task-id optional] [prompt optional]"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

## Steps

1) get task from agents/manager/data/tasks/tasks.index.jsonc by task_id
2) if task is not found say that task not found
3) if task is found than generate report for it or sub-task if sub-task-id is provided. if sub task is not provided generate report for the main task
4) save report to agents/manager/data/tasks/in_plan/{assigned_user}.{github_issue_id}.{status}/{sub-task-id?}.report.md
5) say that report is created and provide path to the report

# Report Structure
{
    "commit_id": "commit_id",
    "session_id": "session_id",
    "tokens_used: "",
    "model": "model used to generate the report",
    "related_logs": [
        {
            "log_path": "log_path",
            "log_content": "log_content"
        }
    ],
    "changes": [
        {
            "file_path": "file_path",
            "status": "added", "modified", "deleted", "renamed",
            "reason": "reason for the change",
            "what_changed": ["update function addtokens for better performance"] if modified or added

        }
    ],
    test_results: [
        {
            "test_name": "test_name",
            "test_description": "test_description",
            "test_result": "passed", "failed",
            "test_file_path": "test_file_path",
        }
    ],
    "notes": "notes for the report",
    "suggestions": "suggestions for the report",
    "issues": "issues for the report",
    "insights": "insights for the report",
    "concerns": "concerns for the report",
    "doubts": "doubts for the report",
    "valuable_memories": "valuable_memories for the report",
    "whatever": "whatever for the report",
}




```json
{ "ai_file_metadata": {
    "path": ".claude/skills/generate-report/SKILL.md",
    "description": "Skill: generate a report for a task in report mode.",
    "tags": ["skill", "tasks", "report"],
} }
```