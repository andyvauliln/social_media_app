# AI in github-oss — Functionality & Implementation

---

## Providers

Three ways to run AI against a cloned repo. The user picks one in the Ask AI modal.

### OpenRouter
Calls the OpenRouter API directly from the server. Returns the answer inline in the UI. No local agent process is started. Best for quick, self-contained questions.

### Claude Code (`ragent.claude.sh`)
Clones the repo to `github-projects/<collection>/<project_name>/` (matching the project index structure), then runs:

```bash
./ragent.claude.sh --add-dir github-projects/<collection>/<project_name>
```

Claude Code starts with full access to the repo directory and all project plugins/tools defined in `ragent.claude.sh`. The user interacts with it in the terminal session.

### Cursor (`ragent.cursor.sh`)
Clones the repo to the same `github-projects/<collection>/<project_name>/` location, then runs:

```bash
./ragent.cursor.sh --workspace github-projects/<collection>/<project_name>
```

The Cursor agent starts with the repo as its workspace. Flags like `--mode ask`, `--mode plan`, or `--print` can be forwarded.

**Clone path convention** — derived from the project index (`!index.jsonc`):
- `collection` field → folder under `github-projects/`
- `progect_name` field → subfolder within that collection
- Example: `hermes-agent` in `coding-terminals` → `github-projects/coding-terminals/hermes-agent/`

---

## Global Context — why it exists

Global context is for reasoning across a **topic** rather than a single repo.

**Scenario:** you're exploring all repos tagged with the GitHub topic `social-media-scheduling`. You ask: _"What authentication patterns do these projects use?"_ That question isn't about one repo — it's about patterns across the whole collection.

Global mode stores Q&A keyed by `project-slug / github-topic`:

```
data/global_context/
  <project-slug>/
    <topic-key>.md      ← append-only log; grows with every answer
    <topic-key>.json    ← structured turn history
```

Each new question for the same topic gets the full prior `.md` log (up to 100KB) injected as context, so knowledge accumulates over time. You can download the notes as `.md`, `.json`, or `.zip` from the Global Context modal in the header.

**When global context is useful:**
- Building a knowledge base about an OSS ecosystem or topic area
- Comparing patterns/approaches across many repos
- Saving research notes that span multiple sessions

**When it is not needed:**
- You have a question about one specific repo → use repo mode instead
- One-off exploration with no intent to revisit

---

## Feature 1 — Keyword Generation

**Endpoint:** `POST /api/ai/keywords`  
**Model:** `OPENROUTER_KEYWORDS_MODEL` (default `google/gemini-2.5-flash`)  
**Used in:** `index.html` (new project search) and `project.html` (extend search)

User types a natural-language description → server asks the model for `{"keywords": [...]}` → returns 5–20 lowercase search phrases as chips used in GitHub queries.

Limits: input max 8000 chars, output max 20 keywords at 120 chars each.

---

## Feature 2 — Repo-scoped Ask AI

**Endpoint:** `POST /api/ai/ask` with `contextMode: "repo"`

### OpenRouter path

```
1. ensureClone(owner/repo)
   └─ looks up owner/repo in github-projects/!index.jsonc by github URL
      → clones to github-projects/<collection>/<progect_name>/repo  (--depth 1)
      → or `git pull` if already cloned
      → falls back to github-projects/misc/<reponame>/repo if not in index

2. git ls-files  →  all tracked paths

3. resolveFilteredPaths(userPrompt, paths)
   ├─ if OPENROUTER_API_KEY: filterPathsWithModel()
   │    └─ FILTER_MODEL receives question + up to 2500 paths
   │       returns {"paths":[...]} with ≤25 picks
   └─ else: heuristicPickPaths()
        └─ scores: readme/manifest (+100/+80), .md/.txt (+25),
           source files (+15), shallow depth (+8), no node_modules/vendor

4. buildFileContextBundle(repoRoot, filteredPaths)
   └─ reads each file (skip binary, truncate at 100KB)
      wraps in ### filename ``` content ``` blocks

5. Build prompt:
   System: "You are a senior software engineer. Answer using the repository
            file excerpts. Be concise and accurate."
   User:   # Repository: owner/repo
            ## Question
            <user prompt>
            ## Selected files
            <file blocks>

6. POST to openrouter.ai/api/v1/chat/completions → return {lastTurn}
```

### Claude Code path

```
1. ensureClone → github-projects/<collection>/<progect_name>/repo
2. exec: ./ragent.claude.sh --add-dir github-projects/<collection>/<progect_name>/repo
```

Claude Code opens interactively with access to the repo. The user types their question directly in the Claude Code session.

### Cursor path

```
1. ensureClone → github-projects/<collection>/<progect_name>/repo
2. exec: ./ragent.cursor.sh --workspace github-projects/<collection>/<progect_name>/repo
```

Cursor agent opens with the repo as its workspace. Optional flags (`--mode ask`, `--mode plan`, `--print`) can be appended.

---

## Feature 3 — Global-scoped Ask AI

**Endpoint:** `POST /api/ai/ask` with `contextMode: "global"`

Does not clone anything. Reasons over accumulated notes for a project+topic pair.

### OpenRouter path

```
1. Load data/global_context/<slug>/<topic>.md (prior Q&A log, max 100KB)
2. Load last turn from data/global_context/<slug>/<topic>.json
3. Build prompt:
   # Search project: <slug>
   ## GitHub topic: <topic>
   ## Context from this project (repos / topic)   ← topicContextBlock from UI
   ## Prior global notes                           ← .md content
   ## Previous turn (context)                      ← last answer excerpt
   ## Question
   <user prompt>
4. Call OpenRouter
5. Append answer to .md (permanent log)
6. Save structured session to .json
```

### Claude Code / Cursor path

Same prompt is built, then passed as the opening message when launching the agent:

```bash
./ragent.claude.sh --add-dir data/global_context/<slug>
# or
./ragent.cursor.sh --workspace . --mode ask
```

---

## Models

| Role | Env var | Default |
|---|---|---|
| Path filter | `FILTER_MODEL` | `minimax/minimax-m2.5` |
| Keyword gen | `OPENROUTER_KEYWORDS_MODEL` | `google/gemini-2.5-flash` |
| Answer (OpenRouter) | user-selected in UI | any model with ctx > 4096 |
| Cursor agent | `CURSOR_MODELS` (extra labels) | built-in Cursor model list |
| Claude Code | `--model` flag in ragent.claude.sh | default from Claude Code config |

---

## Hard Limits

| Constant | Value | Effect |
|---|---|---|
| `MAX_PATHS_LIST` | 2500 | paths sent to filter model |
| `MAX_FILTERED_FILES` | 25 | files included in prompt |
| `MAX_BYTES_PER_FILE` | 100 000 | file truncated with `[truncated]` |
| `MAX_GLOBAL_PRIOR_MD` | 100 000 | prior notes truncated |
| `MAX_KEYWORDS_FROM_AI` | 20 | keyword chips returned |

---

## No-key Fallback

If `OPENROUTER_API_KEY` is absent:
- `POST /api/ai/keywords` → 503
- `POST /api/ai/ask` (OpenRouter) → 503
- Path filtering falls back to `heuristicPickPaths()` — pure JS scoring, no API call
- Claude Code and Cursor providers still work — they use their own auth
