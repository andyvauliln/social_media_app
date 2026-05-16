#!/usr/bin/env node
/**
 * Fetches dependency lists via GitHub recursive tree + raw manifests.
 * Logic matches project.html / index.html enrichRepos.
 *
 *   GITHUB_TOKEN=ghp_xxx node scripts/populate-repo-packages.mjs [path-to-project.json]
 *
 * Env: FORCE=1, LIMIT=n, DELAY_MS=120, MAX_MANIFEST_FILES=25
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  discoverNpmPackagesFromTree,
  discoverPypiPackagesFromTree,
} from './repo-manifest-discovery.mjs';

const MAX_PACKAGE_DEPS = 500;
const DEFAULT_FILE = path.join('data', 'projects', '1_trading-oss.json');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPackagesForRepo(repo, token, maxDeps, maxManifests) {
  const full = repo.full_name;
  if (!full) return [];
  const branch = repo.default_branch || 'main';
  const lang = String(repo.language || '').toLowerCase();

  if (lang === 'javascript' || lang === 'typescript') {
    return discoverNpmPackagesFromTree(full, branch, token, maxDeps, maxManifests);
  }
  if (lang === 'python' || lang === 'jupyter notebook') {
    return discoverPypiPackagesFromTree(full, branch, token, maxDeps, maxManifests);
  }
  return [];
}

async function main() {
  const file = path.resolve(process.argv[2] || DEFAULT_FILE);
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const force = process.env.FORCE === '1' || process.env.FORCE === 'true';
  const limit = process.env.LIMIT ? Math.max(0, parseInt(process.env.LIMIT, 10)) : 0;
  const delayMs = Math.max(0, parseInt(process.env.DELAY_MS || '120', 10));
  const maxManifests = Math.max(1, parseInt(process.env.MAX_MANIFEST_FILES || '25', 10));

  const raw = await fs.readFile(file, 'utf8');
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.repos)) {
    console.error('Invalid project JSON: missing repos[]');
    process.exit(1);
  }

  const repos = data.repos;
  let done = 0;
  let skipped = 0;
  const cap = limit > 0 ? Math.min(limit, repos.length) : repos.length;

  for (let i = 0; i < cap; i++) {
    const r = repos[i];
    const has = Array.isArray(r.packages) && r.packages.length > 0;
    if (has && !force) {
      skipped++;
      continue;
    }
    try {
      const pkgs = await fetchPackagesForRepo(r, token, MAX_PACKAGE_DEPS, maxManifests);
      r.packages = pkgs;
      done++;
      if (done % 20 === 0 || i === cap - 1) {
        console.error(`Progress: ${i + 1}/${cap} repos scanned, ${done} updated, ${skipped} skipped`);
      }
    } catch (e) {
      console.error(`WARN ${r.full_name}: ${e.message}`);
      r.packages = Array.isArray(r.packages) ? r.packages : [];
    }
    await sleep(delayMs);
  }

  await fs.writeFile(file, JSON.stringify(data), 'utf8');
  console.error(`Done. Wrote ${file} (${done} repos updated, ${skipped} skipped, cap=${cap}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
