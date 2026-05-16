# OSS Intelligence API

Runs git clones, OpenRouter (path filter + answer), and appends turns to **`USER_AI_DATA/__thread/session.json`** per clone (one conversation log; UI shows it as a single accordion).

## Setup

```bash
cd server
cp .env.example .env
# Set OPENROUTER_API_KEY (required for /api/models and /api/ai/ask)
# Optional: GITHUB_TOKEN for private repos
npm install
npm run dev
```

Default listen: `http://127.0.0.1:3847`.

The same process **serves the HTML** from the repo root (`index.html`, `project.html`, `data/`, …). Open **`http://127.0.0.1:3847/`** after starting.

**From repo root (one command):**

```bash
npm start
```

**Or from `server/`:**

```bash
npm run dev
```

Sensitive paths (`server/`, dotfiles, `node_modules`, `.git`) are **not** served as static files.

## CORS

Only needed if you host the HTML on another origin. If unset, all origins are allowed (dev only).

## Frontend API URL

When the page is served from this server, [`project.html`](../project.html) calls **`/api/...`** on the same host (no `OSS_API_BASE`). For `file://` opens, it falls back to `http://127.0.0.1:3847`.
