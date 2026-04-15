# Package Management — Concepts & Decisions

## Package managers

| Language | Tool | Why |
|----------|------|-----|
| Python | `uv` | Workspace-aware, `uv add <pkg>` writes to `pyproject.toml`, generates `uv.lock`, fast |
| Node/TS | `bun` | Already in use across all apps and agents, `bun add` writes to `package.json`, supports `--filter` |

---

## Workspace model

### Python — uv workspace

Root `pyproject.toml` declares all Python members:

```toml
[tool.uv.workspace]
members = [
  "packages/python.common",
  "agents/agent.*",
  "apps/*",
]
```

- A single `uv.lock` at the repo root tracks every Python dependency across all members.
- `uv sync` at the root installs all members in one shot.
- To add a package to a specific member: `uv add <pkg> --package <project-name>` (run from repo root).
- Each workspace member must have its own `pyproject.toml` with a `[project]` section and a unique `name`.

### Node — bun workspaces

Root `package.json` declares all Node members:

```json
{
  "workspaces": ["apps/*", "agents/*", "packages/*"]
}
```

- `bun install` at root hoists shared modules and links all workspace packages.
- To add a package to a specific member from root: `bun add <pkg> --filter <workspace-name>`.
- To add from inside the member folder: `cd <path> && bun add <pkg>`.

---

## Common layer

Packages that every agent/skill can rely on live in dedicated manifests:

| Type | Path | Install command |
|------|------|-----------------|
| Python | `packages/python.common/pyproject.toml` | `uv add <pkg> --package python-common` |
| Node | `packages/node.common/package.json` | `cd packages/node.common && bun add <pkg>` |

These are always installed first by `script.init.sh` (via the `"common"` section in `start.config.jsonc`), regardless of which services are enabled.

---

## Init system

`script.init.sh` reads `start.config.jsonc` and:

1. Runs all `"common"` entries unconditionally (no `enabled` check).
2. Runs `"services"` entries filtered by `"enabled": true`.

Each entry defines its own `"init"` command and `"path"`. The script changes into `path` and executes `init`.

`start.config.jsonc` structure:

```jsonc
{
  "common": [
    { "name": "python-common", "path": ".", "init": "uv sync" },
    { "name": "node-common", "path": "packages/node.common", "init": "bun install" }
  ],
  "services": [
    { "name": "telegram-bot", "type": "app", "enabled": true, "path": "apps/telegram-bot", "init": "uv sync --package telegram-bot", "start": "python3 main.py" },
    ...
  ]
}
```

---

## Scope resolution

When the user provides a `scope` argument:

| Scope value | Resolves to |
|-------------|-------------|
| `global` | `packages/python.common` (Python) or `packages/node.common` (Node) |
| anything else | Look up `"name"` field in `start.config.jsonc` (`common` + `services`) → use its `"path"` |

---

## Type detection (Python vs Node)

Given a resolved `path`:

| Condition | Action |
|-----------|--------|
| `pyproject.toml` exists, no `package.json` | Python → use `uv` |
| `package.json` exists, no `pyproject.toml` | Node → use `bun` |
| Both exist | Ask user which runtime |
| Neither exists | Ask user, then create the appropriate manifest first |

For a brand-new agent that needs Python deps, create `agents/agent.X/pyproject.toml`:

```toml
[project]
name = "agent-x"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = []
```

The root `pyproject.toml` glob `agents/agent.*` will pick it up automatically.

---

## Re-syncing after adding packages

- **Python (any member)**: `uv sync` at repo root — re-resolves and installs all workspace members.
- **Node (any member)**: `bun install` at repo root — re-links all workspace packages.
