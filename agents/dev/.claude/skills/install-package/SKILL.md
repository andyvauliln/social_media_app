---
name: install-package
description: Install Python or JS packages with the project standard (root-common + per-agent local), then verify imports and init flow.
argument-hint: "<package> scope=<global|agent.dev|telegram.app|...>"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

## Goal

Install dependencies correctly for this repo using the hybrid model:
1) root-common packages shared across agents/apps
2) local packages for one specific agent/app
3) script.init.sh single point of truth for the project everything that need to be installed shoud be set there.
4) script.init.sh also handling applications and agent installation from the start.config.jsonc file by executing init script in every application, github project and agent folder.

## Core Concepts

### 1) TS,JS/Node/Bun dependency model
- Common JS dependencies live in root `package.json`.
- Agent-only JS dependencies live in that agent/app `package.json`.
- All installation should hapen in a script.init.sh file in a root of the project
- Agent local install command: `cd <agent-path> && bun add <pkg>`.
- Agent scripts can import root packages (for example `jsonc-parser`) if root init script was executed.

### 2) Python dependency model
- Python is environment-based (interpreter/venv), not folder-walk resolution like Node.
- For Python services, install dependencies in their own project path (for example via requirements or `pyproject.toml` flow used by that service).
- If a shared Python baseline is needed later, use one root `.venv` strategy explicitly and document it before adding packages.

### 3) Init script flow
- `script.init.sh` always runs root `bun install` first.
- Then it executes all entries from `"common"` in `start.config.jsonc`.
- Then it executes `"services"` where `"enabled": true`, running each entry's `init` command in that entry's `path`.
- This means package installation policy is enforced by:
  - root `package.json`,
  - per-service/agent `package.json` or Python install files,
  - `start.config.jsonc` init commands.

## Ownership Policy

- Common JS package used by multiple agents/apps -> install at repo root.
- Package used by only one agent/app -> install in that agent/app.
- Do not add shared wrappers unless explicitly needed for shared code (not just shared dependency).
- Keep `start.config.jsonc` init commands aligned with actual runtime:
  - JS services -> `bun install`
  - Python services -> existing Python init command for that service.

## Installation Playbook

1. Identify target scope:
- `global` (root common JS), or
- one concrete service/agent from `start.config.jsonc`.

2. Detect is it js package or python package, if not sure ask user

3. Install with the right command:
- JS global: `cd <repo-root> && bun add <pkg>`
- JS local: `cd <target-path> && bun add <pkg>`
- Python local (requirements-based): edit requirements and run the service init command
- Python local (pyproject/uv-based): use that service's documented uv flow

4. Validate:
- run `./script.init.sh` from root
- run a minimal import check from target runtime path.

## Examples

### Example A: Add common JS package (`jsonc-parser`)
```bash
cd /path/to/repo
bun add jsonc-parser
./script.init.sh
```

Import from an agent script:
```js
import { parse } from "jsonc-parser";
```

### Example B: Add agent-only JS package (`zod`) to `agent.content-factory`
```bash
cd /path/to/repo/agents/agent.content-factory
bun add zod
cd /path/to/repo
./script.init.sh
```

Import in that agent:
```js
import { z } from "zod";
```

### Example C: Verify root-common + local import together
```bash
cd /path/to/repo/agents/agent.content-factory
bun -e "import { parse } from 'jsonc-parser'; import { z } from 'zod'; console.log(typeof parse, z.string().safeParse('ok').success)"
```

Expected output:
- `function true`

# NOTES
- FIX IF ANY ERRORS IN INSALLATION 
- ASK USER IF NOT SURE ABOUT YOUR ACTIONS

