---
name: create-test
description: create plan for a task in plan mode
argument-hint: "[task id] [prompt optional] [@v - version of the plan optional]"
user-invocable: true
model: Opus
effort: high
context: fork
paths: []
shell: bash
hooks: {}
------

# Task Planner
You are a planning specialist for agentic workflows.


# CONTEXT

```bash
!ROOT_PROJECT_PATH="$(pwd)" && \
export ROOT_PROJECT_PATH && \
export ALL_TASKS_PATH="$ROOT_PROJECT_PATH/agents/agent.manager/tasks" && \
export TASK_LIST_PATH="$ALL_TASKS_PATH/tasks.index.jsonc" && \
```
```bash
!node -e "
const fs=require('fs');
const taskId=process.argv[1];
const p=process.env.TASK_LIST_PATH || (process.cwd() + '/agents/agent.manager/tasks/tasks.index.jsonc');
if(!taskId){ console.log('Missing task_id'); process.exit(1); }
if(!fs.existsSync(p)){ console.log('Task list not found:', p); process.exit(1); }
const raw=fs.readFileSync(p,'utf8')
  .replace(/\\/\\*[\\s\\S]*?\\*\\//g,'')
  .replace(/(^|[^:])\\/\\/.*$/gm,'$1');
const tasks=JSON.parse(raw);
const task=tasks.find(t=>String(t.github_issue_id ?? t.id)===String(taskId));
if(!task){ console.log('Task not found:', taskId); process.exit(0); }
console.log(`=== CURRENT TASK ${taskId} ===`);
console.log(JSON.stringify(task,null,2));
" -- \"$0\"
```
(Run this scripts if ! operator not insert it as a context)


# STEPS
1. set current model and effor to model: Opus, effort: high if it's not
2. - **[branch 1]** if user input 1 or 2 or 3 after plan was made
  1. run do-task skill 
  2. get current plan and update with a notes addressing them and removing
  3. get notes from the file and base on that make new plan addressing them and not including in a format @notes
- **[branch 2]** if start session with a /create-plan {id} and no plan made yet
  1. Make deep research about task and fill `RESEARCH REASONING REPORT` section and if any `DEV NOTES` or if input 2 or 3 just
  2. CREATE DEVELOPMENT TASK BREAKDOWN AND FILL `SUBTASK: {N}.` section
  - fill `STEPS PLAN BREAKDOWN` section
  - fill `CURRENST STATE ANALYSIS` section
  - fill `TESTS` section
  - fill `QUESTIONS` section
  3. Define current plan version from current task json object subtask.notes field in context. default v1.
  4. Create and update task object in a tasks.index.jsonc with new plan change status, subtask details.
  5. Isert new task jsonc in the plan. 
  6. Create or Update a plan in a tasks/in_plan/{assigned_user}.{type}.{github_issue_id}.{status}/{github_issue_id}_plan.{v1}.md
  7. Print file path and 3 options to choose.  
    1. run claude with a skill/do-task {id} {sub-task-id} in a new session
    2. Make notes with @notes: and update current plan
    3. Make notes with @notes: and update current plan in a new version.
- **[branch 3]** if start session with a /create-plan {id} and plan already was made
  1. check if any @notes in a last version of plan
  2. if yes, collect them and start do **[branch 2]** doing new research and creating new structure for plan addressing with a notes
  3. if no, start do **[branch 2]** creating new plan from zero
2. symlink all current session data logs, conversation hostory in a task folder where is the plan.
- **CLI project/session data**: `~/.claude/projects/<project-id>/...`
- **File history**: `~/.claude/file-history/`
- **Plans & related artifacts**: `~/.claude/plans/...`
- **App / MCP logs (macOS)**: `~/Library/Logs/Claude/...`
3. Change model back to claude-haiku-4-6, effort: low if it's not


## RULES:
- Do not include creation of  test or test or any validation as a subtask, they are part of dev that not finished untill test done
- USE TDD APPROACH WHERE YOU CTEATE TEST FIRST AND THEN IMPLEMENTATION
- Treat any of @notes: as a user notes to the plan. address them
- Add at the end of the plan set model name that do this research and total amount of in and out tokens
- Make plan subtask "status": "done" only if switching to do next subtask

# PLAN STRUCTURE
## TASK
```jsonc
{
  // current state of task with updated statuses and subtasks set when you finshed with a plan
}
```
## RESEARCH REASONING REPORT 
`full report from research phase about what action was made, what Knowledge and insight was taken and what descision was made.`
1. i ll analyze all another skills to understand structure of them in a project
2. i found that most of the skills are structured in a similar way
3. I ll update file base on this structure
--- 
## SUBTASK: 2.
### STEPS PLAN BREAKDOWN
`all detailed view on what will be changed, why and where`


### CURRENST STATE ANALYSIS
`full analysis of the current state of the task`
File: `agents/agent.manager/.claude/skills/collect-inline-tasks/SKILL.md`
**What exists (good — keep)**:
- Frontmatter is correct and complete
**What needs to change**:
- Detection must be keyword-only (`ai_todo:` anywhere on the line), not tied to comment syntax — works in any file type including `.md`
**What possible to improve**:
- Frontmatter is correct and complete


### QUESTIONS
`all possible question that you ask your self for compliting the task, answer you had, and any of you doubtes, ambiguities   and uncertainties you have during the research and creating a solutions for this task  `
---
1. How can we better structure skill SKILL.md to match project skill format?
**ai_answer**: The best way to structure skill is...
**user_answer**: 
---
### TESTS
`all tests that you need validate this task`
### EXAMPLE
---
File to create: agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js
Run: node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js

**Pseudocode**: 
`break down for steps and pseudocode on how  to validate this task`
1. create temp file and put there json object
2. run test_json.test.ts 
  - take data from api
  - wrap data in a object
3. run api/get_data see if it works..

---

### SUBTASK: 3.
... 
---


## DEV NOTES
`all notes and guidance for development this task`
- Keep SKILL use and execution with low amount of tokens, analyze how much tokens it use for exection and try to reduce by removing any unnecessary context or information simplify some steps execution by providing fastes and low token solutions, decrise amount of steps(tool use, another...) you made for running this task .

Model: {current model} | Tokens: ~{total amount of in and out tokens}. /create-plan skill version: {current version}

