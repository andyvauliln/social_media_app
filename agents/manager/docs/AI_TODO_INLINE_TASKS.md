# `@ai_todo` → tasks (quick ref)

Put **`@ai_todo` as the last word on the line** (anywhere in the file, including last line). The **collect-inline-tasks** cron picks it up.

## Examples

```js
// fix validation @week @ai_todo
```

```jsonc
]
// finish tests @today @ai_todo
```

```js
// @todo_ai Long description line one
// line two @dev @ai_todo
```

## Tags (optional, before `@ai_todo`)

**Defaults:** main agent · assign AI · empty context (you can omit `@main`, `@ai`, and `@c`).

| Tag | Meaning |
|-----|---------|
| `@main` | Main agent **(default)** |
| `@ai` | Assign AI **(default)** |
| `@c` / `@context` | Set `context`; if omitted → empty |
| `@dev` / `@agent.dev` | Dev agent (overrides **default** `@main`) |
| `@today` / `@week` / `@now` | When hint |
| `@high` / `@urgent` | Priority hint |
| `@username` | Assign person |

`.jsonc` OK; plain `.json` not scanned.

Multi-line: open with **`@todo_ai`**, close with **`@ai_todo`** (same rules as single-line for tags on the closing line).