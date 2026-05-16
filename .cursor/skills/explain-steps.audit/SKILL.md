---
name: explain-steps.audit
description: Reformat raw Claude turn audit steps into a structured numbered narrative. Each step gets a title, goal, tool used, and result/action. Use composer2 model only.
model: composer2
disable-model-invocation: false
---

# explain-steps.audit

Read `logs/claude/last.json`. Use the `steps[]` array — each step has `text`, `tools[]`, `tokens`, `model`.

## Output format

One numbered block per step, plain text, no markdown:

1️⃣ Short title (3-6 words)

Goal: One sentence — what this step was trying to achieve.
Tool: ToolName → one sentence on what it did or found.
Action: What was changed/created/sent. (only if a write/edit/reply happened)
Result: What was discovered or confirmed. (only if read/bash/search)

2️⃣ Next step title
...

## Rules

- Emoji numbers: 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 — continue with 11. 12. etc after 10
- Title: short noun phrase summarizing the step's purpose, not the tool name
- Goal: always present, one line
- Tool: use the friendly name (Bash, Read, Edit, mcp:reply etc.), skip ToolSearch
- Action: only for Edit/Write/MultiEdit/mcp:reply steps
- Result: only for Read/Bash/Grep/Glob steps
- If step has no tools (pure text): label as "Response" with the text preview as Goal
- Blank line between each numbered block
- No token counts, no model names, no markdown decorations
- Total ≤ 40 lines regardless of step count
