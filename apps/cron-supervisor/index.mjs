import chokidar from 'chokidar';
import { CronJob } from 'cron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'jsonc-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Merge envs/root.env into process.env for keys not already set (same source as rstart.sh).
 * Systemd/launchd do not source this file; without this, ENVIRONMENT=production is ignored.
 */
function applyRepoRootEnv() {
  const p = path.join(REPO_ROOT, 'envs', 'root.env');
  let text;
  try {
    text = fs.readFileSync(p, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (!key || key.startsWith('#')) continue;
    if (process.env[key] !== undefined) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const CONFIG_PATH =
  process.env.CRON_CONFIG_PATH ||
  path.join(REPO_ROOT, 'configs', 'config.crons.jsonc');
const DEBOUNCE_MS = Number(process.env.CRON_RELOAD_DEBOUNCE_MS || 400);

/** Fixed under repo root: per-cron `<name>.log`, `supervisor.log` (info/warn), `errors.log` (errors + child stderr). */
const CRON_LOGS_REL = path.join('logs', 'crons');
const SUPERVISOR_LOG_FILE = 'supervisor.log';
const ERRORS_LOG_FILE = 'errors.log';

function cronLogsDir() {
  return path.join(REPO_ROOT, CRON_LOGS_REL);
}

function claudeBinPath() {
  return process.env.CLAUDE_BIN || 'claude';
}

/** @type {Map<string, { job: import('cron').CronJob; fingerprint: string }>} */
const active = new Map();
/** @type {Map<string, boolean>} */
const running = new Map();

/** @type {{ defaultTimezone: string }} */
let supervisor = {
  defaultTimezone: process.env.CRON_TZ || 'Asia/Makassar',
};

function supervisorLogPath() {
  return path.join(cronLogsDir(), SUPERVISOR_LOG_FILE);
}

function errorsLogPath() {
  return path.join(cronLogsDir(), ERRORS_LOG_FILE);
}

function jobLogPath(jobName) {
  const safe = String(jobName).replace(/[^a-zA-Z0-9._-]+/g, '_');
  return path.join(cronLogsDir(), `${safe}.log`);
}

function ensureCronLogsDir() {
  fs.mkdirSync(cronLogsDir(), { recursive: true });
}

/**
 * @param {string} line full line including newline
 */
function appendErrorsOnly(line) {
  try {
    ensureCronLogsDir();
    fs.appendFileSync(errorsLogPath(), line);
  } catch {
    // ignore
  }
}

function logLine(level, message, extra) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}${extra != null ? ` ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}\n`;
  process.stderr.write(line);
  try {
    ensureCronLogsDir();
    if (level === 'error') {
      fs.appendFileSync(errorsLogPath(), line);
    } else if (level === 'info' || level === 'warn') {
      fs.appendFileSync(supervisorLogPath(), line);
    }
  } catch {
    // ignore
  }
}

/**
 * @param {{ type: string; cwd: string; prompt?: string; command?: string }} run
 */
function resolveRunCwd(run) {
  if (typeof run.cwd !== 'string' || !run.cwd.trim()) {
    return { ok: false, error: 'run.cwd must be a non-empty repo-relative path' };
  }
  const cwd = path.join(REPO_ROOT, run.cwd.trim());
  if (!fs.existsSync(cwd)) {
    return { ok: false, error: `run.cwd directory missing: ${cwd}` };
  }
  return { ok: true, cwd };
}

/**
 * @param {unknown} r
 * @param {number} i
 * @returns {{ ok: true, run: object } | { ok: false, error: string }}
 */
function validateRun(r, i) {
  if (r == null || typeof r !== 'object') {
    return { ok: false, error: `crons[${i}].run must be an object` };
  }
  const type = r.type;
  if (type !== 'claude' && type !== 'shell') {
    return {
      ok: false,
      error: `crons[${i}].run.type must be "claude" or "shell"`,
    };
  }
  if (typeof r.cwd !== 'string' || !r.cwd.trim()) {
    return { ok: false, error: `crons[${i}].run.cwd must be a non-empty string` };
  }
  if (type === 'claude') {
    if (typeof r.prompt !== 'string' || !r.prompt.trim()) {
      return { ok: false, error: `crons[${i}].run.prompt required for type "claude"` };
    }
    return {
      ok: true,
      run: {
        type: 'claude',
        cwd: r.cwd.trim(),
        prompt: r.prompt.trim(),
      },
    };
  }
  if (typeof r.command !== 'string' || !r.command.trim()) {
    return { ok: false, error: `crons[${i}].run.command required for type "shell"` };
  }
  return {
    ok: true,
    run: {
      type: 'shell',
      cwd: r.cwd.trim(),
      command: r.command.trim(),
    },
  };
}

/**
 * @param {unknown} raw
 */
function normalizeConfigShape(raw) {
  if (Array.isArray(raw)) {
    return null;
  }
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const o = raw;
  return {
    supervisor: typeof o.supervisor === 'object' && o.supervisor !== null ? o.supervisor : {},
    crons: Array.isArray(o.crons) ? o.crons : null,
  };
}

/**
 * @param {{ supervisor: object; crons: unknown }} shape
 * @returns {{ ok: true, supervisor: object, crons: object[] } | { ok: false, error: string }}
 */
function validateAndBuild(shape) {
  if (shape.crons == null) {
    return {
      ok: false,
      error:
        'config must be one object with "crons": []. Each entry needs "run": { "type", "cwd", ... }. Optional: "supervisor".',
    };
  }

  const sup = shape.supervisor;
  let defaultTz = process.env.CRON_TZ || 'Asia/Makassar';
  if (typeof sup.timezone === 'string' && sup.timezone.trim()) {
    defaultTz = sup.timezone.trim();
  } else if (typeof sup.defaultTimezone === 'string' && sup.defaultTimezone.trim()) {
    defaultTz = sup.defaultTimezone.trim();
  }

  const crons = [];
  const arr = shape.crons;
  for (let i = 0; i < arr.length; i++) {
    const j = arr[i];
    if (j == null || typeof j !== 'object') {
      return { ok: false, error: `crons[${i}] must be an object` };
    }
    const name = j.name;
    if (typeof name !== 'string' || !name.trim()) {
      return { ok: false, error: `crons[${i}].name must be a non-empty string` };
    }
    if (typeof j.schedule !== 'string' || !j.schedule.trim()) {
      return { ok: false, error: `crons[${i}].schedule must be a non-empty string` };
    }
    if (typeof j.production !== 'boolean' || typeof j.development !== 'boolean') {
      return { ok: false, error: `crons[${i}].production and .development must be booleans` };
    }
    const rl = j.runLocation;
    if (rl != null && rl !== 'supervisor' && rl !== 'github_actions') {
      return {
        ok: false,
        error: `crons[${i}].runLocation must be "supervisor" or "github_actions"`,
      };
    }
    const runRes = validateRun(j.run, i);
    if (!runRes.ok) {
      return { ok: false, error: runRes.error };
    }
    let githubActions = null;
    if (j.githubActions != null) {
      if (typeof j.githubActions !== 'object' || Array.isArray(j.githubActions)) {
        return { ok: false, error: `crons[${i}].githubActions must be an object if set` };
      }
      githubActions = j.githubActions;
    }
    const timezone =
      j.timezone != null && typeof j.timezone === 'string' && j.timezone.trim()
        ? j.timezone.trim()
        : defaultTz;
    crons.push({
      name: name.trim(),
      description: typeof j.description === 'string' ? j.description : '',
      schedule: j.schedule.trim(),
      production: j.production,
      development: j.development,
      runLocation: rl === 'github_actions' ? 'github_actions' : 'supervisor',
      run: runRes.run,
      githubActions,
      timezone,
    });
  }

  return {
    ok: true,
    supervisor: {
      defaultTimezone: defaultTz,
    },
    crons,
  };
}

function loadConfigText() {
  return fs.readFileSync(CONFIG_PATH, 'utf8');
}

/**
 * @returns {{ ok: true, supervisor: object, crons: object[] } | { ok: false, error: string }}
 */
function parseConfig(text) {
  const errors = [];
  const raw = parse(text, errors, { allowTrailingComma: true });
  if (errors.length) {
    const first = errors[0];
    return {
      ok: false,
      error: `JSONC parse error at offset ${first.offset}: ${first.length}`,
    };
  }
  const shape = normalizeConfigShape(raw);
  if (shape === null) {
    return {
      ok: false,
      error:
        'config root must be one JSON object with "crons": [ ... ] — not an array at the root',
    };
  }
  if (shape.crons === null) {
    return { ok: false, error: 'config object must include a "crons" array' };
  }
  return validateAndBuild(shape);
}

function isProduction() {
  const e = process.env.ENVIRONMENT;
  if (e === 'production') return true;
  if (e === 'development') return false;
  return process.env.NODE_ENV === 'production';
}

/**
 * @param {object[]} crons
 */
function filterForEnv(crons) {
  const prod = isProduction();
  return crons.filter((j) => (prod ? j.production : j.development));
}

/**
 * @param {object[]} crons
 */
function filterForLocalSupervisor(crons) {
  return crons.filter((j) => j.runLocation !== 'github_actions');
}

function fingerprint(job) {
  return JSON.stringify({
    schedule: job.schedule,
    run: job.run,
    githubActions: job.githubActions,
    production: job.production,
    development: job.development,
    timezone: job.timezone,
    runLocation: job.runLocation,
  });
}

function spawnShell(command, options) {
  if (process.platform === 'win32') {
    const com = process.env.ComSpec || 'cmd.exe';
    return spawn(com, ['/d', '/s', '/c', command], options);
  }
  return spawn('sh', ['-c', command], options);
}

function runJob(job) {
  const name = job.name;
  if (running.get(name)) {
    logLine('warn', `skip overlapping run`, name);
    return;
  }
  const cwdRes = resolveRunCwd(job.run);
  if (!cwdRes.ok) {
    logLine('error', cwdRes.error, name);
    return;
  }
  const { run } = job;
  running.set(name, true);

  let child;
  let execSummary;
  if (run.type === 'claude') {
    const bin = claudeBinPath();
    execSummary = `${bin} -p ${JSON.stringify(run.prompt)}`;
    logLine('info', `spawn claude`, { name, cwd: cwdRes.cwd, prompt: run.prompt });
    child = spawn(bin, ['-p', run.prompt], {
      cwd: cwdRes.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });
  } else {
    execSummary = `sh -c ${JSON.stringify(run.command)}`;
    logLine('info', `spawn shell`, { name, cwd: cwdRes.cwd, command: run.command });
    child = spawnShell(run.command, {
      cwd: cwdRes.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });
  }

  const jLog = jobLogPath(name);
  let jobStream;
  try {
    fs.mkdirSync(path.dirname(jLog), { recursive: true });
    jobStream = fs.createWriteStream(jLog, { flags: 'a' });
    const stamp = new Date().toISOString();
    jobStream.write(`\n--- ${stamp} ${name} (${execSummary}) cwd=${cwdRes.cwd} ---\n`);
  } catch {
    jobStream = null;
  }

  const writeLine = (stream, line) => {
    const ts = new Date().toISOString();
    const out = `[${name}] [${stream}] ${line}\n`;
    process.stderr.write(out);
    jobStream?.write(out);
    if (stream === 'stderr') {
      appendErrorsOnly(`[${ts}] [cron:${name}] [stderr] ${line}\n`);
    }
  };

  const prefix = (stream) => (chunk) => {
    const s = chunk.toString();
    for (const line of s.split('\n')) {
      if (!line) continue;
      writeLine(stream, line);
    }
  };

  child.stdout?.on('data', prefix('stdout'));
  child.stderr?.on('data', prefix('stderr'));
  child.on('error', (err) => {
    logLine('error', `spawn failed: ${err.message}`, name);
    running.set(name, false);
    jobStream?.end();
  });
  child.on('close', (code, signal) => {
    running.set(name, false);
    jobStream?.end();
    if (code !== 0 && code != null) {
      logLine('error', `non-zero exit code=${code} signal=${signal ?? ''}`, name);
    } else {
      logLine('info', `finished code=${code} signal=${signal ?? ''}`, name);
    }
  });
}

/**
 * @param {object[]} filteredJobs
 */
function reconcile(filteredJobs) {
  const nextNames = new Set(filteredJobs.map((j) => j.name));

  for (const [name, entry] of active) {
    if (!nextNames.has(name)) {
      entry.job.stop();
      active.delete(name);
      logLine('info', 'removed cron', name);
    }
  }

  for (const job of filteredJobs) {
    const cwdRes = resolveRunCwd(job.run);
    if (!cwdRes.ok) {
      logLine('error', `${cwdRes.error} — not scheduling`, job.name);
      const badExisting = active.get(job.name);
      if (badExisting) {
        badExisting.job.stop();
        active.delete(job.name);
      }
      continue;
    }
    const fp = fingerprint(job);
    const existing = active.get(job.name);
    if (existing && existing.fingerprint === fp) {
      continue;
    }
    if (existing) {
      existing.job.stop();
      active.delete(job.name);
      logLine('info', 'replaced cron (config changed)', job.name);
    }

    let cronJob;
    try {
      cronJob = new CronJob(
        job.schedule,
        () => runJob(job),
        null,
        false,
        job.timezone,
      );
    } catch (e) {
      logLine('error', `invalid cron for ${job.name}: ${e.message}`);
      continue;
    }
    cronJob.start();
    active.set(job.name, { job: cronJob, fingerprint: fp });
    logLine('info', 'scheduled', {
      name: job.name,
      schedule: job.schedule,
      tz: job.timezone,
      run: job.run.type,
    });
  }
}

let lastGoodPayload = { supervisor, crons: [] };
let reloadTimer = null;
/** Digest of last successfully applied local cron definitions (order-independent). */
let lastAppliedJobsDigest = null;

/**
 * @param {object[]} jobs
 */
function digestForJobs(jobs) {
  return jobs
    .map((j) => fingerprint(j))
    .sort()
    .join('\n');
}

/**
 * @param {{ fromFileEvent?: boolean }} [options]
 */
function applyConfig(options = {}) {
  const fromFileEvent = options.fromFileEvent === true;
  let text;
  try {
    text = loadConfigText();
  } catch (e) {
    logLine('error', `read config: ${e.message}`);
    return;
  }
  const parsed = parseConfig(text);
  if (!parsed.ok) {
    logLine('error', `parse/validate: ${parsed.error} (keeping previous schedules)`);
    return;
  }
  supervisor = parsed.supervisor;
  lastGoodPayload = parsed;
  const filtered = filterForLocalSupervisor(filterForEnv(parsed.crons));
  const digest = digestForJobs(filtered);

  if (fromFileEvent && digest === lastAppliedJobsDigest) {
    logLine(
      'info',
      'config reload skipped: filesystem change but effective local crons unchanged (whitespace/comments-only or identical payload)',
    );
    return;
  }

  lastAppliedJobsDigest = digest;
  reconcile(filtered);
}

function scheduleReload() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    applyConfig({ fromFileEvent: true });
  }, DEBOUNCE_MS);
}

function main() {
  applyRepoRootEnv();
  try {
    fs.mkdirSync(path.dirname(supervisorLogPath()), { recursive: true });
  } catch {
    // ignore
  }
  logLine('info', 'cron-supervisor starting', {
    CONFIG_PATH,
    REPO_ROOT,
    ENVIRONMENT: process.env.ENVIRONMENT ?? '(unset)',
    effectiveMode: isProduction() ? 'production' : 'development',
  });
  applyConfig();
  logLine('info', 'cron-supervisor ready', {
    cronLogsDir: CRON_LOGS_REL,
    timezone: supervisor.defaultTimezone,
  });

  chokidar
    .watch(CONFIG_PATH, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200 } })
    .on('all', (ev) => {
      logLine('info', `config file event: ${ev}`);
      scheduleReload();
    });

  process.on('SIGINT', () => {
    for (const [, entry] of active) entry.job.stop();
    process.exit(0);
  });
}

main();
