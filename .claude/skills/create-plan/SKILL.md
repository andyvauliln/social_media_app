---
name: create-plan
description: create custome dev plan in a task manager agent
argument-hint: "[task id] [prompt optional] [@v - version of the plan optional]"
user-invocable: true
model: haiku
effort: low
context: fork
paths: []
shell: bash
hooks: {}
------

you should run this script and wait result after this report of exection

```bash
!cd "$(dirname "$0")" && \
  SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]') && \
  echo "SESSION_ID=$SESSION_ID" && \
  claude \
    --debug \
    --debug-file ./debug.claude.log \
    --verbose \
    --session-id "$SESSION_ID" \
    -p "Session ID: $SESSION_ID\nTask: $ARGUMENTS"
```
print current session subagent session and model currently executing subagent skill