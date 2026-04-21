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

1) install project under `./github-projects/{group}/{project}/repo` (create group folder if project not relates to any current flders)
2) research project and create init/start scripts
3) add init/start entry to `./start.config.jsonc` with `disabled: true` by default
4) add project metadata to `./github-projects/!index.jsonc`
5) create env symlink files in `./envs` for project `.env*` files using unique names:
   `./envs/gp.{project}.symlink.env`
6) print created env symlink paths and required env values the user must fill
