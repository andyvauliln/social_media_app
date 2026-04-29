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

# STEPS

## 1. Run this bash command with the Bash tool (do not just describe it — execute it):

```bash
ROOT=$(git rev-parse --show-toplevel) && \
SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]') && \
echo "SESSION_ID=$SESSION_ID" && \
SKILL_CONTENT=$(cat "$ROOT/agents/manager/.claude/skills/create-plan/SKILL.md") && \
cd "$ROOT/agents/manager" && \
claude \
  --debug \
  --debug-file "$ROOT/debug.claude.log" \
  --verbose \
  --bare \
  --session-id "$SESSION_ID" \
  --max-turns 50 \
  --permission-mode bypassPermissions \
  -p "Session ID: $SESSION_ID
Task args: $ARGUMENTS

$SKILL_CONTENT"
```

## 2. After execution print:
- Sub-agent session ID
- Model used (haiku, from skill frontmatter)
- The exact prompt passed to the agent