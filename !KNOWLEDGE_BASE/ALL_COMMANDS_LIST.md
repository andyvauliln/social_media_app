# Slash commands (registry)

| Command | Defined in | Purpose (example) |
|---------|------------|-------------------|
| `/create-agent` | `.claude/skills/create-agent/SKILL.md` | Scaffold `agents/agent.{name}/` with defaults |

## Example stub (copy shape for new commands)

- **Name**: `/my-command`
- **Location**: `.claude/commands/my-command.md`
- **Args**: `topic` (optional)
- **Does**: One paragraph describing behavior.

```json
{ "ai_file_metadata": {
    "path": "agents/agent.knowledge-base/KNOWLEDGE/ALL_COMMANDS_LIST.md",
    "description": "Inventory of slash commands and where they live.",
    "auto_update_settings": { "on_command": { "name": "" }, "task_is_done": true },
    "tags": ["knowledge", "commands"],
    "developer_notes": [""],
    "notes_for_ai": ["Add a row when a new .claude/commands/*.md is introduced."]
} }
```
