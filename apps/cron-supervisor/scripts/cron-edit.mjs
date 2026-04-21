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
    const on = cron.enabled ? 'enabled ' : 'disabled';
    const loc = cron.runLocation === 'github_actions' ? '[github]  ' : '[local]   ';
    console.log(`  ${on}  ${loc} ${cron.schedule.padEnd(12)} ${cron.name}`);
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
  const enabled = action === 'enable';
  const edits = modify(text, ['crons', idx, 'enabled'], enabled, {
    formattingOptions: { tabSize: 4, insertSpaces: true },
  });
  const newText = applyEdits(text, edits);
  fs.writeFileSync(configPath, newText, 'utf8');
  console.log(`[acron] ${cronName}: ${action}d`);
  process.exit(0);
}

console.error(`[acron] unknown action: ${action}. Use list | enable | disable`);
process.exit(1);
