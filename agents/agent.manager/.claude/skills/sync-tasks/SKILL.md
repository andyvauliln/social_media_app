---
name: sync-tasks
description: Merge tasks.index.jsonc from origin/main with local changes, rebuild per-user today/week files, then push.
argument-hint: ""
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# sync-tasks

Merges `tasks.index.jsonc` from `origin/main` into the local copy (union by `github_issue_id`),
rebuilds scheduling files, then pushes — so every developer stays in sync.

```
/sync-tasks
```

---

## Step 0 — Setup

```bash
ROOT=$(git rev-parse --show-toplevel)
source "$ROOT/agents/agent.manager/scripts/task-helpers.sh"
TASKS_FILE="$MANAGER_TASKS/tasks.index.jsonc"
PLAN_DIR="$MANAGER_TASKS/in_plan"
CURRENT_BRANCH=$(git branch --show-current)
REMOTE_BRANCH="main"
REMOTE_TASKS_TMP=$(mktemp)
```

---

## Step 1 — Fetch remote tasks.index.jsonc

Fetch only the tasks file from `origin/main` into a temp file so local work is untouched.

```bash
git fetch origin "$REMOTE_BRANCH" 2>/dev/null || true

git show "origin/$REMOTE_BRANCH:agents/agent.manager/tasks/tasks.index.jsonc" \
    > "$REMOTE_TASKS_TMP" 2>/dev/null || echo "[]" > "$REMOTE_TASKS_TMP"
```

If both the local `tasks.index.jsonc` and the remote are empty/missing → print `No tasks to sync.` and stop.

---

## Step 2 — Merge local + remote tasks.index.jsonc (field-level)

Three outcomes per shared task (same `github_issue_id`):

| Situation | Result |
|---|---|
| ID only in local | kept as-is |
| ID only in remote | added |
| ID in both, no field conflict | fields union-merged (each side's changes combined) |
| ID in both, **same field edited by both** | written to `CONFLICTS_TMP` for Step 2b |

A **field conflict** = the field value differs between local and remote **and** both differ from the
empty/null default (i.e. both sides actually wrote something different to the same field).

```bash
CONFLICTS_TMP=$(mktemp)

node -e "
const fs   = require('fs');
const {parse} = require('jsonc-parser');

const localFile     = process.env.TASKS_FILE;
const remoteFile    = process.env.REMOTE_TASKS_TMP;
const conflictFile  = process.env.CONFLICTS_TMP;

const readTasks = (f) => {
  try { return parse(fs.readFileSync(f, 'utf8')) || []; } catch { return []; }
};

const local  = readTasks(localFile);
const remote = readTasks(remoteFile);

if (!local.length && !remote.length) {
  console.log('No tasks to sync.');
  process.exit(0);
}

const remoteMap = new Map(remote.map(t => [String(t.github_issue_id ?? ''), t]));
const localMap  = new Map(local.map(t  => [String(t.github_issue_id ?? ''), t]));

const merged    = [];
const conflicts = [];

// Start from remote as base, then apply local field-by-field
for (const [id, remoteTask] of remoteMap) {
  if (!localMap.has(id)) {
    merged.push(remoteTask);   // remote-only
    continue;
  }
  const localTask   = localMap.get(id);
  const mergedTask  = { ...remoteTask };
  const taskConflicts = [];

  const allKeys = new Set([...Object.keys(remoteTask), ...Object.keys(localTask)]);
  for (const key of allKeys) {
    const rv = JSON.stringify(remoteTask[key] ?? null);
    const lv = JSON.stringify(localTask[key]  ?? null);
    if (rv === lv) continue;                 // identical — no action
    if (rv === 'null' || rv === '\"\"') { mergedTask[key] = localTask[key]; continue; }  // remote empty, local has value
    if (lv === 'null' || lv === '\"\"') continue;                                        // local empty, remote has value
    // Both sides have different non-empty values — real conflict
    taskConflicts.push({ field: key, local: localTask[key], remote: remoteTask[key] });
    mergedTask[key] = remoteTask[key];       // placeholder: remote wins until AI resolves
  }

  if (taskConflicts.length) {
    conflicts.push({ github_issue_id: id, title: remoteTask.title || '', fields: taskConflicts });
  }
  merged.push(mergedTask);
}

// Add local-only tasks
for (const [id, localTask] of localMap) {
  if (!remoteMap.has(id)) merged.push(localTask);
}

fs.writeFileSync(localFile,    JSON.stringify(merged,    null, 2) + '\n');
fs.writeFileSync(conflictFile, JSON.stringify(conflicts, null, 2) + '\n');

console.log('merged tasks:', merged.length, '(local:', local.length, '/ remote:', remote.length + ')');
console.log('field conflicts:', conflicts.length);
"
```

---

## Step 2b — AI conflict resolution (only if conflicts exist)

If `CONFLICTS_TMP` contains an empty array (`[]`) skip this step entirely.

Otherwise read `CONFLICTS_TMP` and for **each conflicting task** resolve every field conflict
using your judgment:

- Prefer the value that represents **progress** (e.g. a more advanced `status`, a more specific `when`).
- Prefer longer/richer text for description-like fields (`title`, `notes`, `description`).
- Prefer the non-null / non-empty value when one side is blank.
- If both values are equally valid and additive (e.g. both added different tags), combine them.

After resolving, update `tasks.index.jsonc` in-place: for each conflicting task ID, set every
resolved field to the chosen value.

Print a resolution summary:

```
⚠ resolved {n} field conflicts:
  task #{id} "{title}": {field} → chose "{value}" over "{other_value}" (reason)
  ...
```

---

## Step 3 — Rebuild {assigned_user}.today.jsonc

```bash
!node -e "
const fs   = require('fs');
const path = require('path');
const {parse} = require('jsonc-parser');

const tasks = parse(fs.readFileSync(process.env.TASKS_FILE, 'utf8')) || [];
const todayTasks = tasks.filter(t => ['today','now'].includes(String(t.when || '').toLowerCase()));
const grouped = todayTasks.reduce((acc, t) => {
  const user = String(t.assigned_user || '').trim() || 'unknown-user';
  (acc[user] ??= []).push(t);
  return acc;
}, {});

for (const [user, list] of Object.entries(grouped)) {
  const file = path.join(process.env.PLAN_DIR, user + '.today.jsonc');
  fs.writeFileSync(file, JSON.stringify(list, null, 2) + '\n');
}

const counts = Object.entries(grouped).map(([u, l]) => u + ':' + l.length).join(', ');
console.log('today tasks:', todayTasks.length);
console.log('today files:', counts || 'none');
"
```

---

## Step 4 — Rebuild {assigned_user}.week.jsonc

```bash
!node -e "
const fs   = require('fs');
const path = require('path');
const {parse} = require('jsonc-parser');

const tasks = parse(fs.readFileSync(process.env.TASKS_FILE, 'utf8')) || [];
const weekTasks = tasks.filter(t => String(t.when || '').toLowerCase() === 'week');
const grouped = weekTasks.reduce((acc, t) => {
  const user = String(t.assigned_user || '').trim() || 'unknown-user';
  (acc[user] ??= []).push(t);
  return acc;
}, {});

for (const [user, list] of Object.entries(grouped)) {
  const file = path.join(process.env.PLAN_DIR, user + '.week.jsonc');
  fs.writeFileSync(file, JSON.stringify(list, null, 2) + '\n');
}

const counts = Object.entries(grouped).map(([u, l]) => u + ':' + l.length).join(', ');
console.log('week tasks:', weekTasks.length);
console.log('week files:', counts || 'none');
"
```

---

## Step 5 — Commit & push tasks folder

```bash
git add "$MANAGER_TASKS/"
if git diff --cached --quiet "$MANAGER_TASKS/"; then
    echo "✓ sync-tasks: nothing changed"
    rm -f "$REMOTE_TASKS_TMP" "$CONFLICTS_TMP"
    exit 0
fi

git commit -m "sync-tasks: $(today_iso)"
git push origin HEAD 2>/dev/null || true
rm -f "$REMOTE_TASKS_TMP" "$CONFLICTS_TMP"
```

---

## Output

```
✓ sync-tasks done
  merged:    {total} tasks (local: {n} / remote: {n})
  conflicts: {n} field conflicts resolved by AI  ← omit line if 0
  today:     {count} tasks → {user}.today.jsonc files
  week:      {count} tasks → {user}.week.jsonc files
  pushed:    yes/no
```

---

## Rules

- `tasks.index.jsonc` is the only source of truth — scheduling files are always rebuilt, never merged
- Merge is field-level union by `github_issue_id`; each side's unique field changes are preserved
- A true conflict = same field edited differently by both sides → AI resolves in Step 2b
- Always sync from `origin/main` so the canonical branch stays the reference
- Never silently drop a field change — either auto-merge it or surface it for AI resolution
- Never modify task content beyond conflict resolution — only merge indexes, rebuild derived views, and sync git
