---
name: update-files-with-metadata
description: Add or fix ai_file_metadata in source files using configs/project.config.jsonc as template. Use when normalizing AI metadata across the codebase.
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

# update-files-with-metadata

1) take template and example of ai metadata template ./configs/project.config.jsonc
2) search for all files js, py, md, jsoc, exclude all project related files like package.json and make search for
ai_file_metadata and add where it not exist within a template
3) check all files if there has right structure base on template