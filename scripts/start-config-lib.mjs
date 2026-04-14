import fs from 'node:fs';
import path from 'node:path';

export function loadApplications(root) {
  const configPath = path.join(root, 'start.config.json');
  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (e) {
    console.error(`Cannot read ${configPath}: ${e.message}`);
    process.exit(1);
  }
  if (!raw.trim()) {
    console.error('start.config.json is empty; add an "applications" array.');
    process.exit(1);
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    console.error(`Invalid JSON in start.config.json: ${e.message}`);
    process.exit(1);
  }
  const apps = config.applications;
  if (!Array.isArray(apps)) {
    console.error('start.config.json must contain an "applications" array');
    process.exit(1);
  }
  return apps;
}

export function appLabel(a) {
  if (a == null || typeof a !== 'object') return '(invalid)';
  if (typeof a.name === 'string' && a.name.trim()) return a.name.trim();
  if (typeof a.path === 'string' && a.path.trim()) return a.path.trim();
  return '(unnamed)';
}

export function resolveCwd(root, a) {
  const appPath = a.path;
  if (typeof appPath !== 'string' || !appPath.trim()) {
    return { ok: false, error: 'missing path' };
  }
  const cwd = path.join(root, appPath.trim());
  if (!fs.existsSync(cwd)) {
    return { ok: false, error: `missing directory: ${cwd}` };
  }
  return { ok: true, cwd };
}

export function safeLogName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export function requireStartRoot() {
  const root = process.env.START_ROOT;
  if (!root) {
    console.error('START_ROOT is not set');
    process.exit(1);
  }
  return root;
}
