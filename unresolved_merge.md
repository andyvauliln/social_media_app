## 2026-04-30 10:14 - autostash conflict cleanup

- Situation: autostash restore after sync left conflict markers in one tracked file.
- Branches/commits: current branch `main`; incoming branch `origin/main`; stashed local changes reapplied.
- Conflicted files: `configs/config.crons.jsonc`
- Resolution: kept `end_date` as `null` with the inline `// optional` comment and removed all conflict markers.
- Validation: `rg "^(<<<<<<<|=======|>>>>>>>)" /home/superuser/social_media_app` now no longer reports markers in `configs/config.crons.jsonc`; `.git` operation markers (`MERGE_HEAD`, rebase dirs, `CHERRY_PICK_HEAD`, `REVERT_HEAD`) were not found.
- Remaining uncertainty: none.
