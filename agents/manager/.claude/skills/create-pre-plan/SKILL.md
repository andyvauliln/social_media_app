---
name: create-pre-plan
description: Create a new pre-plan for a task with questions, test and steps 
argument-hint: "{task_id}"
user-invocable: 
model: haiku
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# Task Planner
COLLECT ALL NEEDED INFORMATION TO COMPLETE THIS TASK AT BEST

# Examples

```
/create-pre-plan 8
```

---
# CONTEXT

```bash
!bun task-management get-task "$0"
```
```bash
!bun task-management print-team-config
```
```bash
!bun task-management print-documentation
```
(Run this scripts if ! operator not insert it as a context)

# STEPS
1. Make research about current task
2. Fill the plan with provided structure
3. Save file in a agents/manager/data/tasks/in_plan/{assigned_user}.{type}.{github_issue_id}.{status}/{github_issue_id}_plan.{v0}.md

# RULES:
- Don't use any test frameworks prefer just typescript  scripts with a console log to validate
- If v0 file exist and has @notes update this file with notes only donn't recover deleted information 

# PLAN STRUCTURE
**@assigned_agent**: {assigned_agent} `if need udpate any file use agent.dev if reseaerch use agent.knowledge`
**@attached skills**: {assigned_user}
## 1. TESTS
`all tests that you need validate this task`
- manual tests if needs (Should be used only in rare cases when you need some help from human, should be not used at most)
- if you change some function make test for  this function, if already exist make symlink to this test in a task folder. After change run it to make sure it works correctly
- provide short version of every test we need to make

## Proposed subtask
`logical operation that reach one small testable goal that possible to commit`

## 2. QUESTIONS
`all possible question that you ask your self for compliting the task, answer you had, and any of you doubtes, ambiguities   and uncertainties you have during the research and creating a solutions for this task. Make 5- 20 questions, the more then better, don't hesitate to ask questions that may affect descisions, question how to do better, faster`
---
1. How can we better structure skill SKILL.md to match project skill format?
**ai_answer**: The best way to structure skill is...
**user_answer**: 
---

## 3. REASARCH FINDINGS AND INSIGHTS
- include all files that should be updated, added, deleted and files main section, functions 
Example:
PATH: agents/manager/scripts/script.task-management.ts
- add new function get-task-file-tree
- update another functions include detailed loging 

## 4 CURRENT STATE AND LOGIC FOR THE TASK (HOW IT WORKS NOW)
`description how it works now, mark what logic will be affected in case of processing this task`

## WHAT TOOLS, MCP, SKILLS, SUBAGENTS NEEDED TO COMPLETE THIS TASK:
# Attached skills":
- /develope skill

## NOTES FOR THE AGENT WHO WILL DEVEOPE THIS TASK
`notes for development or research agent `
- What additional context it might need
- What tools or scripts it need to use
- What  mcp it need use
- What skills, agents, plugins it need use



```json
{ "ai_file_metadata": {
    "path": "agents/manager/.claude/skills/create-pre-plan/SKILL.md",
    "description": "Skill: create a pre-plan for a task with questions, test and steps",
    "tags": ["skill", "tasks", "create", "planning", "git"]
} }
```
