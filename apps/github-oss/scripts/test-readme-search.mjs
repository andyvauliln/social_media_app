#!/usr/bin/env node
/**
 * Compares GitHub repository search hits with the actual default-branch README.
 *
 * Mirrors github-discovery.js: multi-word keywords become phrase queries ("a b")
 * before ` in:…` (+ optional stars / fork filters).
 *
 *   GITHUB_TOKEN=ghp_xxx node scripts/test-readme-search.mjs
 *
 * Env:
 *   KEYWORD   — same as app chips (default: content factory). Multi-word is auto-quoted.
 *              Already-quoted KEYWORD='"content factory"' is passed through unchanged.
 *   LIMIT     — max repos to verify (default: 15)
 *   DELAY_MS  — pause between API calls (default: 200)
 *   MIN_STARS — if >0, append stars:>N (default: 0)
 *   EXCLUDE_FORKS — if 1, append fork:false (default: 0)
 *   SCOPE     — readme | all (default: readme)
 *              readme → in:readme only
 *              all    → in:name,description,topics,readme (app defaults)
 *
 * Compares live README text to the contiguous phrase (after stripping optional user quotes).
 */

const RAW_KEYWORD = String(process.env.KEYWORD || 'content factory').trim();

function phraseSearchTermForGitHub(kw) {
  const s = String(kw == null ? '' : kw).trim();
  if (!s) return s;
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s;
  if (s.includes('"')) return s;
  if (/\s/.test(s)) return `"${s}"`;
  return s;
}

/** Substring check in README (inner phrase if user wrapped KEYWORD in quotes). */
const VERIFY_PHRASE = (() => {
  const s = RAW_KEYWORD;
  const m = /^"(.*)"$/.exec(s);
  return (m ? m[1] : s).trim();
})();
const LIMIT = Math.max(1, Math.min(100, parseInt(process.env.LIMIT || '15', 10)));
const DELAY_MS = Math.max(0, parseInt(process.env.DELAY_MS || '200', 10));
const MIN_STARS = Math.max(0, parseInt(process.env.MIN_STARS || '0', 10));
const EXCLUDE_FORKS = process.env.EXCLUDE_FORKS === '1' || process.env.EXCLUDE_FORKS === 'true';
const SCOPE = String(process.env.SCOPE || 'readme').toLowerCase() === 'all' ? 'all' : 'readme';

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildRepoSearchQuery(kw, opt) {
  const inFields = [];
  if (opt.inName) inFields.push('name');
  if (opt.inDescription) inFields.push('description');
  if (opt.inTopics) inFields.push('topics');
  if (opt.inReadme) inFields.push('readme');
  if (!inFields.length) return null;
  const term = phraseSearchTermForGitHub(kw);
  if (!term) return null;
  let q = term + ' in:' + inFields.join(',');
  if (opt.minStars > 0) q += ' stars:>' + opt.minStars;
  if (opt.excludeForks) q += ' fork:false';
  return q;
}

async function ghFetch(url, headers = {}) {
  const h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...headers,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers: h });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = body && body.message ? body.message : text.slice(0, 200);
    const err = new Error(`${res.status} ${msg}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function searchRepos(query, perPage) {
  const url =
    'https://api.github.com/search/repositories?q=' +
    encodeURIComponent(query) +
    '&sort=stars&order=desc&per_page=' +
    perPage;
  return ghFetch(url);
}

/** Raw README bytes via REST (default branch). */
async function fetchReadmeRaw(fullName) {
  const url = `https://api.github.com/repos/${fullName}/readme`;
  const h = {
    Accept: 'application/vnd.github.raw',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers: h });
  if (res.status === 404) return { ok: false, reason: 'no_readme' };
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, reason: `http_${res.status}`, detail: text.slice(0, 120) };
  }
  return { ok: true, text };
}

function normalizeForCompare(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function main() {
  const opt =
    SCOPE === 'all'
      ? {
          inName: true,
          inDescription: true,
          inTopics: true,
          inReadme: true,
          minStars: MIN_STARS,
          excludeForks: EXCLUDE_FORKS,
        }
      : {
          inName: false,
          inDescription: false,
          inTopics: false,
          inReadme: true,
          minStars: MIN_STARS,
          excludeForks: EXCLUDE_FORKS,
        };

  const q = buildRepoSearchQuery(RAW_KEYWORD, opt);
  if (!q) {
    console.error('Empty query');
    process.exit(1);
  }

  console.log('--- readme search probe ---');
  console.log('SCOPE:', SCOPE, '(readme = in:readme only; all = name+description+topics+readme)');
  console.log('GitHub q:', q);
  console.log('Verify LIMIT:', LIMIT, '| phrase check (case-insensitive):', JSON.stringify(VERIFY_PHRASE));
  console.log('Token:', token ? 'set' : 'missing (lower rate limit)');
  console.log('');
  return { q, opt };
}

async function run() {
  const { q } = main();

  let data;
  try {
    data = await searchRepos(q, LIMIT);
  } catch (e) {
    console.error('Search failed:', e.message);
    process.exit(1);
  }

  const items = data.items || [];
  console.log('Search total_count (GitHub):', data.total_count, '| items this page:', items.length);
  console.log('');

  const needle = normalizeForCompare(VERIFY_PHRASE);
  let hits = 0;
  let misses = 0;
  let errors = 0;

  for (let i = 0; i < items.length; i++) {
    const r = items[i];
    const full = r.full_name;
    process.stdout.write(`[${i + 1}/${items.length}] ${full} … `);
    let readme = null;
    try {
      readme = await fetchReadmeRaw(full);
    } catch (e) {
      errors++;
      console.log('FETCH_ERR', e.message);
      await sleep(DELAY_MS);
      continue;
    }
    await sleep(DELAY_MS);

    if (!readme.ok) {
      errors++;
      console.log('README', readme.reason, readme.detail || '');
      continue;
    }

    const hay = normalizeForCompare(readme.text);
    const hasPhrase = hay.includes(needle);
    if (hasPhrase) {
      hits++;
      console.log('README_HAS_PHRASE yes');
    } else {
      misses++;
      const parts = needle.split(' ').filter(Boolean);
      const w1 = parts[0];
      const w2 = parts.slice(1).join(' ');
      const hasBothWords =
        w1 && w2.length > 0 && hay.includes(w1) && hay.includes(w2) && !hasPhrase;
      console.log(
        'README_HAS_PHRASE no',
        hasBothWords ? '(both words appear separately, not as contiguous phrase)' : ''
      );
    }
  }

  console.log('');
  console.log('--- summary ---');
  console.log('verified:', items.length, '| phrase in README:', hits, '| phrase missing:', misses, '| readme/errors:', errors);
  console.log(
    'Interpretation: discovery auto-quotes multi-word terms (phrase search). Remaining README_HAS_PHRASE=no hits are usually index lag vs live README or GitHub phrase matching edge cases.'
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
