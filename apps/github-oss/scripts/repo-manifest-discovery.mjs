/**
 * Discover package.json / requirements.txt paths via GitHub Git Trees API (recursive),
 * then fetch raw file contents. Used by populate-repo-packages.mjs; mirrors browser logic in project.html / index.html.
 */

const GH_ACCEPT = 'application/vnd.github+json';
const GH_VER = '2022-11-28';

function apiHeaders(token) {
  const h = { Accept: GH_ACCEPT, 'X-GitHub-Api-Version': GH_VER };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchRepoBlobPaths(fullName, branch, token) {
  try {
    const cr = await fetch(
      `https://api.github.com/repos/${fullName}/commits/${encodeURIComponent(branch)}`,
      { headers: apiHeaders(token) }
    );
    if (!cr.ok) return [];
    const c = await cr.json();
    const treeSha = c?.commit?.tree?.sha;
    if (!treeSha) return [];
    const tr = await fetch(
      `https://api.github.com/repos/${fullName}/git/trees/${treeSha}?recursive=1`,
      { headers: apiHeaders(token) }
    );
    if (!tr.ok) return [];
    const t = await tr.json();
    return (t.tree || []).filter((x) => x.type === 'blob' && x.path).map((x) => x.path);
  } catch {
    return [];
  }
}

export function manifestPathsForBasename(paths, baseName) {
  return paths
    .filter((p) => p === baseName || p.endsWith('/' + baseName))
    .sort((a, b) => {
      const da = a.split('/').length;
      const db = b.split('/').length;
      if (da !== db) return da - db;
      return a.localeCompare(b);
    });
}

export async function discoverNpmPackagesFromTree(fullName, branch, token, maxDeps, maxManifests) {
  const paths = await fetchRepoBlobPaths(fullName, branch, token);
  const rels = manifestPathsForBasename(paths, 'package.json').slice(0, maxManifests);
  const rawH = {};
  if (token) rawH.Authorization = `Bearer ${token}`;
  const byName = new Map();
  for (const rel of rels) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${fullName}/${branch}/${rel}`, {
        headers: rawH,
      });
      if (!res.ok) continue;
      const pkg = await res.json();
      for (const [name, ver] of Object.entries(pkg.dependencies || {})) {
        byName.set(name, { ver, dev: false });
      }
      for (const [name, ver] of Object.entries(pkg.devDependencies || {})) {
        byName.set(name, { ver, dev: true });
      }
    } catch {
      /* invalid json or network */
    }
  }
  return Array.from(byName.entries()).slice(0, maxDeps).map(([name, { ver, dev }]) => ({
    name,
    version: String(ver ?? '').replace(/[\^~>=<]/g, ''),
    registry: 'npm',
    description: '',
    devDependency: dev,
  }));
}

export async function discoverPypiPackagesFromTree(fullName, branch, token, maxDeps, maxManifests) {
  const paths = await fetchRepoBlobPaths(fullName, branch, token);
  const rels = manifestPathsForBasename(paths, 'requirements.txt').slice(0, maxManifests);
  const rawH = {};
  if (token) rawH.Authorization = `Bearer ${token}`;
  const seen = new Set();
  const out = [];
  for (const rel of rels) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${fullName}/${branch}/${rel}`, {
        headers: rawH,
      });
      if (!res.ok) continue;
      const text = await res.text();
      for (const line of text.split('\n')) {
        const name = line.trim().split(/[>=<!\[]/)[0].trim();
        if (!name || name.startsWith('#') || name.length >= 60) continue;
        const k = name.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ name, version: '', registry: 'pypi', description: '' });
        if (out.length >= maxDeps) return out;
      }
    } catch {
      /* next file */
    }
  }
  return out;
}
