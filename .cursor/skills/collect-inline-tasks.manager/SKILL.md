---
name: collect-inline-tasks.manager
description: collect inline tasks from the comments on projects files
disable-model-invocation: false
---

Same behavior as `agents/manager/.claude/skills/collect-inline-tasks/SKILL.md` (that file is the single source for CONTEXT, excludes, and STEPS). Cursor invokes this wrapper; the scan is defined only in `agents/manager/scripts/collect-inline-tasks-if-needed.sh`.

use ./agents/manager/.claude/skills/collect-inline-tasks/SKILL.md to continue