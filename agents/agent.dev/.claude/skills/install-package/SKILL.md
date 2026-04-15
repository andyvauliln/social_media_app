---
name: install-package
description: Installs a Python or Node package into the correct scope (global common layer or a specific agent/app) by reading start.config.jsonc to resolve paths and detecting the runtime from manifest files. Use when the user runs /install-package with a package name and scope.
argument-hint: "<package> scope=<global|service-name>"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

## Invocation

```
/install-package <package> scope=<target>
```

- `<package>` — package name (e.g. `requests`, `axios`, `python-dotenv`)
- `scope=global` — installs into the common layer
- `scope=<name>` — any `"name"` value from `start.config.jsonc` (e.g. `telegram-bot`, `content-factory`, `cron-supervisor`)

---

## Reference

Read `agents/agent.dev/.claude/skills/install-package/knowledge.md` before proceeding. It contains all concepts, decisions, workspace rules, scope resolution, and type detection logic used in the steps below.

---

## Steps

### 1. Resolve scope → path

```bash
ROOT=$(git rev-parse --show-toplevel)
CONFIG="$ROOT/start.config.jsonc"
```

- If `scope=global`: path is determined by runtime (see step 2) — Python → `packages/python.common`, Node → `packages/node.common`.
- Otherwise: parse `start.config.jsonc` (both `"common"` and `"services"` arrays) and find the entry whose `"name"` matches the scope value. Use its `"path"`.
- If no match is found: stop and tell the user the valid scope values from the config.

### 2. Detect runtime

In the resolved path:

- `pyproject.toml` present, no `package.json` → Python/uv
- `package.json` present, no `pyproject.toml` → Node/bun
- Both present → ask user which
- Neither present → ask user which, then create the manifest (see knowledge.md for the template)

For `scope=global` with no explicit runtime context: ask the user "Python or Node?"

### 3. Ensure manifest exists

If the target path has no manifest yet, create it before adding the package:

Python — create `<path>/pyproject.toml`:
```toml
[project]
name = "<derived-from-folder-name>"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = []
```

Node — create `<path>/package.json`:
```json
{
  "name": "<derived-from-folder-name>",
  "private": true,
  "dependencies": {}
}
```

### 4. Install

**Python (uv)** — run from repo root:
```bash
uv add <package> --package <project-name>
```
`<project-name>` is the `name` field from the target `pyproject.toml`.

**Node (bun)** — run from the target path:
```bash
cd "$ROOT/<path>" && bun add <package>
```

### 5. Confirm

Report to the user:
- Package name and installed version
- Which manifest was updated (relative path)
- Reminder: run `uv sync` (Python) or `bun install` (Node) at the repo root to propagate the change to all workspace members
