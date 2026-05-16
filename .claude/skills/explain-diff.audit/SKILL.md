---
name: explain-diff.audit
description: Generate a short semantic explanation of code changes from a Claude turn audit. Shows what logic/data/signatures changed in plain English. Uses claude-haiku-4-5-20251001.
model: claude-haiku-4-5-20251001
disable-model-invocation: false
---

# explain-diff.audit

Read `logs/claude/last.json` (or the session file passed as context).
Use `files[]` → `hunks[].old_preview` / `hunks[].new_preview` as the diff source.
Also check `ops[]` to determine create vs edit vs delete.

## Output format — one block per file, plain text only

```
/edit   src/foo/bar.ts
  logic:  before → fetched raw DB row and mapped inline
          after  → delegates mapping to UserDTO.fromRow()
  sig:    fetchUser(id: string): Promise<any>
       →  fetchUser(id: string): Promise<UserDTO>

/create  src/foo/types.ts
  new:    UserDTO { id, name, email, avatarUrl }

/delete  src/foo/legacy.ts
  removed: syncUser() — deprecated sync helper
```

## Rules

- Paths relative to repo root, no leading `/home/...`
- Operation prefix: `/edit` `/create` `/delete`
- `logic:` — plain English, ≤ 12 words per line, before/after pair
- `sig:` — only when a function signature actually changed; show old → new
- Data structures: list added fields with `+`, removed with `-`, changed with `~`
- Skip: import-only changes, pure whitespace, comment edits, config value tweaks
  unless they are the only change (then one line: `config: X → Y`)
- If old_preview is empty → treat as new addition; if new_preview empty → deletion
- No bullet points, no headers, no markdown decorations — plain indented text only
- Total output ≤ 30 lines regardless of file count; trim least-important files first
