---
name: sync-agent-providers
description: Set up, sync, or maintain skillshare and related agent providers. Use when configuring skillshare or shared skills.
argument-hint: ""
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---

# GITHUB
if not installed you can install from source
The GitHub repo is `github.com/runkids/skillshare`. or
`brew install runkids/tap/skillshare`

# Skillshare Sync Workflow

Use this skill when a user wants to set up, sync, or maintain shared skills with `skillshare`.

## Core Commands

- Initialize local configuration:
  - `skillshare init`
- Sync skills to detected targets:
  - `skillshare sync`
- Install skills from a remote repository:
  - `skillshare install <repo-or-url>`
- Update installed skills:
  - `skillshare update --all`
- Run security audit before syncing:
  - `skillshare audit`

## CI Setup With GitHub Action

Use `runkids/setup-skillshare@v1` in CI before running `skillshare` commands.

```yaml
name: Sync Skills
on: push

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: runkids/setup-skillshare@v1
        with:
          source: ./skills
      - run: skillshare sync
```

## Common Flows

### 1) First-time setup

1. Run `skillshare init`
2. Run `skillshare sync`
3. Verify target status with normal CLI output before continuing

### 2) Project-level skills (recommended in repos)

1. Run `skillshare init -p`
2. Run `skillshare sync`
3. Commit generated project skill configuration when requested by user

### 3) Install shared skills from a repo

1. Run `skillshare install <repo-or-url>`
2. Run `skillshare audit`
3. Run `skillshare sync`

### 4) Fix symlink issues on a specific target

If a target does not support symlinks well:

1. Run `skillshare target <name> --mode copy`
2. Run `skillshare sync`

### 5) CI project mode workflow

1. Configure action with `project: true`
2. Optionally set `targets` and `mode`
3. Run `skillshare sync -p`

```yaml
- uses: actions/checkout@v4
- uses: runkids/setup-skillshare@v1
  with:
    project: true
    targets: claude,cursor
- run: skillshare sync -p
```

## Decision Rules

- Prefer `skillshare audit` before large updates or new installs.
- Prefer project mode (`init -p`) when team members should share the same setup.
- Use target copy mode only when symlink mode causes issues.
- In CI, always run `setup-skillshare` before `skillshare sync/install/update`.
- For project mode in CI, only use `targets` and `mode` settings.

## Action Inputs To Use Most

- `version`: pin deterministic installs for CI stability.
- `source`: set source dir in global mode, usually `./skills`.
- `targets`: limit sync scope, for example `claude,cursor`.
- `mode`: `merge` (default), `copy`, or `symlink`.
- `project`: use project-level `.skillshare/` mode.
- `audit`, `audit-threshold`, `audit-format`, `audit-output`: enforce security checks.

## Action Outputs

- `version`: installed skillshare version.
- `audit-exit-code`: `0` clean, `1` findings.

Use outputs to gate later CI steps when needed.

## Security Audit Patterns (CI)

- Basic fail-on-severity:
  - `audit: true`
  - `audit-threshold: high`
- Code Scanning integration:
  - `audit-format: sarif`
  - upload with `github/codeql-action/upload-sarif@v3`
- Stricter pipelines:
  - `audit-profile: strict`
  - `audit-threshold: medium`

## CI Reliability Notes

- The action initializes skillshare config automatically.
- It supports retry and cache behavior for binary download.
- It avoids direct shell interpolation for inputs.
- Prefer supported runners:
  - `ubuntu-latest`
  - `macos-latest`
  - `macos-13`

## Quick Troubleshooting

- If expected skills are missing after sync, rerun `skillshare sync` and inspect target mapping.
- If install/update fails, retry after checking repository URL and network access.
- If mode mismatch causes issues, set explicit target mode and sync again.
- If CI runs in project mode and fails with source/git options, remove unsupported flags and keep only `targets`/`mode`.

