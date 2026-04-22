# Official environment variables

Pulled directly from the official docs.

---

## Authentication & API

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | API key sent as `X-Api-Key`; overrides subscription login |
| `ANTHROPIC_AUTH_TOKEN` | Custom `Authorization` header value (prefixed with `Bearer`) |
| `ANTHROPIC_BASE_URL` | Override API endpoint (proxy/gateway) |
| `ANTHROPIC_BEDROCK_BASE_URL` | Override Bedrock endpoint URL |
| `ANTHROPIC_VERTEX_BASE_URL` | Override Vertex AI endpoint |
| `ANTHROPIC_VERTEX_PROJECT_ID` | GCP project ID for Vertex AI |
| `ANTHROPIC_FOUNDRY_API_KEY` | API key for Microsoft Foundry |
| `ANTHROPIC_FOUNDRY_BASE_URL` | Full Foundry resource base URL |
| `ANTHROPIC_FOUNDRY_RESOURCE` | Foundry resource name |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock API key |
| `ANTHROPIC_BETAS` | Comma-separated extra `anthropic-beta` header values |
| `ANTHROPIC_CUSTOM_HEADERS` | Custom headers (newline-separated `Name: Value`) |
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth access token for Claude.ai auth |
| `CLAUDE_CODE_OAUTH_REFRESH_TOKEN` | OAuth refresh token (for automated provisioning) |
| `CLAUDE_CODE_OAUTH_SCOPES` | Scopes for the refresh token |
| `CLAUDE_CODE_CLIENT_CERT` | Path to client cert for mTLS |
| `CLAUDE_CODE_CLIENT_KEY` | Path to client private key for mTLS |
| `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE` | Passphrase for encrypted client key |

## Model configuration

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_MODEL` | Model name to use |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Override default Sonnet model ID |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Override default Haiku model ID |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Override default Opus model ID |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` | Add a non-standard model to `/model` picker |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_NAME` | Display name for custom model |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION` | Display description for custom model |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Model used for subagents |
| `CLAUDE_CODE_EFFORT_LEVEL` | `low`, `medium`, `high`, `max`, or `auto` |
| `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP` | Prevent auto-remap of older Opus versions |
| `MAX_THINKING_TOKENS` | Override extended thinking token budget |
| `CLAUDE_CODE_DISABLE_THINKING` | Force-disable extended thinking |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | Disable adaptive reasoning on Opus/Sonnet 4.6 |
| `ANTHROPIC_SMALL_FAST_MODEL` | **[DEPRECATED]** Haiku-class model for background tasks |

## Context & compaction

| Variable | Purpose |
| --- | --- |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | Context window size for compaction calculations |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | % of context at which auto-compact triggers (1–100) |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | Disable 1M token context window |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max output tokens per request |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | Token limit override for file reads |
| `DISABLE_AUTO_COMPACT` | Disable auto-compaction (manual `/compact` still works) |
| `DISABLE_COMPACT` | Disable **all** compaction including manual |

## Bash & shell execution

| Variable | Purpose |
| --- | --- |
| `CLAUDE_ENV_FILE` | Shell script sourced before every Bash command (also populated by hooks) |
| `CLAUDE_CODE_SHELL` | Override shell detection |
| `CLAUDE_CODE_SHELL_PREFIX` | Command prefix wrapping all bash commands (e.g. audit logging) |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | Return to original cwd after each Bash command |
| `BASH_DEFAULT_TIMEOUT_MS` | Default timeout for long-running bash commands |
| `BASH_MAX_TIMEOUT_MS` | Max timeout the model can set for bash |
| `BASH_MAX_OUTPUT_LENGTH` | Max characters in bash output before middle-truncation |
| `CLAUDECODE` | Set to `1` inside shells spawned by Claude Code |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | Strip API credentials from subprocess environments |

## MCP (Model Context Protocol)

| Variable | Purpose |
| --- | --- |
| `MCP_TIMEOUT` | Timeout for MCP server startup |
| `MCP_TOOL_TIMEOUT` | Timeout for MCP tool execution |
| `MCP_SERVER_CONNECTION_BATCH_SIZE` | Parallel local (stdio) MCP connections at startup (default: 3) |
| `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE` | Parallel remote (HTTP/SSE) MCP connections (default: 20) |
| `MCP_CONNECTION_NONBLOCKING` | Skip MCP connection wait in `-p` mode |
| `MAX_MCP_OUTPUT_TOKENS` | Max tokens in MCP tool responses (default: 25000) |
| `ENABLE_CLAUDEAI_MCP_SERVERS` | Set `false` to disable claude.ai MCP servers |
| `ENABLE_TOOL_SEARCH` | Control MCP tool deferral behavior |
| `MCP_CLIENT_SECRET` | OAuth client secret for MCP servers |
| `MCP_OAUTH_CALLBACK_PORT` | Fixed port for OAuth callback |
| `CLAUDE_AGENT_SDK_MCP_NO_PREFIX` | Skip `mcp__<server>__` prefix on tool names in SDK mode |

## Subagents & tasks

| Variable | Purpose |
| --- | --- |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent teams (experimental) |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Disable all background task functionality |
| `CLAUDE_AUTO_BACKGROUND_TASKS` | Force-enable auto-backgrounding for long subagent tasks |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | Max parallel read-only tools/subagents (default: 10) |
| `CLAUDE_CODE_ENABLE_TASKS` | Enable task tracking in `-p` mode |
| `CLAUDE_CODE_TASK_LIST_ID` | Share task list across multiple sessions |
| `CLAUDE_CODE_TEAM_NAME` | Agent team name (auto-set on team members) |
| `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` | Disable all built-in subagent types in SDK mode |
| `TASK_MAX_OUTPUT_LENGTH` | Max chars in subagent output (default: 32000, max: 160000) |

## Security & credential management

| Variable | Purpose |
| --- | --- |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | Strip credentials from subprocess envs |
| `CLAUDE_CODE_SKIP_BEDROCK_AUTH` | Skip AWS auth for Bedrock (for LLM gateways) |
| `CLAUDE_CODE_SKIP_FOUNDRY_AUTH` | Skip Azure auth for Foundry |
| `CLAUDE_CODE_SKIP_VERTEX_AUTH` | Skip Google auth for Vertex |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | Let proxy handle DNS resolution |

## Hooks & session lifecycle

| Variable | Purpose |
| --- | --- |
| `CLAUDE_ENV_FILE` | Dynamically populated by SessionStart, CwdChanged, FileChanged hooks |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | Max time for SessionEnd hooks (default: 1500ms) |
| `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY` | Auto-exit delay after idle in SDK mode |
| `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS` | Emit session state changes for external consumers |

## IDE integration

| Variable | Purpose |
| --- | --- |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` | Override auto IDE connection (`true`/`false`) |
| `CLAUDE_CODE_IDE_HOST_OVERRIDE` | Override IDE host address |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` | Skip auto-install of IDE extensions |
| `CLAUDE_CODE_IDE_SKIP_VALID_CHECK` | Skip IDE lockfile validation |

## Rendering & terminal

| Variable | Purpose |
| --- | --- |
| `CLAUDE_CODE_NO_FLICKER` | Enable fullscreen rendering (reduces flicker, research preview) |
| `CLAUDE_CODE_DISABLE_MOUSE` | Disable mouse tracking (restores native copy-on-select) |
| `CLAUDE_CODE_SCROLL_SPEED` | Mouse wheel scroll multiplier in fullscreen mode (1–20) |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | Disable auto terminal title updates |
| `CLAUDE_CODE_ACCESSIBILITY` | Keep native cursor visible for screen magnifiers |
| `CLAUDE_CODE_SYNTAX_HIGHLIGHT` | Set `false` to disable syntax highlighting in diffs |
| `CLAUDE_CODE_TMUX_TRUECOLOR` | Control 24-bit color in tmux sessions |
| `CLAUDE_CODE_DEBUG_REPAINTS` | Debug logging for terminal repaint operations |

## Plugins

| Variable | Purpose |
| --- | --- |
| `CLAUDE_CODE_PLUGIN_CACHE_DIR` | Override plugins root directory |
| `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` | Timeout for git ops when installing plugins (default: 120000) |
| `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE` | Keep marketplace cache on git pull failure |
| `CLAUDE_CODE_PLUGIN_SEED_DIR` | Read-only plugin seed dirs for containers |
| `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL` | Skip official marketplace on first run |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` | Wait for plugin install before first query in `-p` mode |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS` | Timeout for synchronous plugin install |
| `FORCE_AUTOUPDATE_PLUGINS` | Force plugin updates even if autoupdater is disabled |

## Networking & proxies

| Variable | Purpose |
| --- | --- |
| `HTTP_PROXY` | HTTP proxy server |
| `HTTPS_PROXY` | HTTPS proxy server |
| `NO_PROXY` | Domains/IPs that bypass proxy |
| `API_TIMEOUT_MS` | API request timeout in ms (default: 600000 / 10 min) |
| `CLAUDE_ENABLE_STREAM_WATCHDOG` | Abort stalled API streams after idle timeout |
| `CLAUDE_STREAM_IDLE_TIMEOUT_MS` | Idle timeout before watchdog closes stream (default: 90000) |
| `CLAUDE_CODE_MAX_RETRIES` | API request retry count (default: 10) |
| `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK` | Disable non-streaming retry on stream failure |

## OpenTelemetry / monitoring

| Variable | Purpose |
| --- | --- |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | Enable OTel data collection |
| `OTEL_LOG_TOOL_CONTENT` | Include tool inputs/outputs in OTel spans |
| `OTEL_LOG_TOOL_DETAILS` | Include MCP server names in telemetry |
| `OTEL_LOG_USER_PROMPTS` | Include user prompt text in traces |
| `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` | Include account UUID in metrics (default: true) |
| `OTEL_METRICS_INCLUDE_SESSION_ID` | Include session ID in metrics (default: true) |
| `OTEL_METRICS_INCLUDE_VERSION` | Include Claude Code version in metrics (default: false) |
| `CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS` | OTel span flush timeout (default: 5000) |
| `CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS` | OTel exporter shutdown timeout (default: 2000) |
| `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS` | Dynamic OTel header refresh interval (default: 29 min) |
| `DISABLE_TELEMETRY` | Opt out of Statsig telemetry |
| `DISABLE_ERROR_REPORTING` | Opt out of Sentry error reporting |

## Disable / feature flags

| Variable | Purpose |
| --- | --- |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Disables autoupdater + feedback + error reporting + telemetry |
| `DISABLE_AUTOUPDATER` | Disable automatic updates |
| `DISABLE_COST_WARNINGS` | Disable cost warning messages |
| `DISABLE_PROMPT_CACHING` | Disable prompt caching for all models |
| `DISABLE_PROMPT_CACHING_HAIKU/SONNET/OPUS` | Disable caching per model tier |
| `DISABLE_INTERLEAVED_THINKING` | Prevent interleaved-thinking beta header |
| `CLAUDE_CODE_DISABLE_FAST_MODE` | Disable fast mode |
| `CLAUDE_CODE_DISABLE_CRON` | Disable scheduled tasks and `/loop` |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Disable background task system |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` | Send `@file` mentions as plain text |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | Prevent loading any `CLAUDE.md` files |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Disable auto memory |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | Disable session quality surveys |
| `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` | Disable file checkpointing (breaks `/rewind`) |
| `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` | Remove built-in git workflow instructions |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Strip beta headers (for proxy compatibility) |
| `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` | Disable internal advisory tool |
| `DISABLE_LOGIN_COMMAND` | Hide `/login` |
| `DISABLE_LOGOUT_COMMAND` | Hide `/logout` |
| `DISABLE_DOCTOR_COMMAND` | Hide `/doctor` |
| `DISABLE_UPGRADE_COMMAND` | Hide `/upgrade` |
| `DISABLE_FEEDBACK_COMMAND` | Hide `/feedback` |
| `DISABLE_INSTALL_GITHUB_APP_COMMAND` | Hide `/install-github-app` |
| `DISABLE_EXTRA_USAGE_COMMAND` | Hide `/extra-usage` |

## Miscellaneous

| Variable | Purpose |
| --- | --- |
| `CLAUDE_CONFIG_DIR` | Override config directory (default: `~/.claude`) |
| `CLAUDE_CODE_TMPDIR` | Override temp directory |
| `CLAUDE_CODE_SIMPLE` | Minimal mode: only Bash + file tools, no plugins/hooks/MCP |
| `CLAUDE_CODE_NEW_INIT` | Make `/init` run interactive setup flow |
| `IS_DEMO` | Demo mode: hide email/org, skip onboarding |
| `USE_BUILTIN_RIPGREP` | Set `0` to use system `rg` instead of bundled one |
| `SLASH_COMMAND_TOOL_CHAR_BUDGET` | Override character budget for skill metadata |
| `MAX_STRUCTURED_OUTPUT_RETRIES` | Retry count for JSON schema validation failures (default: 5) |
| `CLAUDE_CODE_GLOB_HIDDEN` | Set `false` to exclude dotfiles from Glob results |
| `CLAUDE_CODE_GLOB_NO_IGNORE` | Set `false` to respect `.gitignore` in Glob |
| `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS` | Glob timeout (default: 20s, WSL: 60s) |
| `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` | Auto-resume mid-turn sessions in SDK mode |
| `FALLBACK_FOR_ALL_PRIMARY_MODELS` | Trigger fallback model on any overload, not just Opus |
| `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` | Credential refresh interval for apiKeyHelper |
| `CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING` | Force-enable fine-grained tool input streaming (Anthropic API only) |
| `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION` | Set `false` to disable prompt suggestions |
| `ENABLE_PROMPT_CACHING_1H_BEDROCK` | Request 1-hour prompt cache TTL on Bedrock |
| `CLAUDE_CODE_USE_BEDROCK` | Use Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | Use Vertex AI |
| `CLAUDE_CODE_USE_FOUNDRY` | Use Microsoft Foundry |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | Enable PowerShell tool on Windows (opt-in) |
| `CLAUDE_CODE_GIT_BASH_PATH` | Windows: path to Git Bash executable |
| `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` | Host app controls provider selection |
| `CLAUDE_CODE_ENABLE_XAA` | Enable experimental XAA feature |
| `CLAUDE_CODE_DEBUG_LOGS_DIR` | Override debug log file path |
| `CLAUDE_CODE_DEBUG_LOG_LEVEL` | Log level: `verbose`, `debug`, `info`, `warn`, `error` |

---

**Summary:** 191 variables as of v2.1.83. The `CLAUDE_ENV_FILE` + hook combination is especially powerful for workflows: you can make Claude’s bash environment reactive to project context without manual activation steps.
