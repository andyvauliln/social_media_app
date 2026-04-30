#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${GIT_SYNC_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Run from a temp copy so autostash cannot change this file while Bash is still reading it.
if [[ "${GIT_SYNC_REEXEC_FROM_TEMP:-0}" != "1" ]]; then
  _tmp_script="${TMPDIR:-/tmp}/git-sync-pull-push.$$.$RANDOM.sh"
  if ! cp "$0" "$_tmp_script"; then
    echo "[git-sync] ERROR: could not create temp runner copy" >&2
    exit 1
  fi
  chmod 700 "$_tmp_script" 2>/dev/null || true
  GIT_SYNC_REEXEC_FROM_TEMP=1 GIT_SYNC_ROOT="$ROOT" bash "$_tmp_script" "$@"
  _status=$?
  rm -f "$_tmp_script"
  exit "$_status"
fi

cd "$ROOT"

# Optional: --claude (default) or --cursor chooses which runner handles resolve-conflicts.
RESOLVE_AGENT="claude"
_seen_claude=0
_seen_cursor=0
for _arg in "$@"; do
  case "$_arg" in
    --claude) _seen_claude=1 ;;
    --cursor) _seen_cursor=1 ;;
    *)
      echo "[git-sync] unknown option: $_arg (expected --claude or --cursor)" >&2
      exit 2
      ;;
  esac
done
if [[ "$_seen_claude" -eq 1 && "$_seen_cursor" -eq 1 ]]; then
  echo "[git-sync] use only one of --claude or --cursor" >&2
  exit 2
fi
if [[ "$_seen_cursor" -eq 1 ]]; then
  RESOLVE_AGENT="cursor"
fi

MAIN_BRANCH="${GIT_SYNC_MAIN_BRANCH:-main}"
GIT_SYNC_AUTOSTASHED=0
STEP=0
ERROR_LOG="${GIT_SYNC_ERROR_LOG:-$ROOT/logs/crons/errors.log}"

next_step() {
  STEP=$((STEP + 1))
}

log_step() {
  local what="$1"
  local reason="$2"
  next_step
  echo "${STEP}. ${what}. Reason: ${reason}"
}

write_error_log() {
  local message="$1"
  local reason="$2"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  mkdir -p "$(dirname "$ERROR_LOG")" 2>/dev/null || true
  printf '[%s] [git-sync] ERROR: %s. Reason: %s\n' "$ts" "$message" "$reason" >>"$ERROR_LOG" 2>/dev/null || true
}

log_error() {
  local message="$1"
  local reason="$2"
  echo "[git-sync] ERROR: $message. Reason: $reason" >&2
  write_error_log "$message" "$reason"
}

fail_sync() {
  log_error "$1" "$2"
  if [[ "${GIT_SYNC_AUTOSTASHED:-0}" -eq 1 ]] &&
    ! has_git_operation_in_progress &&
    git diff --diff-filter=U --quiet; then
    restore_autostash || true
  fi
  exit 1
}

has_local_changes() {
  ! git diff --quiet || ! git diff --cached --quiet
}

autostash_local_changes() {
  log_step "Stashed local changes before sync" "updating $MAIN_BRANCH requires a clean working tree"
  if ! git stash push --quiet -u -m "git-sync autostash $(date -u +%Y-%m-%dT%H:%M:%SZ)"; then
    fail_sync "autostash failed" "local changes must be protected before syncing"
  fi
  GIT_SYNC_AUTOSTASHED=1
}

restore_autostash() {
  if [[ "${GIT_SYNC_AUTOSTASHED:-0}" -eq 1 ]]; then
    log_step "Applied local changes from autostash" "local work was stashed before syncing"
    if ! git stash pop --quiet; then
      log_error "autostash restore produced conflicts" "remote changes overlapped with local work"
      run_resolve_conflicts_agent "autostash restore produced conflicts after syncing $MAIN_BRANCH" || true
      if has_git_operation_in_progress || ! git diff --diff-filter=U --quiet; then
        fail_sync "autostash conflict is still unresolved" "agent could not fully resolve the local restore conflict"
      fi
      git stash drop --quiet stash@{0} 2>/dev/null || true
    fi
    GIT_SYNC_AUTOSTASHED=0
  fi
}

# Pop autostash before exiting successfully.
git_sync_exit_ok() {
  restore_autostash
  exit 0
}

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
# ragent.claude.sh / ragent.cursor.sh load project setup, env, and permissions.
run_resolve_conflicts_agent() {
  local reason="$1"
  local prompt

  # Emergency switch: set GIT_SYNC_CONFLICT_AGENT=0 to stop automatic agent runs.
  if [[ "${GIT_SYNC_CONFLICT_AGENT:-1}" != "1" ]]; then
    log_error "conflict agent disabled" "$reason"
    return 1
  fi

  prompt="Run the dev resolve-conflicts skill at agents/dev/.claude/skills/resolve-conflicts/SKILL.md.

Context from scripts/git-sync-pull-push.sh:
- Reason: $reason
- Main branch: $MAIN_BRANCH
- Original branch: $(git branch --show-current 2>/dev/null || true)

Resolve the Git conflict or divergence if one exists. You may complete the required merge/rebase/cherry-pick/revert continuation commit only when Git requires it to finish this resolution. Include unresolved_merge.md in that resolution commit when a commit is created. Do not create unrelated commits. Update unresolved_merge.md in the repository root only when you actually resolve conflicts or add uncertainty markers (see skill). If you are unsure about a materially significant choice, keep the best valid result and mark it with @unresolved_merge per the skill.

In your final answer, report briefly what was resolved and why. If no conflict existed, say that directly. If any uncertainty remains, say where it was recorded in unresolved_merge.md."

  if [[ "$RESOLVE_AGENT" == "cursor" ]]; then
    if [[ ! -f "$ROOT/ragent.cursor.sh" ]]; then
      log_error "cannot run conflict agent" "ragent.cursor.sh not found"
      return 127
    fi
    log_step "Ran resolve-conflicts agent with Cursor" "$reason"
    echo "Agent report follows. Reason: $reason"
    bash "$ROOT/ragent.cursor.sh" --print --trust --model auto -p "$prompt" 2> >(sed '/^cursor-retrieval: tracing to /d' >&2)
    echo "Agent report ended. Reason: $reason"
    return
  fi

  if [[ ! -f "$ROOT/ragent.claude.sh" ]]; then
    log_error "cannot run conflict agent" "ragent.claude.sh not found"
    return 127
  fi

  log_step "Ran resolve-conflicts agent with Claude" "$reason"
  echo "Agent report follows. Reason: $reason"
  bash "$ROOT/ragent.claude.sh" -p "$prompt"
  echo "Agent report ended. Reason: $reason"
}

# Stop early if this is not a Git project.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  fail_sync "not a git repository" "sync must run inside a Git repository"
fi

# Existing conflicts are handled before the normal dirty-tree guard because
# conflict files are local changes, but they are exactly what this agent fixes.
if has_git_operation_in_progress || ! git diff --diff-filter=U --quiet; then
  run_resolve_conflicts_agent "existing interrupted Git operation or unmerged paths before sync" || true
  if has_git_operation_in_progress || ! git diff --diff-filter=U --quiet; then
    fail_sync "conflict agent finished but Git still has an unresolved operation" "existing interrupted Git operation or unmerged paths remain"
  fi
fi

# Track local edits. We only stash if we later detect incoming updates for $MAIN_BRANCH.
LOCAL_CHANGES_PRESENT=0
if has_local_changes; then
  LOCAL_CHANGES_PRESENT=1
fi

# origin is the shared remote repository, usually GitHub.
if ! git remote get-url origin >/dev/null 2>&1; then
  log_step "Skipped sync" "no origin remote"
  git_sync_exit_ok
fi

# Fetch updates remote branch information without changing local files yet.
log_step "Fetched origin/$MAIN_BRANCH" "compare local $MAIN_BRANCH with the remote branch"
if ! git fetch --quiet origin "$MAIN_BRANCH"; then
  fail_sync "fetch failed" "could not read origin/$MAIN_BRANCH"
fi

current="$(git branch --show-current 2>/dev/null || true)"
# Detached HEAD means Git is not on a named branch, so we do not know what to update.
if [[ -z "${current}" ]]; then
  log_step "Skipped sync" "detached HEAD has no branch name to update"
  git_sync_exit_ok
fi

# If the remote main branch does not exist, there is nothing safe to sync with.
if ! git show-ref --verify --quiet "refs/remotes/origin/$MAIN_BRANCH"; then
  log_step "Skipped sync" "origin/$MAIN_BRANCH not found"
  git_sync_exit_ok
fi

# If local main is missing, create it from origin/main.
if ! git show-ref --verify --quiet "refs/heads/$MAIN_BRANCH"; then
  git branch "$MAIN_BRANCH" "origin/$MAIN_BRANCH"
  log_step "Created local $MAIN_BRANCH from origin/$MAIN_BRANCH" "local branch was missing"
  git_sync_exit_ok
fi

# Compare local main and origin/main so we know whether to pull, push, or resolve.
main_anc_of_origin="$(git merge-base --is-ancestor "$MAIN_BRANCH" "origin/$MAIN_BRANCH" && echo 1 || echo 0)"
origin_anc_of_main="$(git merge-base --is-ancestor "origin/$MAIN_BRANCH" "$MAIN_BRANCH" && echo 1 || echo 0)"

# Both checks true means both branches point to the same history.
if [[ "$main_anc_of_origin" == 1 && "$origin_anc_of_main" == 1 ]]; then
  log_step "Finished with no branch changes" "local $MAIN_BRANCH already matches origin/$MAIN_BRANCH"
  git_sync_exit_ok
fi

# origin/main is ahead: safe pull case.
if [[ "$main_anc_of_origin" == 1 ]]; then
  if [[ "$LOCAL_CHANGES_PRESENT" -eq 1 && "$current" == "$MAIN_BRANCH" && "${GIT_SYNC_AUTOSTASHED:-0}" -eq 0 ]]; then
    autostash_local_changes
  fi
  if [[ "$current" == "$MAIN_BRANCH" ]]; then
    git merge --quiet --ff-only "origin/$MAIN_BRANCH"
  else
    git branch -f "$MAIN_BRANCH" "origin/$MAIN_BRANCH"
  fi
  log_step "Fast-forwarded local $MAIN_BRANCH from origin/$MAIN_BRANCH" "remote branch was ahead with compatible history"
  git_sync_exit_ok
fi

# local main is ahead: safe push case.
if [[ "$origin_anc_of_main" == 1 ]]; then
  if ! git push --quiet origin "$MAIN_BRANCH"; then
    # A push can fail if the remote changed after our fetch. Let the agent inspect it.
    log_error "push $MAIN_BRANCH failed" "remote changed or rejected the push"
    run_resolve_conflicts_agent "push of local $MAIN_BRANCH to origin/$MAIN_BRANCH failed" || true
    if has_local_changes; then
      fail_sync "conflict agent left uncommitted changes; not pushing" "push retry requires a clean tree"
    fi
    git fetch --quiet origin "$MAIN_BRANCH"
    if git merge-base --is-ancestor "origin/$MAIN_BRANCH" "$MAIN_BRANCH"; then
      git push --quiet origin "$MAIN_BRANCH"
      log_step "Pushed local $MAIN_BRANCH to origin/$MAIN_BRANCH after agent" "agent made the push safe"
      git_sync_exit_ok
    fi
    fail_sync "push $MAIN_BRANCH still not safe after conflict agent" "remote is not an ancestor of local $MAIN_BRANCH"
  fi
  log_step "Pushed local $MAIN_BRANCH to origin/$MAIN_BRANCH" "local branch was ahead with compatible history"
  git_sync_exit_ok
fi

# Both sides have different new commits. Prefer a non-interactive merge in this shell (real Git
# access) before involving the conflict agent. Set GIT_SYNC_AUTO_MERGE=0 to skip and call the agent immediately.
try_auto_merge_diverged_main() {
  local prev_branch="$1"
  local merge_msg="Merge origin/$MAIN_BRANCH into $MAIN_BRANCH (git-sync auto)"
  local on_main=0
  [[ "$prev_branch" == "$MAIN_BRANCH" ]] && on_main=1

  if [[ "$on_main" -eq 0 ]]; then
    git checkout --quiet "$MAIN_BRANCH"
  fi

  if git merge --quiet --no-edit -m "$merge_msg" "origin/$MAIN_BRANCH"; then
    if [[ "$on_main" -eq 0 ]]; then
      git checkout --quiet "$prev_branch"
    fi
    return 0
  fi

  # Conflicts: leave repo on MAIN_BRANCH with merge in progress for the agent (or user).
  return 1
}

if [[ "${GIT_SYNC_AUTO_MERGE:-1}" == "1" ]]; then
  if [[ "$LOCAL_CHANGES_PRESENT" -eq 1 && "${GIT_SYNC_AUTOSTASHED:-0}" -eq 0 ]]; then
    autostash_local_changes
  fi
  log_step "Tried auto-merge for diverged $MAIN_BRANCH" "local and remote both have unique commits"
  if try_auto_merge_diverged_main "$current"; then
    git push --quiet origin "$MAIN_BRANCH"
    log_step "Pushed auto-merged $MAIN_BRANCH to origin/$MAIN_BRANCH" "Git merged diverged history without conflicts"
    git_sync_exit_ok
  fi
  log_error "auto-merge had conflicts" "agent is needed to resolve diverged history"
else
  log_step "Skipped auto-merge and used agent" "GIT_SYNC_AUTO_MERGE=0 and branches diverged"
fi

run_resolve_conflicts_agent "local $MAIN_BRANCH and origin/$MAIN_BRANCH diverged (after auto-merge failed or disabled)" || true

# The agent must leave Git with no unfinished conflict operation.
if has_git_operation_in_progress || ! git diff --diff-filter=U --quiet; then
  fail_sync "conflict agent finished but Git still has an unresolved operation" "diverged branch conflict remains"
fi

# Restore previous branch if we left it to merge on main.
if [[ "$current" != "$MAIN_BRANCH" ]]; then
  git checkout --quiet "$current" 2>/dev/null || true
fi

# The script does not push if the agent leaves uncommitted edits behind.
if has_local_changes; then
  fail_sync "conflict agent left uncommitted changes; not pushing" "push after conflict resolution requires a clean tree"
fi

# Re-fetch after the agent because the remote may have changed while it worked.
log_step "Fetched origin/$MAIN_BRANCH after agent" "remote may have changed while the agent worked"
git fetch --quiet origin "$MAIN_BRANCH"
main_anc_of_origin="$(git merge-base --is-ancestor "$MAIN_BRANCH" "origin/$MAIN_BRANCH" && echo 1 || echo 0)"
origin_anc_of_main="$(git merge-base --is-ancestor "origin/$MAIN_BRANCH" "$MAIN_BRANCH" && echo 1 || echo 0)"

# If the agent made the branches match, the sync is done.
if [[ "$main_anc_of_origin" == 1 && "$origin_anc_of_main" == 1 ]]; then
  log_step "Finished after agent" "local $MAIN_BRANCH matches origin/$MAIN_BRANCH"
  git_sync_exit_ok
fi

# If local main is now safely ahead, push it.
if [[ "$origin_anc_of_main" == 1 ]]; then
  git push --quiet origin "$MAIN_BRANCH"
  log_step "Pushed local $MAIN_BRANCH to origin/$MAIN_BRANCH after agent" "agent left local branch safely ahead"
  git_sync_exit_ok
fi

# If origin/main is now safely ahead, fast-forward local main.
if [[ "$main_anc_of_origin" == 1 ]]; then
  if [[ "$current" == "$MAIN_BRANCH" ]]; then
    git merge --quiet --ff-only "origin/$MAIN_BRANCH"
  else
    git branch -f "$MAIN_BRANCH" "origin/$MAIN_BRANCH"
  fi
  log_step "Fast-forwarded local $MAIN_BRANCH from origin/$MAIN_BRANCH after agent" "agent left remote branch safely ahead"
  git_sync_exit_ok
fi

# Still diverged means it is safer to stop than guess.
fail_sync "local $MAIN_BRANCH and origin/$MAIN_BRANCH still diverged after conflict agent" "history is still not safe to push or fast-forward"

# Plain-language steps:
# 1. Work from the project root so every Git command uses the right folder.
# 2. Use the main branch by default, unless GIT_SYNC_MAIN_BRANCH says otherwise.
# 3. Check if Git is already in the middle of a merge, rebase, cherry-pick, or revert.
#    Simple meaning: Git started combining changes earlier, but it got stuck.
# 4. If Git is stuck, run the resolve-conflicts agent first.
# 5. If the agent cannot finish the conflict, stop and report the problem.
# 6. If there are normal uncommitted local edits, stash only when incoming main updates must be applied.
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
# 17. If local main and origin/main both have different new commits, try a normal auto-merge first.
# 18. If auto-merge conflicts or push fails, run the resolve-conflicts agent.
# 19. After the agent finishes, confirm Git has no unfinished conflict operation.
# 20. Confirm the agent did not leave uncommitted changes behind before pushing branch changes.
# 21. Fetch origin/main again because the remote may have changed while the agent was working.
# 22. If both sides now match, finish successfully.
# 23. If local main is safely ahead after the agent, push it.
# 24. If origin/main is safely ahead after the agent, fast-forward local main.
# 25. If it is still not safe, stop instead of guessing.
