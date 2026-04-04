## PURPOSE:
- have aggreation of knowledge from individual subproject


## AI_TODO: `make sync command and skill should be sync with a notion can be added as plugin or whatever`

## AI_TODO: `NEED /commnand and skill that will collect all  AI_TODO or NAME_TODO and add make task for them and after remove them from files`

## AI_TODO: `NEED /commnand and skill that will collect all  AI_RESEARCH topics and make research task for them in research agent`

## Example index entries (template)

- `KNOWLEDGE/CODE_GUIDANCE.md` — principles and TODO/research conventions
- `KNOWLEDGE/ALL_AGENTS_LIST.md` — registered agents
- `KNOWLEDGE/models/INDEX.md` — model catalog

```json
{ "ai_file_metadata": {
    "path": "agents/agent.knowledge-base/KNOWLEDGE/!INDEX.md",
    "description": "Top-level knowledge base index and maintenance TODOs.",
    "auto_update_settings": { "on_command": { "name": "" }, "task_is_done": false },
    "tags": ["knowledge", "index"],
    "developer_notes": [""],
    "notes_for_ai": ["Add links when new KNOWLEDGE files are added; resolve AI_TODOs when commands exist."]
} }
```
