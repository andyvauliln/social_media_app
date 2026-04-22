## PHASE 0
- setup custom Agentic System that manage and develope this project compatable with different plaforms such as claude (first). cursor, open_router (later)
-

I WANT:

## GENERAL
- That we try develope agents with care about tokens they cosume
- That we have advanced project knowladge base and connect knowledge agent


## HOOKS
-on-file-created
-before-commit
-on-file-updated



## DB
- every agent has own db
- how we will deal with a mergings? should be exclude from merge will be recreated on start from schema. After update db schema script should be also updated. always add examples of rows that need to be created
- all dbs should be symlinked to agents/agent.db/dbs

## GLOBAL SKILLS
- 
##

## AGENTS

## LOGS

## CONFIGS

## APPS

## ENV

## TASK MANAGMENT AGENT
- Want that it's was wll done synchonisation if defferent dev working
## Need to add to Claude.md
- all developers name working on a table and theirs gihub emails [andrei andy.vaulin@gmail.com main engineer ]


### Task skill and command
/choose-task
- list task for today and recommendation what to pick
/create-task {prompt}
- ll create task and subtask and put it in a tasks.index.jsonc
/start-task {id}
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



### DEV FLOW
0) Choose task with a command /choose-task (it should list show top 5) several tasks which depeloper can choose to process
1) Or Start work on any issue with a command /create-task {prompt} or agents can run it as well
2) Agent will create issue on github with a description and scope of work
3) Save it to our tasks.index.jsonc with filled data provided in a schema and github id
4) Make a plan (should be made as a Skill and command, don't use platorms functionlity in claude or curosr or etc) and put it in a folder tasks and insert curent task object in a plan
5) Developer checking the  plan and test(part of the plan) if need update and running /run-plan
6) AI building first test then task or first subtask
7) In building process can add additional subtask, if some task need some additional human interaction


### Tasks folder
tasks
-- tasks.index.jsonc //array of all tasks
-- done
----| {#task-id}.{scope}.type.{assigned_user} //scope it's task scope
-------| plan.md
-------| create-agent.test.symlink.js //symlink to test file, some tasks could not have it or have it just here not in a project
-------| report.md
-------| sessions
----------| {build/plan/report/sub-task/question}.log
-- in_plan
----| {#task-id}.{scope}.type.{assigned_user} // same slug pattern as done/
-------| plan.md
-------| create-agent.test.symlink.js // optional; symlink to test file when applicable
-------| report.md
-------| sessions
----------| {plan/test/build/report/sub-task/question}.log // plan + test work in @plan mode often logged here first



### report.md
- we need track here what was done, why and some summary
- what was updated in a knowledge base 
- Any notes, suggestions, problems, issues, insights, concerns, doubts, valuable memories or  whatever


### CRONS
- Morning Plan should be run Moning Plan Skill where described what should be done today
- Weekly Plan should be run every wekk

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

## GITHUB AGENT
## GITHUB DB AGENT

## SCRIPTS

## TELEGRAM

## CRON TASK
```json
```

## FILE METADATA

## INLINE AI TAGS
- that i can leave AI_RESEARCH or AI_TODO OR {@name}_TODO: and can search by `_todo`
- ai agent which should be run  on a command /collect-notes or by cron
and i want that it run claude with a skill name: collect-notes and let's better not make it on cron let's
collect not should schedule task base on params @now @today @week @month @1h @5m default @now
-

## SYMLINKS
- everything that has in a name symlink should be symlink
- i want that we have some config in a config.project.jsonc and has map everything that need to be linked
- i want that it was script that will link everything that need to linked from config
- i want command and skill where i can validate if everything what has symlink in a name exist in a config and validate is everything in a config has symlink if need run script
- want that this script was present in a init if it's development mode

## INTERACTIONS
- whant that by running init sript in root project was setuped and configured for work
- whant that on a script start in a root i can controll what i am running
default all enabled applications in apps and applications in github projects


## FEATURES
- 

## DEV PROCESS
- clone
- run `npm run init` to start `./script.init.symlink.sh`
- run `npm run start` `./script.start.symlink` to run all from root or run `./script.start.symlink {app-name/agent-name/github-project}}`
- 

## PRODUCTION PROCESS

## KNOWLADGE_BASE `storage for all project documents`
index.jsonc 
- `i want store here all information about all folders and files that are not symlinks`
- `i want that this file was self updated`
- `Should be root claude skill update knowledgegase index and it ll search and get all file metadata ai_file_metadata objects in a knowledge_base` 
- `format is {"file_path: "", "description" "main-points": [{"name":"Tech Stack", "desctiption": "Storing current project stack} ],"}`
-  ``
AGENTS_ARCHITECTURE.md `i want command`
ALL_AGENTS_LIST.md
ALL_COMMANDS_LIST.md
ALL_MCP_LIST.md
ANALITICS.md
CODE_GUIDANCE.md
CRONS.md
CURRENT_COST.md
EXAMPLES.md
PRICSES.md
all-agents
all-commads
all-mcps
all-skills
apis
content-management.symlink
content.symlink
dbs.symlink
docs
logs.symlink
models
project-management.symlink
researches.symlink


# RULES
- prefer use only skill.md 