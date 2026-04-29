# Project File Tree

Current repository tree snapshot (`node_modules` and `.git` excluded):

```text
./
├── !KNOWLEDGE_BASE/
│   ├── agents.docs/
│   │   ├── docs.agent.content-factory.symlink -> ../../agents/content-factory/docs.agent.content-factory
│   │   ├── docs.agent.dante.symlink -> ../../agents/dante/docs.agent.dante
│   │   ├── docs.agent.db.symlink -> ../../agents/db/docs.agent.db
│   │   ├── docs.agent.dev.symlink -> ../../agents/dev/docs.agent.dev
│   │   ├── docs.agent.instagram.symlink -> ../../agents/instagram/docs.agent.instagram
│   │   ├── docs.agent.knowledge-base.symlink -> ../../agents/knowledge-base/docs.agent.knowledge-base
│   │   ├── docs.agent.logs.symlink -> ../../agents/logs/docs.agent.logs
│   │   ├── docs.agent.manager.symlink -> ../../agents/manager/docs.agent.manager
│   │   └── docs.agent.research.symlink -> ../../agents/research/docs.agent.research
│   ├── docs/
│   │   ├── AI_FILE_METADATA.md
│   │   └── SCRIPTS.md

├── !MINE/
│   └── Mine.md
├── !WORKTREES/
│   ├── #6/
│   └── .gitkeep
├── .claude/
│   ├── commands/
│   │   ├── dev/
│   │   │   ├── create-agent.dev.md
│   │   │   ├── create-root-command-for-skill.md
│   │   │   ├── create-skill.dev.md
│   │   │   ├── develope-task.dev.md
│   │   │   ├── github-installer.dev.md
│   │   │   ├── install-package.dev.md
│   │   │   ├── merge-main.dev.md
│   │   │   ├── resolve-conflicts.dev.md
│   │   │   ├── sync-agent-providers.dev.md
│   │   │   ├── sync-plugins.dev.md
│   │   │   ├── sync-project.dev.md
│   │   │   ├── update-agents.dev.md
│   │   │   ├── update-files-with-metadata.dev.md
│   │   │   ├── update-index-lists.dev.md
│   │   │   ├── update-realated-files.dev.md
│   │   │   └── validate-skills-metadata.dev.md
│   │   └── manager/
│   │       ├── collect-notes.manager.md
│   │       ├── create-plan.manager.md
│   │       ├── create-pre-plan.manager.md
│   │       ├── create-task.manager.md
│   │       ├── do-task.manager.md
│   │       ├── pick-task.manager.md
│   │       └── sync-tasks.manager.md
│   ├── output-styles/
│   │   ├── breaker.md
│   │   ├── challenger.md
│   │   ├── concise.md
│   │   ├── minimal.md
│   │   ├── opinionated.md
│   │   ├── paranoid.md
│   │   ├── performance.md
│   │   ├── roast.md
│   │   ├── ship-it.md
│   │   ├── simple.md
│   │   ├── socratic.md
│   │   ├── tdd.md
│   │   └── think-aloud.md
│   ├── skills/
│   │   └── create-plan/
│   │       └── SKILL.md
│   ├── settings.json
│   └── settings.local.json
├── .cursor/
│   ├── canvases/
│   │   ├── claude-prompt-execution-flow.canvas.status.json
│   │   └── claude-prompt-execution-flow.canvas.tsx
│   └── skills/
│       ├── create-plan.manager/
│       │   └── SKILL.md
│       ├── create-task.manager/
│       │   └── SKILL.md
│       ├── do-task.manager/
│       │   └── SKILL.md
│       ├── generate-report-task.manager/
│       │   └── SKILL.md
│       └── install-github-project.dev/
│           └── SKILL.md
├── .github/
│   └── workflows/
│       ├── claude-code-review.yml
│       ├── claude.yml
│       ├── cron-make-today-plan.yml
│       ├── cron-make-week-plan.yml
│       └── skillshare-sync.yml
├── .vscode/
│   └── ai-markers.code-snippets
├── agents/
│   ├── agent.content-factory/
│   │   ├── content/
│   │   │   ├── collections/
│   │   │   │   ├── audio/
│   │   │   │   │   └── collection_name/
│   │   │   │   │       └── id_name.symlink.mp3
│   │   │   │   ├── pictures/
│   │   │   │   │   └── collection_name/
│   │   │   │   │       └── content_id.symlink.png
│   │   │   │   ├── sessions/
│   │   │   │   │   └── session_id/
│   │   │   │   │       └── content_id.png
│   │   │   │   └── video/
│   │   │   │       └── collection_name/
│   │   │   │           └── content_id.symlink.mp4
│   │   │   └── sessions/
│   │   │       └── session_id/
│   │   │           └── content_id.png
│   │   ├── docs.agent.content-factory/
│   │   │   └── !INDEX.md
│   │   ├── scripts.agent.content-factory/
│   │   │   ├── generate-nanobanano-2.test.ts
│   │   │   ├── generate-nanobanano-2.ts
│   │   │   ├── get-voice.py
│   │   │   └── get.voice.test.py
│   │   ├── .env
│   │   ├── bun.lockb
│   │   ├── CLAUDE.md
│   │   ├── config.content-factory.jsonc
│   │   ├── db-shema.content-factory.md
│   │   ├── db.content-factory.db
│   │   └── package.json
│   ├── agent.dante/
│   │   ├── dante.reports/
│   │   │   └── April  2026/
│   │   │       └── week 4/
│   │   │           ├── 25.04.2026.plan.md
│   │   │           └── dante.week-report.md
│   │   ├── docs.agent.dante/
│   │   │   └── dante.index.md
│   │   ├── CLAUDE.md
│   │   ├── config.dante.jsonc
│   │   ├── package.json
│   │   ├── ragent.claude.dante.sh
│   │   └── ragent.dante.sh
│   ├── agent.db/
│   │   ├── dbs/
│   │   │   ├── db.content-factory.symlink.db
│   │   │   └── db.logs.symlink.db
│   │   ├── docs.agent.db/
│   │   │   └── !INDEX.md
│   │   ├── tools/
│   │   │   └── .gitkeep
│   │   └── CLAUDE.md
│   ├── agent.dev/
│   │   ├── .claude/
│   │   │   └── skills/
│   │   │       ├── create-agent/
│   │   │       │   ├── agent-template.md
│   │   │       │   └── SKILL.md
│   │   │       ├── create-skill/
│   │   │       │   └── SKILL.md
│   │   │       ├── develope-task/
│   │   │       │   └── SKILL.md
│   │   │       ├── github-installer/
│   │   │       │   └── SKILL.md
│   │   │       ├── improve-skill/
│   │   │       │   └── SKILL.md
│   │   │       ├── install-package/
│   │   │       │   └── SKILL.md
│   │   │       ├── remove-sensitive-data/
│   │   │       │   └── SKILL.md
│   │   │       ├── resolve-conflicts/
│   │   │       │   └── SKILL.md
│   │   │       ├── sync-agent-providers/
│   │   │       │   └── SKILL.md
│   │   │       ├── sync-db/
│   │   │       │   └── SKILL.md
│   │   │       ├── update-agents/
│   │   │       │   └── SKILL.md
│   │   │       ├── update-change-log/
│   │   │       │   └── SKILL.md
│   │   │       ├── update-files-with-metadata/
│   │   │       │   └── SKILL.md
│   │   │       ├── update-related-files/
│   │   │       │   └── SKILL.md
│   │   │       └── validate-skills-metadata/
│   │   │           └── SKILL.md
│   │   ├── docs.agent.dev/
│   │   │   └── !INDEX.md
│   │   ├── CLAUDE.md
│   │   └── config.agent.dev.jsonc
│   ├── agent.instagram/
│   │   ├── .claude/
│   │   │   └── skills/
│   │   │       └── create-account/
│   │   │           └── SKILL.md
│   │   ├── .CLAUDE.md
│   │   └── config.intstagram.jsonc
│   ├── agent.knowledge-base/
│   │   └── CLAUDE.md
│   ├── agent.logs/
│   │   ├── docs.agent.logs/
│   │   │   └── !INDEX.md
│   │   └── CLAUDE.md
│   ├── agent.manager/
│   │   ├── .claude/
│   │   │   └── skills/
│   │   │       ├── close-task/
│   │   │       │   └── SKILL.md
│   │   │       ├── collect-inline-tasks/
│   │   │       │   └── SKILL.md
│   │   │       ├── create-plan/
│   │   │       │   ├── SKILL.md
│   │   │       │   └── temp.md
│   │   │       ├── create-pre-plan/
│   │   │       │   └── SKILL.md
│   │   │       ├── create-task/
│   │   │       │   └── SKILL.md
│   │   │       ├── create-test/
│   │   │       │   ├── SKILL.md
│   │   │       │   └── temp.md
│   │   │       ├── do-task/
│   │   │       │   └── SKILL.md
│   │   │       ├── generate-report/
│   │   │       │   └── SKILL.md
│   │   │       ├── make-today-plan/
│   │   │       │   └── SKILL.md
│   │   │       ├── make-week-plan/
│   │   │       │   └── SKILL.md
│   │   │       ├── pick-task/
│   │   │       │   └── SKILL.md
│   │   │       ├── sync-tasks/
│   │   │       │   └── SKILL.md
│   │   │       └── sync-with-notion-db/
│   │   │           └── SKILL.md
│   │   ├── docs.agent.manager/
│   │   │   ├── dev.index.md
│   │   │   ├── manager.index.md
│   │   │   └── ROAD_MAP.md
│   │   ├── scripts.agent.manager/
│   │   │   └── script.task-management.ts
│   │   ├── tasks/
│   │   │   ├── in_plan/
│   │   │   │   ├── andrei.feature.8.pending/
│   │   │   │   │   └── 8_plan.v0.md
│   │   │   │   ├── andrei.improvement.6.planned/
│   │   │   │   │   ├── 6_plan.v1.md
│   │   │   │   │   ├── 6_plan.v2.md
│   │   │   │   │   └── 6_plan.v3.md
│   │   │   │   ├── ai.today.jsonc
│   │   │   │   ├── andrei.today.jsonc
│   │   │   │   └── week.jsonc
│   │   │   └── tasks.index.jsonc
│   │   ├── tests.agent.manager.tests/
│   │   │   ├── fixtures/
│   │   │   │   ├── collect-inline-tasks.fixture.js
│   │   │   │   └── collect-inline-tasks.fixture.snapshot.js
│   │   │   └── collect-inline-tasks.test.js
│   │   ├── CLAUDE.md
│   │   ├── config.manager.jsonc
│   │   ├── package.json
│   │   └── ragent.manager.sh
│   └── agent.research/
│       ├── docs.agent.research/
│       │   └── !INDEX.md
│       ├── researches/
│       │   └── session_id/
│       │       ├── file_id.md
│       │       └── file_id.result.md
│       ├── CLAUDE.md
│       └── db.research.db
├── apps/
│   ├── app.dashboard_v2/
│   │   ├── docs.dashboard/
│   │   │   └── !app.index.jsonc
│   │   └── package.json
│   ├── cron-supervisor/
│   │   ├── scripts/
│   │   │   ├── collect-inline-tasks-if-needed.sh
│   │   │   ├── cron-edit.mjs
│   │   │   ├── gh-cron-enabled.mjs
│   │   │   └── setup-service.sh
│   │   ├── acron.sh
│   │   ├── bun.lockb
│   │   ├── index.mjs
│   │   ├── package-lock.json
│   │   └── package.json
│   └── !index.jsonc
├── configs/
│   ├── !index.jsonc
│   ├── config.crons.jsonc
│   └── config.project.jsonc
├── envs/
│   ├── dante.telegram/
│   │   ├── access.json
│   │   ├── bot.pid
│   │   └── teleram.logs
│   ├── main.telegram/
│   │   ├── access.json
│   │   └── teleram.logs
│   ├── manager.telegram/
│   │   ├── access.json
│   │   └── teleram.logs
│   ├── .gitkeep
│   ├── agents.dante.env
│   ├── agents.dev.symlink.env
│   ├── agents.manager.env
│   ├── gp.brightbean-studio.symlink.env
│   ├── gp.claude-code.symlink.env
│   ├── gp.everything-claude-code.symlink.env
│   ├── gp.hermes-agent.symlink.env
│   ├── gp.hyperframes.symlink.env
│   ├── gp.OpenMontage.symlink.env
│   └── root.env
├── github-projects/
│   ├── coding-terminals/
│   │   ├── BMAD-METHOD/
│   │   │   ├── .gitkeep
│   │   │   ├── BMAD-METHOD.index.md
│   │   │   ├── BMAD-METHOD.init.sh
│   │   │   └── BMAD-METHOD.start.sh
│   │   ├── claude-code/
│   │   │   ├── .gitkeep
│   │   │   ├── claude-code.index.md
│   │   │   ├── claude-code.init.sh
│   │   │   └── claude-code.start.sh
│   │   ├── everything-claude-code/
│   │   │   ├── .gitkeep
│   │   │   ├── everything-claude-code.index.md
│   │   │   ├── everything-claude-code.init.sh
│   │   │   └── everything-claude-code.start.sh
│   │   ├── hermes-agent/
│   │   │   ├── .gitkeep
│   │   │   ├── hermes-agent.index.md
│   │   │   ├── hermes-agent.init.sh
│   │   │   └── hermes-agent.start.sh
│   │   └── pi-mono/
│   │       ├── .gitkeep
│   │       ├── pi-mono.index.md
│   │       ├── pi-mono.init.sh
│   │       └── pi-mono.start.sh
│   ├── content-factory/
│   │   ├── brightbean-studio/
│   │   │   ├── .gitkeep
│   │   │   ├── brightbean-studio.index.md
│   │   │   ├── brightbean-studio.init.sh
│   │   │   └── brightbean-studio.start.sh
│   │   ├── claude-code-output-styles/
│   │   │   ├── .gitkeep
│   │   │   ├── claude-code-output-styles.index.md
│   │   │   ├── claude-code-output-styles.init.sh
│   │   │   └── claude-code-output-styles.start.sh
│   │   ├── OpenMontage/
│   │   │   ├── .gitkeep
│   │   │   ├── OpenMontage.index.md
│   │   │   ├── OpenMontage.init.sh
│   │   │   └── OpenMontage.start.sh
│   │   ├── openscreen/
│   │   │   ├── .gitkeep
│   │   │   ├── openscreen.index.md
│   │   │   ├── openscreen.init.sh
│   │   │   └── openscreen.start.sh
│   │   └── postiz-app/
│   │       ├── .gitkeep
│   │       ├── postiz-app.index.md
│   │       ├── postiz-app.init.sh
│   │       └── postiz-app.start.sh
│   └── !index.jsonc
├── logs/
│   ├── crons/
│   │   ├── collect-inline-tasks.log
│   │   ├── errors.log
│   │   ├── health-check.log
│   │   ├── supervisor.log
│   │   ├── sync-project.log
│   │   └── update-related-files.log
│   └── start/
│       ├── pids/
│       │   ├── dante.pid
│       │   └── main.pid
│       ├── dante.log
│       ├── main.log
│       └── manager.log
├── plugins/
│   ├── ai-firstify/
│   │   └── 1.1.0/
│   │       ├── .claude-plugin/
│   │       │   └── plugin.json
│   │       ├── codex/
│   │       │   └── AGENTS.md
│   │       ├── skills/
│   │       │   └── ai-firstify/
│   │       │       ├── references/
│   │       │       │   ├── anti-patterns.md
│   │       │       │   ├── assessment-rubric.md
│   │       │       │   ├── mode-audit.md
│   │       │       │   ├── mode-bootstrap.md
│   │       │       │   ├── mode-reengineer.md
│   │       │       │   ├── patterns.md
│   │       │       │   ├── principles.md
│   │       │       │   ├── project-structure.md
│   │       │       │   └── skill-architecture.md
│   │       │       ├── scripts/
│   │       │       │   └── validate-report.sh
│   │       │       └── SKILL.md
│   │       └── README.md
│   ├── ai-plugins/
│   │   └── 1.0.0/
│   ├── analyze-codebase/
│   │   └── 1.0.0/
│   │       ├── .claude-plugin/
│   │       │   └── plugin.json
│   │       └── commands/
│   │           └── analyze-codebase.md
│   ├── claude-code-setup/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   └── claude-automation-recommender/
│   │   │       ├── references/
│   │   │       │   ├── hooks-patterns.md
│   │   │       │   ├── mcp-servers.md
│   │   │       │   ├── plugins-reference.md
│   │   │       │   ├── skills-reference.md
│   │   │       │   └── subagent-templates.md
│   │   │       └── SKILL.md
│   │   ├── automation-recommender-example.png
│   │   ├── LICENSE
│   │   └── README.md
│   ├── claude-md-management/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── commands/
│   │   │   └── revise-claude-md.md
│   │   ├── skills/
│   │   │   └── claude-md-improver/
│   │   │       ├── references/
│   │   │       │   ├── quality-criteria.md
│   │   │       │   ├── templates.md
│   │   │       │   └── update-guidelines.md
│   │   │       └── SKILL.md
│   │   ├── claude-md-improver-example.png
│   │   ├── LICENSE
│   │   ├── README.md
│   │   └── revise-claude-md-example.png
│   ├── code-simplifier/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── agents/
│   │   │   └── code-simplifier.md
│   │   └── LICENSE
│   ├── codebase-documenter/
│   │   └── 1.0.0/
│   │       ├── .claude-plugin/
│   │       │   └── plugin.json
│   │       └── agents/
│   │           └── codebase-documenter.md
│   ├── context7/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── .mcp.json
│   ├── context7-docs-fetcher/
│   │   └── 1.0.0/
│   │       ├── .claude-plugin/
│   │       │   └── plugin.json
│   │       └── agents/
│   │           └── context7-docs-fetcher.md
│   ├── fakechat/
│   │   └── 0.0.1/
│   │       ├── .claude-plugin/
│   │       │   └── plugin.json
│   │       ├── .mcp.json
│   │       ├── .npmrc
│   │       ├── bun.lock
│   │       ├── bun.lockb
│   │       ├── LICENSE
│   │       ├── package.json
│   │       ├── README.md
│   │       └── server.ts
│   ├── hookify/
│   │   └── unknown/
│   │       ├── .claude-plugin/
│   │       │   └── plugin.json
│   │       ├── agents/
│   │       │   └── conversation-analyzer.md
│   │       ├── commands/
│   │       │   ├── configure.md
│   │       │   ├── help.md
│   │       │   ├── hookify.md
│   │       │   └── list.md
│   │       ├── core/
│   │       │   ├── __pycache__/
│   │       │   │   ├── __init__.cpython-310.pyc
│   │       │   │   ├── config_loader.cpython-310.pyc
│   │       │   │   └── rule_engine.cpython-310.pyc
│   │       │   ├── __init__.py
│   │       │   ├── config_loader.py
│   │       │   └── rule_engine.py
│   │       ├── examples/
│   │       │   ├── console-log-warning.local.md
│   │       │   ├── dangerous-rm.local.md
│   │       │   ├── require-tests-stop.local.md
│   │       │   └── sensitive-files-warning.local.md
│   │       ├── hooks/
│   │       │   ├── __init__.py
│   │       │   ├── hooks.json
│   │       │   ├── posttooluse.py
│   │       │   ├── pretooluse.py
│   │       │   ├── stop.py
│   │       │   └── userpromptsubmit.py
│   │       ├── matchers/
│   │       │   └── __init__.py
│   │       ├── skills/
│   │       │   └── writing-rules/
│   │       │       └── SKILL.md
│   │       ├── utils/
│   │       │   └── __init__.py
│   │       ├── .gitignore
│   │       ├── LICENSE
│   │       └── README.md
│   ├── playwright/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── .mcp.json
│   ├── postman/
│   │   └── 1.0.0/
│   ├── pyright-lsp/
│   │   ├── LICENSE
│   │   └── README.md
│   ├── python-expert/
│   │   └── 1.0.0/
│   │       ├── .claude-plugin/
│   │       │   └── plugin.json
│   │       └── agents/
│   │           └── python-expert.md
│   ├── ralph-loop/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── commands/
│   │   │   ├── cancel-ralph.md
│   │   │   ├── help.md
│   │   │   └── ralph-loop.md
│   │   ├── hooks/
│   │   │   ├── hooks.json
│   │   │   └── stop-hook.sh
│   │   ├── scripts/
│   │   │   └── setup-ralph-loop.sh
│   │   ├── LICENSE
│   │   └── README.md
│   ├── session-report/
│   │   └── unknown/
│   │       ├── skills/
│   │       │   └── session-report/
│   │       │       ├── analyze-sessions.mjs
│   │       │       ├── SKILL.md
│   │       │       └── template.html
│   │       └── LICENSE
│   ├── skill-creator/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   └── skill-creator/
│   │   │       ├── agents/
│   │   │       │   ├── analyzer.md
│   │   │       │   ├── comparator.md
│   │   │       │   └── grader.md
│   │   │       ├── assets/
│   │   │       │   └── eval_review.html
│   │   │       ├── eval-viewer/
│   │   │       │   ├── generate_review.py
│   │   │       │   └── viewer.html
│   │   │       ├── references/
│   │   │       │   └── schemas.md
│   │   │       ├── scripts/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── aggregate_benchmark.py
│   │   │       │   ├── generate_report.py
│   │   │       │   ├── improve_description.py
│   │   │       │   ├── package_skill.py
│   │   │       │   ├── quick_validate.py
│   │   │       │   ├── run_eval.py
│   │   │       │   ├── run_loop.py
│   │   │       │   └── utils.py
│   │   │       ├── LICENSE.txt
│   │   │       └── SKILL.md
│   │   ├── LICENSE
│   │   └── README.md
│   ├── telegram/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   ├── access/
│   │   │   │   └── SKILL.md
│   │   │   └── voice/
│   │   │       └── SKILL.md
│   │   ├── .mcp.json
│   │   ├── .npmrc
│   │   ├── ACCESS.md
│   │   ├── bun.lock
│   │   ├── bun.lockb
│   │   ├── LICENSE
│   │   ├── package.json
│   │   ├── README.md
│   │   └── server.ts
│   ├── typescript-lsp/
│   │   ├── LICENSE
│   │   └── README.md
│   ├── ui5/
│   │   └── 0.1.0/
│   │       ├── .claude-plugin/
│   │       │   └── plugin.json
│   │       ├── .mcp.json
│   │       └── README.md
│   └── vercel/
│       └── 0.40.0/
├── scripts/
│   ├── !index.jsonc
│   ├── ensure-bun.sh
│   ├── ensure-claude.sh
│   ├── git-sync-pull-push.sh
│   ├── install-shell-aliases.sh
│   ├── kill-telegram-env-pids.sh
│   ├── run-under-pty.sh
│   └── script.configure.sh
├── .gitignore
├── bun.lockb
├── change-log.md
├── claude-sessions-last-24h.md
├── CLAUDE.local.md
├── CLAUDE.md
├── package.json
├── pyproject.toml
├── ragent.claude.sh
├── README.md
├── rinit.sh
├── rstart.sh
├── rtest.sh
├── start.config.jsonc
└── test.config.jsonc
```
