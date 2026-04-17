---
name: do-task
description: Starting task by it id or sub id
argument-hint: "{task-id} {sub-task-id optional} {prompt optional} @context @ai"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# EXAMPLES
```js
/do-task 12
/do-task 12 2
/do-task 12 2 "Let's try do instead of..."
/do-task 12 2 Let's try do instead of...
/do-task 12 @ai // execute without confirmation if was marked need-human
/do-task 12 @context or @c login.tsx @logout.tsx  
```

---
# CONTEXT

## Path Setup

```bash
!ROOT_PROJECT_PATH="$(pwd)" && \
export ROOT_PROJECT_PATH && \
export ALL_TASKS_PATH="$ROOT_PROJECT_PATH/agents/agent.manager/tasks" && \
export TASK_LIST_PATH="$ALL_TASKS_PATH/tasks.index.jsonc" && \
export AGENT_CONFIG_PATH="$ROOT_PROJECT_PATH/agents/agent.manager/config.manager.jsonc" && \
export DOCS_AGENT_MANAGER_PATH="$ROOT_PROJECT_PATH/agents/agent.manager/docs.agent.manager/!index.md" && \
echo "ROOT_PROJECT_PATH=$ROOT_PROJECT_PATH" && \
echo "ALL_TASKS_PATH=$ALL_TASKS_PATH" && \
echo "TASK_LIST_PATH=$TASK_LIST_PATH" && \
echo "AGENT_CONFIG_PATH=$AGENT_CONFIG_PATH"
echo "AGENT_CONFIG_CONTENT=$(cat "$AGENT_CONFIG_PATH")"
echo "MAIN_DOCUMENTATION_FILE=$(cat "$DOCS_AGENT_MANAGER_PATH")"
```
## Task Context

```bash
!echo "=== TASK CONTEXT ===" && \
node -e "
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const taskId = process.argv[1];
const tasksFile = process.env.TASK_LIST_PATH;
if (!tasksFile) { console.error('TASK_LIST_PATH unset — run the path setup ! block in this shell first'); process.exit(1); }
if (fs.existsSync(tasksFile)) {
  const raw = fs.readFileSync(tasksFile, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  try {
    const gitUserEmail = execSync('git config --get user.email', { encoding: 'utf8' }).trim();
    const gitUserName = execSync('git config --get user.name', { encoding: 'utf8' }).trim();
    const githubNameFromEmail = (gitUserEmail.split('@')[0] || '').trim();
    const githubName = githubNameFromEmail || gitUserName || 'unknown';
    console.log('CURENT DEV USER GITHUB NAME:', githubName);
    console.log('CURENT DEV USER EMAIL:', gitUserEmail || 'unknown');
    console.log('');

    const tasks = JSON.parse(raw);
    const task = tasks.find(t => String(t.id) === String(taskId));
    console.log('Current Task:');
    console.log(task ? JSON.stringify(task, null, 2) : 'Task ' + taskId + ' not found');
    if (!task) process.exit(0);

    console.log('');
    console.log('=== PLAN CONTEXT ===');
    const root = process.env.ROOT_PROJECT_PATH || process.cwd();
    const assignedUser = String(task.assigned_user || '').trim();
    const githubUserId = String(task.github_user_id || '').trim();
    const status = String(task.status || '').trim();
    const type = String(task.type || '').trim();
    if (!assignedUser || !githubUserId || !status) {
      console.log('Missing one of required fields: assigned_user, github_user_id, status');
      process.exit(0);
    }
    const planDir = path.resolve(root, 'agents/agent.manager/tasks/in_plan', assignedUser + '.' + type + '.' + githubUserId + '.' + status);
    const planPath = path.join(planDir, githubUserId + '_plan.md');
    if (!fs.existsSync(planDir)) fs.mkdirSync(planDir, { recursive: true });
    if (!fs.existsSync(planPath)) fs.writeFileSync(planPath, '# Plan\n', 'utf8');
    console.log('Plan Path:', planPath);
    console.log(fs.readFileSync(planPath, 'utf8'));
  } catch(e) { console.log(raw); }
} else { console.log('index file missing:', tasksFile); }
" -- \"$0\"
```

---

# STEPS
1. Parse args — extract task-id, sub-task-id, prompt, flags (`@ai`, `@context`)
2. read `@context` files if provided
3. If plan file is empty or only has `#User Task Notes` 
  — run `/create-plan {task-id} {include task in a prompt} agent.manager skill`, 
  - ask user check edit if needs and say ok to continue with a plan. 
  - if user say ok get reload task object from a tasks.index.jsonc and reload new plan.
5. if plan exists pick next pending task if sub-task id not provided
6. create task worktree + branch from main branch if not created yet 
7. execute next subtask in a new session with a new context in a task worktree and branch
  - attach related information from plan 
  - attach previous subtask report if exists
  - run assigned agent if in task object assigned_agent is provided for related agent folder agents/agent.dev .. if main run from the root social-media-app folder
8. when finished run `agent.manager /generate-report {task-id} {sub-task-id}` 
  - provide user with file paths to check report.
  - ask if user if he want to 1. commit changes or 2. commit and close-task if it's last subtask.
9.  commit and close if  user said close `agent.manager /close-task {task-id}` skill 
10. if user continue and asking additional changes continue working, consider create additional subtasks and update related plan and report
11. update task in `tasks.index.jsonc` base on current state of task
12. update task folder name base on current status TASK_LIST_PATH/in_plan/{assigned_user}.{type}.{github-issue-id}.{status}

     

---

# RULES
- if no sub-task-id given, pick next pending subtask
- If `@ai` flag set — execute subtasks previously marked `is_need_human_confirmation:true` without confirmation
- task should not be in a pending after this command
- also when should be today after this command
---

# OUTPUT
```
✓ Task #12 started

  branch:   feature/12-user-profile-photo  (created & checked out)
  assigned: Andrei
  status:   in-progress
  plan:     agents/agent.manager/tasks/in_plan/12.agent.manager.feature.andrei/plan.md

  Sub-tasks:
    1. [x] Plan and define tests                  [done]
    2. [ ] Proposals and alternatives             [research]  <- current
    3. [ ] Implementation                         [build]
```
