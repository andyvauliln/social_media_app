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
2) research project and create init scripts {project_name}.init.sh 
- include clonning repo or pulling if already exists
3) create also start project script {project_name}.start.sh
- include starting project in a way that it is available for use
- if it's endpoints with a ports available after start remember them and add them in a 
4) create also {project_name}.index.md file put there some guidance for installation and start process, endpoints all information needed to unerstand init and start process and where to check
5) add health.sh script that ll run and check if application running and working as expected
6) add init/start entry to `./start.config.jsonc` with `developmentEnabled: false` and `productionEnabled: false` by default (turn on per environment as needed)
7) add project metadata to `./github-projects/!index.jsonc`
8) create env symlink files in `./envs` for project `.env*` files using unique names:
   `./envs/gp.{project}.symlink.env`
9) print created env symlink paths and required env values the user must fill
