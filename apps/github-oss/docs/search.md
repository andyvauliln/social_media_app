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

`readDiscoveryOptions('search')` (`index.html:777`) reads the checked radio and
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
User clicks #startBtn → startSearch()   (index.html:998)
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
5. **Show progress UI** — `#progressSection` becomes visible; `#startBtn` is
  disabled; the Cancel button reads "Running…".
6. **Run discovery** — `runGitHubRepoDiscovery({ keywords, langs, maxResults,
  options, ghFetch, sleep, onProgress })`(the engine — see §4). Returns an  array of *raw* GitHub repo objects, capped at`maxResults`.
7. **Enrich** — `enrichRepos(repos, onProgress, enrichOpts)` (see §5). Returns
  normalised repo records with commit counts (and optionally packages / matched
   file text).
8. **Derive top languages** — count `language` across enriched repos, keep the
  top 5 (`topLangs`).
9. **Allocate a file number** — `nextAvailableProjectNum()` does `GET /api/projects`,
  finds the highest leading number, returns `+1`. `buildFileName(num, keywords)`
   produces `"<num>_<slug>"` from the first 3 keywords.
10. **Persist** — `saveProjectJsonFile()` → `POST /api/projects/save` writes
  `data/projects/<num>_<slug>.json` with: `name`, `keywords`, `languages`,
    `repoCount`, `topLangs`, `createdAt`, `repos[]` (enriched), `searchOptions`.
11. **Finish** — re-enable the button, `closeModal()`, `loadProjects()` re-renders
  the card grid. On any thrown error: `setProgress(0, "Error: …")` and the
    modal stays open.

Progress percentages are a convention shared between the engine and the page:
**0–45%** = repository/code discovery, **45–80%** = code-search extra pass (when
enabled), **60–90%** = enrichment, **90–100%** = saving.

---

## 4. The discovery engine — `runGitHubRepoDiscovery()`

Defined in `github-discovery.js:262`. Pure function: it receives `ghFetch` and
`sleep` as injected dependencies (so it has no DOM or token coupling) and returns
raw repo objects. It runs **exactly one** of four modes based on `options`.

Shared building blocks:

- `**phraseSearchTermForGitHub(kw)`** — a multi-word keyword is wrapped in quotes
(`open source` → `"open source"`) so GitHub treats it as a contiguous phrase.
Single words and already-quoted strings pass through unchanged.
- `**seenIds` Set** — global dedup across keywords and modes; a repo id is added
at most once.
- **Pagination budget** — `maxResults` is divided across keywords and pages so a
single keyword cannot consume the whole quota:
`budgetPerKw = ceil(maxResults / keywords.length / PER_PAGE)`.
- **Rate-limit pacing** — `sleep()` between pages: `120ms` for repo search,
`850ms` for code search (GitHub code search is rate-limited far harder).
- **Error handling** — HTTP `422` (bad query) or `403` (rate limit) breaks the
current page loop gracefully; any other error is re-thrown.

### Mode A — `meta` (repository name / description / topics)

The default. `anyRepoScope` is true and `readmeOnly` is false →
[`github-discovery.js:414`].

```
for each keyword:
  q = buildRepoSearchQuery(kw, langs, opt)
    → '"phrase" in:name,description,topics [language:X …] [stars:>N] [fork:false]'
  for page = 1 .. budgetPerKw:
    GET https://api.github.com/search/repositories
        ?q=…&sort=stars&order=desc&per_page=30&page=N
    for each item:
      skip if seenIds has it, or item.fork
      seenIds.add(id); repos.push(rawItem)
    sleep(120ms)
```

Results come back already sorted by stars (descending). No extra verification —
GitHub's index decides relevance.

### Mode B — `readme` (verified README phrase)

`readmeOnlyScope(opt)` is true → [`github-discovery.js:362`]. GitHub's
`in:readme` qualifier matches its *indexed* README, which can be stale or match
loosely. So this mode **re-verifies every candidate**:

```
for each keyword:
  q = '"phrase" in:readme …'
  for page = 1 .. MAX_REPO_SEARCH_PAGES (34):
    GET search/repositories?q=…&sort=stars&per_page=30&page=N
    for each candidate repo:
      skip forks / star-fork filter failures
      text = fetchReadmeTextDecoded(full_name)   ← GET /repos/:o/:r/readme, base64-decode
      sleep(90ms)
      if NOT readmeContainsKeywordPhrase(text, kw): skip   ← real substring check
      keep repo, attach { readme, readme_fetched:true }
    sleep(120ms); stop early if page returned < 30 items
```

`readmeContainsKeywordPhrase` lower-cases and whitespace-collapses both the
README body and the needle, then does an `indexOf`. This is the only mode that
pre-fetches the README and stores it on the repo record.

### Mode C — `code` (GitHub code search)

Runs when `includeCodeSearch` is set and no repo scope matched, **or** as an
*extra pass* after Mode A/B if those returned fewer than `maxResults`
[`github-discovery.js:460`].

```
for each keyword:
  cq = buildCodeSearchQuery(kw, langs)   → '"phrase" language:X language:Y'
  for page = 1 .. budgetCodePerKw:
    GET https://api.github.com/search/code?q=…&per_page=30&page=N
    for each code hit:
      repo = hit.repository
      skip if seenIds has repo.id
      if repo.stargazers_count / fork are missing:
        GET /repos/:owner/:name to backfill full metadata   ← code search returns thin repo objects
        sleep(80ms)
      apply star/fork filter; seenIds.add; repos.push
    sleep(850ms)
```

Code search hits report the *file* that matched, but the engine keeps only the
**repository**. Because code-search repo objects are minimal, missing fields are
backfilled with an extra `/repos/:owner/:name` call.

### Mode D — `file` (search inside a named file)

`fileSearchScope(opt)` is true → [`github-discovery.js:278`]. Runs first and
returns immediately (it does not fall through to the code pass).

```
fterms = [fileContains, ...keywords]   (deduped; at least one required)
for each fterm:
  fq = buildFileCodeSearchQuery(fterm, fileName, langs)
    → '"phrase" filename:package.json'      (no slash in fileName)
    → '"phrase" path:docs/README.md'        (slash present → path qualifier)
  for page = 1 .. budgetFilePerTerm:
    GET search/code?q=…&per_page=30&page=N
    for each hit:
      backfill thin repo metadata if needed (as Mode C)
      apply star/fork filter
      repos.push({ ...repo, search_file_path: hit.path })   ← keeps the matched path
    sleep(850ms)
```

The matched `hit.path` is stored as `search_file_path` so enrichment can later
download the actual file body.

---

## 5. Enrichment — `enrichRepos()`

`index.html:1240`. Walks the raw repo list and produces the normalised record
shape that gets saved. For **each** repo, in series (paced by `sleep`):

1. **Normalise** — map GitHub field names to the project schema (`stargazers_count`
  → `stars`, `license.spdx_id` → `license`, etc.) and seed empty fields
   (`commit_count:null`, `packages:[]`, `cloned:false`, …).
2. **Commit count** — `GET /repos/:full_name/commits?per_page=1`, then parse the
  `Link: …rel="last"` header; the last-page number *is* the commit count.
3. **Matched file** *(file mode only)* — if `fetchSearchFile` and a
  `search_file_path` exist, `ghFetchFile()` downloads and base64-decodes the   
   file body into `search_file_text`.  @ai_notes: `search_file_path what is this? so we store it in object or in docs?`
4. **Packages** *(if "Fetch dependencies" was checked)* —
  `fillRepoPackagesForRecord()`:
  - JS/TS → `packagesFromTreeNpm()`: list the repo tree, find every
  `package.json` (≤25), read `dependencies` + `devDependencies`.
  - Python / Jupyter → `packagesFromTreePypi()`: same for `requirements.txt`.
  - Caps: `MAX_MANIFEST_FILES=25`, `MAX_PACKAGE_DEPS=500`.

Enrichment reports progress every 5th repo (`60–90%` band).

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

## 7. Suggested improvements

### 7.1 Simplification & refactoring (readability)

- `**startSearch()` is a 85-line god-function.** Split into `gatherSearchInputs()`,
`runDiscoveryAndEnrich()`, and `persistProject()`. Each is independently
testable and the flow reads as three named steps.
- **Modes C and D are near-duplicate loops.** Both paginate `search/code`,
backfill thin repo metadata, apply the star/fork filter, and dedup. Extract a
shared `paginateCodeSearch(queryFor, perHit)` helper; the only differences are
the query builder and whether `search_file_path` is attached.
- `**readDiscoveryOptions()` repeats `...base, ...emptyRepoFields` four times.**
Replace the four `if` branches with a small lookup table
`{ meta: {...}, readme: {...}, code: {...}, file: (els)=>({...}) }`.
- **Three identical header objects.** `ghFetch`, `ghRestHeaders`, `enrichRepos`,
and `ghFetchFile` each rebuild the `Authorization`/`Accept` headers inline.
One `ghHeaders()` (already half-done as `ghRestHeaders`) should be the single
source.
- `**fullRepoToSearchItem` / `codeRepositoryToItem` are the same function.**
`codeRepositoryToItem` just calls the other — inline it or drop one name.
- **Magic numbers.** `60`, `30`, `90`, `45`, `35` progress offsets are scattered
as literals. A `PROGRESS = { discovery:[5,45], codePass:[45,80], … }` map makes
the phases explicit and keeps the bands from silently overlapping.
- `**buildFileName` and `previewFileName` duplicate the slug logic** — extract
`keywordSlug(keywords)`.

### 7.2 Correctness / edge cases

- `**minStars` is off-by-one.** The query uses `stars:>N` and the client filter
uses `stars <= minStars → reject`. A repo with exactly `N` stars is excluded
even though the UI says "Min stars: N". Use `stars:>=N` (and `< minStars`) so
the boundary matches the label.
- **Token in `localStorage`.** `GITHUB_TOKEN` sits in `localStorage` and is sent
from the browser — exposed to any XSS. Consider proxying GitHub search through
the server (which already supports a server-side `GITHUB_TOKEN`) so the token
never reaches the client.
- **No token → silent failure.** If no token resolves, `ghFetch` still fires and
GitHub replies `401`/`403` with a low unauthenticated rate limit. Detect a
missing token up front and show a clear message instead of a raw API error.
- **GitHub Search caps at 1000 results per query.** `maxResults` is clamped to
1000 but a single keyword can still only reach ~1000; large multi-keyword
searches silently under-deliver. Surface this limit in the UI.
- **No cancel.** The Cancel button only reads "Running…" — there is no
`AbortController`, so a long code search cannot actually be stopped. Thread an
`AbortSignal` through `ghFetch` and the engine loops.
- **Mode B README fetch is expensive and uncapped per page.** Up to 34 pages × 30
repos = ~1000 README downloads at 90ms each ≈ 90s of pure sleeping, ignoring
network. Cap verified-candidate fetches, or fetch READMEs concurrently with a
small pool.
- **Commit count via `Link` header is fragile.** If a repo has ≤1 commit there is
no `rel="last"` link and `commit_count` stays `null` — indistinguishable from a
failed request. Treat "no link" as count `1` (or `data.length`).
- `**atob` + `decodeURIComponent(escape())`** in `ghFetchFile` breaks on non-Latin
UTF-8 file contents. `fetchReadmeTextDecoded` already uses the correct
`TextDecoder` path — reuse it.
- **No retry on `403` rate limit.** The engine breaks the loop on `403` but does
not read `Retry-After` / `X-RateLimit-Reset`. A single retry-after-wait would
recover many searches that currently return partial results.
- **Partial results are saved silently.** If discovery hits a `422`/`403` and
returns 12 of 100 requested repos, the project is saved as if complete. Record
a `partial: true` / `searchError` field so the UI can warn.

### 7.3 Functional improvements

- **Per-keyword result counts.** Show how many repos each keyword contributed so
the user can prune dead keywords.
- **Combine keywords with `OR`.** GitHub repo search supports a single query with
`OR`; for small keyword sets one request is faster and dedups server-side.
- **Cache `/repos/:o/:r` backfill** within a run — the same repo can surface for
multiple code-search keywords and is re-fetched each time.
- **Persist the search as re-runnable.** `searchOptions` is already saved; add a
"Re-run / refresh" action that replays it and merges new repos.
- **Progress detail is string-formatted in the engine.** Returning a structured
progress object (`{ phase, keyword, page, found, total }`) and letting the UI
format it would decouple the engine from copy and ease i18n/testing.

### 7.4 Known limitations

- Search runs in the browser, so it is bound by the browser tab staying open and
by GitHub's unauthenticated/authenticated rate limits for that token.
- GitHub **code search** only indexes a subset of repos (default branch, under a
size limit, and — for the public index — repos with some activity). Modes C/D
will miss matches that exist but are not indexed.
- The README index backing Mode B's `in:readme` is GitHub's, not the live file;
Mode B mitigates this with a real fetch, but the *candidate set* is still
whatever GitHub indexed.
- No incremental/streaming results — the UI shows nothing until the whole search
and enrichment finish.

# AI NOTES

1. can i set several  kewords in a file search? what about strict not stric search? should be by defaut strict

1. we need move search on server i guess
2. why in searches we have only 30 per page?

 4. address all of you imprvments

 5. add to this file full data structure for project and for repo with a comments what logic relates to this field