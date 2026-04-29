# All agents (registry)

| Agent | Path | Description |
|-------|------|-------------|
| *example* | `agents/example/` | Replace with real agents as you add them |

## Example entry (copy and edit)

### agent.example
- **Path**: `agents/example/`
- **Docs**: `agents/example/docs.agent.example/!INDEX.md`
- **DB**: `agents/example/example.db`
- **Description**: Illustrative row; delete or replace when registering a real agent.

```json
{ "ai_file_metadata": {
    "path": "agents/knowledge-base/KNOWLEDGE/ALL_AGENTS_LIST.md",
    "description": "Canonical list of agents, paths, and short descriptions.",
    "auto_update_settings": { "on_command": { "name": "create-agent" }, "task_is_done": false },
    "tags": ["knowledge", "agents"],
    "developer_notes": [""],
    "notes_for_ai": ["Append new agents when /create-agent runs; avoid duplicate rows."]
} }
```
