---
name: sync-project
description: Git sync with origin/main plus symlink checks for local dev
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

# Git (automated cron uses this too)

The supervisor cron `sync-project` runs from repo root:

`bash scripts/git-sync-pull-push.sh`

That script skips if the index or working tree is dirty, then `git fetch`, `git pull --rebase origin main` on `main` (else `git merge origin/main --no-edit`), then `git push`.

For a one-off in shell (clean tree only):

```bash
ROOT=$(git rev-parse --show-toplevel)
bash "$ROOT/scripts/git-sync-pull-push.sh"
```

# Symlinks (manual / follow-up)

1) Validate paths that should be symlinks
2) Read symlink expectations from `config.project.jsonc` (or project config) and fix missing links