import {
  Card, CardBody, CardHeader,
  Code, Divider, Grid, H1, H2, H3,
  Pill, Row, Stack, Stat, Table, Text,
  useHostTheme,
} from 'cursor/canvas';

const phases = [
  {
    num: 1,
    title: 'CLI Entry Point',
    file: 'src/entrypoints/cli.tsx',
    fn: 'main()',
    steps: [
      'Node executes the bin entry defined in package.json ("claude": "src/entrypoints/cli.tsx")',
      'Fast paths evaluated: --version, bridge mode, daemon, background sessions',
      'startCapturingEarlyInput() begins buffering stdin immediately',
      'Dynamic import of ../main.js → awaits cliMain()',
    ],
  },
  {
    num: 2,
    title: 'Full CLI Bootstrap',
    file: 'src/main.tsx',
    fn: 'run()',
    steps: [
      'Commander program built with .argument("[prompt]")',
      'preAction hook: ensureMdmSettingsLoaded() + ensureKeychainPrefetchCompleted()',
      'init() from entrypoints/init.ts: enableConfigs(), CA certs, repo detection, OAuth prefetch',
      'initSinks() attaches analytics and logging pipelines',
      'Trust checks, --settings / --setting-sources parsed via eagerLoadSettings()',
    ],
  },
  {
    num: 3,
    title: 'Prompt Parsing',
    file: 'src/screens/REPL.tsx',
    fn: 'onSubmit() → handlePromptSubmit()',
    steps: [
      'Interactive: user input arrives at REPL.tsx onSubmit()',
      'handlePromptSubmit() dispatches to processUserInput() (utils/processUserInput/processUserInput.ts)',
      'processUserInput turns raw text → Message[] (handles slash commands, attachments, mentions)',
      'Non-interactive (-p flag): cli/print.ts drives the headless path via QueryEngine.ask()',
      'Both paths converge into query() — the single model entry point',
    ],
  },
  {
    num: 4,
    title: 'Context & Message Preparation',
    file: 'src/query.ts',
    fn: 'query() → queryLoop()',
    steps: [
      'fullSystemPrompt assembled: getSystemPrompt() + appendSystemContext() + tool definitions',
      'prependUserContext() injects injected context blocks before user messages',
      'Messages normalized: normalizeMessagesForAPI() flattens and validates',
      'Compaction pipeline: microcompactMessages() → snipCompactIfNeeded() → autoCompactIfNeeded()',
      'applyToolResultBudget() trims oversized tool results to fit context window',
    ],
  },
  {
    num: 5,
    title: 'API Call to Anthropic',
    file: 'src/services/api/claude.ts',
    fn: 'queryModelWithStreaming()',
    steps: [
      'getAnthropicClient() resolves credentials (API key / OAuth token)',
      'anthropic.beta.messages.create({ ...params, stream: true }).withResponse() — SSE stream opened',
      'Uses raw stream (not BetaMessageStream) intentionally for performance on tool JSON deltas',
      'HTTP headers include: session ID, telemetry, user agent, custom headers from settings',
      'Request body: model, max_tokens, system, messages[], tools[], thinking config, etc.',
    ],
  },
  {
    num: 6,
    title: 'Stream Processing',
    file: 'src/services/api/claude.ts',
    fn: 'queryModelWithStreaming() — for await (part of stream)',
    steps: [
      'message_start: captures input token count, initializes assistant message',
      'content_block_start: opens text / thinking / tool_use block',
      'text_delta / thinking_delta: accumulated character by character',
      'tool_use delta: JSON tool call arguments parsed incrementally',
      'message_delta: captures stop_reason (end_turn / tool_use / max_tokens)',
      'Yields structured Message objects upstream to queryLoop()',
    ],
  },
  {
    num: 7,
    title: 'Tool Execution Loop',
    file: 'src/services/tools/toolOrchestration.ts',
    fn: 'runTools() / StreamingToolExecutor',
    steps: [
      'StreamingToolExecutor may fire tools as tool_use blocks complete during streaming',
      'After stream ends, remaining tool calls collected by getRemainingResults()',
      'partitionToolCalls() splits calls into concurrent-safe batches vs serial',
      'Each tool: canUseTool() permission check → runToolUse() in toolExecution.ts',
      'Tool results appended as user messages with role:"tool"',
      'queryLoop() continues: feeds results back → calls model again',
      'Loop exits when: stop_reason = end_turn, max turns reached, stop hooks fire',
    ],
  },
  {
    num: 8,
    title: 'Response Rendering',
    file: 'src/screens/REPL.tsx',
    fn: 'onQueryImpl() → onQueryEvent() → handleMessageFromStream()',
    steps: [
      'for await (event of query(...)) receives each streamed message',
      'onQueryEvent() dispatches: setMessages(), setStreamingText(), setStreamingToolUses()',
      'Ink (React-in-terminal) re-renders the component tree on every state update',
      'Messages.tsx renders text, tool call blocks, thinking blocks with syntax highlighting',
      'Headless (-p): cli/print.ts writes to stdout; JSON mode available via --output-format',
      'After final message: usage stats logged, hooks fired, analytics events flushed',
    ],
  },
];

const middleware = [
  ['argv / env', 'cli.tsx, main.tsx', 'Fast paths, --bare, trust rewrites'],
  ['Config', 'init.ts, utils/config.ts', 'enableConfigs(), safe vs full env'],
  ['System prompt', 'constants/prompts.ts', 'getSystemPrompt(), tool definitions'],
  ['Message shaping', 'utils/messages.ts', 'normalizeMessagesForAPI(), prependUserContext()'],
  ['Compaction', 'services/compact/*', 'microcompact, autocompact, snip, reactive'],
  ['Hooks', 'utils/hooks/*', 'executePostSamplingHooks, handleStopHooks'],
  ['Analytics', 'services/analytics', 'Events flushed after sinks attach'],
];

export default function ClaudePromptFlow() {
  const { tokens: t } = useHostTheme();

  return (
    <Stack gap={28} style={{ padding: 24, maxWidth: 900 }}>
      <Stack gap={6}>
        <H1>Claude Prompt Execution Flow</H1>
        <Text tone="secondary">Step-by-step: what happens from `claude "your prompt"` to response on screen</Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="8" label="Phases" />
        <Stat value="5" label="Core files" />
        <Stat value="1" label="API call" />
        <Stat value="∞" label="Tool loop iterations" />
      </Grid>

      <Divider />

      {/* Chain overview */}
      <Stack gap={8}>
        <H2>Execution Chain</H2>
        <Card>
          <CardBody>
            <Stack gap={4}>
              {[
                'cli.tsx main()',
                'main.tsx run()',
                'init.ts init()',
                'REPL.tsx onSubmit()',
                'processUserInput()',
                'query.ts queryLoop()',
                'claude.ts queryModelWithStreaming()',
                'Anthropic API (streaming)',
                'toolOrchestration.ts runTools()',
                '→ loop back to queryLoop()',
                'REPL.tsx handleMessageFromStream()',
                'Ink render to terminal',
              ].map((step, i, arr) => (
                <Row key={i} gap={10} style={{ alignItems: 'center' }}>
                  <Text size="small" style={{ color: t.accent.primary, fontFamily: 'monospace', minWidth: 20 }}>
                    {i < arr.length - 1 ? '↓' : '✓'}
                  </Text>
                  <Text size="small" style={{ fontFamily: 'monospace' }}>{step}</Text>
                </Row>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Divider />

      <H2>Detailed Phases</H2>

      {phases.map((phase) => (
        <Stack key={phase.num} gap={8}>
          <Row gap={12} style={{ alignItems: 'center' }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              background: t.fill.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Text style={{ fontFamily: 'monospace', color: t.accent.primary }}>{phase.num}</Text>
            </div>
            <H3>{phase.title}</H3>
          </Row>

          <Row gap={8} style={{ paddingLeft: 40 }}>
            <Pill size="small">{phase.file}</Pill>
            <Pill size="small" tone="success">{phase.fn}</Pill>
          </Row>

          <Stack gap={4} style={{ paddingLeft: 40 }}>
            {phase.steps.map((step, i) => (
              <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
                <Text size="small" tone="secondary" style={{ flexShrink: 0, minWidth: 16 }}>{i + 1}.</Text>
                <Text size="small">{step}</Text>
              </Row>
            ))}
          </Stack>

          {phase.num < phases.length && (
            <Row gap={8} style={{ paddingLeft: 40, paddingTop: 4 }}>
              <Text size="small" style={{ color: t.accent.primary }}>↓ continues to Phase {phase.num + 1}</Text>
            </Row>
          )}
        </Stack>
      ))}

      <Divider />

      <Stack gap={8}>
        <H2>Middleware & Cross-cutting Concerns</H2>
        <Table
          headers={['Stage', 'File(s)', 'What happens']}
          rows={middleware}
        />
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H2>Tool Loop Detail</H2>
        <Text tone="secondary" size="small">The model is called repeatedly until no more tool_use blocks are returned.</Text>
        <Card>
          <CardBody>
            <Stack gap={6}>
              {[
                { label: 'Model returns tool_use', detail: 'stop_reason = "tool_use", one or more tool call blocks in response' },
                { label: 'Partition calls', detail: 'partitionToolCalls() → concurrent-safe batch vs serial sequential' },
                { label: 'Permission check', detail: 'canUseTool() → user prompt if not allowed, deny if rejected' },
                { label: 'Execute tool', detail: 'runToolUse() in toolExecution.ts → bash, edit, read, MCP, etc.' },
                { label: 'Append results', detail: 'Tool results added as role:"user" messages with type:"tool_result"' },
                { label: 'Recurse', detail: 'queryLoop() calls model again with full conversation + results' },
                { label: 'Exit conditions', detail: 'stop_reason = end_turn / max turns exceeded / stop hook fires' },
              ].map((row, i) => (
                <Row key={i} gap={12} style={{ alignItems: 'flex-start' }}>
                  <Text size="small" style={{ color: t.accent.primary, minWidth: 180, flexShrink: 0 }}>{row.label}</Text>
                  <Text size="small" tone="secondary">{row.detail}</Text>
                </Row>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Divider />

      <Stack gap={4}>
        <H2>Key Files at a Glance</H2>
        <Table
          headers={['File', 'Role']}
          rows={[
            ['src/entrypoints/cli.tsx', 'Binary entry — fast paths, early input, dynamic import main'],
            ['src/main.tsx', 'Commander setup, init, preAction hooks, launchRepl'],
            ['src/entrypoints/init.ts', 'Config, env, CA certs, OAuth, repo detection'],
            ['src/screens/REPL.tsx', 'Interactive loop, query events, Ink state updates'],
            ['src/query.ts', 'queryLoop — context prep, compaction, tool loop orchestration'],
            ['src/services/api/claude.ts', 'queryModelWithStreaming — Anthropic SSE client'],
            ['src/services/tools/toolOrchestration.ts', 'runTools — partition, permission, execute'],
            ['src/cli/print.ts', 'Headless (-p) output path'],
            ['src/QueryEngine.ts', 'SDK-style ask() facade over query()'],
          ]}
        />
      </Stack>

      <Text tone="secondary" size="small" style={{ paddingTop: 4 }}>
        Workspace: src/entrypoints/cli.tsx → main.tsx → query.ts → services/api/claude.ts
      </Text>
    </Stack>
  );
}
