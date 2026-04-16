---
name: collect-inline-tasks
description: Scan codebase for ai_todo inline comments, create tasks from them via create-task, and remove processed comments. Use when the user runs collect-inline-tasks or asks to gather TODO items from code.
argument-hint: "[path optional] [@scope optional]"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# collect-inline-tasks

Scans the codebase for `ai_todo` inline comments, converts each into a structured task via `/create-task`, then removes the processed comment from source.

## Setup

```bash
ROOT=$(git rev-parse --show-toplevel)
```

If a `[path]` argument is provided, scope the search to that path. Otherwise search from `$ROOT`.

## ai_todo syntax

```
// ai_todo: "<prompt>" @<param1> @<param2>
```

| Element | Required | Description |
|---------|----------|-------------|
| `ai_todo:` | yes | Marker keyword (case-insensitive) |
| `"<prompt>"` | yes | Task description — may include params inside or outside quotes |
| `@ai` | no | Assign to AI | (default)
| `@<user>` | no | Assign to a team member |
| `@context` | no | Include file path and line number in the task prompt |
| `@now` / `@today` / `@week` | no | Scheduling hint |
| `@<priority>` | no | `@high`, `@urgent`, etc. |

### Examples in code

```js
// ai_todo: "change this field name" @ai @context
// ai_todo: "refactor auth logic to use middleware" @andrei @week
// ai_todo: "fix date parsing for ISO format @context @high"
/* ai_todo: "add input validation" @ai @today */
# ai_todo: "migrate config to YAML" @context
ai_todo: "migrate config to YAML" @context
```

## Workflow

### 1. Search for ai_todo comments

```bash
rg -n -i 'ai_todo:' "$SEARCH_PATH"
```

Collect every match: file path, line number, and full comment content.

**No matches found** → report "No ai_todo comments found" and stop.

### 2. Process each match

For each `ai_todo` entry:

1. **Parse** the prompt text and params from the comment
2. **Build the `/create-task` invocation:**
   - Pass the prompt text as the task description
   - Forward all `@params` as-is
   - If `@context` is present → append the file path and line number to the prompt:
     `"<prompt> (source: <file>:<line>)"`
3. **Run** `/create-task` with the assembled arguments
4. **On success** → remove the `ai_todo` comment line from the source file
5. **On failure** → log the error, keep the comment intact, continue to next

### 3. Report results

```
✓ Collected inline tasks

   * Task ID: "title"
   * Task ID: "title"
```

## Rules

- Process entries one at a time — each needs its own `/create-task` call
- Never remove a comment unless the task was successfully created
- Preserve file formatting when removing comments — delete the entire line if the comment is the only content, remove only the comment portion if code precedes it on the same line
- Support all comment styles: `//`, `/* */`, `#`, `<!-- -->`
