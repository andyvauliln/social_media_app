
## Skill Frontmatter Properties (SKILL.md)
```yaml
---
name: deploy
description: Deploy the app to production. Use when deploying, releasing, or pushing to prod.
argument-hint: "[environment] [version]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash(gh *) Bash(npm *) Read
model: claude-sonnet-4-6
effort: high
context: fork
agent: Explore
paths:
  - "src/**/*.ts"
  - "*.config.js"
shell: bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/safety-check.sh"
---

Deploy $ARGUMENTS to production:

1. Run `npm test`
2. Run `npm run build`
3. Run `gh release create $0`
```
--- 


## String Substitutions in Skill Content
- Variable	Description
```bash
$ARGUMENTS	All arguments passed when invoking
$ARGUMENTS[0], $0	First argument
$ARGUMENTS[1], $1	Second argument (and so on)
${CLAUDE_SESSION_ID}	Current session ID
${CLAUDE_SKILL_DIR}	Directory of the skill's SKILL.md file
!`command`	Runs shell command at invocation time; output replaces the placeholder
```

## Agent Frontmatter Properties (.claude/agents/)
Agents are defined in .claude/agents/<name>.md and use the same frontmatter format as skills, with a few unique fields:


```yaml
---
name: security-reviewer
description: Reviews code changes for security vulnerabilities. Spawned automatically on PreToolUse.
model: claude-opus-4-6
effort: max
allowed-tools: Read Grep Glob
skills:
  - owasp-rules
  - secret-detection
context: fork
hooks:
  Stop:
    - matcher: ""
      hooks:
        - type: command
          command: "echo 'Review complete' >> ~/.claude/agent-log.txt"
          async: true
---

You are a security reviewer. When invoked:
