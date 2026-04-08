---
name: make-symlinks
description: create delete or update symlinks for project.
argument-hint: ""
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: Explore
paths:
  - "./"
shell: bash
hooks:
---

1) check folders that represent collections in ./github-projects
2) install project to folder ./github-projects/collection
3) install dependencies and try to run and and check if it's works
4) base on the result and additional research add project to !index.jsonc
