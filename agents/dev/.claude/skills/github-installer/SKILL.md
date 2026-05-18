---
name: github-installer
description: create delete or update symlinks for project.
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

1) install project under `./github-projects/{collection}/{project}/repo` (create collection folder if needed)

2) create `{project}.init.sh` beside `repo/` — single place for clone/pull and dependency install:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/repo"
REPO_URL="https://github.com/{owner}/{repo}"

if [[ ! -d "$REPO_DIR" ]]; then
  echo "[init] cloning $REPO_URL -> $REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
elif [[ -d "$REPO_DIR/.git" ]]; then
  echo "[init] pulling latest in $REPO_DIR"
  (cd "$REPO_DIR" && git pull --ff-only)
fi

cd "$REPO_DIR"
# deps: bun install | npm install | pnpm install | pip install -r requirements.txt | make setup | etc.
```

- pick the correct package manager from the repo (package.json, pnpm-lock, requirements.txt, …)
- if no deps, end with a one-line echo like existing output-styles project

3) run the init script after creating it: `bash ./github-projects/{collection}/{project}/{project}.init.sh`

4) create `{project}.start.sh` — start the app when applicable; record ports in the script comments

5) create `{project}.index.md` — install/start guidance, endpoints, health checks

6) add `health.sh` in the project folder

7) add entry to `./start.config.jsonc`:
   - `"type": "github-project"`
   - `"path": "github-projects/{collection}/{project}/repo"`
   - `"init": "bash ../{project}.init.sh"`
   - `"start": "bash ../{project}.start.sh"`
   - `"developmentEnabled": false`, `"productionEnabled": false` always (not started by `./rstart.sh`)
   - `./rinit.sh` still runs github-project init when listed in config (install/clone/deps)

8) add project metadata to `./github-projects/!index.jsonc`

9) create env symlink files in `./envs` for project `.env*` files:
   `./envs/gp.{project}.symlink.env`

10) print created env symlink paths and required env values the user must fill
