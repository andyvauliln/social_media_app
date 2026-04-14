import { spawnSync } from 'node:child_process';
import {
  loadApplications,
  appLabel,
  resolveCwd,
  requireStartRoot,
} from './start-config-lib.mjs';

const root = requireStartRoot();
const apps = loadApplications(root);

for (const a of apps) {
  if (a == null || typeof a !== 'object') continue;
  const label = appLabel(a);
  const inst =
    typeof a.install_command === 'string' && a.install_command.trim()
      ? a.install_command.trim()
      : '';
  if (!inst) {
    console.error(`[script.init] skip (no install_command): ${label}`);
    continue;
  }
  const cwdRes = resolveCwd(root, a);
  if (!cwdRes.ok) {
    console.error(`[script.init] skip (${cwdRes.error}): ${label}`);
    continue;
  }
  const { cwd } = cwdRes;
  console.error(`[script.init] ${label}: ${inst}`);
  console.error(`[script.init] cwd: ${cwd}`);
  const r = spawnSync('sh', ['-c', inst], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env },
  });
  if (r.status !== 0 && r.status != null) {
    console.error(`[script.init] failed: ${label} exit ${r.status}`);
    process.exit(r.status);
  }
  if (r.error) {
    console.error(`[script.init] failed: ${label}: ${r.error.message}`);
    process.exit(1);
  }
}
console.error('[script.init] done');
