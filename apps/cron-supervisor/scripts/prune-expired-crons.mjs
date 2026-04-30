#!/usr/bin/env node
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cronSupervisorRoot = path.join(__dirname, '..');
const repoRoot = path.join(cronSupervisorRoot, '..', '..');
const require = createRequire(import.meta.url);
const { applyEdits, modify, parse } = require(
  path.join(cronSupervisorRoot, 'node_modules/jsonc-parser/lib/umd/main.js'),
);

const configPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(repoRoot, 'configs', 'config.crons.jsonc');

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dateOnlyEndOfDayUtcMs(value) {
  const match = DATE_ONLY_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  const d = new Date(ms);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return ms;
}

function endDateToExpiresAtMs(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return NaN;
  const trimmed = value.trim();
  if (!trimmed) return NaN;
  const dateOnlyMs = dateOnlyEndOfDayUtcMs(trimmed);
  if (dateOnlyMs != null) return dateOnlyMs;
  return Date.parse(trimmed);
}

const text = fs.readFileSync(configPath, 'utf8');
const errors = [];
const parsed = parse(text, errors, { allowTrailingComma: true });
if (errors.length || parsed == null || typeof parsed !== 'object' || !Array.isArray(parsed.crons)) {
  console.error(`[prune-expired-crons] Invalid or unreadable config: ${configPath}`);
  process.exit(1);
}

const now = Date.now();
const expiredIndexes = [];
for (let i = 0; i < parsed.crons.length; i++) {
  const cron = parsed.crons[i];
  if (cron == null || typeof cron !== 'object') continue;
  const expiresAtMs = endDateToExpiresAtMs(cron.end_date);
  if (Number.isFinite(expiresAtMs) && expiresAtMs < now) {
    expiredIndexes.push(i);
  }
}

if (expiredIndexes.length === 0) {
  console.log('[prune-expired-crons] no expired crons');
  process.exit(0);
}

let next = text;
const fmt = { formattingOptions: { tabSize: 4, insertSpaces: true } };
for (const idx of expiredIndexes.reverse()) {
  next = applyEdits(next, modify(next, ['crons', idx], undefined, fmt));
}

fs.writeFileSync(configPath, next, 'utf8');
console.log(`[prune-expired-crons] removed ${expiredIndexes.length} expired cron(s)`);
