/**
 * GitHub Actions gate: reads repo configs/config.crons.jsonc for a named cron.
 *
 * Usage: node apps/cron-supervisor/scripts/gh-cron-enabled.mjs <cron-name>
 * (run from repo root after npm ci in apps/cron-supervisor)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cronSupervisorRoot = path.join(__dirname, '..');
const repoRoot = path.join(cronSupervisorRoot, '..', '..');
const require = createRequire(import.meta.url);
const { parse } = require(
  path.join(cronSupervisorRoot, 'node_modules/jsonc-parser/lib/umd/main.js'),
);

const name = process.argv[2];
if (!name) {
  console.error('Usage: node apps/cron-supervisor/scripts/gh-cron-enabled.mjs <cron-name>');
  process.exit(1);
}

const configPath = path.join(repoRoot, 'configs', 'config.crons.jsonc');
const text = fs.readFileSync(configPath, 'utf8');
const errors = [];
const raw = parse(text, errors, { allowTrailingComma: true });
if (errors.length || raw == null || typeof raw !== 'object' || !Array.isArray(raw.crons)) {
  console.error('Invalid or unreadable configs/config.crons.jsonc');
  process.exit(1);
}

const cron = raw.crons.find((c) => c && typeof c === 'object' && c.name === name);

const isProduction = () => {
  const e = process.env.ENVIRONMENT;
  if (e === 'production') return true;
  if (e === 'development') return false;
  return process.env.NODE_ENV === 'production';
};

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

function endDateState(cron) {
  const expiresAtMs = endDateToExpiresAtMs(cron.end_date);
  if (cron.end_date == null) return 'active';
  if (!Number.isFinite(expiresAtMs)) return 'invalid';
  return expiresAtMs < Date.now() ? 'expired' : 'active';
}

/** @type {{ enabled: boolean; reason: string }} */
let result = { enabled: false, reason: 'not_found' };
if (cron) {
  const endDate = endDateState(cron);
  if (cron.runLocation !== 'github_actions') {
    result = { enabled: false, reason: 'not_github_actions' };
  } else if (
    cron.githubActions != null &&
    typeof cron.githubActions === 'object' &&
    cron.githubActions.enabled === false
  ) {
    result = { enabled: false, reason: 'githubActions_enabled_false' };
  } else if (isProduction() ? cron.production !== true : cron.development !== true) {
    result = {
      enabled: false,
      reason: isProduction() ? 'production_false' : 'development_false',
    };
  } else if (endDate === 'invalid') {
    result = { enabled: false, reason: 'invalid_end_date' };
  } else if (endDate === 'expired') {
    result = { enabled: false, reason: 'end_date_expired' };
  } else {
    result = { enabled: true, reason: 'ok' };
  }
}

const out = process.env.GITHUB_OUTPUT;
if (out) {
  fs.appendFileSync(out, `enabled=${result.enabled}\n`);
  fs.appendFileSync(out, `reason=${result.reason}\n`);
} else {
  console.log(
    result.enabled
      ? `enabled=true reason=${result.reason}`
      : `enabled=false reason=${result.reason}`,
  );
}
