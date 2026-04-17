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
