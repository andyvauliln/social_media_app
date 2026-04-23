---
name: collect-inline-tasks
description: Scan codebase for ai_todo inline comments, create tasks from them via create-task, and remove processed comments. Use when the user runs collect-inline-tasks or asks to gather TODO items from code.
argument-hint: "[path optional]"
user-invocable: true
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# collect-inline-tasks

# EXAMPLES
```
/collect-inline-tasks
/collect-inline-tasks src/
/collect-inline-tasks agents/agent.manager/
```

---

# CONTEXT

```bash
!ROOT_PROJECT_PATH="$(pwd)" && \
export ROOT_PROJECT_PATH && \
export TASK_LIST_PATH="$ROOT_PROJECT_PATH/agents/agent.manager/tasks/tasks.index.jsonc" && \
echo "ROOT=$ROOT_PROJECT_PATH" && \
echo "=== AI_TODO MATCHES ===" && \
rg -n -i 'ai_todo' "$ROOT_PROJECT_PATH" \
  --glob '!**/SKILL.md' \
  --glob '!**/agent.manager.tests/**' \
  --glob '!**/*.jsonc' \
  --glob '!**/*.json' \
  2>/dev/null || echo "NO_MATCHES"
```

---

# ai_todo syntax

```
// ai_todo: "<prompt>" @<param1> @<param2>
```

| Element | Required | Description |
|---------|----------|-------------|
| `ai_todo:` | yes | Marker keyword (case-insensitive) |
| `"<prompt>"` | yes | Task description |
| `@ai` | no | Assign to AI (default) |
| `@<user>` | no | Assign to a team member |
| `@c` / `@context` | no | Set task `context` field to source file:line |
| `@now` / `@today` / `@week` | no | Scheduling hint |
| `@high` / `@urgent` | no | Priority hint |

### Supported comment styles
```js
// ai_todo: "change this field name" @ai @context
/* ai_todo: "add input validation" @ai @today */
# ai_todo: "migrate config to YAML" @c
ai_todo: "raw style" @andrei
```

---

# STEPS

1. **Parse args** — if `[path]` argument provided, filter the CONTEXT match list to only lines from that path prefix. Why: user may scope to a single folder; pre-injected list covers full repo but filtering is cheaper than re-running rg.

2. **Check match list** — if CONTEXT shows `NO_MATCHES` or filtered list is empty → print `No ai_todo comments found` and stop. Why: fail fast before any tool calls.

3. **For each match** (process one at a time, never batch):
   - a. **Read context** — use Read tool on the file, targeting the matched line ±3 lines. Why: need surrounding code to edit safely without breaking formatting.
   - b. **Parse** — extract prompt text and `@params` from the `ai_todo` line.
   - c. **Build create-task call**:
     - If `@c` or `@context` in params → include `@context <file>:<line>` in the `/create-task` invocation so the task's `context` field records the source location.
     - Pass all other `@params` (user, scheduling, priority) directly.
   - d. **Call `/create-task "<prompt>" @params`** and wait for confirmation the task was created (task ID returned).
   - e. **On success** → use Edit tool to remove the `ai_todo:` marker and its params from the line. If the line contains only the comment, remove the entire line. If code precedes the comment on the same line, remove only the comment portion.
   - f. **On failure** → log the error, leave the comment intact, continue to next match.

4. **Report** — print summary:
```
✓ Collected inline tasks

   * <task-id>: "<title>"
   * <task-id>: "<title>"
```

---

# RULES

- Never remove a comment unless the task was successfully created (task ID confirmed).
- Use Edit tool for all file mutations — not sed, not fs.writeFileSync.
- `@c` / `@context` in an `ai_todo` → sets task `context` field to `file:line`. It is NOT the `/create-task @context` flag for attaching files.
- Excluded from scan: all `SKILL.md` files, `agent.manager.tests/` directory — these use `ai_todo:` as examples, not real tasks.
- For JSONC manipulation use `jsonc-parser` from `packages/node.common` — not task-helpers.sh.
- Process matches one at a time — each needs its own `/create-task` call.

# OUTPUT

```
✓ Collected inline tasks

   * 42: "fix login validation"
   * 43: "migrate config to YAML"

2 tasks created. 0 failed.
```
