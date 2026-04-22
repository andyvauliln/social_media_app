---
name: create-pre-plan.manager
description: create pre-plan for this project based on task
argument-hint: "[task_id] [prompt optional] [@v - version of the plan optional]"
shell: bash

---

!SESSION_ID=$(uuidgen)
use ./agents/agent.manager/.claude/skills/create-pre-plan/SKILL.md to make a pre-plan