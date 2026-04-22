content-production-project/
│
├── .env                             # All API keys and secrets
├── .gitignore                       # Excludes .env, /mine/, temp files python and node inoring files
├── package.json                     # Root monorepo / workspace config
├── README.md                        # Project overview and setup guide
│
├── dev-agent/
│   ├── .claude/
│   │   ├── agents/
│   │   ├── commands/
│   │   ├── hooks/
│   │   ├── skills/
│   │   ├── settings.json
│   │   └── settings.local.json
│   ├── .mcp.json
│   └── CLAUDE.md                    # NOTE: Develops and maintains the content production project. Workspace: content-production-project/
│
├── content-factory-agent/
│   ├── .claude/
│   │   ├── agents/
│   │   ├── commands/
│   │   ├── hooks/
│   │   ├── skills/
│   │   ├── settings.json
│   │   └── settings.local.json
│   ├── global-config-empty/         # Empty dir for global Claude isolation
│   ├── tools/
│   ├── content.db                        # Content agent DB notes — queries, content records, sessions
│   ├── .mcp.json
│   └── CLAUDE.md                    # NOTE: Produces and manages content for social media. Workspace: content-production-project/
│                                    # NOTE: Set CLAUDE_CONFIG_DIR=content-factory-agent/global-config-empty/
│
├── db-agent/
│   ├── .claude/
│   │   ├── agents/
│   │   ├── commands/
│   │   ├── hooks/
│   │   ├── skills/
│   │   ├── settings.json
│   │   └── settings.local.json
│   ├── global-config-empty/         # Empty dir for global Claude isolation
│   ├── tools/
│   ├── dbs/                        # virtual link to all dbs in all projects
│   ├── .mcp.json
│   └── CLAUDE.md                    # NOTE: Database schema, migrations, and operational DB work. Workspace: content-production-project/
│                                    # NOTE: Set CLAUDE_CONFIG_DIR=db-agent/global-config-empty/
│
├── research-agent/
│   ├── .claude/
│   │   ├── agents/
│   │   ├── commands/
│   │   ├── hooks/
│   │   ├── skills/
│   │   ├── settings.json
│   │   └── settings.local.json
│   ├── db.md                        # Research agent DB notes — research records, queue state
│   ├── .mcp.json
│   └── CLAUDE.md                    # NOTE: Researches topics, populates knowledge-base/research/. Workspace: content-production-project/
│
├── app/
│   ├── api/
│   ├── ui/
│   └── telegram-bot/
│
├── knowledge-base/
│   ├── docs/
│   │   └── LOGS_DOCUMENTATION.md  virtual link to documenation in a logs 
│   ├── research/
│   │   ├── QUEUE.md                 # Pending research topics with priority and status
│   │   └── topics/                  # Completed research — one folder per topic
│   ├── platforms/
│   ├── accounts/
│   ├── flows/
│   ├── content-management/
│   ├── content/
│   ├── github-projects/
│   ├── logs/
│   │   ├── LOGS_DOCUMENTATION.md
│   │   ├── last-two-sessions-dev-agent.log
│   │   ├── last-two-sessions-content-agent.log
│   │   ├── last-two-sessions-api.log
│   │   ├── last-two-sessions-ai.log
│   │   │
│   │   ├── errors.ai.log
│   │   ├── errors.api.log
│   │   ├── errors.content-agent.log
│   │   ├── errors.crons.log
│   │   ├── errors.db.log
│   │   ├── errors.dev-agent.log
│   │   ├── errors.telegram.log
│   │   ├── errors.tools-content-agent.log
│   │   ├── errors.tools-dev-agent.log
│   │   │
│   │   ├── ai.log
│   │   ├── api.log
│   │   ├── content-agent.log
│   │   ├── crons.log
│   │   ├── db.log
│   │   ├── dev-agent.log
│   │   ├── telegram.log
│   │   ├── tools-content-agent.log
│   │   └── tools-dev-agent.log
│   │   └── logs.db
│   ├── project-management/
│   └── INDEX.md
│
├── project-management/
└── mine/                            # Local-only; add to .gitignore if used
    └── MINE.md