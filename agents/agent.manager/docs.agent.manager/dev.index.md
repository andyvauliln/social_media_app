## TASK MANAGMENT AGENT


### AS USER I WANT
- Want that it's was wll done synchonisation if defferent dev working

## What need to add in Claude.md
- all developers name working on a table and theirs gihub emails [andrei andy.vaulin@gmail.com main engineer ]


### Task skill and command
`/list-task` {tags} # @top5priority @today/week/ @project @short basicly what ever 
- list task for today and recommendation what to pick
/create-task {prompt}
- ll create task and subtask and put it in a tasks.index.jsonc
/start-task {id}
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
8) 
9) 

### Tasks folder
tasks
-- tasks.index.jsonc //array of all tasks
-- done
----| {#task-id}.{scope}.type.{assigned_user} //scope it's task scope
-------| plan.md
-------| create-agent.test.symlink.js //symlink to test file, some tasks could not have it or have it just here not in a project
-------| report.md
-------| sessions
----------| {build/plan/report/sub-task/question}


-- today
-- week
-- month
-- next_phase


### report.md
- we need track here what was done, why and some summary
- what was updated in a knowledge base 
- Any notes, suggestions, problems, issues, insights, concerns, doubts, valuable memories or  whatever


### CRONS
- Morning Plan should be run Moning Plan Skill where described what should be done today
- Weekly Plan should be run every week
- cron that will run every 10 min and collect all inline tasks from files and put them in a system

### tasks.index.jsonc schema
{

    "github_issue_id": 1, // incremental start from 1
    "title": "",
    "description": "",
    "branch_name": "",
    "branch_github_link": "",
    "pr_id": "",
    "pr_link": "",
    "estimated_time": "" //ai estimate time
    "status": "", // planed, pending, scheduled,blocked, done, canceled, merged,
    // pending - default state if task untill someone took it in a work
    // 
    "task_directory": "./tasks/{github-issues-id}"??
    "priority": "low, medium, high, urgent"
    "scope": "" //main, github project name, app name or name of the agent
    "when": "" //@now @today @tomorrow @week @month @next_phase
    "tags: [""],  depneds on context and task or situation  github issues also need have this tags.
    type: "", //the main {research, bug, feature, enhancement, idia}
    "sub_tasks": [
        {
            "sub-task-id": 1,
            "commit_id": "",
            "session_id": "",
            "title:": "",
            "type": "" //plan,build,research,report
            "changed_files_relative_paths": [""],
            "is_need_human": true // is need human validation or whatever interaction
            "status": "" // pending | completed | issue | need_human_validation |

        }

    ],
    "is_passed_test": false,
    "run_test_command": "node ./tests/create-agent.js" // could be run of any script or start claude or another agent on a project that validate task completion
    "assigned_user": "", // to understand who working on this task, set when user choosed a task. users should be taken from Claude.md in manager agent. could be user or ai
    "ai_agents":"claude" // claude,cursor,codex...
    "create_at": "",
    "create_by": "", //github email or just ai
    "update_at": ""

}