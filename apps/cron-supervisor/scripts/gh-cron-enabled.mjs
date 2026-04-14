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

/** @type {{ enabled: boolean; reason: string }} */
let result = { enabled: false, reason: 'not_found' };
if (cron) {
  if (cron.runLocation !== 'github_actions') {
    result = { enabled: false, reason: 'not_github_actions' };
  } else if (cron.enabled === false) {
    result = { enabled: false, reason: 'cron_enabled_false' };
  } else if (
    cron.githubActions != null &&
    typeof cron.githubActions === 'object' &&
    cron.githubActions.enabled === false
  ) {
    result = { enabled: false, reason: 'githubActions_enabled_false' };
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
