import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  loadApplications,
  appLabel,
  resolveCwd,
  safeLogName,
  requireStartRoot,
} from './start-config-lib.mjs';

const root = requireStartRoot();
const apps = loadApplications(root);
const logsDir = path.join(root, 'logs', 'start');
fs.mkdirSync(logsDir, { recursive: true });

for (const a of apps) {
  if (a == null || typeof a !== 'object') continue;
  const label = appLabel(a);
  if (a.enabled === false) {
    console.error(`[script.start] skip (enabled: false): ${label}`);
    continue;
  }
  const cwdRes = resolveCwd(root, a);
  if (!cwdRes.ok) {
    console.error(`[script.start] skip (${cwdRes.error}): ${label}`);
    continue;
  }
  const { cwd } = cwdRes;
  const name =
    typeof a.name === 'string' && a.name.trim() ? a.name.trim() : a.path.trim();
  const cmd =
    typeof a.command === 'string' && a.command.trim()
      ? a.command.trim()
      : 'bun run start';
  const logFile =
    typeof a.log === 'string' && a.log.trim()
      ? path.join(root, a.log.trim())
      : path.join(logsDir, `${safeLogName(name)}.log`);

  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const out = fs.openSync(logFile, 'a');
  const stamp = new Date().toISOString();
  fs.writeSync(out, `\n--- ${stamp} starting ${name} (${cmd}) cwd=${cwd} ---\n`);

  console.error(`[script.start] ${name}: ${cmd} (cwd ${cwd}) -> ${logFile}`);
  const child = spawn('sh', ['-c', cmd], {
    cwd,
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
}
