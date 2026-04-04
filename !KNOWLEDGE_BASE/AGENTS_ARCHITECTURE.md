# Agents architecture (sketch)

- **Project agents** live under `agents/agent.{name}/` with local `.claude/` (skills, commands, rules).
- **Shared knowledge** lives under `agents/agent.knowledge-base/KNOWLEDGE/` (indexes, lists, guidance).
- **Docs per agent** use `docs.agent.{name}/` and may be linked from the knowledge base.

## Example flow (default data)

1. User runs `/create-agent payments`.
2. Tooling creates `agents/agent.payments/` + registers a row in `ALL_AGENTS_LIST.md`.
3. Optional symlink under `KNOWLEDGE/docs/` points at that agent’s docs folder.

```json
{ "ai_file_metadata": {
    "path": "agents/agent.knowledge-base/KNOWLEDGE/AGENTS_ARCHITECTURE.md",
    "description": "High-level layout of project agents vs shared knowledge.",
    "auto_update_settings": { "on_command": { "name": "" }, "task_is_done": true },
    "tags": ["knowledge", "agents", "architecture"],
    "developer_notes": [""],
    "notes_for_ai": ["Update if agent layout or knowledge paths change."]
} }
```
