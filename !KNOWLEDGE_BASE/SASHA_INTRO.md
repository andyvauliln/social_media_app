.
|-- !KNOWLEDGE_BASE // FULL KNOWLADGE BASE OF THE PROJECT FOR KNOWLADGE BASSE AGENT
|   |-- all-agents.md
|   |-- all-skills.md
|   |-- all-commads.md
|   |-- all-mcp.md
|   |-- all-apps.md
|   |-- all-scripts.md
|   |-- all-crons.md
|   |-- docs // docs from all agents and apps
|   |   |-- docs.agent.cotnent-factory.symlink
|   |   |-- docs.agent.db.symlink
|   |   |-- docs.agent.knowledge-base
|   |   |-- docs.agent.logs.symlink
|   |   |-- docs.agent.research.symlink
|   |   |-- docs.dashboard.symlink
|   |   |-- docs.telegram.symlink
|   |-- models
|   |   `-- index.jsoc // list of all model with all realted data about it
|   |-- researches.symlink // symlink from research agent
|   |-- !index.jsonc // list of all files in knowledge base
|   |-- AGENTS_ARCHITECTURE.md // view on architecture
|   |-- CRONS.md
|   |-- CURRENT_COST.md
|   |-- EXAMPLES.md
|   |-- PRICSES.md
|   `-- SASHA_INTRO.md
|-- .claude
|   |-- commands
|   |   |-- dev
|   |   |   |-- create-agent.dev.md
|   |   |   |-- create-root-command-for-skill.md
|   |   |   |-- create-skill.dev.md
|   |   |   |-- github-installer.dev.md
|   |   |   |-- merge-main.dev.md
|   |   |   |-- sync-agent-providers.dev.md
|   |   |   |-- sync-project.dev.md
|   |   |   |-- update-agents.dev.md
|   |   |   |-- update-files-with-metadata.dev.md
|   |   |   |-- update-index-lists.dev.md
|   |   |   |-- update-realated-files.dev.md
|   |   |   `-- validate-skills-metadata.dev.md
|   |   `-- manager
|   |       |-- collect-notes.manager.md
|   |       |-- create-plan.manager.md
|   |       |-- create-task.manager.md
|   |       |-- pick-task.manager.md
|   |       |-- do-task.manager.md
|   |       `-- sync-tasks.manager.md
|   |-- output-styles
|   |   |-- breaker.md
|   |   |-- challenger.md
|   |   |-- concise.md
|   |   |-- minimal.md
|   |   |-- opinionated.md
|   |   |-- paranoid.md
|   |   |-- performance.md
|   |   |-- roast.md
|   |   |-- ship-it.md
|   |   |-- simple.md
|   |   |-- socratic.md
|   |   |-- tdd.md
|   |   `-- think-aloud.md
|   |-- settings.json
|   `-- settings.local.json
|-- .github
|   `-- workflows
|       |-- claude-code-review.yml
|       |-- claude.yml
|       `-- skillshare-sync.yml
|-- .vscode
|   |-- ai-markers.code-snippets
|   `-- settings.json
|-- agents
|   |-- agent.content-factory
|   |   |-- content
|   |   |   |-- collections
|   |   |   |   |-- audio
|   |   |   |   |   `-- collection_name
|   |   |   |   |       `-- id_name.symlink.mp3
|   |   |   |   |-- pictures
|   |   |   |   |   `-- collection_name
|   |   |   |   |       `-- content_id.symlink.png
|   |   |   |   |-- sessions
|   |   |   |   |   `-- session_id
|   |   |   |   |       `-- content_id.png
|   |   |   |   `-- video
|   |   |   |       `-- collection_name
|   |   |   |           `-- content_id.symlink.mp4
|   |   |   `-- sessions
|   |   |       `-- session_id
|   |   |           `-- content_id.png
|   |   |-- docs.agent.content-factory
|   |   |   `-- !INDEX.md
|   |   |-- scripts.agent.content-factory
|   |   |   |-- generate-nanobanano-2.test.ts
|   |   |   |-- generate-nanobanano-2.ts
|   |   |   |-- get-voice.py
|   |   |   `-- get.voice.test.py
|   |   |-- .env
|   |   |-- CLAUDE.md
|   |   |-- config.content-factory.jsonc
|   |   |-- db-shema.content-factory.md
|   |   `-- db.content-factory.db
|   |-- agent.db
|   |   |-- dbs
|   |   |   |-- db.content-factory.symlink.db
|   |   |   `-- db.logs.symlink.db
|   |   |-- docs.agent.db
|   |   |   `-- !INDEX.md
|   |   |-- tools
|   |   |   `-- .gitkeep
|   |   `-- CLAUDE.md
|   |-- agent.dev
|   |   |-- .claude
|   |   |   `-- skills
|   |   |       |-- create-agent
|   |   |       |   |-- SKILL.md
|   |   |       |   `-- agent-template.md
|   |   |       |-- create-skill
|   |   |       |   `-- SKILL.md
|   |   |       |-- github-installer
|   |   |       |   `-- SKILL.md
|   |   |       |-- improve-skill
|   |   |       |   `-- SKILL.md
|   |   |       |-- merge-main
|   |   |       |   `-- SKILL.md
|   |   |       |-- remove-sensitive-data
|   |   |       |   `-- SKILL.md
|   |   |       |-- sync-agent-providers
|   |   |       |   `-- SKILL.md
|   |   |       |-- sync-db
|   |   |       |   `-- SKILL.md
|   |   |       |-- sync-project
|   |   |       |   `-- SKILL.md
|   |   |       |-- update-agents
|   |   |       |   `-- SKILL.md
|   |   |       |-- update-files-with-metadata
|   |   |       |   `-- SKILL.md
|   |   |       |-- update-related-files
|   |   |       |   `-- SKILL.md
|   |   |       `-- validate-skills-metadata
|   |   |           `-- SKILL.md
|   |   |-- docs.agent.dev
|   |   |   `-- !INDEX.md
|   |   |-- CLAUDE.md
|   |   `-- config.agent.dev.jsonc
|   |-- agent.instagram
|   |   |-- .claude
|   |   |   `-- skills
|   |   |       `-- create-account
|   |   |           `-- SKILL.md
|   |   |-- posts
|   |   |   `-- social_media.channel.post_id
|   |   |       `-- content_id.symlink.png
|   |   |-- .CLAUDE.md
|   |   `-- config.intstagram.jsonc
|   |-- agent.knowledge-base
|   |   |-- knowledge-base.symlink
|   |   `-- CLAUDE.md
|   |-- agent.logs
|   |   |-- docs.agent.logs
|   |   |   `-- !INDEX.md
|   |   |-- CLAUDE.md
|   |   `-- claude-debug.log
|   |-- agent.manager
|   |   |-- .claude
|   |   |   `-- skills
|   |   |       |-- collect-notes
|   |   |       |   `-- SKILL.md
|   |   |       |-- create-plan
|   |   |       |   `-- SKILL.md
|   |   |       |-- create-task
|   |   |       |   `-- SKILL.md
|   |   |       |-- make-pan-for-week
|   |   |       |   `-- SKILL.md
|   |   |       |-- make-plan-for-today
|   |   |       |   `-- SKILL.md
|   |   |       |-- pick-task
|   |   |       |   `-- SKILL.md
|   |   |       |-- do-task
|   |   |       |   `-- SKILL.md
|   |   |       |-- sync-tasks
|   |   |       |   `-- SKILL.md
|   |   |       `-- sync-with-notion-db
|   |   |           `-- SKILL.md
|   |   |-- docs.agent.manager
|   |   |   |-- !index.md
|   |   |   `-- dev.index.md
|   |   |-- scripts
|   |   |-- tasks
|   |   |   |-- done
|   |   |   |-- in_plan
|   |   |   `-- tasks.index.jsonc
|   |   `-- config.manager.jsonc
|   `-- agent.research
|       |-- docs.agent.research
|       |   `-- !INDEX.md
|       |-- researches
|       |   `-- session_id
|       |       |-- file_id.md
|       |       `-- file_id.result.md
|       |-- CLAUDE.md
|       `-- db.research.db
|-- apps
|   |-- app.dashboard_v2
|   |   |-- docs.dashboard
|   |   |   `-- !app.index.jsonc
|   |   `-- package.json
|   |-- telegram-bot
|   |   |-- docs.telegram
|   |   |   `-- !INDEX.md
|   |   `-- main.py
|   `-- !index.jsonc
|-- configs
|   |-- agents
|   |   `-- config.content-factory.symlink.jsonc
|   |-- global-claude.symlink -> /Users/hallojohnnypitt/.claude
|   |-- global-cursor.symlink -> /Users/hallojohnnypitt/.cursor
|   |-- !index.jsonc
|   |-- config.crons.jsonc
|   `-- config.project.jsonc
|-- envs
|   `-- root.symlink.env
|-- github-projects
|-- mine
|   |-- I_WANT.md
|   |-- MINE.md
|   |-- PROJECT-STRUCTURE.md
|   |-- PROJECT_NOTES.md
|   |-- claude.md
|   |-- env.md
|   `-- settings.jsonc
|-- scripts
|   |-- script.agent.content-factory.symlink
|   |   `-- create-video-sora2.py
|   |-- !index.jsonc
|   |-- script.clone-github-projects.sh
|   |-- script.configure.sh
|   |-- script.init.sh
|   `-- script.start.sh
|-- tasks.symlink
|-- .gitignore
|-- CLAUDE.local.md
|-- CLAUDE.md
|-- README.md
|-- package.json
|-- script.code.sh
|-- script.init.symlink.sh
`-- script.start.symlink.sh

971 directories, 4657 files
