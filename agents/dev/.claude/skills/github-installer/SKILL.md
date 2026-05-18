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

2) create `{project}.init.sh` beside `repo/` — clone when missing + dependency install (no `git pull`; cron syncs updates):

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/repo"
REPO_URL="https://github.com/{owner}/{repo}"

if [[ ! -d "$REPO_DIR" ]]; then
  echo "[init] cloning $REPO_URL -> $REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
elif [[ ! -d "$REPO_DIR/.git" ]]; then
  if [[ -z "$(ls -A "$REPO_DIR" 2>/dev/null)" ]]; then
    echo "[init] removing empty placeholder at $REPO_DIR"
    rmdir "$REPO_DIR"
    echo "[init] cloning $REPO_URL -> $REPO_DIR"
    git clone "$REPO_URL" "$REPO_DIR"
  else
    echo "[init] error: $REPO_DIR exists but is not a git repository" >&2
    exit 1
  fi
fi

cd "$REPO_DIR"
# deps: bun install | npm install | pnpm install | pip install -r requirements.txt | make setup | etc.
# OpenMontage: run repo-root `scripts/ensure-nvm-node.sh` + `scripts/ensure-ffmpeg.sh` before `make setup` (HyperFrames needs Node 22 + ffmpeg).
```

- pick the correct package manager from the repo (package.json, pnpm-lock, requirements.txt, …)
- if no deps, end with a one-line echo like existing output-styles project

3) run the init script after creating it: `bash ./github-projects/{collection}/{project}/{project}.init.sh` and fix errors if needs

3.1) add gitkeep to the project folder

4) create `{project}.start.sh` — start the app when applicable; record ports in the script comments

5) create `docs/{project}.index.md` — install/start guidance, endpoints, health checks

6) add `health.sh` in the project folder if applicable

7) add entry to `./start.config.jsonc`:
   - `"type": "github-project"`
   - `"path": "github-projects/{collection}/{project}/repo"`
   - `"init": "bash ../{project}.init.sh"`
   - `"start": "bash ../{project}.start.sh"`
   - `"developmentEnabled": false`, `"productionEnabled": false` always (not started by `./rstart.sh`)
   - `./rinit.sh` still runs github-project init when listed in config (clone if missing + deps)

8) add project metadata to `./github-projects/!index.jsonc`

9) create env symlink file in `./envs` for project `repo/.env` file:
   `./envs/gp.{project}.symlink.env`

10) print created env symlink paths and required env values the user must fill

11) Create new branch mine and commit there if something need to commit

12) try to run start script and check if it's working if not figure out fix update if need init or start scripts and docs for the project if needs commit you changes to the mine branch
