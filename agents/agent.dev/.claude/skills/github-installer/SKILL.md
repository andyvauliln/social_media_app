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

1) check folders that represent collections in ./github-projects
2) install project to any sutabable folder (collection) ./github-projects/{collection_name} or create new collection
3) research project and make init and start scripts and add them in a start.config.jsonc file with init and start. make it default dissabled
4) base on the result and additional research add project to ./github-projects/!index.jsonc
5) add entrace in a start.config.jsonc (disabled by default)
6) symlink env file with examples to env with a name ./envs/github.app.{project_name}.symlink.env
6) print env file path and envs need to be filled for user
