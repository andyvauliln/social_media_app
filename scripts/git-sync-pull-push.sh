#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

MAIN_BRANCH="${GIT_SYNC_MAIN_BRANCH:-main}"

# Check whether Git is already stuck in a merge/rebase/cherry-pick/revert.
# In simple words: Git started combining changes earlier, but needs help to finish.
has_git_operation_in_progress() {
  [[ -d "$(git rev-parse --git-path rebase-merge)" ||
    -d "$(git rev-parse --git-path rebase-apply)" ||
    -f "$(git rev-parse --git-path MERGE_HEAD)" ||
    -f "$(git rev-parse --git-path CHERRY_PICK_HEAD)" ||
    -f "$(git rev-parse --git-path REVERT_HEAD)" ]]
}

# Ask the project AI agent runner to fix a conflict situation.
# ragent.claude.sh loads the project's normal Claude setup, plugins, env, and permissions.
run_resolve_conflicts_agent() {
  local reason="$1"
  local prompt

  # Emergency switch: set GIT_SYNC_CONFLICT_AGENT=0 to stop automatic agent runs.
  if [[ "${GIT_SYNC_CONFLICT_AGENT:-1}" != "1" ]]; then
    echo "[git-sync] conflict agent disabled: $reason" >&2
    return 1
  fi

  if [[ ! -f "$ROOT/ragent.claude.sh" ]]; then
    echo "[git-sync] cannot run conflict agent: ragent.claude.sh not found" >&2
    return 127
  fi

  prompt="Run the dev resolve-conflicts skill at agents/agent.dev/.claude/skills/resolve-conflicts/SKILL.md.

Context from scripts/git-sync-pull-push.sh:
- Reason: $reason
- Main branch: $MAIN_BRANCH
- Original branch: $(git branch --show-current 2>/dev/null || true)

Resolve the Git conflict or divergence if one exists. You may complete the required merge/rebase/cherry-pick/revert continuation commit only when Git requires it to finish this resolution. Include unresolved_merge.md in that resolution commit when a commit is created. Do not create unrelated commits. Always create or update unresolved_merge.md in the repository root with the conflict situation. If you are unsure about a choice, keep the best valid result and mark the less confident option with @unresolved_merge."

  echo "[git-sync] running resolve-conflicts agent: $reason" >&2
  bash "$ROOT/ragent.claude.sh" -p "$prompt"
}

# Stop early if this is not a Git project.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "[git-sync] not a git repository" >&2
  exit 1
fi

# Existing conflicts are handled before the normal dirty-tree guard because
# conflict files are local changes, but they are exactly what this agent fixes.
if has_git_operation_in_progress || ! git diff --diff-filter=U --quiet; then
  run_resolve_conflicts_agent "existing interrupted Git operation or unmerged paths before sync"
  if has_git_operation_in_progress || ! git diff --diff-filter=U --quiet; then
    echo "[git-sync] conflict agent finished but Git still has an unresolved operation" >&2
    exit 1
  fi
fi

# Do not sync over normal unfinished local work.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[git-sync] skip: working tree or index has local changes"
  exit 0
fi

# origin is the shared remote repository, usually GitHub.
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "[git-sync] skip: no origin remote" >&2
  exit 0
fi

# Fetch updates remote branch information without changing local files yet.
git fetch origin "$MAIN_BRANCH"

current="$(git branch --show-current 2>/dev/null || true)"
# Detached HEAD means Git is not on a named branch, so we do not know what to update.
if [[ -z "${current}" ]]; then
  echo "[git-sync] skip: detached HEAD" >&2
  exit 0
fi

# If the remote main branch does not exist, there is nothing safe to sync with.
if ! git show-ref --verify --quiet "refs/remotes/origin/$MAIN_BRANCH"; then
  echo "[git-sync] skip: origin/$MAIN_BRANCH not found" >&2
  exit 0
fi

# If local main is missing, create it from origin/main.
if ! git show-ref --verify --quiet "refs/heads/$MAIN_BRANCH"; then
  git branch "$MAIN_BRANCH" "origin/$MAIN_BRANCH"
  echo "[git-sync] ok created local $MAIN_BRANCH from origin/$MAIN_BRANCH"
  exit 0
fi

# Compare local main and origin/main so we know whether to pull, push, or resolve.
main_anc_of_origin="$(git merge-base --is-ancestor "$MAIN_BRANCH" "origin/$MAIN_BRANCH" && echo 1 || echo 0)"
origin_anc_of_main="$(git merge-base --is-ancestor "origin/$MAIN_BRANCH" "$MAIN_BRANCH" && echo 1 || echo 0)"

# Both checks true means both branches point to the same history.
if [[ "$main_anc_of_origin" == 1 && "$origin_anc_of_main" == 1 ]]; then
  echo "[git-sync] ok $MAIN_BRANCH already synced"
  exit 0
fi

# origin/main is ahead: safe pull case.
if [[ "$main_anc_of_origin" == 1 ]]; then
  if [[ "$current" == "$MAIN_BRANCH" ]]; then
    git merge --ff-only "origin/$MAIN_BRANCH"
  else
    git branch -f "$MAIN_BRANCH" "origin/$MAIN_BRANCH"
  fi
  echo "[git-sync] ok fast-forwarded local $MAIN_BRANCH from origin/$MAIN_BRANCH"
  exit 0
fi

# local main is ahead: safe push case.
if [[ "$origin_anc_of_main" == 1 ]]; then
  if ! git push origin "$MAIN_BRANCH"; then
    # A push can fail if the remote changed after our fetch. Let the agent inspect it.
    echo "[git-sync] push $MAIN_BRANCH failed" >&2
    run_resolve_conflicts_agent "push of local $MAIN_BRANCH to origin/$MAIN_BRANCH failed"
    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "[git-sync] conflict agent left uncommitted changes; not pushing" >&2
      exit 1
    fi
    git fetch origin "$MAIN_BRANCH"
    if git merge-base --is-ancestor "origin/$MAIN_BRANCH" "$MAIN_BRANCH"; then
      git push origin "$MAIN_BRANCH"
      echo "[git-sync] ok pushed local $MAIN_BRANCH to origin/$MAIN_BRANCH after conflict agent"
      exit 0
    fi
    echo "[git-sync] push $MAIN_BRANCH still not safe after conflict agent" >&2
    exit 1
  fi
  echo "[git-sync] ok pushed local $MAIN_BRANCH to origin/$MAIN_BRANCH"
  exit 0
fi

# Both sides have different new commits, so a human-like merge decision is needed.
echo "[git-sync] local $MAIN_BRANCH and origin/$MAIN_BRANCH diverged; running /resolve-conflicts agent" >&2
run_resolve_conflicts_agent "local $MAIN_BRANCH and origin/$MAIN_BRANCH diverged"

# The agent must leave Git with no unfinished conflict operation.
if has_git_operation_in_progress || ! git diff --diff-filter=U --quiet; then
  echo "[git-sync] conflict agent finished but Git still has an unresolved operation" >&2
  exit 1
fi

# The script does not push if the agent leaves uncommitted edits behind.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[git-sync] conflict agent left uncommitted changes; not pushing" >&2
  exit 1
fi

# Re-fetch after the agent because the remote may have changed while it worked.
git fetch origin "$MAIN_BRANCH"
main_anc_of_origin="$(git merge-base --is-ancestor "$MAIN_BRANCH" "origin/$MAIN_BRANCH" && echo 1 || echo 0)"
origin_anc_of_main="$(git merge-base --is-ancestor "origin/$MAIN_BRANCH" "$MAIN_BRANCH" && echo 1 || echo 0)"

# If the agent made the branches match, the sync is done.
if [[ "$main_anc_of_origin" == 1 && "$origin_anc_of_main" == 1 ]]; then
  echo "[git-sync] ok $MAIN_BRANCH synced after conflict agent"
  exit 0
fi

# If local main is now safely ahead, push it.
if [[ "$origin_anc_of_main" == 1 ]]; then
  git push origin "$MAIN_BRANCH"
  echo "[git-sync] ok pushed local $MAIN_BRANCH to origin/$MAIN_BRANCH after conflict agent"
  exit 0
fi

# If origin/main is now safely ahead, fast-forward local main.
if [[ "$main_anc_of_origin" == 1 ]]; then
  if [[ "$current" == "$MAIN_BRANCH" ]]; then
    git merge --ff-only "origin/$MAIN_BRANCH"
  else
    git branch -f "$MAIN_BRANCH" "origin/$MAIN_BRANCH"
  fi
  echo "[git-sync] ok fast-forwarded local $MAIN_BRANCH from origin/$MAIN_BRANCH after conflict agent"
  exit 0
fi

# Still diverged means it is safer to stop than guess.
echo "[git-sync] local $MAIN_BRANCH and origin/$MAIN_BRANCH still diverged after conflict agent" >&2
exit 1

# Plain-language steps:
# 1. Work from the project root so every Git command uses the right folder.
# 2. Use the main branch by default, unless GIT_SYNC_MAIN_BRANCH says otherwise.
# 3. Check if Git is already in the middle of a merge, rebase, cherry-pick, or revert.
#    Simple meaning: Git started combining changes earlier, but it got stuck.
# 4. If Git is stuck, run the resolve-conflicts agent first.
# 5. If the agent cannot finish the conflict, stop and report the problem.
# 6. If there are normal uncommitted local edits, stop so we do not overwrite someone's work.
# 7. Check that the project has an origin remote, usually GitHub or the shared repository.
# 8. Download the newest information about origin/main. This does not change files yet.
# 9. Stop if Git is in detached HEAD mode, because the script cannot know which branch to update.
# 10. Stop if origin/main does not exist.
# 11. If local main does not exist, create it from origin/main.
# 12. Compare local main with origin/main.
# 13. If both are already the same, do nothing.
# 14. If only origin/main has new commits, fast-forward local main. This is the safe pull case.
# 15. If only local main has new commits, push local main to origin/main. This is the safe push case.
# 16. If that push fails, run the resolve-conflicts agent and retry only if Git is clean and safe.
# 17. If local main and origin/main both have different new commits, run the resolve-conflicts agent.
# 18. After the agent finishes, confirm Git has no unfinished conflict operation.
# 19. Confirm the agent did not leave uncommitted changes behind.
# 20. Fetch origin/main again because the remote may have changed while the agent was working.
# 21. If both sides now match, finish successfully.
# 22. If local main is safely ahead after the agent, push it.
# 23. If origin/main is safely ahead after the agent, fast-forward local main.
# 24. If it is still not safe, stop instead of guessing.
