## 2026-04-30 10:14 - autostash conflict cleanup

- Situation: autostash restore after sync left conflict markers in one tracked file.
- Branches/commits: current branch `main`; incoming branch `origin/main`; stashed local changes reapplied.
- Conflicted files: `configs/config.crons.jsonc`
- Resolution: kept `end_date` as `null` with the inline `// optional` comment and removed all conflict markers.
- Validation: `rg "^(<<<<<<<|=======|>>>>>>>)" /home/superuser/social_media_app` now no longer reports markers in `configs/config.crons.jsonc`; `.git` operation markers (`MERGE_HEAD`, rebase dirs, `CHERRY_PICK_HEAD`, `REVERT_HEAD`) were not found.
- Remaining uncertainty: none.

## 2026-04-30 22:24 - autostash conflict cleanup

- Situation: autostash restore after sync left conflict markers in one tracked task index file.
- Branches/commits: current branch `main`; incoming branch `origin/main`; stashed local changes reapplied.
- Conflicted files: `agents/manager/data/tasks/tasks.index.jsonc`
- Resolution: removed conflict markers, kept upstream-added task records, and kept the stashed newer `updated_at` value (`2026-04-30T10:31:00Z`) for issue 11.
- Validation: `rg "^(<<<<<<<|=======|>>>>>>>)" agents/manager/data/tasks/tasks.index.jsonc` should return no matches; `.git` operation markers (`MERGE_HEAD`, rebase dirs, `CHERRY_PICK_HEAD`, `REVERT_HEAD`) were not found in fallback checks.
- Remaining uncertainty: none.

## 2026-05-01 17:07 - autostash conflict cleanup

- Situation: autostash restore after sync left one unmerged file with conflict markers.
- Branches/commits: current branch `main`; incoming branch `origin/main`; stashed local changes reapplied.
- Conflicted files: `agents/dev/.claude/skills/resolve-conflicts/SKILL.md`
- Resolution: removed conflict markers, dropped accidental placeholder text, and kept the valid guidance about blocked shell output handling.
- Validation: `git status --short --branch` now shows no unmerged paths; `rg "^(<<<<<<<|=======|>>>>>>>)" agents/dev/.claude/skills/resolve-conflicts/SKILL.md` returns no matches.
- Remaining uncertainty: none.
