---
name: resolve-conflicts
description: Resolve Git merge, pull, rebase, cherry-pick, and diverged-branch conflicts. Use when Git reports conflicts, unmerged paths, failed pull/merge/rebase/cherry-pick, or when sync cannot safely decide between local and remote changes.
argument-hint: "[task-id optional]"
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# resolve-conflicts

## Goal

Finish an interrupted Git operation or safely resolve branch divergence so the repo has no unmerged paths and no conflict markers.

Use this skill when:

- `git pull`, `git merge`, `git rebase`, or `git cherry-pick` reports conflicts.
- `git status` shows unmerged paths, both-modified files, add/add conflicts, delete/modify conflicts, or rebase/cherry-pick in progress.
- Local `main` and `origin/main` diverged during sync.
- A sync script says a merge problem must be resolved by an agent.
- `scripts/git-sync-pull-push.sh` invoked the agent with reason **working tree or index has local changes before sync** (dirty tree, not necessarily a merge).


## First Checks

1. Run `git status --short --branch`. If `git` is not available, execution is blocked, the shell returns `Rejected`, or the command produces no real Git output, stop immediately. Do not edit files, do not stage, do not continue the operation, and do not write or update `unresolved_merge.md` from guesses when Git was never queried.
   - **Partial fallback (read-only):** when Git truly cannot run, you may still scan the worktree for `<<<<<<<` / `=======` / `>>>>>>>` and check `.git/` for `MERGE_HEAD`, `rebase-merge/`, `rebase-apply/`, `CHERRY_PICK_HEAD`, `REVERT_HEAD` to infer whether a conflict operation is in progress. Treat this as incomplete: always tell the user to run `git status --short --branch` locally before pushing or stashing, and do not claim the repo is clean without Git output.
   - **Blocked agent shell:** if the agent environment rejects shell commands so `git status` never runs, still apply the partial fallback above; state clearly that Git was not executed in-session; for dirty-tree-only sync, do not create `unresolved_merge.md` or commits when fallback shows no interrupted operation and no markers.
   - **Git binary blocked, filesystem allowed:** some sandboxes deny `git` while still allowing `test -f` / `ls` on `.git/MERGE_HEAD`, `.git/rebase-merge`, `.git/CHERRY_PICK_HEAD`, `.git/REVERT_HEAD`. Use those when `git` never runs; conclusions stay incomplete until the user runs `git status --short --branch` locally.
2. Check whether Git is in a merge, rebase, cherry-pick, or revert state.
3. Inspect only relevant files:
   - `git diff --name-only --diff-filter=U`
   - conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`
   - staged/unstaged changes related to the operation
4. Do not overwrite unrelated local edits.
5. Do not commit unless the user or calling script explicitly asked for a commit.

## Diverged `main` / sync workflow

`scripts/git-sync-pull-push.sh` tries a non-interactive `git merge origin/<main>` in Bash (with real Git) when local and `origin/<main>` diverge. You usually run **after** that step failed with conflicts, or when `GIT_SYNC_AUTO_MERGE=0`, or when fixing an already-started merge/rebase. Prefer finishing the current in-progress operation (`git merge --continue` after resolved paths) over choosing a new strategy.

## Choose the Resolution

Resolve automatically when the correct result is clear.

- Preserve the user's current branch intent.
- Include required updates from the incoming branch or remote.
- For generated lockfiles, prefer regenerating with the repo's package manager when possible.
- For deleted-vs-modified conflicts, keep the file only when the remaining code still references it or the modification is clearly intentional.
- For rename conflicts, preserve the path that matches the current project structure.
- Never leave Git conflict markers in the final files.

## Uncertain Choices

If the correct choice is not fully clear, still make the best valid resolution. Use `@unresolved_merge` **only** when two plausible outcomes would materially change behavior or data and you cannot validate which is correct; skip markers for routine merges where combining both sides is the obvious outcome.

When you do use `@unresolved_merge`:

- In code files, use the file's native comment syntax near the resolved area.
- In Markdown or plain text files, add a short visible note near the resolved area.
- In JSON, lockfiles, or formats where comments/text would make the file invalid, create a sibling note named `<filename>.unresolved_merge.md`.
- Keep the note short: include the less confident option and why it was not chosen.

Example for code:

```ts
const timeoutMs = 10000;
// @unresolved_merge less confident option: main used 5000ms before retry behavior changed.
// const timeoutMs = 5000;
```

Example for Markdown:

```md
Use the new sync-project command.

@unresolved_merge less confident option: previous text said to run merge-and-solve manually after every pull.
```

Example sidecar note:

```md
# @unresolved_merge

File: package-lock.json

Less confident option: keep the old transitive dependency set from origin/main.
Chosen option: regenerated the lockfile from the current package manifest.
Reason: lockfiles must stay valid JSON and should match the manifest.
```

## Root Conflict Summary

Create or update `unresolved_merge.md` in the repository root when this skill **actually** resolved unmerged paths or conflict markers, completed an interrupted Git operation, or added `@unresolved_merge` / sidecar notes. Skip creating or updating it if preflight failed (no working `git`) or you only confirmed there was nothing to do.

- Append a new entry instead of deleting older entries.
- Include the Git operation, branches or commits involved, conflicted files, chosen resolution, validation run, and remaining uncertainty.
- If everything was resolved confidently, write `Remaining uncertainty: none`.
- If any file contains `@unresolved_merge` or has a sidecar note, list it in this file too.
- Keep this file as Markdown so future agents and users can quickly understand what happened.

Entry template:

```md
## YYYY-MM-DD HH:MM - <operation>

- Situation: <merge/pull/rebase/cherry-pick/revert/diverged sync details>
- Branches/commits: <current branch, incoming branch/commit, origin branch when relevant>
- Conflicted files: <files>
- Resolution: <short summary of what was kept/combined>
- Validation: <commands run and result>
- Remaining uncertainty: <none or @unresolved_merge notes>
```

## Operation-Specific Finish

- Merge or pull conflict: after resolving files, run `git add <resolved-files>`.
- Rebase conflict: after resolving files and `git add`, run `git rebase --continue`.
- Cherry-pick conflict: after resolving files and `git add`, run `git cherry-pick --continue`.
- Revert conflict: after resolving files and `git add`, run `git revert --continue`.
- Git sync conflict: if the caller explicitly asks to finish sync, complete only the commit required by the merge/rebase/cherry-pick/revert operation and include `unresolved_merge.md`.
- Diverged `main` and `origin/main`: the sync script already attempts a merge in Bash when possible; finish any merge/rebase the caller left in progress, complete the merge commit when appropriate, then leave push/re-fetch to the sync script unless the caller asked otherwise.

## Validate

1. Run `git status --short` and confirm there are no unmerged paths.
2. Search resolved files for conflict markers.
3. Run the smallest relevant validation available for touched files.
4. If validation fails because of the resolution, fix it and validate again.
5. If you performed resolution work or added uncertainty markers, confirm `unresolved_merge.md` was created or updated in the repository root.
6. Report any remaining `@unresolved_merge` notes clearly in the final response.

If you had problems along the way and found solutions or anything that improves performance, quality, or conflict-resolution paths, update this resolve-conflicts skill.

## Git unavailable in the agent session

When `git status` never ran (shell blocked, Git missing, agent/IDE rejecting terminal or Git invocations, etc.), read-only fallback does **not** replace Git: unmerged paths or a dirty index cannot be ruled out completely (marker scans miss index-only unmerged entries). Still report that Git was not executed, tell the user to run `git status --short --branch` before push or before trusting autostash. For **local changes before sync** with no interrupted operation and no markers in fallback, skip `unresolved_merge.md` and commits per the Dirty tree before sync rules above.

If the agent session rejects **every** shell invocation (no `git` output at all), treat it the same: document that Git was not executed in-session, apply the partial fallback only for obvious markers and `.git/` heads, and do not claim a clean index without local `git status`.

When the terminal tool fails entirely (e.g. every invocation rejected before the shell starts, including tools that return “Rejected” with no shell output), you still cannot run `git`; partial fallback is the same, but you also cannot run validation commands or `git merge --continue` / `git commit` in-session—tell the user to run those locally or re-run this skill where Git works.

If **every** `run_terminal_cmd` / shell invocation returns “Rejected” with no output (sandbox or agent policy), treat it like Git unavailable: same partial fallback, same “run `git status --short --branch` locally” guidance; for dirty-tree-only sync with no interrupted operation and no markers in fallback, still skip `unresolved_merge.md` and commits.

In some Cursor agent sessions the shell tool may return a single line such as `Rejected:` with no subprocess output; treat that the same as Git unavailable for in-session `git status` / continuation commands. When called by `scripts/git-sync-pull-push.sh`, include `GIT_SYNC_AGENT_GIT_BLOCKED` in the final answer if this happens, or `GIT_SYNC_AGENT_GIT_OK` only after `git status --short --branch` really succeeds.

