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
source "$ROOT/agents/manager/scripts/task-helpers.sh"
TASKS_FILE="$MANAGER_TASKS/tasks.index.jsonc"
PLAN_DIR="$MANAGER_TASKS/in_plan"
CURRENT_BRANCH=$(git branch --show-current)
REMOTE_BRANCH="main"
REMOTE_TASKS_TMP=$(mktemp)
export TASKS_FILE PLAN_DIR REMOTE_BRANCH REMOTE_TASKS_TMP
```

---

## Step 1 — Fetch remote tasks.index.jsonc

Fetch only the tasks file from `origin/main` into a temp file so local work is untouched.

```bash
git fetch origin "$REMOTE_BRANCH" 2>/dev/null || true

git show "origin/$REMOTE_BRANCH:agents/manager/data/tasks/tasks.index.jsonc" \
    > "$REMOTE_TASKS_TMP" 2>/dev/null || echo "[]" > "$REMOTE_TASKS_TMP"
```

If both the local `tasks.index.jsonc` and the remote are empty/missing → print `No tasks to sync.` and stop.

---

## Step 2 — Merge local + remote tasks.index.jsonc (field-level)
```bash
CONFLICTS_TMP=$(mktemp)
export CONFLICTS_TMP

node -e "
const fs = require('fs');
const { parse } = require('jsonc-parser');

const local  = parse(fs.readFileSync(process.env.TASKS_FILE,       'utf8')) || [];
const remote = parse(fs.readFileSync(process.env.REMOTE_TASKS_TMP, 'utf8')) || [];

const localMap  = new Map(local.map(t  => [String(t.github_issue_id), t]));
const remoteMap = new Map(remote.map(t => [String(t.github_issue_id), t]));

const merged    = [];
const conflicts = [];

for (const [id, r] of remoteMap) {
  const l = localMap.get(id);
  if (!l) { merged.push(r); continue; }

  const task = { ...r };
  const taskConflicts = [];

  for (const key of new Set([...Object.keys(r), ...Object.keys(l)])) {
    const rv = r[key] ?? null, lv = l[key] ?? null;
    if (JSON.stringify(rv) === JSON.stringify(lv)) continue;
    if (rv === null) { task[key] = lv; continue; }   // only local has value
    if (lv === null) continue;                        // only remote has value
    taskConflicts.push({ field: key, local: lv, remote: rv });
    task[key] = lv;                                   // local placeholder until AI resolves
  }

  if (taskConflicts.length) conflicts.push({ github_issue_id: id, fields: taskConflicts });
  merged.push(task);
}

for (const [id, l] of localMap) {
  if (!remoteMap.has(id)) merged.push(l);
}

fs.writeFileSync(process.env.TASKS_FILE,       JSON.stringify(merged,    null, 2));
fs.writeFileSync(process.env.CONFLICTS_TMP,    JSON.stringify(conflicts, null, 2));
console.log('conflicts:', conflicts.length);
"
```

If CONFLICTS_TMP is not empty, read it and resolve each conflict using judgment:

Prefer more advanced status
Prefer longer/richer text fields
Prefer non-null over null
Combine additive values (e.g. tags from both sides)
Then patch the resolved fields back into $TASKS_FILE.

Print: merged: {n} tasks, conflicts resolved: {n}.
DOUBTES: if you resolve with doubts and something is ambiguous, write here you conserns.

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
if ! git pull --rebase origin "$REMOTE_BRANCH"; then
    echo "sync-tasks: pull --rebase failed — resolve conflicts and retry" >&2
    rm -f "$REMOTE_TASKS_TMP" "$CONFLICTS_TMP"
    exit 1
fi
if ! git push origin HEAD; then
    echo "sync-tasks: push failed" >&2
    rm -f "$REMOTE_TASKS_TMP" "$CONFLICTS_TMP"
    exit 1
fi
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
