# Logs (`knowledge-base/logs/`)

Runtime and agent output is split by area. Files are plain text; rotate or archive as needed.


LOGS_LEVEL = 1,2,3 (1 no logs, 2 main logs, 3 dev verbose logs)

## Last sessions

| File | Purpose |
|------|---------|
| `last-sessions-dev-agent.log` | Recent dev-agent session tail (last sessions). |
| `last-sessions-content-agent.log` | Recent content-factory session tail. |
| `last-sessions-api.log` | Recent API process session tail. |
| `last-sessions-ai.log` | Recent AI/LLM integration session tail. |

## Error-only streams (`errors.*.log`)

One file per subsystem for stack traces and error lines only, for quick grepping and alerts.

| File | Scope |
|------|--------|
| `errors.ai.log` | AI/LLM calls and tooling |
| `errors.api.log` | HTTP API |
| `errors.content-agent.log` | Content factory agent |
| `errors.crons.log` | Scheduled jobs |
| `errors.db.log` | Database client and queries |
| `errors.dev-agent.log` | Dev agent |
| `errors.telegram.log` | Telegram bot |
| `errors.tools-content-agent.log` | Content-agent tools |
| `errors.tools-dev-agent.log` | Dev-agent tools |

## Full streams (`*.log` without `errors.` or `last-sessions-`)

Broader logging (info, warnings, debug) per area, not limited to errors.

| File | Scope |
|------|--------|
| `ai.log` | AI/LLM |
| `api.log` | API |
| `content-agent.log` | Content factory agent |
| `crons.log` | Crons |
| `db.log` | Database |
| `dev-agent.log` | Dev agent |
| `telegram.log` | Telegram |
| `tools-content-agent.log` | Content-agent tools |
| `tools-dev-agent.log` | Dev-agent tools |

## TEMPLATE: `ai.log`
### Log Level: 2 
```json
[{
  "request_id": "",
  "duration_ms": 2100,
  "session_id":"",
  "input": "",
  "prompt": "",
  "output": "",
  "agent_provider":"", //claude code, cursor, codex
  "model": ""
}]
```
### Log Level: 3
```json
[{
  "request_id": "",
  "timestamp_start": "2026-04-02T20:30:00.000Z",
  "timestamp_end": "2026-04-02T20:30:02.100Z",
  "duration_ms": 2100,
  "session_id":"",
  "input": "",
  "prompt": "",
  "model": "",
   "token_usage": {"prompt": 1200, "completion": 280, "total": 1480, "cost": ""},
  "steps": [
    {"name": "analyze_request", "input": "", "output": "", "status": "done"},
    {"name": "fetch_context", "status": "done"}
  ],
}]
```

## Related

- DB : `logs.db`
## SHEMA


/