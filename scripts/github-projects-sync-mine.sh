#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECTS_ROOT="${GITHUB_PROJECTS_ROOT:-$ROOT/github-projects}"
MAIN_BRANCH="${GITHUB_PROJECTS_MAIN_BRANCH:-main}"
MINE_BRANCH="${GITHUB_PROJECTS_MINE_BRANCH:-mine}"
RESOLVE_AGENT="${GITHUB_PROJECTS_RESOLVE_AGENT:-claude}"
CONFLICT_AGENT="${GITHUB_PROJECTS_CONFLICT_AGENT:-1}"
DRY_RUN=0
SELF_TEST=0
TOTAL=0
UPDATED=0
SKIPPED=0
FAILED=0

GIT_USER_NAME="${GITHUB_PROJECTS_SYNC_GIT_USER_NAME:-github-projects-sync}"
GIT_USER_EMAIL="${GITHUB_PROJECTS_SYNC_GIT_USER_EMAIL:-github-projects-sync@local}"

usage() {
  cat <<'HELP'
Usage: scripts/github-projects-sync-mine.sh [options]

Sync every Git repo under github-projects/<collection>/<project>:
  1. fetch origin/main
  2. update local main from origin/main
  3. create local mine if missing
  4. merge main into mine
  5. ask the AI resolve-conflicts skill to finish conflicts when needed

Options:
  --cursor                 Use Cursor agent for conflict resolution
  --claude                 Use Claude agent for conflict resolution (default)
  --projects-root <path>   Override github-projects root
  --main-branch <name>     Override source branch (default: main)
  --mine-branch <name>     Override target branch (default: mine)
  --conflict-agent <0|1>   Disable/enable AI conflict resolver
  --dry-run                Print planned repos without changing them
  --self-test              Run an isolated local Git fixture test
  -h, --help               Show this help
HELP
}

log() {
  printf '[github-projects-sync] %s\n' "$*"
}

warn() {
  printf '[github-projects-sync] WARN: %s\n' "$*" >&2
}

fail_project() {
  local project="$1"
  local reason="$2"
  FAILED=$((FAILED + 1))
  warn "$project: $reason"
}

git_in() {
  local repo="$1"
  shift
  git \
    -c "user.name=$GIT_USER_NAME" \
    -c "user.email=$GIT_USER_EMAIL" \
    -C "$repo" "$@"
}

has_git_operation_in_progress() {
  local repo="$1"
  [[ -d "$(git_in "$repo" rev-parse --git-path rebase-merge)" ||
    -d "$(git_in "$repo" rev-parse --git-path rebase-apply)" ||
    -f "$(git_in "$repo" rev-parse --git-path MERGE_HEAD)" ||
    -f "$(git_in "$repo" rev-parse --git-path CHERRY_PICK_HEAD)" ||
    -f "$(git_in "$repo" rev-parse --git-path REVERT_HEAD)" ]]
}

has_unmerged_paths() {
  local repo="$1"
  ! git_in "$repo" diff --diff-filter=U --quiet
}

has_local_changes() {
  local repo="$1"
  [[ -n "$(git_in "$repo" status --porcelain=v1)" ]]
}

current_branch() {
  local repo="$1"
  git_in "$repo" branch --show-current 2>/dev/null || true
}

restore_branch_if_possible() {
  local repo="$1"
  local original_branch="$2"
  if [[ -n "$original_branch" ]] &&
    [[ "$(current_branch "$repo")" != "$original_branch" ]] &&
    ! has_git_operation_in_progress "$repo" &&
    ! has_unmerged_paths "$repo"; then
    git_in "$repo" checkout --quiet "$original_branch" 2>/dev/null || true
  fi
}

run_resolve_conflicts_agent() {
  local repo="$1"
  local reason="$2"
  local output_file
  local agent_status
  local prompt

  if [[ "$CONFLICT_AGENT" != "1" ]]; then
    warn "$repo: conflict agent disabled; $reason"
    return 1
  fi

  output_file="$(mktemp "${TMPDIR:-/tmp}/github-projects-sync-agent.XXXXXX.log")"
  prompt="Run the dev resolve-conflicts skill at agents/dev/.claude/skills/resolve-conflicts/SKILL.md.

Context from scripts/github-projects-sync-mine.sh:
- Repository path: $repo
- Reason: $reason
- Source branch: $MAIN_BRANCH
- Target branch: $MINE_BRANCH

Hard preflight:
1. Your first shell action must be: git -C \"$repo\" status --short --branch
2. If that command is rejected, blocked, unavailable, or produces no real Git output, stop immediately.
3. When preflight fails, do not edit files, do not update unresolved_merge.md, and include this exact line in the final answer:
GIT_SYNC_AGENT_GIT_BLOCKED
4. Only after git status succeeds, include this exact line in the final answer:
GIT_SYNC_AGENT_GIT_OK

Resolve the Git conflict or interrupted operation inside this nested repository only. Use git -C \"$repo\" for Git commands. You may complete the required merge/rebase/cherry-pick/revert continuation commit only when Git requires it to finish this resolution. Include unresolved_merge.md in that nested repository when the skill calls for it. Do not create unrelated commits and do not edit files outside \"$repo\".

In your final answer, report briefly what was resolved and why. If no conflict existed, say that directly. If any uncertainty remains, say where it was recorded."

  log "$repo: running $RESOLVE_AGENT resolve-conflicts agent"
  set +e
  if [[ "$RESOLVE_AGENT" == "cursor" ]]; then
    if [[ ! -f "$ROOT/ragent.cursor.sh" ]]; then
      rm -f "$output_file"
      return 127
    fi
    bash "$ROOT/ragent.cursor.sh" --print --trust --force --sandbox disabled --model auto -p "$prompt" \
      2> >(sed '/^cursor-retrieval: tracing to /d' >&2) | tee "$output_file"
    agent_status="${PIPESTATUS[0]}"
  else
    if [[ ! -f "$ROOT/ragent.claude.sh" ]]; then
      rm -f "$output_file"
      return 127
    fi
    bash "$ROOT/ragent.claude.sh" -p "$prompt" | tee "$output_file"
    agent_status="${PIPESTATUS[0]}"
  fi
  set -e

  if [[ "$agent_status" -ne 0 ]]; then
    rm -f "$output_file"
    return "$agent_status"
  fi
  if grep -Fxq "GIT_SYNC_AGENT_GIT_BLOCKED" "$output_file"; then
    rm -f "$output_file"
    return 1
  fi
  if ! grep -Fxq "GIT_SYNC_AGENT_GIT_OK" "$output_file"; then
    warn "$repo: conflict agent did not prove Git access"
    rm -f "$output_file"
    return 1
  fi
  rm -f "$output_file"
}

finish_conflicts_or_fail() {
  local repo="$1"
  local reason="$2"
  if ! run_resolve_conflicts_agent "$repo" "$reason"; then
    return 1
  fi
  if has_git_operation_in_progress "$repo" || has_unmerged_paths "$repo"; then
    warn "$repo: conflict agent finished but Git still has unresolved state"
    return 1
  fi
}

ensure_clean_start() {
  local repo="$1"
  if has_git_operation_in_progress "$repo" || has_unmerged_paths "$repo"; then
    finish_conflicts_or_fail "$repo" "existing interrupted Git operation before github-projects sync"
    return
  fi
  if has_local_changes "$repo"; then
    warn "$repo: skipped because working tree has local changes"
    return 2
  fi
}

create_mine_from_existing_main_if_missing() {
  local repo="$1"
  if git_in "$repo" show-ref --verify --quiet "refs/heads/$MINE_BRANCH"; then
    return 0
  fi
  if git_in "$repo" show-ref --verify --quiet "refs/heads/$MAIN_BRANCH"; then
    git_in "$repo" branch "$MINE_BRANCH" "$MAIN_BRANCH"
    log "$repo: created local $MINE_BRANCH from existing $MAIN_BRANCH while leaving dirty worktree untouched"
  fi
}

update_main_branch() {
  local repo="$1"

  if ! git_in "$repo" show-ref --verify --quiet "refs/heads/$MAIN_BRANCH"; then
    git_in "$repo" branch "$MAIN_BRANCH" "origin/$MAIN_BRANCH"
    log "$repo: created local $MAIN_BRANCH from origin/$MAIN_BRANCH"
  fi

  git_in "$repo" checkout --quiet "$MAIN_BRANCH"

  if git_in "$repo" merge-base --is-ancestor "$MAIN_BRANCH" "origin/$MAIN_BRANCH" &&
    git_in "$repo" merge-base --is-ancestor "origin/$MAIN_BRANCH" "$MAIN_BRANCH"; then
    log "$repo: $MAIN_BRANCH already matches origin/$MAIN_BRANCH"
    return 0
  fi

  if git_in "$repo" merge-base --is-ancestor "$MAIN_BRANCH" "origin/$MAIN_BRANCH"; then
    git_in "$repo" merge --quiet --ff-only "origin/$MAIN_BRANCH"
    log "$repo: fast-forwarded $MAIN_BRANCH from origin/$MAIN_BRANCH"
    return 0
  fi

  if git_in "$repo" merge-base --is-ancestor "origin/$MAIN_BRANCH" "$MAIN_BRANCH"; then
    log "$repo: local $MAIN_BRANCH is ahead of origin/$MAIN_BRANCH; keeping local commits"
    return 0
  fi

  log "$repo: merging diverged origin/$MAIN_BRANCH into $MAIN_BRANCH"
  if ! git_in "$repo" merge --no-edit -m "Merge origin/$MAIN_BRANCH into $MAIN_BRANCH (github-projects sync)" "origin/$MAIN_BRANCH"; then
    finish_conflicts_or_fail "$repo" "origin/$MAIN_BRANCH conflicted while updating local $MAIN_BRANCH" || return 1
  fi
}

merge_main_into_mine() {
  local repo="$1"

  if ! git_in "$repo" show-ref --verify --quiet "refs/heads/$MINE_BRANCH"; then
    git_in "$repo" branch "$MINE_BRANCH" "$MAIN_BRANCH"
    log "$repo: created local $MINE_BRANCH from $MAIN_BRANCH"
  fi

  git_in "$repo" checkout --quiet "$MINE_BRANCH"

  if git_in "$repo" merge-base --is-ancestor "$MAIN_BRANCH" "$MINE_BRANCH"; then
    log "$repo: $MINE_BRANCH already contains $MAIN_BRANCH"
    return 0
  fi

  log "$repo: merging $MAIN_BRANCH into $MINE_BRANCH"
  if ! git_in "$repo" merge --no-edit -m "Merge $MAIN_BRANCH into $MINE_BRANCH (github-projects sync)" "$MAIN_BRANCH"; then
    finish_conflicts_or_fail "$repo" "$MAIN_BRANCH conflicted while merging into $MINE_BRANCH" || return 1
  fi
}

process_repo() {
  local repo="$1"
  local original_branch
  TOTAL=$((TOTAL + 1))

  if [[ "$DRY_RUN" == "1" ]]; then
    log "dry-run: would sync $repo"
    return 0
  fi

  original_branch="$(current_branch "$repo")"
  log "$repo: sync start"

  if ! git_in "$repo" rev-parse --git-dir >/dev/null 2>&1; then
    fail_project "$repo" "not a git repository"
    return 0
  fi

  set +e
  ensure_clean_start "$repo"
  local clean_status=$?
  set -e
  if [[ "$clean_status" -eq 2 ]]; then
    create_mine_from_existing_main_if_missing "$repo"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi
  if [[ "$clean_status" -ne 0 ]]; then
    fail_project "$repo" "could not resolve existing Git state"
    return 0
  fi

  if ! git_in "$repo" remote get-url origin >/dev/null 2>&1; then
    SKIPPED=$((SKIPPED + 1))
    warn "$repo: skipped because origin remote is missing"
    return 0
  fi

  if ! git_in "$repo" fetch --quiet origin "$MAIN_BRANCH"; then
    fail_project "$repo" "fetch origin/$MAIN_BRANCH failed"
    restore_branch_if_possible "$repo" "$original_branch"
    return 0
  fi

  if ! git_in "$repo" show-ref --verify --quiet "refs/remotes/origin/$MAIN_BRANCH"; then
    SKIPPED=$((SKIPPED + 1))
    warn "$repo: skipped because origin/$MAIN_BRANCH is missing"
    restore_branch_if_possible "$repo" "$original_branch"
    return 0
  fi

  if ! update_main_branch "$repo"; then
    fail_project "$repo" "could not update $MAIN_BRANCH"
    restore_branch_if_possible "$repo" "$original_branch"
    return 0
  fi

  if ! merge_main_into_mine "$repo"; then
    fail_project "$repo" "could not merge $MAIN_BRANCH into $MINE_BRANCH"
    restore_branch_if_possible "$repo" "$original_branch"
    return 0
  fi

  if has_git_operation_in_progress "$repo" || has_unmerged_paths "$repo" || has_local_changes "$repo"; then
    fail_project "$repo" "sync left uncommitted or unresolved changes"
    restore_branch_if_possible "$repo" "$original_branch"
    return 0
  fi

  UPDATED=$((UPDATED + 1))
  restore_branch_if_possible "$repo" "$original_branch"
  log "$repo: sync done"
}

discover_repos() {
  local collection
  local project
  local candidate
  shopt -s nullglob
  for collection in "$PROJECTS_ROOT"/*; do
    [[ -d "$collection" ]] || continue
    for project in "$collection"/*; do
      [[ -d "$project" ]] || continue
      for candidate in "$project" "$project/repo"; do
        [[ -e "$candidate/.git" ]] || continue
        printf '%s\n' "$candidate"
        break
      done
    done
  done
  shopt -u nullglob
}

run_sync() {
  local repo
  if [[ ! -d "$PROJECTS_ROOT" ]]; then
    warn "projects root not found: $PROJECTS_ROOT"
    exit 1
  fi

  while IFS= read -r repo; do
    [[ -n "$repo" ]] || continue
    process_repo "$repo"
  done < <(discover_repos)

  log "summary: total=$TOTAL updated=$UPDATED skipped=$SKIPPED failed=$FAILED"
  [[ "$FAILED" -eq 0 ]]
}

self_test() {
  local tmp
  local origin
  local seed
  local project
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/github-projects-sync-test.XXXXXX")"
  trap 'rm -rf "$tmp"' RETURN

  origin="$tmp/origin.git"
  seed="$tmp/seed"
  project="$tmp/github-projects/test/demo"

  git init --bare --quiet "$origin"
  git clone --quiet "$origin" "$seed"
  git_in "$seed" checkout --quiet -b "$MAIN_BRANCH"
  printf 'v1\n' >"$seed/file.txt"
  git_in "$seed" add file.txt
  git_in "$seed" commit --quiet -m "Initial main"
  git_in "$seed" push --quiet origin "$MAIN_BRANCH"

  mkdir -p "$(dirname "$project")"
  git clone --quiet "$origin" "$project"
  git_in "$project" checkout --quiet "$MAIN_BRANCH"

  printf 'v2\n' >"$seed/file.txt"
  git_in "$seed" add file.txt
  git_in "$seed" commit --quiet -m "Update main"
  git_in "$seed" push --quiet origin "$MAIN_BRANCH"

  PROJECTS_ROOT="$tmp/github-projects" CONFLICT_AGENT=0 run_sync

  git_in "$project" show-ref --verify --quiet "refs/heads/$MINE_BRANCH"
  git_in "$project" checkout --quiet "$MINE_BRANCH"
  grep -Fxq "v2" "$project/file.txt"
  git_in "$project" diff --quiet
  git_in "$project" diff --cached --quiet
  log "self-test passed"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cursor)
      RESOLVE_AGENT="cursor"
      shift
      ;;
    --claude)
      RESOLVE_AGENT="claude"
      shift
      ;;
    --projects-root)
      PROJECTS_ROOT="${2:?--projects-root requires a path}"
      shift 2
      ;;
    --main-branch)
      MAIN_BRANCH="${2:?--main-branch requires a name}"
      shift 2
      ;;
    --mine-branch)
      MINE_BRANCH="${2:?--mine-branch requires a name}"
      shift 2
      ;;
    --conflict-agent)
      CONFLICT_AGENT="${2:?--conflict-agent requires 0 or 1}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --self-test)
      SELF_TEST=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      warn "unknown option: $1"
      usage >&2
      exit 2
      ;;
  esac
done

case "$RESOLVE_AGENT" in
  claude | cursor) ;;
  *)
    warn "invalid resolve agent: $RESOLVE_AGENT"
    exit 2
    ;;
esac

if [[ "$SELF_TEST" == "1" ]]; then
  self_test
else
  run_sync
fi
