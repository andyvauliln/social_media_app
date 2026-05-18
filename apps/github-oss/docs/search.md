# Project Search — Functionality & Implementation

How the **New Project Search** flow in `index.html` works: every UI control, the
client-side discovery engine in `github-discovery.js`, the GitHub API calls it
makes, and the local server endpoints it touches.

> A "project" here is a *saved GitHub search* — a named query plus its results,
> persisted as one JSON file under `data/projects/`.

---

## 1. Components involved


| File                  | Role in search                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`          | Renders the New Search modal, reads the form, calls the discovery engine, enriches results, saves the project file.                                 |
| `github-discovery.js` | Pure discovery engine. Builds GitHub query strings and paginates `search/repositories` / `search/code`. Shared with `project.html` (extend search). |
| `server/src/index.js` | Local Fastify server. Serves the static HTML and exposes `/api/projects`* (list/save/delete) and `/api/ai/keywords` (AI keyword generation).        |


**Important:** the GitHub search itself runs **entirely in the browser**. The
server is never a proxy for `api.github.com` — it only stores result files and
generates keyword suggestions. The browser authenticates to GitHub directly with
a token resolved by `resolveGhToken()` (`window.GITHUB_TOKEN`, else
`localStorage['GITHUB_TOKEN']`).

---

## 2. UI element → logic map

The modal is `#searchModal` (`index.html:384`). Each control:


| UI element                                | id / name                                             | Read by                                | Becomes                                                                                               |
| ----------------------------------------- | ----------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Project name**                          | `#projectName`                                        | `startSearch()`                        | `name` field of the saved project; also drives the file slug.                                         |
| **Keyword input + chips**                 | `#keywordInput`, `keywords[]`                         | `flushKeywordInput()` → `addKeyword()` | `keywords[]` array. Each keyword is a **separate** GitHub query; results are deduplicated by repo id. |
| **Generate keywords with AI**             | `#searchAiKeywordsBtn`                                | `runSearchAiKeywordsGenerate()`        | `POST /api/ai/keywords` → returned phrases pushed in via `addKeyword()`.                              |
| **Language chips + extra-language input** | `selectedLangs` Set                                   | `startSearch()`                        | `langs[]` → `language:` qualifiers in the query.                                                      |
| **Min stars**                             | `#searchMinStars`                                     | `readDiscoveryOptions()`               | `opt.minStars` → `stars:>N` qualifier and a client-side post-filter.                                  |
| **Exclude forks**                         | `#searchExcludeForks`                                 | `readDiscoveryOptions()`               | `opt.excludeForks` → `fork:false` qualifier and a client-side filter.                                 |
| **Search scope** (4 radios)               | `name="searchDiscoveryScope"`                         | `readDiscoveryOptions()`               | Selects one of four discovery modes — see §4.                                                         |
| ↳ `meta`                                  | `#searchScopeMeta`                                    |                                        | `inName + inDescription + inTopics` repository search.                                                |
| ↳ `readme`                                | `#searchScopeReadme`                                  |                                        | `inReadme`-only search with README-body verification.                                                 |
| ↳ `code`                                  | `#searchScopeCode`                                    |                                        | `includeCodeSearch` — GitHub code search over file contents.                                          |
| ↳ `file`                                  | `#searchScopeFile`                                    |                                        | `includeFileSearch` — code search scoped to a named file.                                             |
| **File name / path**                      | `#searchFileName`                                     | `readDiscoveryOptions()`               | `opt.fileName` → `filename:` (no slash) or `path:` (has slash) qualifier.                             |
| **File must contain**                     | `#searchFileContains`                                 | `readDiscoveryOptions()`               | `opt.fileContains` → phrase searched inside that file.                                                |
| **Fetch dependencies during search**      | `#searchExtractPackages`                              | `readExtractPackages()`                | `extractPackagesOnSearch` → enrichment scans `package.json`/`requirements.txt`.                       |
| **Max results** (hidden)                  | `#maxResults`                                         | `startSearch()`                        | `maxResults`, clamped to `[1, 1000]`.                                                                 |
| **Search GitHub** button                  | `#startBtn`                                           | `onclick=startSearch()`                | Entry point for the whole flow.                                                                       |
| **Progress bar / status**                 | `#progressFill`, `#modalStatus`, `#modalStatusDetail` | `setProgress()`                        | Driven by the `onProgress(pct, msg, detail)` callback.                                                |


The four scope radios are mutually exclusive and only one mode runs per search.
`#searchFileScopePanel` (the file-name / file-contains inputs) is shown only when
the `file` radio is selected (`bindDiscoveryScopeRadios()`).

### How a scope radio becomes an options object

`readDiscoveryOptions('search')` (`index.html:783`) reads the checked radio and
returns a flat object the engine understands. The radio value is *expanded* into
boolean flags:


| Radio value | Resulting flags                                  |
| ----------- | ------------------------------------------------ |
| `meta`      | `inName:true, inDescription:true, inTopics:true` |
| `readme`    | `inReadme:true` (all others false)               |
| `code`      | `includeCodeSearch:true`                         |
| `file`      | `includeFileSearch:true, fileName, fileContains` |


Plus `minStars` and `excludeForks` from the always-visible filter row.

---

## 3. Step-by-step: what happens on "Search GitHub"

```
User clicks #startBtn → startSearch()   (index.html:1074)
```

1. **Flush keyword input** — `flushKeywordInput()` commits any half-typed keyword
  still in the textbox so it is not lost.
2. **Validate name** — empty `#projectName` aborts and focuses the field.
3. **Validate scope** — `validateDiscoveryBeforeSearch('search', keywords)`:
  - `file` mode requires a file name; requires either *file contains* text or
   at least one keyword.
  - every other mode requires at least one keyword.
4. **Read inputs** — `maxResults` (clamped `1–1000`), `discoveryOpt` from
  `readDiscoveryOptions()`, `extractPkgs` from `readExtractPackages()`.
  Inputs are gathered by `gatherSearchInputs()`, which also rejects a missing
  GitHub token up front (unauthenticated search is rate-limited almost
  immediately).
5. **Show progress UI** — `#progressSection` becomes visible; `#startBtn` is
   disabled; an `AbortController` (`searchAbort`) is created; the Cancel button
   relabels to "Stop".
6. **Run discovery** — `runDiscoveryAndEnrich()` calls `runGitHubRepoDiscovery({
   keywords, langs, maxResults, options, ghFetch, sleep, onProgress,
   onKeywordResult, onPartial })` (the engine — see §4). Returns an array of
   *raw* GitHub repo objects, capped at `maxResults`. `onKeywordResult`
   accumulates per-keyword contribution counts; `onPartial` records if GitHub
   truncated the scan.
7. **Enrich** — `enrichRepos(repos, onProgress, enrichOpts)` (see §5). Returns
   normalised repo records with commit counts (and optionally packages / matched
   file text).
8. **Derive top languages** — count `language` across enriched repos, keep the
   top 5 (`topLangs`).
9. **Allocate a file number** — `nextAvailableProjectNum()` does `GET /api/projects`,
   finds the highest leading number, returns `+1`. `buildFileName(num, keywords)`
   produces `"<num>_<slug>"` from the first 3 keywords (`keywordSlug()`).
10. **Persist** — `persistProject()` → `saveProjectJsonFile()` → `POST
    /api/projects/save` writes `data/projects/<num>_<slug>.json` — see §8 for the
    full schema (`name`, `keywords`, `repos[]`, `searchOptions`, `keywordCounts`,
    `partial`, `searchError`, …).
11. **Finish** — `finishSearch()` resets state, `closeModal()`, `loadProjects()`
    re-renders the card grid. On a thrown error: `setProgress(0, "Error: …")` (or
    "Search cancelled." if the user hit Stop) and the modal stays open.

Progress percentages: the **engine owns 5–80%** (discovery), the **page owns
80–100%** (`80–99%` enrichment, `100%` saving). The engine maps a 0–1 work
fraction into its band via `progressPct()`.

---

## 4. The discovery engine — `runGitHubRepoDiscovery()`

Pure function: it receives `ghFetch` and `sleep` as injected dependencies (so it
has no DOM or token coupling) and returns raw repo objects. It runs **exactly
one** of four modes based on `options`.

Shared building blocks:

- **`phraseSearchTermForGitHub(kw)`** — a multi-word keyword is wrapped in quotes
  (`open source` → `"open source"`) so GitHub treats it as a contiguous phrase.
  This makes search **strict by default**. Single words and already-quoted
  strings pass through unchanged.
- **`seenIds` Set** — global dedup across keywords and modes; a repo id is added
  at most once.
- **Pagination budget** — `maxResults` is divided across keywords and pages so a
  single keyword cannot consume the whole quota:
  `budgetPerKw = ceil(maxResults / keywords.length / PER_PAGE)`. `PER_PAGE` is
  **100** (the GitHub Search API maximum) — fewer round-trips, fewer rate-limit
  hits.
- **`repoCache`** — code-search hits return thin repo objects that need a
  metadata backfill (`GET /repos/:o/:r`); the cache (`backfillRepoMetadata()`)
  fetches each repo at most once per run.
- **Rate-limit pacing** — `sleep()` between pages: `120ms` for repo search,
  `850ms` for code search (GitHub code search is rate-limited far harder).
- **Error handling** — HTTP `422` (bad query) or `403` (rate limit) breaks the
  current page loop gracefully and fires `onPartial(reason)` once; any other
  error is re-thrown. (`ghFetch` itself retries a rate-limited `403` once after
  waiting `Retry-After` / `X-RateLimit-Reset`.)
- **`onKeywordResult(keyword, count)`** — fired per keyword with the number of
  *unique* repos it contributed.

### Mode A — `meta` (repository name / description / topics)

The default. `anyRepoScope` is true and `readmeOnly` is false.

```
for each keyword:
  q = buildRepoSearchQuery(kw, langs, opt)
    → '"phrase" in:name,description,topics [language:X …] [stars:>=N] [fork:false]'
  for page = 1 .. budgetPerKw:
    GET https://api.github.com/search/repositories
        ?q=…&sort=stars&order=desc&per_page=100&page=N
    for each item:
      skip if seenIds has it, or item.fork
      seenIds.add(id); repos.push(rawItem)
    sleep(120ms)
```

Results come back already sorted by stars (descending). No extra verification —
GitHub's index decides relevance.

### Mode B — `readme` (verified README phrase)

`readmeOnlyScope(opt)` is true. GitHub's `in:readme` qualifier matches its
*indexed* README, which can be stale or match loosely. So this mode
**re-verifies every candidate**:

```
for each keyword:
  q = '"phrase" in:readme …'
  readmeFetches = 0
  for page = 1 .. MAX_REPO_SEARCH_PAGES (34):
    GET search/repositories?q=…&sort=stars&per_page=100&page=N
    for each candidate repo:
      skip forks / star-fork filter failures
      stop the keyword if readmeFetches ≥ MAX_README_VERIFY_PER_KEYWORD (80)
      text = fetchReadmeTextDecoded(full_name)   ← GET /repos/:o/:r/readme, base64-decode
      readmeFetches++; sleep(90ms)
      if NOT readmeContainsKeywordPhrase(text, kw): skip   ← real substring check
      keep repo, attach { readme, readme_fetched:true }
    sleep(120ms); stop early if page returned < 100 items
```

`readmeContainsKeywordPhrase` lower-cases and whitespace-collapses both the
README body and the needle, then does an `indexOf`. This is the only mode that
pre-fetches the README and stores it on the repo record. README downloads are
capped per keyword (`MAX_README_VERIFY_PER_KEYWORD`) so a broad query cannot
trigger ~1000 sequential fetches.

### Mode C — `code` (GitHub code search)

Runs when `includeCodeSearch` is set and no repo scope matched, **or** as an
*extra pass* after Mode A/B if those returned fewer than `maxResults`.

```
for each keyword:
  cq = buildCodeSearchQuery(kw, langs)   → '"phrase" language:X language:Y'
  for page = 1 .. budgetCodePerKw:
    GET https://api.github.com/search/code?q=…&per_page=100&page=N
    processCodeSearchPage(ctx, items, null):    ← shared with Mode D
      for each code hit:
        repo = hit.repository
        skip if seenIds has repo.id
        if repo.stargazers_count / fork are missing:
          backfillRepoMetadata()   ← cached GET /repos/:o/:r, sleep(80ms)
        apply star/fork filter; seenIds.add; repos.push
    sleep(850ms)
```

Code search hits report the *file* that matched, but Mode C keeps only the
**repository**. Because code-search repo objects are minimal, missing fields are
backfilled via `backfillRepoMetadata()` (cached per run). The per-hit loop is
the shared `processCodeSearchPage()` helper, also used by Mode D.

### Mode D — `file` (search inside a named file)

`fileSearchScope(opt)` is true. Runs first and returns immediately (it does not
fall through to the code pass). **Several keywords are allowed** — each keyword
*and* the "file must contain" phrase becomes its own search term.

```
fterms = [fileContains, ...keywords]   (deduped; at least one required)
for each fterm:
  fq = buildFileCodeSearchQuery(fterm, fileName, langs)
    → '"phrase" filename:package.json'      (no slash in fileName)
    → '"phrase" path:docs/README.md'        (slash present → path qualifier)
  for page = 1 .. budgetFilePerTerm:
    GET search/code?q=…&per_page=100&page=N
    processCodeSearchPage(ctx, items, fileName):   ← shared with Mode C
      backfill thin repo metadata if needed (cached)
      apply star/fork filter
      repos.push({ ...repo, search_file_path: hit.path })   ← keeps the matched path
    sleep(850ms)
```

The matched `hit.path` is stored as `search_file_path` so enrichment can later
download the actual file body. See §8 — `search_file_path` is a field on the
**saved repo record**, not doc-only metadata.

---

## 5. Enrichment — `enrichRepos()`

`index.html:1288`. Walks the raw repo list and produces the normalised record
shape that gets saved. For **each** repo, in series (paced by `sleep`):

1. **Normalise** — map GitHub field names to the project schema (`stargazers_count`
  → `stars`, `license.spdx_id` → `license`, etc.) and seed empty fields
   (`commit_count:null`, `temp_files:[]`, `cloned:false`, …).
2. **Commit count** — `GET /repos/:full_name/commits?per_page=1`, then parse the
   `Link: …rel="last"` header; the last-page number *is* the commit count. When
   there is no `rel="last"` link the repo has 0–1 commits, so the response body
   length is used directly instead of leaving `commit_count` `null`.
3. **Matched file** *(file mode only)* — if `fetchSearchFile` and a
   `search_file_path` exist, `ghFetchFile()` downloads and UTF-8-decodes
   (`decodeBase64Utf8()`) the file body into `search_file_text`.
   `search_file_path` is a **field on the saved repo record** (see §8): in file
   mode the discovery engine attaches the matched path to each repo object
   (`{ ...repo, search_file_path: hit.path }`), and enrichment reads it back to
   know which file to download. It is stored in the project JSON, not just docs.
4. **Packages** *(if "Fetch dependencies" was checked)* —
  `fillRepoPackagesForRecord()`:
  - JS/TS → `packagesFromTreeNpm()`: list the repo tree, find every
  `package.json` (≤25), read `dependencies` + `devDependencies`.
  - Python / Jupyter → `packagesFromTreePypi()`: same for `requirements.txt`.
  - Caps: `MAX_MANIFEST_FILES=25`, `MAX_PACKAGE_DEPS=500`.
5. **Stage `temp_files`** — `buildRepoTempFiles({ readme, packages, notes })`
   builds the 3-entry `temp_files` array (§8.4): the README markdown, the
   packages serialised as a Markdown+JSON stack doc, and an empty notes entry.
   `readme` / `packages` are **not** stored as top-level fields.

Enrichment reports progress every 5th repo (`80–99%` band).

---

## 6. Server endpoints touched by search


| Endpoint               | Method | Used for                                                                                                                                                                      |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/projects`        | GET    | List saved projects; `nextAvailableProjectNum()` and `loadProjects()`.                                                                                                        |
| `/api/projects/save`   | POST   | Write the result file. Filename validated by `assertSafeProjectFname` (path-escape guard).                                                                                    |
| `/api/projects/:fname` | DELETE | Delete a saved project (from the card grid, not the search flow).                                                                                                             |
| `/api/ai/keywords`     | POST   | AI keyword generation. Needs `OPENROUTER_API_KEY`; else `503`. Input ≤8000 chars; output ≤20 deduped lowercase phrases (`KEYWORDS_MODEL`, default `google/gemini-2.5-flash`). |


All GitHub API calls (`search/repositories`, `search/code`, `/repos/*`,
`/readme`, `raw.githubusercontent.com`) go **straight from the browser** —
they do not appear in this table because the server is not involved.

---

## 7. Improvements — applied

The items below were carried out across `index.html` and `github-discovery.js`.

### 7.1 Simplification & refactoring

- **`startSearch()` split.** The old ~85-line function is now four named steps:
  `gatherSearchInputs()` → `runDiscoveryAndEnrich()` → `persistProject()`, with
  `finishSearch()` resetting state.
- **Modes C & D dedup loop extracted** into `processCodeSearchPage(ctx, items,
  fileNameFallback)` — one shared per-hit loop; pass a file name to attach
  `search_file_path` (Mode D) or `null` to keep only the repo (Mode C).
- **`readDiscoveryOptions()`** now uses a `scopeOverrides` lookup table instead
  of four repeated `if` branches.
- **Headers consolidated** — one `ghHeaders()` (REST/Search) and one
  `ghAuthHeader()` (raw file bytes); `ghRestHeaders` removed.
- **`codeRepositoryToItem` dropped** — it was an alias of `fullRepoToSearchItem`.
- **Progress bands named** — the engine maps a 0–1 fraction through
  `progressPct()` (`PROGRESS_START`/`PROGRESS_END`); the page owns 80–100%.
- **`keywordSlug()`** extracted; `buildFileName` / `previewFileName` reuse it.

### 7.2 Correctness / edge cases

- **`minStars` off-by-one fixed** — query now uses `stars:>=N` and the client
  filter rejects only `stars < minStars`, so exactly-N matches the "Min stars"
  label.
- **Missing-token check** — `gatherSearchInputs()` aborts with a clear message
  instead of letting GitHub return a raw rate-limited error.
- **1000-result cap** surfaced as a form hint in the modal.
- **Cancel works** — `searchAbort` (`AbortController`) is threaded through every
  `fetch`; the Cancel button relabels to "Stop" and aborts; the run ends with
  "Search cancelled."
- **Mode B README fetches capped** per keyword (`MAX_README_VERIFY_PER_KEYWORD`).
- **Commit count** — no `rel="last"` link now falls back to the response body
  length instead of leaving `commit_count` `null`.
- **UTF-8 file decode** — `ghFetchFile()` uses `decodeBase64Utf8()` (`TextDecoder`)
  so non-Latin file contents survive.
- **Rate-limit retry** — `ghFetch()` retries a `403` once after waiting
  `Retry-After` / `X-RateLimit-Reset` (capped at 10s).
- **Partial results flagged** — a truncated scan sets `partial: true` and
  `searchError` on the saved project; the final status line says "(partial …)".

### 7.3 Functional improvements

- **Per-keyword counts** — `onKeywordResult` accumulates each keyword's unique
  contribution into `keywordCounts` on the saved project.
- **Backfill cache** — `repoCache` fetches each code-search repo's metadata at
  most once per run.

### 7.4 Deferred (with reasons)

- **Move search to the server.** Would remove the `localStorage` token exposure
  (XSS surface) and lift browser rate limits, but it is a real architecture
  change — new server endpoints, the server holding `GITHUB_TOKEN`, streamed
  progress. Tracked as the recommended next step; `searchOptions` is already
  persisted so a server-side re-run is feasible.
- **Combine keywords with `OR`.** Faster for small keyword sets, but it changes
  result semantics and makes per-keyword counts impossible — the two
  improvements conflict, and per-keyword counts won.
- **Re-runnable search UI.** `searchOptions` is saved (the data half is done);
  the "Re-run / refresh" button belongs in `project.html`, outside this flow.
- **Structured progress object.** Would change the `onProgress` signature that
  `project.html` also depends on — breaking. Left as string detail.

### 7.5 Known limitations

- Search runs in the browser, so it is bound by the tab staying open and by
  GitHub's rate limits for that token.
- GitHub **code search** only indexes a subset of repos (default branch, under a
  size limit, some activity). Modes C/D miss matches that exist but are not
  indexed.
- Mode B's candidate set is still whatever GitHub's `in:readme` index returns;
  the real-fetch verification only filters that set, it cannot widen it.
- No incremental/streaming results — the UI shows nothing until the whole search
  and enrichment finish.

---

## 8. Data structures

### 8.1 Project file — `data/projects/<num>_<slug>.json`

One file per saved search. Written by `persistProject()`.

```jsonc
{
  "_fname": "12_algo-trading",      // file basename (no .json); also the project.html ?file= param
  "_num": 12,                       // leading number; nextAvailableProjectNum() returns max+1
  "schemaVersion": 1,               // shape version — bump on breaking changes
  "name": "Algo trading OSS",       // user-entered title; the card heading
  "keywords": ["algo trading", …],  // search terms; each is queried separately then deduped
  "languages": ["Python", "Rust"],  // language: filter chips chosen for the search
  "repoCount": 87,                  // repos.length; rendered as the card badge
  "topLangs": ["Python", "Go", …],  // 5 most common languages across repos (card chips)
  "createdAt": "2026-05-16T…Z",     // ISO timestamp the search finished
  "searchOptions": { … },           // discovery options used — §8.2; lets the search be re-run
  "keywordCounts": {"algo trading": 40, …},  // unique repos each keyword contributed
  "partial": false,                 // true if GitHub truncated the scan (422/403)
  "searchError": "",                // reason string when partial; "" otherwise
  "repos": [ { …repo record… } ],   // the results — §8.3
  "seeded": true                    // OPTIONAL — present only on bundled sample projects
}
```

### 8.2 `searchOptions`

The discovery scope + filters; mirrors what `readDiscoveryOptions()` produced.

```jsonc
{
  "minStars": 5,                    // → stars:>=N qualifier + client-side filter
  "excludeForks": true,             // → fork:false qualifier + client-side filter
  "inName": true,                   // Mode A — match repository name
  "inDescription": true,            // Mode A — match description
  "inTopics": true,                 // Mode A — match topics
  "inReadme": false,                // Mode B — match + verify README body
  "includeCodeSearch": false,       // Mode C — code search over file contents
  "includeFileSearch": false,       // Mode D — code search scoped to one file
  "fileName": "",                   // Mode D — filename: (no slash) or path: qualifier
  "fileContains": "",               // Mode D — phrase searched inside that file
  "extractPackagesOnSearch": false  // enrichment scanned dependency manifests
}
```

### 8.3 Repo record (`repos[]` element)

Produced by `enrichRepos()`. The first block is GitHub metadata; the rest is
populated by the search/enrichment pipeline or later by `project.html`.

```jsonc
{
  "id": 1296269,                    // GitHub repo id — the dedup key (seenIds)
  "name": "Hello-World",            // short repo name
  "full_name": "owner/Hello-World", // owner/name — used in every API path
  "description": "…",               // repo description ('' if none)
  "html_url": "https://github.com/…",  // repo page link
  "homepage": "",                   // project homepage if the repo sets one
  "language": "Python",             // GitHub's primary language — feeds topLangs + colors
  "stars": 1234,                    // stargazers_count
  "forks": 56,                      // forks_count
  "open_issues": 7,                 // open_issues_count
  "created_at": "…Z",               // repo creation timestamp
  "pushed_at": "…Z",                // last push — activity recency
  "topics": ["cli", "trading"],     // GitHub topics
  "license": "MIT",                 // SPDX id or license name ('' if none)
  "archived": false,                // repo archived flag
  "default_branch": "main",         // used for tree + raw-file fetches
  "commit_count": 312,              // from the commits Link header (null if unknown)
  "temp_files": [ { …temp file… } ],// staged readme/stack/notes — §8.4; removed after clone+seed
  "search_file_path": "",           // Mode D — path of the file that matched
  "search_file_text": "",           // Mode D — that file's body (if fetchSearchFile)
  "search_file_fetched": false,     // true once search_file_text is populated
  "cloned": false,                  // set later by project.html when the repo is cloned
  "cloned_at": "",                  // clone timestamp
  "github_collection": "…"          // OPTIONAL — set by project.html on install-to-collection
}
```

`readme` and `packages` are **not** top-level fields — they are staged inside
`temp_files` (§8.4). `project.html` hydrates `r.readme` / `r.packages` from
`temp_files` in memory on load (`normalizeRepoRecord()`) and dehydrates back on
save (`reposForPersistence()`), so render code still reads `r.readme` /
`r.packages` directly.

### 8.4 `temp_files` — staged tab content

`temp_files` is a 3-entry array (`readme`, `stack`, `notes`) that holds the
content shown in a repo's README / Stack / Notes tabs **before it is cloned**.

```jsonc
[
  { "name": "readme", "text": "# repo…" },   // README markdown (Mode B fills it; else '')
  { "name": "stack",  "text": "# Stack…" },  // Markdown doc with a ```json fence of packages[]
  { "name": "notes",  "text": "" }           // user notes — empty until written post-clone
]
```

**Lifecycle.** During search, `enrichRepos()` builds `temp_files` via
`buildRepoTempFiles()` (shared helper in `github-discovery.js`). When the repo is
cloned, `project.html`'s `seedPendingClonedRepos()` flushes the three entries to
`<collection>/<projectDir>/docs/readme.md`, `stack.md`, `notes.md` via
`POST /api/repos/docs/seed`, then **deletes `temp_files`** from the repo record.
From then on the README/Stack/Notes content is read from the `docs/` folder as
ordinary doc tabs — a repo with no `temp_files` renders purely from the folder.
Existing non-empty `docs/` files are never overwritten by a re-seed.

The `stack` entry's text is a Markdown document wrapping the raw `packages` JSON
in a ```` ```json ```` fence; `packagesToStackFileText()` / `packagesFromStackFile()`
convert between the array and that text. Each package object:

```jsonc
{
  "name": "express",                // dependency name
  "version": "4.18.2",              // version; range chars (^ ~ >= <) stripped; '' for pypi
  "registry": "npm",                // "npm" | "pypi"
  "description": "",                // reserved — currently always ''
  "devDependency": false            // npm only — true for entries from devDependencies
}
```

---

## 9. Design notes & decisions

- **Several keywords in a file search — yes.** Mode D builds its term list as
  `[fileContains, ...keywords]` (`fileSearchTerms()`), so the "file must contain"
  phrase *and* every keyword are each searched independently inside the named
  file, then deduplicated.
- **Strict by default — yes.** `phraseSearchTermForGitHub()` wraps any multi-word
  term in quotes, so GitHub matches it as a contiguous phrase rather than loose
  words. Single words are inherently exact-word matches. There is intentionally
  no "loose" toggle — strict is the only mode.
- **Per page is now 100.** Repo and code search both use `per_page=100`, the
  GitHub Search API maximum (previously 30). This is ~3× fewer HTTP requests for
  the same result count, which also means fewer rate-limit hits.
- **Server-side search** is the recommended larger follow-up — see §7.4.