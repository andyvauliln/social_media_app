#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export START_ROOT="$ROOT"

node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.env.START_ROOT;
if (!root) {
  console.error('START_ROOT is not set');
  process.exit(1);
}

const configPath = path.join(root, 'start.config.json');
let raw;
try {
  raw = fs.readFileSync(configPath, 'utf8');
} catch (e) {
  console.error(`Cannot read ${configPath}: ${e.message}`);
  process.exit(1);
}

if (!raw.trim()) {
  console.error(`start.config.json is empty; add an "applications" array.`);
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

const logsDir = path.join(root, 'logs', 'start');
fs.mkdirSync(logsDir, { recursive: true });

function safeLogName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]+/g, '_');
}

for (const a of apps) {
  if (a == null || typeof a !== 'object') continue;
  const label =
    typeof a.name === 'string' && a.name.trim()
      ? a.name.trim()
      : typeof a.path === 'string' && a.path.trim()
        ? a.path.trim()
        : '(unnamed)';
  if (a.enabled === false) {
    console.error(`[script.start] skip (enabled: false): ${label}`);
    continue;
  }
  const appPath = a.path;
  if (typeof appPath !== 'string' || !appPath.trim()) {
    console.error('Skipping application entry without a non-empty "path"');
    continue;
  }
  const cwd = path.join(root, appPath.trim());
  if (!fs.existsSync(cwd)) {
    console.error(`Skipping missing path: ${cwd}`);
    continue;
  }
  const name = typeof a.name === 'string' && a.name.trim() ? a.name.trim() : appPath.trim();
  const cmd = typeof a.command === 'string' && a.command.trim() ? a.command.trim() : 'npm start';
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
NODE
