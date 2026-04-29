**@assigned_agent**: agent.dev

## 1. TESTS

```ts
@notes: so test i want run 2 agents main and manager and the i ll text in both i expecing 
```

---

## 2. QUESTIONS

---

1. **How does each agent get its own bot token?**

**ai_answer**: Via `TELEGRAM_BOT_TOKEN` env variable. Each agent's `.env` or ragent launch config sets a different token. The `.mcp.json` already passes `TELEGRAM_BOT_TOKEN` from env. So each ragent shell script just needs to export a different token + different `TELEGRAM_STATE_DIR`.
**user_answer**: yes and we need update related skill because there we set cocreate path

---

1. **How to configure per-agent `TELEGRAM_STATE_DIR` so state doesn't collide?**

**ai_answer**: Default is `~/.claude/channels/telegram`. We should adopt a convention like `~/.claude/channels/{agent_name}/telegram`. Each ragent launch script sets this env var before starting Claude Code. The `.mcp.json` already supports `TELEGRAM_STATE_DIR` passthrough.
**user_answer**: we should never use global configuration or path we need per agent configuration and  configuration for main root agent that can controll another agents

---

1. **Can Claude channels (`claude/channel` experimental) be used for task coordination between agents?**

**ai_answer**: Partially. The current `server.ts` already uses `notifications/claude/channel` to relay inbound Telegram messages into Claude. Claude can then reply via the `reply` MCP tool. This is effectively a chat-based coordination layer. However, it's one-directional push — Claude doesn't initiate messages autonomously unless triggered by a session. For agent-to-agent coordination, we'd need a second relay or a shared inbox. Claude channels are a practical UX channel for human↔agent, less so for agent↔agent without additional tooling.
**user_answer**:

---

1. **How should message routing work in group chats with multiple bots?**

**ai_answer**: Each bot only responds to its own `@mention` (or configured `mentionPatterns`). The group policy in `access.json` uses `requireMention: true`. So @rootbot messages go only to root agent, @managerbot to manager agent. No routing table needed — Telegram delivers all group messages to all bots; each bot filters by its own username.
**user_answer**:  let's now consider that every agent has it's own bot and group chat

---

1. **Does the `bun server.ts` orphan/PID mechanism work when two instances run for different agents?**

**ai_answer**: Yes — each instance uses its own `TELEGRAM_STATE_DIR`, so `bot.pid` files are separate. One instance won't kill the other on startup.
**user_answer**:

---

1. **What identity should each agent announce in Telegram (display name, username)?**

**ai_answer**: The Telegram bot username is fixed at BotFather creation. We need separate bots created: one for root agent, one for manager agent. Display names and usernames set at BotFather. No code change needed — just separate tokens.
**user_answer**:

---

1. **Should agents send proactive task updates (not just respond to messages)?**

**ai_answer**: The current design is reactive (respond to inbound). For proactive updates (e.g., "task 8 done"), the agent session must call the `reply` MCP tool with a known `chat_id`. That `chat_id` must be in `allowFrom`. This is feasible but requires knowing the chat_id at agent runtime. Could store it in agent config.
**user_answer**:

---

1. **How does the manager ragent (`manager.ragent.sh`) know which bot to use?**

**ai_answer**: The ragent shell script should export `TELEGRAM_BOT_TOKEN=<manager-token>` and `TELEGRAM_STATE_DIR=~/.claude/channels/agent.manager/telegram` before launching. The `.mcp.json` picks these up via env passthrough already.
**user_answer**: we should store every bot config or whatever in agents/agent name/

---

1. **Is there a risk of the 409 Conflict error if two agents share the same bot token?**

**ai_answer**: Yes — Telegram allows only one `getUpdates` consumer per token. Two agents must have two different tokens. If someone accidentally uses the same token, the second instance will get 409 and retry/exit per existing server.ts logic.
**user_answer**:

---

1. **Should we validate Claude channels as a message bus for agent-to-agent task updates (not just human↔agent)?**

**ai_answer**: Worth testing. Agents could send task status updates to a shared Telegram group where all bots are members. Each agent monitors its own bot for group @mentions. This gives a visible audit trail in Telegram. However, latency and the polling nature make it unsuitable for tight loops — better for human-readable notifications.
**user_answer**:

---

1. **Where should the per-agent Telegram config live (bot token, state dir)?**

**ai_answer**: In the agent's `.env` file loaded by the ragent launch script, or in `config.{agent}.jsonc`. The `.mcp.json` already uses env vars, so `.env` is the right place. The `/telegram:access` skill reads `TELEGRAM_STATE_DIR` to find access.json.
**user_answer**: already sasid but per agent icluding .env

---

1. **Do we need a new skill or just config changes?**

**ai_answer**: Mostly config changes (per-agent tokens + state dirs in ragent scripts). Potentially a small new skill or updated skill docs to explain multi-bot setup. The core `server.ts` is already capable.
**user_answer**:

---

## 3. RESEARCH FINDINGS AND INSIGHTS

**Existing Telegram plugin is fully featured** — `plugins/telegram/server.ts` already supports:

- DM pairing with 6-char codes
- Group support with `requireMention`
- Photo/document/voice/video attachments
- Permission relay via Telegram inline buttons
- Orphan detection via PID file per `TELEGRAM_STATE_DIR`
- Groq voice transcription

**Key env vars** (already supported in `.mcp.json`):

- `TELEGRAM_BOT_TOKEN` — bot token
- `TELEGRAM_STATE_DIR` — isolates all state (access.json, inbox, approved, bot.pid)
- `GROQ_API_KEY` — optional voice transcription

**Files to change/create:**

```
PATH: agents/agent.manager/config.manager.jsonc
- Add telegram section: manager bot token reference, state dir @notes: no need store here anything

PATH: plugins/telegram/.mcp.json  
- Already correct (uses env vars). No change needed.

PATH: rinit.sh (or equivalent agent launch scripts)
- Set TELEGRAM_STATE_DIR per agent
- Set TELEGRAM_BOT_TOKEN per agent

PATH: agents/agent.manager/.env (create if needed)
- TELEGRAM_BOT_TOKEN=<manager-bot-token>
- TELEGRAM_STATE_DIR=~/.claude/channels/agent.manager/telegram

PATH: plugins/telegram/skills/access/SKILL.md
- Update docs to mention per-agent setup convention
```

**Multi-bot architecture:**

```
Root agent    → TELEGRAM_BOT_TOKEN=<root-token>    → STATE_DIR=./envs/telegram
Manager agent → TELEGRAM_BOT_TOKEN=<manager-token> → STATE_DIR=./envs/telegram
```

Both can run simultaneously — separate tokens, separate PID files, no conflict.

---

## 4. CURRENT STATE AND LOGIC FOR THE TASK (HOW IT WORKS NOW)

The Telegram plugin (`plugins/telegram/server.ts`) is a single MCP server:

- Launched by Claude Code via `.mcp.json` plugin config
- Reads `TELEGRAM_BOT_TOKEN` + `TELEGRAM_STATE_DIR` from env
- Polls Telegram for updates (long-polling via grammy)
- Delivers inbound messages as `notifications/claude/channel` to the Claude session
- Claude replies via `reply` MCP tool

**Current limitation**: Only one bot configured globally (root agent). The manager agent running via `manager.ragent.sh` would share the same bot if no override is set.

**What needs to change**:

1. Manager ragent launch script must export different `TELEGRAM_BOT_TOKEN` + `TELEGRAM_STATE_DIR`
2. BotFather: create a second bot for manager agent
3. Run `/telegram:access pair <code>` separately for each agent's bot
4. Document the convention for future agents

**What already works without changes**:

- The plugin code itself supports all this via env vars
- Group + DM + attachment support
- Permission relay, pairing, allowlists

---

## NOTES FOR THE AGENT WHO WILL DEVELOP THIS TASK

- **No server.ts changes needed** — the plugin already supports full isolation via `TELEGRAM_STATE_DIR`
- **Primary work is config/env/launch-script** — set per-agent env vars in ragent scripts
- **Two bots needed** — create via BotFather: `@root_claude_bot` and `@manager_claude_bot` (or similar)
- **Test with both bots running simultaneously** before claiming done
- **Claude channels validation**: send a task update from the manager session via `reply` tool with `chat_id` of a known group — verify it appears in Telegram. This confirms agents can proactively push updates.
- **Voice skill**: `plugins/telegram/skills/voice/` directory exists (untracked) — check if there's a new voice skill to integrate
- The task note says "Should be one telegram bot for root agent and if i run manager agent with manager.ragent.sh it has own config with setuped bot and this 2 bots both working" — this confirms the two-separate-bots-via-env approach is correct.

