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
/collect-inline-tasks agents/manager/
```

---

# CONTEXT

Scan matches **only** lines containing the marker `\bai_todo\s*:` (case-insensitive), same as `agents/manager/scripts/collect-inline-tasks-if-needed.sh`. Excludes below must stay in sync with that script. Worktree matches are normalized to the main project-relative path before excludes and duplicate detection.

```bash
!ROOT_PROJECT_PATH="$(pwd)" && \
export ROOT_PROJECT_PATH && \
export TASK_LIST_PATH="$ROOT_PROJECT_PATH/agents/manager/data/tasks/tasks.index.jsonc" && \
echo "ROOT=$ROOT_PROJECT_PATH" && \
echo "=== AI_TODO MATCHES ===" && \
if [ -n "${COLLECT_INLINE_TASKS_SCAN_OUT:-}" ]; then
  printf '%s\n' "$COLLECT_INLINE_TASKS_SCAN_OUT"
else
  COLLECT_INLINE_TASKS_DRY_RUN=1 bash "$ROOT_PROJECT_PATH/agents/manager/scripts/collect-inline-tasks-if-needed.sh" --cursor
fi
```

**Excluded path segments (any file whose relative path contains this directory name):** `.git`, `node_modules`, `.vscode`, `logs`, `agent.manager.tests`.

**Excluded file suffix:** `.json` only (**.jsonc is scanned**, e.g. manager config).

**Extra excluded relative paths:** `agents/manager/scripts/collect-inline-tasks-if-needed.sh`, `!KNOWLEDGE_BASE/CODE_GUIDANCE.md`, `agents/manager/.claude/skills/collect-inline-tasks/SKILL.md`.

**Worktree path handling:** files under `!WORKTREES/<branch>/`, `.claude/worktrees/<branch>/`, or `.cursor/worktrees/<branch>/` are treated as if `<branch>/` was removed before applying excludes. If the same normalized `path:line:comment` exists in both main and a worktree, process it once and preserve the worktree branch for notes.

When the scan includes `__COLLECT_INLINE_RAW__`, each raw record has this shape:

```
<normalized_path>:<line>:worktree=<branch-or-empty>:raw=<actual_path>:<escaped original comment>
```

Use `raw=<actual_path>` for reading and removing the comment. Use `<normalized_path>:<line>` only for de-duping and display.

---

# ai_todo syntax

```
// ai_todo: "<prompt>" @<param1> @<param2>
```

| Element | Required | Description |
|---------|----------|-------------|
| `ai_todo:` | yes | Marker keyword (case-insensitive; `#AI_TODO:` and `//ai_todo:` are valid) |
| `"<prompt>"` | yes | Task description (double quotes) *or* unquoted text after `:` until end of comment |
| `@ai` | no | Assign to AI (default) |
| `@<user>` | no | Assign to a team member |
| `@c` / `@context` | no | If present → set task JSON `context` (paths or `file:line` after the tag; if tag has no path, use source `path:line`). If absent → leave `context` empty |
| `@now` / `@today` / `@week` | no | Scheduling hint |
| `@main` / `@dev` | no | Execution agent for `/do-task`: default passes `@main` (`assigned_agent`: `"main"`) unless todo has `@dev` / `@agent.dev` / another `@agent.*` |
| `@high` / `@urgent` | no | Priority hint |
```js
// ai_todo: "change this field name" @ai @context
/* ai_todo: "add input validation" @ai @today */
# ai_todo: "migrate config to YAML" @c
#AI_TODO: unquoted reminder @week
//ai_todo: "jsonc style" @week
ai_todo: "raw style" @andrei
```

### Multi-line descriptions (supported)

The scanner and agent treat these as **one** todo:

1. **`/* ... */`** — Any lines between `/*` and `*/` that contain `ai_todo:` (e.g. Javadoc-style `*` prefixes are stripped). A **double-quoted** prompt may span newlines inside the block.
2. **`//` (C/JS/TS/JSONC)** — First line has `ai_todo:`; **each following line** must be a `//` line comment; stops at the first blank line or a non-`//` line. Put `@tags` on the last `//` line if you use them.
3. **`#` (shell, etc.)** — Same rule as `//` but each continuation line must start with `#` (not `#!`).

`//`-only languages cannot have an unquoted string span real newlines inside one `//` string; use a block comment or multiple `//` lines as above.

---

# STEPS

1. **Parse args** — if `[path]` argument provided, filter the CONTEXT match list to only lines from that path prefix. Why: user may scope to a single folder; pre-injected list covers full repo but filtering is cheaper than re-running rg.

2. **Check match list** — if CONTEXT shows `NO_MATCHES` or filtered list is empty → print `No ai_todo comments found` and stop. Why: fail fast before any tool calls.

3. **For each match** (process one at a time, never batch):
   - a. **Read context** — use Read tool on the raw file path from the scan entry (`raw=<actual_path>` when present), targeting the matched line ±8 lines (wider if the `ai_todo` sits in a multi-line `/* ... */` block). Why: need enough context to remove the **whole** comment safely in the actual source file.
   - b. **Parse** — from the **full** comment (single line, full `/* */` block, or consecutive `//` / `#` run produced by the multiline rules above): extract prompt text — prefer a double-quoted string (may span lines inside a block); else use everything after `ai_todo:` through the end of that comment unit, normalizing whitespace. Parse `@params` from that tail.
   - c. **Build create-task call**:
     - Always add **`@main`** for execution agent **unless** the comment already has `@dev`, `@agent.dev`, or another explicit `@agent.*` (then pass those instead). Map to task `assigned_agent`: default `"main"`, or `"dev"` when `@dev` / `@agent.dev` is present.
     - Put **`@context` / `@c` in the `/create-task` invocation only when** the `ai_todo` line/block contains `@c` or `@context`. Then supply paths or `relative/path:line` as appropriate. **Do not** pass source location as `@context` when those tags are missing — the task JSON `context` must stay `""`.
     - Task JSON **`notes`** must be exactly **`Inline collected`** for main-tree matches, or **`Inline collected from worktree branch: <branch>`** when the scan entry says `source: worktree branch: <branch>`.
     - Pass all other `@params` (user, scheduling, priority, types, etc.) from the comment.
   - d. **Call `/create-task "<prompt>" @ai @main …`** (plus optional tags) and wait for confirmation the task was created (task ID returned).
   - e. **On success → remove the entire comment**, not just the `ai_todo:` fragment:
     - **`//`** (C/JS/TS/JSONC/etc.): delete from the `//` that starts this comment through end of line. If the line had code before `//`, keep the code and trim trailing spaces; if the line was only a comment, delete the whole line.
     - **`#` / `#!`**: delete from `#` through end of line; if the line was only a comment, delete the whole line.
     - **`/* ... */`** on one line: delete the entire `/*`…`*/` span (and trim). If the line becomes empty, remove the line.
     - **Multi-line `/* ... */`**: delete from the opening `/*` through the closing `*/` that pairs with it for this block (remove all lines that belonged only to that block).
     - Never leave a stray `//` fragment or half of a block comment behind.
   - f. **On failure** → log the error, leave the comment intact, continue to next match.

4. **Report** — for every successful create, print in this shape (agent log style):

```
<id>: <title>
  <description>
  <type, scope, when, priority, assigned_user, assigned_agent — only fields that were set; include **context** only if `@c` / `@context` was in the todo>
  source ai_todo:
  <exact original line or block text>
```

Then end with counts, e.g. `N created. M failed.`

---

# RULES

- Never remove a comment unless the task was successfully created (task ID confirmed).
- Use Edit tool for all file mutations — not sed, not fs.writeFileSync.
- `@c` / `@context` in an `ai_todo` → set task JSON `context` (and pass matching `@context` / `@c` on `/create-task`). Without those tags → `context: ""`; never invent `path:line` from the scan location.
- Default `assigned_agent` for created tasks: **`main`**; use **`dev`** when the todo includes `@dev` or `@agent.dev`, or another explicit `@agent.*` when given.
- Excludes and the `\bai_todo\s*:` rule must match `collect-inline-tasks-if-needed.sh` (see CONTEXT and the list above). Do not skip `.jsonc` files.
- For JSONC manipulation use `jsonc-parser` from `packages/node.common` — not task-helpers.sh.
- Process matches one at a time — each needs its own `/create-task` call.
- Saved task **`notes`** for collected inline todos: **`Inline collected`** for main-tree matches, or **`Inline collected from worktree branch: <branch>`** for worktree-origin matches (see create-task skill).

# OUTPUT

```
42: Fix symlink bootstrap in init
  Add config and installer script; wire into rinit and shell alias.
  type: feature | scope: main | when: week | assigned_user: ai | assigned_agent: main
  source ai_todo:
  //ai_todo: "add config for symlinks..." @week

✓ Collected inline tasks — 1 created, 0 failed.
```
