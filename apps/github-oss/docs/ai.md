# AI — Functionality & Implementation

How the AI features of github-oss work: every UI control, the server endpoints
they call, the OpenRouter / agent integration, and a step-by-step view of how a
question becomes an answer.

> The server (`server/src/index.js`) is the **only** place that calls OpenRouter
> or spawns an agent. The browser never holds the OpenRouter key.

---

## 1. Components involved

| File | Role in AI |
|---|---|
| `index.html` | "Generate keywords with AI" modal in the New Search flow. |
| `project.html` | The **Ask AI** modal (repo-scoped), the **Collection Ask AI** modal, per-tab "Ask AI" buttons, the **Clone** button, and the doc-tab rendering of answers. |
| `server/src/index.js` | All AI endpoints. Calls OpenRouter (`openRouterChat`), runs the path-filter pipeline, and spawns the `ragent.*` agent scripts. |
| `ragent.claude.sh` / `ragent.cursor.sh` | Repo-root launcher scripts for the Claude Code / Cursor agents (spawned by the server). |
| `agents/dev/.claude/skills/github-installer/SKILL.md` | The skill the Claude agent runs to clone + set up a repo. |

External services: **OpenRouter** (`openrouter.ai/api/v1`) for chat + the model
list; **GitHub** for clones (server-side, with `GITHUB_TOKEN`).

### Providers

Every AI action picks one of three providers (`AI_PROVIDERS`), chosen by a radio
group. `normalizeAiProvider()` lower-cases and maps `claude-code` → `claude`.

| Provider | What it does |
|---|---|
| `openrouter` | Server calls the OpenRouter chat API and returns the answer inline. |
| `claude` | Server spawns `ragent.claude.sh` (detached); the user works with Claude Code in a terminal. |
| `cursor` | Server spawns `ragent.cursor.sh` (detached); the Cursor agent opens with the repo as workspace. |

---

## 2. UI element → logic map

### 2.1 Ask AI modal — `#aiModal` (`project.html`)

Opened by `openModal(repoId, opts)` from a repo row's **Ask AI** button or a
tab's **Ask AI** button.

| UI element | id / name | Read by | Becomes |
|---|---|---|---|
| **AI provider** (3 radios) | `name="aiProvider"` | `getAiProvider()` | `aiProvider` in the request body. |
| **OpenRouter model** | `#modelSelect` | `submitAiQuery()` | `userModel` (OpenRouter only). Populated by `loadModels()` → `/api/models`. |
| **Claude model** | `#claudeModelSelect` | `submitAiQuery()` | `claudeModel` (Claude only). From `/api/claude-models`. |
| **Cursor model** | `#cursorModelSelect` | `submitAiQuery()` | `cursorModel` (Cursor only). From `/api/cursor-models`. |
| **Question / Prompt** | `#aiPrompt` | `submitAiQuery()` | `prompt`. |
| **Ask AI / Run agent** button | `#askBtn` | `onclick=submitAiQuery()` | Sends `POST /api/ai/ask`. Label flips to "Run agent" for claude/cursor (`syncAiProviderUI()`). |
| **Result box** | `#aiModalResult` | — | Renders the answer (OpenRouter) or the launch command (agent). |

`syncAiProviderUI()` shows exactly one model `<select>` for the chosen provider.
The modal also carries `S.aiModalOpts` = `{ docFile, tabKey, tabLabel }` — set
when Ask AI is opened from a specific tab (see §2.3).

### 2.2 Collection Ask AI modal — `#collectionAiModal`

Opened by `openCollectionAiModal()` when a collection tab is active. Same
provider/model controls as §2.1, plus:

| UI element | id | Becomes |
|---|---|---|
| **Output folder** | `#collectionAiOutputFolder` | `outputFolder` (default `research/docs`) — where the answer `.md` is written. |
| **Prompt** | `#collectionAiPrompt` | `prompt`. |

Submits `POST /api/collections/:name/ai-ask` via `submitCollectionAiQuery()`.

### 2.3 Per-tab "Ask AI" buttons

Every repo tab pane has a toolbar (`tabPaneToolbarHtml()`) with an **Ask AI**
button carrying `data-tab-key` and `data-doc-file`. Clicking it opens `#aiModal`
with `opts = { tabKey, docFile }`. Before sending, `gatherTabContextForAsk()`
collects the tab's content into `tabContext` + `tabLabel`:

| Tab | `tabContext` source |
|---|---|
| `readme` | `r.readme` (fetched on demand if missing), ≤80 000 chars. |
| `stack` | Topics + `name@version` per package. |
| `matchfile` | The matched file's path + body. |
| `doc:<file>` | The doc file's content (`/api/repos/docs/file`). |

The answer is appended to a `docs/*.md` file — either the doc tab it was asked
from (`docFile`), or a fresh `qa-<timestamp>.md` if `docFile` is empty.

### 2.4 Keyword generation — `index.html` / `project.html`

The **Generate keywords with AI** button opens a small modal with a description
textarea; `POST /api/ai/keywords` turns the description into search-keyword
chips. (Covered from the search angle in [`search.md`](./search.md) §6.)

### 2.5 Clone button

Each repo row's **Clone** button calls `onAiCloneClick()` → `POST
/api/repos/ai-clone`, which runs the **github-installer** skill via the Claude
agent to clone + set up the repo.

---

## 3. Step-by-step flows

### 3.1 Keyword generation — `POST /api/ai/keywords`

```
User types a description → POST /api/ai/keywords { text }
  ├─ no OPENROUTER_API_KEY → 503
  ├─ text empty → 400 ; text > 8000 chars → 400
  ├─ openRouterChat(KEYWORDS_MODEL, [system, user])
  │    system: "respond with ONLY JSON {keywords:[...]}, 5–12 lowercase phrases"
  ├─ extractJsonObject(raw) → { keywords: [...] }
  └─ clean: trim + lowercase + collapse spaces, dedupe,
     cap each at MAX_KEYWORD_STRING_LEN (120), cap list at MAX_KEYWORDS_FROM_AI (20)
→ { keywords: [...] }  → chips added to the search form
```

Model: `OPENROUTER_KEYWORDS_MODEL` (default `google/gemini-2.5-flash`).

### 3.2 Repo Ask AI — OpenRouter path

`POST /api/ai/ask` with `aiProvider: "openrouter"`:

```
1. Validate — aiProvider valid, OR_KEY present, fullName + prompt + userModel set.

2. installRepoToCollection(fullName, collection)
   └─ clone/move the repo into github-projects/<collection>/<projectDir>/repo
      (plain `git clone --depth 1` or `git pull` if already there).

3. gitLsFiles(repoDir)            → every tracked path.

4. resolveFilteredPaths(prompt, paths)
   ├─ OR_KEY set  → filterPathsWithModel():
   │     FILTER_MODEL gets the question + up to MAX_PATHS_LIST (2500) paths,
   │     returns {"paths":[...]} — kept paths intersected with the real list,
   │     capped at MAX_FILTERED_FILES (25).
   └─ no OR_KEY   → heuristicPickPaths():  pure scoring, no API call (see §4).

5. buildFileContextBundle(repoDir, filteredPaths)
   └─ readRepoFile() each: skip binary, truncate at MAX_BYTES_PER_FILE (100 000),
      wrap as  ### path \n ``` content ```

6. Build the prompt:
   system: "You are a senior software engineer. Answer using the repository
            file excerpts…" (a doc-aware variant when docFile is set)
   user:   # Repository: owner/repo
           ## Tab context (<tabLabel>)        ← if asked from a tab
           ## Prior content in docs/<docFile> ← if appending to an existing doc
           ## Question
           <prompt>
           ## Selected files
           <file bundle>

7. openRouterChat(userModel, [system, user]) → answer text.

8. appendRepoDocAiTurn(fullName, docFile, turn)
   └─ append a formatted turn to docs/<docFile>.md
      (allocates qa-<timestamp>.md when docFile is empty).

→ { provider:"openrouter", docFile, docContent, lastTurn, contextMode:"repo" }
```

The browser renders `lastTurn` inline and switches the row to the `docFile` tab.

### 3.3 Repo Ask AI — Claude / Cursor agent path

`POST /api/ai/ask` with `aiProvider: "claude"` or `"cursor"`:

```
1. Validate — claudeModel / cursorModel required.
2. installRepoToCollection(fullName, collection)   → repo on disk.
3. launchRagentAsk(provider, { workspaceDir, prompt, agentModel }):
   ├─ buildRagentAskArgs():
   │    cursor → ragent.cursor.sh --workspace <dir> --trust [--model M] -p <prompt>
   │    claude → ragent.claude.sh --add-dir <reldir> [--model M] -p <prompt>
   └─ spawnRagentDetached() — detached process, output → data/ai-clone-logs/*.log
4. appendRepoDocAiTurn() — records a turn noting the launch + the command.
→ { provider, docFile, docContent, lastTurn, ragentLaunch:{ pid, command, logFile } }
```

The agent runs in its own process; the **answer itself is not captured back** —
the recorded turn only says "Launched agent" with the command. The browser shows
the command (and copies it to the clipboard).

### 3.4 Collection Ask AI — `POST /api/collections/:name/ai-ask`

```
1. Validate collection name + prompt + provider; resolve the output folder.
2. buildCollectionAskContext(collection, detail, repos)
   └─ a Markdown block: one ## section per project with GitHub URL, install
      state, and (from the browser) description / language / stars. Metadata
      only — no file contents. Capped at 120 000 chars.
3a. openrouter → openRouterChat(model, [system, contextBlock + question])
    → writeCollectionAskMarkdown() saves <collection>-ask-<ts>.md in the folder.
3b. claude/cursor → write a placeholder .md with the question + context,
    then launchRagentAsk() with a prompt telling the agent to read that file
    and write its answer into the output folder.
```

### 3.5 AI Clone — `POST /api/repos/ai-clone`

```
1. Validate fullName (owner/repo); mkdir the target repo dir.
2. runGithubInstaller(fullName, opts):
   buildGithubInstallerPrompt() → a prompt telling the Claude agent to run the
   github-installer skill (clone into github-projects/<collection>/<project>/repo,
   write <project>.init.sh, run it).
3. spawnRagentDetached('claude', ['-p', prompt])  — detached; logs to ai-clone-logs/.
→ { ok, cloned, pid, command, logFile }   (cloned=false until the agent finishes)
```

The browser then polls `clone-status` until the repo appears (`pollRepoCloneUntil`).

---

## 4. Path filtering — `resolveFilteredPaths()`

The OpenRouter repo ask can't send a whole repo to the model, so it picks ≤25
files. Two strategies:

**`filterPathsWithModel()`** (when `OPENROUTER_API_KEY` is set) — sends the
question plus up to 2500 paths to `FILTER_MODEL` (default `minimax/minimax-m2.5`)
and asks for `{"paths":[…]}`. The reply is intersected with the real path list
(hallucinated paths dropped) and capped at 25.

**`heuristicPickPaths()`** (no key) — pure scoring, no API call:

| Signal | Score |
|---|---|
| basename in `HEURISTIC_PRIORITY_BASE` (readme, manifests, …) | +100 |
| ends with `readme.md` | +80 |
| `.md` / `.txt` | +25 |
| source file (`.ts .js .py .rs .go …`) | +15 |
| shallow path (≤2 segments) | +8 |
| under `node_modules/` or `vendor/` | −1 (excluded) |

Top 25 by score, then the list is topped up with any remaining non-`node_modules`
paths.

`buildFileContextBundle()` then reads each picked file (`readRepoFile()`): a file
with a NUL byte in its first 8 KB is treated as binary and skipped; text over
100 000 chars is truncated with a `[truncated]` marker.

---

## 5. Server endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/ai/keywords` | POST | Description → search keywords (OpenRouter; 503 without key). |
| `/api/ai/ask` | POST | Repo-scoped Ask AI — openrouter / claude / cursor. |
| `/api/collections/:name/ai-ask` | POST | Collection-scoped Ask AI. |
| `/api/repos/ai-clone` | POST | Clone + set up a repo via the github-installer skill. |
| `/api/models` | GET | OpenRouter model list (proxied; 503 without key). |
| `/api/cursor-models` | GET | Cursor model labels (built-in + `CURSOR_MODELS`). |
| `/api/claude-models` | GET | Claude `--model` values (built-in + `CLAUDE_MODELS`). |
| `/api/repos/docs` | GET | List a repo's `docs/*.md` tab files. |
| `/api/repos/docs/file` | GET | Read one `docs/*.md` file. |
| `/api/repos/ai-session` | GET | Read `docs/session.json` turns — **see §9** (legacy). |

---

## 6. Where answers are stored

A repo's AI answers live under its project folder:

```
github-projects/<collection>/<projectDir>/
  repo/                     ← the cloned repository
  docs/
    qa-<timestamp>.md       ← an Ask AI conversation (one per "new doc")
    <docFile>.md            ← any doc tab Ask AI was pointed at
    notes.md                ← default notes file (created on clone)
    session.json            ← legacy AI session (see §9)
    qa-log.md               ← legacy AI log (see §9)
```

`listRepoDocTabFiles()` shows every `.md` file as a tab **except** the
`INTERNAL_DOC_FILES` set (`session.json`, `notes.json`, `notes-log.md`).

### AI turn — appended to `docs/<docFile>.md`

`appendRepoDocAiTurn()` appends `formatRepoAiTurnMarkdown(turn)`:

```markdown
## 2026-05-16T12:00:00.000Z

**Model:** anthropic/claude-sonnet-4-5

**Q:** <the question>

**A:**

<the answer>

---
```

The in-memory turn object:

```jsonc
{
  "prompt": "…",                 // the question
  "content": "…",                // the answer (or "Launched … agent" for agents)
  "userModel": "…",              // model id / label used
  "provider": "openrouter",      // openrouter | claude | cursor
  "filterModel": "minimax/…",    // OpenRouter path only
  "filteredPaths": ["src/…"],    // OpenRouter path only — files sent to the model
  "tabContext": "README",        // optional — the tab label the question came from
  "ts": "2026-05-16T…Z"
}
```

---

## 7. Models

| Role | Source | Default / list |
|---|---|---|
| Keyword generation | `OPENROUTER_KEYWORDS_MODEL` | `google/gemini-2.5-flash` |
| Path filter | `FILTER_MODEL` | `minimax/minimax-m2.5` |
| Answer (OpenRouter) | `#modelSelect` | `/api/models`, filtered to context > 4096, top 200 by context |
| Answer (Cursor) | `#cursorModelSelect` | `CURSOR_BUILTIN_MODEL_LABELS` + `CURSOR_MODELS` env |
| Answer (Claude) | `#claudeModelSelect` | `CLAUDE_BUILTIN_MODEL_LABELS` + `CLAUDE_MODELS` env |

If `/api/models` fails, `loadModels()` falls back to a hardcoded 4-model list.

---

## 8. Hard limits

| Constant | Value | Effect |
|---|---|---|
| `MAX_PATHS_LIST` | 2500 | paths sent to the filter model / scored |
| `MAX_FILTERED_FILES` | 25 | files included in the prompt |
| `MAX_BYTES_PER_FILE` | 100 000 | file truncated with `[truncated]` |
| `MAX_KEYWORDS_FROM_AI` | 20 | keyword chips returned |
| `MAX_KEYWORD_STRING_LEN` | 120 | max chars per keyword |
| `tabContext` slice | 120 000 | tab context chars sent with a question |
| `buildCollectionAskContext` | 120 000 | collection context block size |
| `INSTALL_TIMEOUT_MS` | 45 min | synchronous github-installer timeout |

---

## 9. Suggested improvements

### 9.1 Dead / stale code

- **`session.json` + `qa-log.md` are no longer written.** The ask flow uses
  `appendRepoDocAiTurn()` (→ `docs/<docFile>.md`); `appendRepoAiTurn()` (→
  `session.json` + `qa-log.md`) is **unreferenced**. `GET /api/repos/ai-session`
  reads `session.json` and so now always returns empty `turns`. Either wire
  `ai-session` to the doc files or delete the endpoint + `appendRepoAiTurn` +
  `repoAiLogMdPath`.
- The previous **"global context"** feature was removed; this doc replaces the
  stale description of it. Collection Ask AI (§3.4) is its successor.

### 9.2 Correctness / edge cases

- **Every OpenRouter ask clones the whole repo** (`installRepoToCollection`)
  just to read ≤25 files. For a one-off question this is a heavy, slow side
  effect. Consider fetching only the filtered files via the GitHub contents API
  when the repo isn't already installed.
- **Cloning via Ask AI bypasses temp_files seeding.** `submitAiQuery()` marks
  the repo cloned but does not call `seedPendingClonedRepos()` (see
  [`search.md`](./search.md) §8.4); the repo's `temp_files` are only flushed to
  `docs/` on the next clone-status sync. Call the seed sweep after an ask that
  clones.
- **Agent answers are never captured.** For claude/cursor the recorded turn is
  just "Launched … agent"; the real answer lives in the terminal or in files the
  agent writes. There is no callback to fold it back into the doc tab.
- **`filterPathsWithModel` silently truncates at 2500 paths** — a large repo's
  later files are invisible to the filter model. Surface this, or pre-rank with
  the heuristic before sending.
- **`extractJsonObject` is brittle** — it slices from the first `{` to the last
  `}`. Prose containing braces around the JSON breaks it. Prefer a JSON-mode
  request or a balanced-brace scan.
- **`openRouterChat` has no timeout or retry.** A slow/stuck model hangs the
  request indefinitely; a transient 429/5xx fails the whole ask. Add an
  `AbortController` timeout and one retry.
- **No streaming.** The answer appears only when fully generated — a long answer
  looks like a hang. OpenRouter supports SSE streaming.
- **`detached` agent spawns inherit the full `process.env`** and are unbounded
  in number. A burst of Ask AI / Clone clicks can spawn many agent processes.
  Consider a small concurrency cap.

### 9.3 Simplification & refactoring

- **The Ask AI modal and the Collection Ask AI modal are near-duplicates** —
  provider radios, three model selects, `sync*ProviderUI()`, `get*Provider()`,
  and the submit handlers all mirror each other. Extract one
  provider/model-picker component and one `runAiAsk(endpoint, body)` helper.
- **`buildRagentAskArgs` mutates the args array with `splice`** to insert
  `--model`. Build the array in final order instead — easier to read.
- **`/api/ai/ask` is one ~170-line handler** doing validation, two provider
  branches, prompt assembly, and persistence. Split into `validateAskBody()`,
  `runOpenRouterAsk()`, `runAgentAsk()`.
- **The system prompts are inline string literals** in three places. Move them
  to named constants so prompt wording is reviewable in one spot.

### 9.4 Functional improvements

- **Capture agent answers** — have `ragent.*` write the answer to a known file
  the server can read back into the doc tab (the collection path already does
  something like this).
- **Show the filtered file list in the UI** — `lastTurn.filteredPaths` already
  records which files were sent; surfacing them builds trust and helps debug
  bad answers.
- **Reuse an existing clone** — if the repo is already installed, skip the
  install step entirely instead of calling `installRepoToCollection` every time.
- **Collection ask is metadata-only.** `buildCollectionAskContext` sends
  descriptions/languages/stars but no code or READMEs — answers about
  *implementation* across a collection are necessarily shallow. Optionally fold
  in each repo's README.

### 9.5 Known limitations

- The OpenRouter key, `ragent.*` scripts, and the github-installer skill must
  all exist on the server host; without them the relevant providers 503 or fail.
- `git ls-files` requires the repo to be a real clone — the path filter sees
  only tracked files on the default branch (cloned `--depth 1`).
- Agent providers depend on the user's own Claude Code / Cursor auth and on a
  terminal being available to interact with.

---

## 10. No-key fallback

If `OPENROUTER_API_KEY` is absent:

- `GET /api/models`, `POST /api/ai/keywords`, and the OpenRouter branches of
  `POST /api/ai/ask` and `/api/collections/:name/ai-ask` → **503**.
- Path filtering falls back to `heuristicPickPaths()` — pure JS scoring, no API
  call.
- `loadModels()` in the browser falls back to a hardcoded 4-model list.
- The **Claude** and **Cursor** providers still work — they use their own auth,
  not the OpenRouter key.
