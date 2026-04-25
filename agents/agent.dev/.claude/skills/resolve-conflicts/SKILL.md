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

## First Checks

1. Run `git status --short --branch`.
2. Check whether Git is in a merge, rebase, cherry-pick, or revert state.
3. Inspect only relevant files:
   - `git diff --name-only --diff-filter=U`
   - conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`
   - staged/unstaged changes related to the operation
4. Do not overwrite unrelated local edits.
5. Do not commit unless the user or calling script explicitly asked for a commit.

## Choose the Resolution

Resolve automatically when the correct result is clear.

- Preserve the user's current branch intent.
- Include required updates from the incoming branch or remote.
- For generated lockfiles, prefer regenerating with the repo's package manager when possible.
- For deleted-vs-modified conflicts, keep the file only when the remaining code still references it or the modification is clearly intentional.
- For rename conflicts, preserve the path that matches the current project structure.
- Never leave Git conflict markers in the final files.

## Uncertain Choices

If the correct choice is not fully clear, still make the best valid resolution and mark the less confident option with `@unresolved_merge`.

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

Always create or update `unresolved_merge.md` in the repository root for every conflict situation handled by this skill.

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
- Diverged `main` and `origin/main`: merge or rebase only if the project workflow clearly expects it; otherwise resolve the conflict state already started by the caller and leave pushing to the caller.

## Validate

1. Run `git status --short` and confirm there are no unmerged paths.
2. Search resolved files for conflict markers.
3. Run the smallest relevant validation available for touched files.
4. If validation fails because of the resolution, fix it and validate again.
5. Confirm `unresolved_merge.md` was created or updated in the repository root.
6. Report any remaining `@unresolved_merge` notes clearly in the final response.

IF YOU HAD ANY PROBLEMS ON A WAY AND FOUND SOLUTIONS OR ANYTHING THAT CAN HELP IMPROVE PERFOMANCE OR QUALITY OR USING BETTER ACTIONS OR PATHS TO RESOLVE CONFLICGS UPDATE  /resolve-conflicts skill

