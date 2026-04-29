# MCP servers (registry)

| Server | Config | Notes (example) |
|--------|--------|-------------------|
| *example* | `.mcp.json` | Placeholder row; document real servers from your `.mcp.json` |

## Example `.mcp.json` fragment

```json
{
  "mcpServers": {
    "example-server": {
      "command": "npx",
      "args": ["-y", "@example/mcp-server@latest"]
    }
  }
}
```

```json
{ "ai_file_metadata": {
    "path": "agents/knowledge-base/KNOWLEDGE/ALL_MCP_LIST.md",
    "description": "Human-readable list of MCP servers and how they are launched.",
    "auto_update_settings": { "on_command": { "name": "" }, "task_is_done": true },
    "tags": ["knowledge", "mcp"],
    "developer_notes": [""],
    "notes_for_ai": ["Mirror entries when .mcp.json changes; redact secrets."]
} }
```
