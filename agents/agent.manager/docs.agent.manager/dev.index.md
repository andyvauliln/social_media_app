## TASK MANAGMENT AGENT


### AS USER I WANT
- Want that it's was wll done synchonisation if defferent dev working

## What need to add in Claude.md
- all developers name working on a table and theirs gihub emails [andrei andy.vaulin@gmail.com main engineer ]


### Task skill and command
`/pick-task` {tags} # @top5priority @today/week/ @project @short basicly what ever 
- pick a task for today and recommendation what to work on
/create-task {prompt}
- ll create task and subtask and put it in a tasks.index.jsonc
/do-task {id}
- shoule create and switch to the new branch
- should create plan
/collect-tasks
- manually or by cron check all files where exist AI_TODO, {name}_todo, ai_research, ai_idea
/make-plan
- plan
/build-plan
-
/add-sub-task {prompt} {root-task-id optional}
-
/add-report
/daily-plan
/weekly-plan
/close "{root-task}-{sub-task}"



### DEV FLOW
0) Choose task with a command /choose-task (it should list show top 5) several tasks which depeloper can choose to process
1) Or Start work on any issue with a command /create-task {prompt} or agents can run it as well
2) Agent will create issue on github with a description and scope of work
3) Save it to our tasks.index.jsonc with filled data provided in a schema and github id
4) Make a plan (should be made as a Skill and command, don't use platorms functionlity in claude or curosr or etc) and put it in a folder tasks and insert curent task object in a plan
5) Developer checking the  plan and test(part of the plan) if need update and running /run-plan
6) AI building first test then task or first subtask
7) Building....In building process can add additional subtask, if some task need some additional human interaction. Looped untill passed tests when passed considred as building


 {
    // GitHub issue ID — set after `gh issue create`
    "github_issue_id": 7,

    "title": "Finish generate-report skill",

    "description": "Complete and finalize the generate-report task skill for the manager workflow. The skill should reliably produce the expected report output shape and integrate cleanly with existing task lifecycle commands. Finishing it reduces manual overhead and keeps task reporting consistent across runs.",

    // Git branch name — format: {type}/{github_issue_id}-{slug}
    "branch_name": "improvement/7-finish-generate-report-skill",

    "branch_github_link": "",

    "pr_id": "",
    "pr_link": "",

    "estimated_time": "2h",

    // pending | planned | in_progress | in_review | done | blocked | cancelled
    "status": "pending",

    // phase_N | week | today
    "when": "phase_1",
    "when_date": "",

    "blocked_reason": "",

    // Folder created only when plan/report generation starts
    "in_plan_task_directory": "",

    "priority": "medium",

    "scope": "agent.manager",

    "tags": ["skill", "generate-report", "agent.manager", "workflow", "improvement"],

    // research | bug | feature | enhancement | idea | update | self_improvement | improvement
    "type": "improvement",

    "context": ".cursor/skills/generate-report-task.manager/SKILL.md",

    "user_input": "finish generate-report skill",

    "sub_tasks": [
      {
        "sub_task_id": 1,
        "commit_id": "",
        "session_id": "",
        "title": "Plan and define improvements for generate-report skill",
        "type": "plan",
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
    "assigned_agent": "agent.manager",

    "is_need_human_confirmation": true,

    "notes": "",

    "platform": "claude",

    "created_at": "2026-04-16T16:30:24Z",
    "created_by": "Andrei",
    "updated_at": "2026-04-16T16:30:24Z",
    "closed_at": ""
  },




  ---
name: create-plan
description: create plan for a task in plan mode
argument-hint: "[task id] [prompt optional] [@v - version of the plan optional]"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
paths: []
shell: bash
hooks: {}
------


# Task Planner
You are a planning specialist for agentic workflows.
Your role is to convert a vague or complex goal into a practical execution plan that another agent can follow reliably.

## CONTEXT

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
console.log(JSON.stringify(task,null,2));
" -- \"$0\"
```
(Run this scripts if ! operator not insert it as a context)


## STEPS

1. Find task by `task_id` in `tasks/tasks.index.jsonc` if not provided with a prompt
2. If not found or not provided — say so and stop
3. Create plan file and save using version-aware naming:
   - Base file: `tasks/in_plan/{assigned_user}.{type}.{github_issue_id}.{status}/{github_issue_id}_plan.md`
   - If base file does not exist or is empty -> write to base file.
   - If base file exists and is not empty -> create next version file:
     - `.../{github_issue_id}_plan_v2.md`
     - `.../{github_issue_id}_plan_v3.md`
     - continue incrementing until first free filename (`vN`).
   - Never overwrite an existing non-empty plan file and don't take them in context or as example.
4. Make research for the task
4. Write a plan with a test section. TEST section required always include it!.   
5. after finishe update task object in a tasks.index.jsonc inlcude new subtasks if they exist and update related fields.
6. Print file path and 3 options to choose 
  1. Start executing plan in a new session
    - should run /do-task {task-id}
  2. Update file with a notes @notes comments or in DEV NOTES section and asnwered questions if they are answered
    - update file plan
    - update  task object in a tasks.index.jsonc with new plan file path
  3. Update with a notes and execute plan in a new session
    - should just update file plan and 
    - update  task object in a tasks.index.jsonc with new plan file path
    - run /do-task {task-id}
  4. Update with a notes in a new version of plan
    - should create new version of plan 
    - update  task object in a tasks.index.jsonc with new plan file path
7. if user asnwered to /do-task run it in a new session with 0 context and print results





# TESTS 
## TEST RULES
- if you work on some code that don't have test yet create them
- absolutely all tasks should have tests. even if it need just human validation should be file where described where and what to check. If this job could be done by AI agent write script that will run this agent with instructions what to do and how to check
- follow best practices of TDD approach.

## EXAMPLES 
---
**path** - `agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js`
**commmand to run** - `bun run test:collect-inline-tasks`
## Pseudocode for subtask 2
- add different style of comments in a test temp files
- run claude on a agent.manager with a skill /collect-inline-tasks
- check if tasks was created as expected base on the comments
- if tasks was created as expected remove comments from the test temp files
- print results

---
**path** - `agents/agent.manager/agent.instagram/agent.instagram.tests/get_instagram_posts.test.py`
**commmand to run** - `python -m unittest test_collect_inline_tasks`
## Pseudocode for subtask 3
- set test params
  @channel: "sasha"
  @date: "2026-04-17"
- run function get_instagram_posts(@channel, @date)
- validate with expected result
  Expected result: 
  posts: [ {
    "post_id": "123",
    "post_title": "test post",
    "post_description": "test description",
    "post_image": "test image",
    "post_video": "test video",
    "post_link": "test link",
    "post_date": "2026-04-17",
    "post_time": "10:00:00",
    "post_likes": 100,
  }]
---


## PLAN STRUCTURE 
## Task Object (jsonc)
Paste the full task object exactly as you get it context from `agents/agent.manager/tasks/tasks.index.jsonc`.
- Do not shorten it.
- Do not drop fields.
- Keep key order and values from source.
- Only update fields that this planning step is allowed to change (for example: `task_directory`, `sub_tasks`, `updated_at`, status-related fields when applicable).
```jsonc
{
   //...current task data
  // Full raw object copied from tasks.index.jsonc for the selected task_id
  // (include every field exactly as in source, fill what you can fill for this fields)
 
  "sub_tasks": [
    {
      //..... current subtask data
      "additional_info":{  // plus include this fields if they are applicable and not required for every subtask. If not applicable and empty no include them in a object. 
        "questions": [], // REQUIRED!!!,  don't hesitate to ask user for more information if needed 5-10 questions. Always ask user how does it looks like finshed version of the task
        "changed_logic": [
            {"old_behavior": "", "new_behavior": "", "why_we_change_it": ""}
          ], 
        
        "changed_files": {"delted": [""], "updated": [""], "created": [""]}, // files that are changed for this task
        "best_practices": [],
        "key_decisions": [],
        "what_we_need_to_know_to_handle_this_task": [], //what it need to know to accomplish this task
        "assumptions": [],
        "constraints": [],
        "risks": [],
        "validation": [],
        "insights": [],
        "problematics_of_current_implementation": [],
        "alternatives": [],
        "edge_cases": [],
        "improvement_ideas": [],
        "test_details": [{}],
         "approach": "",
        "dependencies": [
          {}, //new dependencies that are required for this task. propose different options if they are and explain why 
        ],
        "configuration": [{ // configuration that would be changed for this task

        }],
        "manual_checks": [
          "",
        ],
        "extra": {}// any extra information that need to know for this task or address to developer
      }
    }],
}
```

## Core objective

Produce a plan that is:
- concrete
- ordered
- dependency-aware
- easy to execute
- easy to revise if something fails
- TDD approach should always includes tests to execute even for SKILLS. No need when task is research, design, not developement etc. Any times we change file and changing behaviour we need check if this behaviour is expected and correct.

# Quality Bar
A good plan:
- references real file paths
- uses concrete actions
- Do not over-expand simple tasks.
- surfaces trade-offs
- avoids fluff
- does not over-design simple tasks
- is ready for implementation once approved



## Rules
- don't skip TESTS section
- if it's not first version of plan v2...v4 Don't rellay on the pervious plans, remove it from context and don't take anything from there.
- perform research first
- when asking the questions try asnwer by your self with a best guess
- clarify objectives
- gather required inputs
- remain read-only
- Keep plans short and actionable, no fluff
- Each step = one clear action
- Keep the plan proportional to the task complexity.
- Reference real file paths, not vague descriptions
- Plan versioning is automatic: if a non-empty plan already exists, save to `_plan_v2.md`, then `_plan_v3.md`, ... `_plan_vN.md`
- Never replace a non-empty existing plan file; always create next version.
- AT THE END OF DOCUMENT INCLUDE SECTIONS APPROVED: TRUE, DEV NOTES:



```json
{ "ai_file_metadata": {
    "path": ".claude/skills/create-plan/SKILL.md",
    "description": "Skill: create a structured plan for a task in plan mode.",
    "tags": ["skill", "tasks", "plan"],
} }
```
