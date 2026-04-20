---
name: create-plan.manager
description: create plan for this project based on task
argument-hint: "[task_id] [prompt optional] [@v - version of the plan optional]"
shell: bash

---

!SESSION_ID=$(uuidgen)
use ./agents/agent.manager/.claude/skills/create-plan/SKILL.md to make a plan