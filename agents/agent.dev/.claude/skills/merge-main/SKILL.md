---
name: merge-main
description: Merge the latest main branch into the current branch. Use when updating a feature branch with main.
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

# merge-main

1. `git fetch origin`
2. Merge main (e.g. `git merge origin/main` or `git merge main` depending on default branch name).
3. Resolve conflicts if prompted; run tests if the project expects them after merge.
