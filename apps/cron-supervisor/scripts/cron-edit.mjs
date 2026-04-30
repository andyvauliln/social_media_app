#!/usr/bin/env bun
import { parse, applyEdits, modify } from 'jsonc-parser';
import fs from 'node:fs';

const [, , action, configPath, cronName] = process.argv;

if (!configPath || !fs.existsSync(configPath)) {
  console.error(`[acron] config not found: ${configPath}`);
  process.exit(1);
}

const text = fs.readFileSync(configPath, 'utf8');
const errors = [];
const parsed = parse(text, errors, { allowTrailingComma: true });

if (errors.length) {
  console.error(`[acron] config parse error at offset ${errors[0].offset}`);
  process.exit(1);
}

const crons = parsed.crons ?? [];

if (action === 'list') {
  for (const cron of crons) {
    const p = cron.production ? 'prod' : '---';
    const d = cron.development ? 'dev ' : '---';
    const loc = cron.runLocation === 'github_actions' ? '[github]  ' : '[local]   ';
    const end = cron.end_date ? ` end=${cron.end_date}` : '';
    console.log(`  ${p}/${d}  ${loc} ${cron.schedule.padEnd(12)} ${cron.name}${end}`);
  }
  process.exit(0);
}

if (action === 'enable' || action === 'disable') {
  if (!cronName) {
    console.error(`[acron] usage: cron-edit.mjs ${action} <config> <cron-name>`);
    process.exit(1);
  }
  const idx = crons.findIndex((c) => c.name === cronName);
  if (idx === -1) {
    console.error(`[acron] cron not found: "${cronName}"`);
    console.error(`[acron] available: ${crons.map((c) => c.name).join(', ')}`);
    process.exit(1);
  }
  const on = action === 'enable';
  const fmt = { formattingOptions: { tabSize: 4, insertSpaces: true } };
  let next = text;
  next = applyEdits(next, modify(next, ['crons', idx, 'production'], on, fmt));
  next = applyEdits(next, modify(next, ['crons', idx, 'development'], on, fmt));
  fs.writeFileSync(configPath, next, 'utf8');
  console.log(`[acron] ${cronName}: ${action}d`);
  process.exit(0);
}

console.error(`[acron] unknown action: ${action}. Use list | enable | disable`);
process.exit(1);
