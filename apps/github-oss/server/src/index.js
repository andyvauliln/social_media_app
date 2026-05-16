import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import simpleGit from 'simple-git';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3847;
/** Repo root (parent of `server/`): HTML + data/ */
const STATIC_ROOT = path.resolve(process.env.STATIC_ROOT || path.join(__dirname, '..', '..'));
const REPOS_ROOT = path.resolve(process.env.REPOS_ROOT || path.join(__dirname, '..', 'data', 'clones'));
const OR_KEY = process.env.OPENROUTER_API_KEY || '';
const GH_TOKEN = process.env.GITHUB_TOKEN || '';
const FILTER_MODEL = process.env.FILTER_MODEL || 'minimax/minimax-m2.5';
const KEYWORDS_MODEL = process.env.OPENROUTER_KEYWORDS_MODEL || 'google/gemini-2.5-flash';
const OR_API = 'https://openrouter.ai/api/v1';
/** Extra Cursor IDE model labels for Ask AI dropdown (comma-separated). */
const CURSOR_MODELS_EXTRA = (process.env.CURSOR_MODELS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Display names aligned with Cursor’s model picker (see cursor.com/docs/models); order = preferred defaults first. */
const CURSOR_BUILTIN_MODEL_LABELS = [
  'Composer 2 Fast',
  'Composer 2',
  'Auto',
  'Composer 1.5',
  'Composer 1',
  'Claude 4.6 Sonnet',
  'Claude 4.6 Opus',
  'Claude 4.6 Opus (Fast mode)',
  'Claude 4.5 Sonnet',
  'Claude 4.5 Opus',
  'Claude 4.5 Haiku',
  'Claude 4 Sonnet',
  'Claude 4 Sonnet 1M',
  'Gemini 3.1 Pro',
  'Gemini 3 Pro',
  'Gemini 3 Pro Image Preview',
  'Gemini 3 Flash',
  'Gemini 2.5 Flash',
  'GPT-5.4',
  'GPT-5.4 Mini',
  'GPT-5.4 Nano',
  'GPT-5.3 Codex',
  'GPT-5.2',
  'GPT-5.2 Codex',
  'GPT-5.1 Codex Max',
  'GPT-5.1 Codex',
  'GPT-5.1 Codex Mini',
  'GPT-5-Codex',
  'GPT-5 Fast',
  'GPT-5',
  'GPT-5 Mini',
  'Grok 4.20',
  'Kimi K2.5',
  'o3',
  'o4-mini',
];

const MAX_KEYWORDS_FROM_AI = 20;
const MAX_KEYWORD_STRING_LEN = 120;

const MAX_PATHS_LIST = 2500;
const MAX_FILTERED_FILES = 25;
const MAX_BYTES_PER_FILE = 100_000;
const MAX_GLOBAL_PRIOR_MD = 100_000;
const FOLLOWUP_CONTEXT_CHARS = 4000;
/** Single conversation log per clone (UI: one tab, many accordion turns). */
const THREAD_TOPIC_ID = '__thread';

const GLOBAL_CONTEXT_ROOT = path.join(STATIC_ROOT, 'data', 'global_context');
const PROJECTS_DIR = path.join(STATIC_ROOT, 'data', 'projects');

/** Matches client `buildFileName`: digits_slug.json base name */
function assertSafeProjectFname(fname) {
  const s = String(fname || '').trim();
  if (!/^\d+_[a-z0-9_-]+$/.test(s)) {
    const e = new Error('Invalid project file name');
    e.statusCode = 400;
    throw e;
  }
  const fp = path.join(PROJECTS_DIR, `${s}.json`);
  const norm = path.normalize(fp);
  if (!norm.startsWith(path.normalize(PROJECTS_DIR + path.sep))) {
    const e = new Error('Path escapes projects directory');
    e.statusCode = 400;
    throw e;
  }
  return { fname: s, filePath: fp };
}

function projectCardMetaFromFileJson(raw, fnameNoExt) {
  if (!raw || typeof raw !== 'object') return null;
  const _fname = String(raw._fname || fnameNoExt).trim() || fnameNoExt;
  const repoCount =
    raw.repoCount != null ? Number(raw.repoCount) : Array.isArray(raw.repos) ? raw.repos.length : 0;
  const prefixNum = parseInt(String(_fname).match(/^(\d+)_/)?.[1] || '', 10);
  const _num = Number.isFinite(Number(raw._num)) ? Number(raw._num) : Number.isFinite(prefixNum) ? prefixNum : 0;
  return {
    _fname,
    _num,
    schemaVersion: raw.schemaVersion ?? 1,
    name: raw.name || _fname,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    languages: Array.isArray(raw.languages) ? raw.languages : [],
    repoCount: Number.isFinite(repoCount) ? repoCount : 0,
    topLangs: Array.isArray(raw.topLangs) ? raw.topLangs : [],
    createdAt: raw.createdAt || '',
    seeded: !!raw.seeded,
    searchOptions: raw.searchOptions && typeof raw.searchOptions === 'object' ? raw.searchOptions : undefined,
  };
}

function assertSafeProjectSlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(s)) {
    const e = new Error('Invalid searchProjectSlug');
    e.statusCode = 400;
    throw e;
  }
  return s;
}

function safeTopicKey(topic) {
  const t = String(topic || '').trim().toLowerCase();
  const key = t.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!key || !/^[a-z0-9][a-z0-9-]*$/.test(key)) {
    const e = new Error('Invalid githubTopic');
    e.statusCode = 400;
    throw e;
  }
  return key;
}

function globalContextDir(projectSlug) {
  const s = assertSafeProjectSlug(projectSlug);
  const dir = path.join(GLOBAL_CONTEXT_ROOT, s);
  const norm = path.normalize(dir);
  if (!norm.startsWith(path.normalize(GLOBAL_CONTEXT_ROOT + path.sep))) {
    throw new Error('Path escapes global context root');
  }
  return norm;
}

function globalTopicMdPath(projectSlug, topicKey) {
  return path.join(globalContextDir(projectSlug), `${topicKey}.md`);
}

function globalTopicJsonPath(projectSlug, topicKey) {
  return path.join(globalContextDir(projectSlug), `${topicKey}.json`);
}

function readGlobalMdCapped(projectSlug, topicKey) {
  const fp = globalTopicMdPath(projectSlug, topicKey);
  if (!fs.existsSync(fp)) return '';
  const text = fs.readFileSync(fp, 'utf8');
  if (text.length <= MAX_GLOBAL_PRIOR_MD) return text;
  return text.slice(0, MAX_GLOBAL_PRIOR_MD) + '\n\n[truncated]';
}

function appendGlobalMarkdown(projectSlug, topicKey, githubTopic, userPrompt, model, content) {
  const dir = globalContextDir(projectSlug);
  fs.mkdirSync(dir, { recursive: true });
  const fp = globalTopicMdPath(projectSlug, topicKey);
  const ts = new Date().toISOString();
  const block = `\n\n## ${ts} · ${githubTopic}\n\n**Q:** ${userPrompt}\n\n**Model:** ${model}\n\n${content}\n\n---\n`;
  fs.appendFileSync(fp, block, 'utf8');
}

function loadGlobalTopicSession(projectSlug, topicKey) {
  const fp = globalTopicJsonPath(projectSlug, topicKey);
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (raw.session && Array.isArray(raw.session.turns)) return raw.session;
  } catch {
    return null;
  }
  const now = new Date().toISOString();
  return {
    topicId: `global:${topicKey}`,
    fullName: assertSafeProjectSlug(projectSlug),
    createdAt: now,
    updatedAt: now,
    turns: [],
  };
}

function saveGlobalTopicBundle(projectSlug, topicKey, githubTopic, session) {
  const dir = globalContextDir(projectSlug);
  fs.mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  session.updatedAt = now;
  session.topicId = `global:${topicKey}`;
  session.fullName = assertSafeProjectSlug(projectSlug);
  const payload = {
    topic: githubTopic,
    topicKey,
    updatedAt: now,
    session,
  };
  fs.writeFileSync(globalTopicJsonPath(projectSlug, topicKey), JSON.stringify(payload, null, 2), 'utf8');
}

function listGlobalContextTopics(projectSlug) {
  const dir = globalContextDir(projectSlug);
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir);
  const topics = [];
  for (const name of names) {
    if (!name.endsWith('.md')) continue;
    const topicKey = name.slice(0, -3);
    if (!topicKey || topicKey.startsWith('_')) continue;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(topicKey)) continue;
    const mdPath = path.join(dir, name);
    const jsonPath = globalTopicJsonPath(projectSlug, topicKey);
    const md = fs.readFileSync(mdPath, 'utf8');
    const previewLen = 800;
    const mdPreview = md.length <= previewLen ? md : `${md.slice(0, previewLen)}…`;
    let label = topicKey;
    let updatedAt = null;
    if (fs.existsSync(jsonPath)) {
      try {
        const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (j.topic) label = j.topic;
        if (j.updatedAt) updatedAt = j.updatedAt;
      } catch {
        /* ignore */
      }
    }
    if (!updatedAt) {
      try {
        updatedAt = fs.statSync(mdPath).mtime.toISOString();
      } catch {
        updatedAt = null;
      }
    }
    topics.push({
      topicKey,
      label,
      updatedAt,
      mdPreview,
      hasJson: fs.existsSync(jsonPath),
    });
  }
  topics.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  return topics;
}

function repoDirName(fullName) {
  const [owner, name] = fullName.split('/');
  if (!owner || !name) throw new Error('Invalid fullName; expected owner/repo');
  return `${owner}__${name}`;
}

function repoPath(fullName) {
  return path.join(REPOS_ROOT, repoDirName(fullName));
}

function userDataDir(fullName) {
  return path.join(repoPath(fullName), 'USER_AI_DATA');
}

async function openRouterChat(model, messages) {
  const res = await fetch(`${OR_API}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OR_KEY}`,
      'HTTP-Referer': 'https://oss-intelligence.local',
      'X-Title': 'OSS Intelligence',
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function extractJsonObject(text) {
  const s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : s;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model response');
  return JSON.parse(raw.slice(start, end + 1));
}

function looksBinary(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

function readRepoFile(repoRoot, relPath) {
  const abs = path.join(repoRoot, relPath);
  const norm = path.normalize(abs);
  if (!norm.startsWith(path.normalize(repoRoot + path.sep))) {
    throw new Error('Path escapes repo');
  }
  if (!fs.existsSync(norm) || !fs.statSync(norm).isFile()) {
    return { relPath, content: null, skipped: 'missing' };
  }
  const buf = fs.readFileSync(norm);
  if (looksBinary(buf)) {
    return { relPath, content: null, skipped: 'binary' };
  }
  let text = buf.toString('utf8');
  let truncated = false;
  if (text.length > MAX_BYTES_PER_FILE) {
    text = text.slice(0, MAX_BYTES_PER_FILE);
    truncated = true;
  }
  return { relPath, content: text + (truncated ? '\n\n[truncated]' : ''), skipped: null };
}

async function gitLsFiles(repoRoot) {
  const git = simpleGit(repoRoot);
  const out = await git.raw(['ls-files']);
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

async function ensureClone(fullName, branch) {
  fs.mkdirSync(REPOS_ROOT, { recursive: true });
  const dir = repoPath(fullName);
  const [owner, name] = fullName.split('/');
  if (!owner || !name) throw new Error('Invalid fullName');
  const auth = GH_TOKEN ? `${GH_TOKEN}@` : '';
  const url = `https://${auth}github.com/${owner}/${name}.git`;

  if (!fs.existsSync(path.join(dir, '.git'))) {
    const cloneOpts = ['--depth', '1'];
    if (branch) cloneOpts.push('--branch', branch);
    await simpleGit().clone(url, dir, cloneOpts);
  } else {
    const git = simpleGit(dir);
    try {
      await git.pull();
    } catch {
      /* offline or conflict — continue with existing tree */
    }
  }
  return dir;
}

const HEURISTIC_PRIORITY_BASE = new Set(
  [
    'readme.md',
    'readme',
    'package.json',
    'package-lock.json',
    'cargo.toml',
    'go.mod',
    'pyproject.toml',
    'requirements.txt',
    'composer.json',
    'build.gradle',
    'pom.xml',
    'dockerfile',
    'makefile',
  ].map((s) => s.toLowerCase()),
);

function heuristicPickPaths(paths) {
  const list = paths.slice(0, MAX_PATHS_LIST);
  const lower = (p) => p.toLowerCase();
  const scored = list.map((p) => {
    const l = lower(p);
    if (l.includes('node_modules/') || l.includes('/node_modules/')) return { p, score: -1 };
    if (l.includes('vendor/') || l.startsWith('vendor/')) return { p, score: -1 };
    let score = 0;
    const seg = l.split('/');
    const base = seg[seg.length - 1] || l;
    if (HEURISTIC_PRIORITY_BASE.has(base)) score += 100;
    if (l.endsWith('readme.md')) score += 80;
    if (/\.(md|txt)$/.test(l)) score += 25;
    if (/\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|kt|swift)$/.test(l)) score += 15;
    if (seg.length <= 2) score += 8;
    return { p, score };
  });
  const ranked = scored.filter((x) => x.score >= 0).sort((a, b) => b.score - a.score);
  const out = [];
  const seen = new Set();
  for (const { p } of ranked) {
    if (out.length >= MAX_FILTERED_FILES) break;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  for (const p of list) {
    if (out.length >= MAX_FILTERED_FILES) break;
    if (seen.has(p)) continue;
    if (lower(p).includes('node_modules')) continue;
    out.push(p);
    seen.add(p);
  }
  return out;
}

async function resolveFilteredPaths(userPrompt, paths) {
  if (OR_KEY) return filterPathsWithModel(userPrompt, paths);
  return heuristicPickPaths(paths);
}

async function filterPathsWithModel(userQuestion, paths) {
  const list = paths.slice(0, MAX_PATHS_LIST);
  const system = `You are a repository navigator. Given a user question and a list of file paths (one per line), pick the smallest set of files needed to answer the question.

Respond with ONLY valid JSON (no markdown): {"paths":["relative/path",...]}
Rules:
- Use exact paths from the list only.
- At most ${MAX_FILTERED_FILES} paths.
- Prefer source over generated/vendor if both could work (skip node_modules, dist, build if obvious from paths).`;

  const user = `## Question\n${userQuestion}\n\n## Paths\n${list.join('\n')}`;
  const raw = await openRouterChat(FILTER_MODEL, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  const j = extractJsonObject(raw);
  const picked = Array.isArray(j.paths) ? j.paths.map(String) : [];
  const set = new Set(list);
  const valid = picked.filter((p) => set.has(p)).slice(0, MAX_FILTERED_FILES);
  return valid;
}

function buildFileContextBundle(repoRoot, relPaths) {
  const parts = [];
  for (const rel of relPaths) {
    const { content, skipped } = readRepoFile(repoRoot, rel);
    if (skipped === 'binary') {
      parts.push(`### ${rel}\n\n[skipped: binary file]`);
    } else if (skipped === 'missing' || content == null) {
      parts.push(`### ${rel}\n\n[skipped: not found]`);
    } else {
      parts.push(`### ${rel}\n\n\`\`\`\n${content}\n\`\`\``);
    }
  }
  return parts.join('\n\n');
}

function loadSession(fullName, topicId) {
  const dir = userDataDir(fullName);
  const fp = path.join(dir, topicId, 'session.json');
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function saveSession(fullName, session) {
  const dir = path.join(userDataDir(fullName), session.topicId);
  fs.mkdirSync(dir, { recursive: true });
  session.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'session.json'), JSON.stringify(session, null, 2), 'utf8');
}

const app = Fastify({ logger: true, bodyLimit: 55 * 1024 * 1024 });

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.length === 0) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
});

app.get('/health', async () => ({ ok: true }));

app.get('/api/projects', async () => {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  const names = fs.readdirSync(PROJECTS_DIR).filter((n) => n.endsWith('.json'));
  const projects = [];
  for (const name of names) {
    const base = name.slice(0, -'.json'.length);
    try {
      assertSafeProjectFname(base);
    } catch {
      continue;
    }
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, name), 'utf8'));
      const meta = projectCardMetaFromFileJson(raw, base);
      if (meta) projects.push(meta);
    } catch {
      /* skip broken file */
    }
  }
  projects.sort((a, b) => (a._num || 0) - (b._num || 0));
  return { projects };
});

app.post('/api/projects/save', async (req, reply) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    reply.code(400);
    return { error: 'JSON body required' };
  }
  let safe;
  try {
    safe = assertSafeProjectFname(body._fname);
  } catch (e) {
    reply.code(e.statusCode || 400);
    return { error: e.message };
  }
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  fs.writeFileSync(safe.filePath, JSON.stringify(body), 'utf8');
  return { ok: true, file: `data/projects/${safe.fname}.json` };
});

app.delete('/api/projects/:fname', async (req, reply) => {
  let safe;
  try {
    safe = assertSafeProjectFname(req.params.fname);
  } catch (e) {
    reply.code(e.statusCode || 400);
    return { error: e.message };
  }
  if (!fs.existsSync(safe.filePath)) {
    reply.code(404);
    return { error: 'Not found' };
  }
  fs.unlinkSync(safe.filePath);
  return { ok: true };
});

app.get('/api/models', async (req, reply) => {
  if (!OR_KEY) {
    reply.code(503);
    return { error: 'OPENROUTER_API_KEY not configured' };
  }
  const res = await fetch(`${OR_API}/models`, {
    headers: { Authorization: `Bearer ${OR_KEY}` },
  });
  if (!res.ok) {
    reply.code(res.status);
    return { error: await res.text() };
  }
  return res.json();
});

app.post('/api/repos/ensure', async (req) => {
  const { fullName, branch } = req.body || {};
  if (!fullName || typeof fullName !== 'string') {
    const e = new Error('fullName required');
    e.statusCode = 400;
    throw e;
  }
  const dir = await ensureClone(fullName.trim(), branch || null);
  return { ok: true, path: dir, fullName: fullName.trim() };
});

app.get('/api/repos/:owner/:name/sessions', async (req) => {
  const fullName = `${req.params.owner}/${req.params.name}`;
  const session = loadSession(fullName, THREAD_TOPIC_ID);
  return { fullName, session };
});

app.get('/api/global-context/:projectSlug', async (req, reply) => {
  try {
    const projectSlug = assertSafeProjectSlug(req.params.projectSlug);
    const topics = listGlobalContextTopics(projectSlug);
    return { projectSlug, topics };
  } catch (e) {
    reply.code(e.statusCode || 400);
    return { error: e.message };
  }
});

app.get('/api/global-context/:projectSlug/topic/:topicKey/download', async (req, reply) => {
  let projectSlug;
  let topicKey;
  try {
    projectSlug = assertSafeProjectSlug(req.params.projectSlug);
    topicKey = safeTopicKey(req.params.topicKey);
  } catch (e) {
    reply.code(e.statusCode || 400);
    return { error: e.message };
  }
  const which = String(req.query.which || 'md').toLowerCase();
  const mdPath = globalTopicMdPath(projectSlug, topicKey);
  const jsonPath = globalTopicJsonPath(projectSlug, topicKey);
  const hasMd = fs.existsSync(mdPath);
  const hasJson = fs.existsSync(jsonPath);

  if (which === 'md') {
    if (!hasMd) {
      reply.code(404);
      return { error: 'Not found' };
    }
    reply.header('Content-Type', 'text/markdown; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${topicKey}.md"`);
    return reply.send(fs.createReadStream(mdPath));
  }
  if (which === 'json') {
    if (!hasJson) {
      reply.code(404);
      return { error: 'Not found' };
    }
    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${topicKey}.json"`);
    return reply.send(fs.createReadStream(jsonPath));
  }
  if (which === 'zip') {
    if (!hasMd && !hasJson) {
      reply.code(404);
      return { error: 'Not found' };
    }
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      req.log.error(err);
    });
    if (hasMd) archive.file(mdPath, { name: `${topicKey}.md` });
    if (hasJson) archive.file(jsonPath, { name: `${topicKey}.json` });
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${topicKey}.zip"`);
    archive.finalize();
    return reply.send(archive);
  }
  reply.code(400);
  return { error: 'Invalid which (use md, json, or zip)' };
});

async function handleGlobalAsk(body) {
  const searchProjectSlug = String(body.searchProjectSlug || '').trim();
  const githubTopic = String(body.githubTopic || '').trim();
  const userPrompt = String(body.prompt || '').trim();
  const model = String(body.userModel || '').trim();
  const fullName = String(body.fullName || '').trim();
  const topicContextBlock = body.topicContextBlock != null ? String(body.topicContextBlock) : '';

  if (!searchProjectSlug || !githubTopic || !userPrompt || !model) {
    const e = new Error('searchProjectSlug, githubTopic, prompt, and userModel are required for global mode');
    e.statusCode = 400;
    throw e;
  }

  const projectSlug = assertSafeProjectSlug(searchProjectSlug);
  const topicKey = safeTopicKey(githubTopic);

  const priorMd = readGlobalMdCapped(projectSlug, topicKey);
  let session = loadGlobalTopicSession(projectSlug, topicKey);
  const now0 = new Date().toISOString();
  if (!session) {
    session = {
      topicId: `global:${topicKey}`,
      fullName: projectSlug,
      createdAt: now0,
      updatedAt: now0,
      turns: [],
    };
  }

  let priorBlock = '';
  if (priorMd) {
    priorBlock += `\n\n## Prior global notes (from saved notes, may be truncated)\n${priorMd}\n`;
  }
  if (session.turns.length) {
    const last = session.turns[session.turns.length - 1];
    const ans = String(last.content || '').slice(-FOLLOWUP_CONTEXT_CHARS);
    priorBlock += `\n\n## Previous turn (context)\n**Q:** ${last.prompt}\n\n**A (excerpt):**\n${ans}\n`;
  }

  const userContent = [
    `# Search project: ${projectSlug}`,
    `\n## GitHub topic: ${githubTopic}\n`,
    topicContextBlock ? `\n## Context from this project (repos / topic)\n${topicContextBlock}\n` : '',
    priorBlock,
    '\n## Question\n',
    userPrompt,
  ].join('');

  const system =
    'You are a senior software engineer. Answer using the prior global notes, repository/topic summary from the user, and conversation context when present. Be concise and accurate.';

  const content = await openRouterChat(model, [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ]);

  const now = new Date().toISOString();
  session.turns.push({
    prompt: userPrompt,
    content,
    userModel: model,
    filterModel: null,
    filteredPaths: [],
    ts: now,
    contextMode: 'global',
    githubTopic,
    sourceRepo: fullName || undefined,
  });

  appendGlobalMarkdown(projectSlug, topicKey, githubTopic, userPrompt, model, content);
  saveGlobalTopicBundle(projectSlug, topicKey, githubTopic, session);

  return {
    session,
    lastTurn: session.turns[session.turns.length - 1],
    contextMode: 'global',
  };
}

function handleGlobalCursorPack(body) {
  const searchProjectSlug = String(body.searchProjectSlug || '').trim();
  const githubTopic = String(body.githubTopic || '').trim();
  const userPrompt = String(body.prompt || '').trim();
  const cursorModel = String(body.cursorModel || '').trim();
  const fullName = String(body.fullName || '').trim();
  const topicContextBlock = body.topicContextBlock != null ? String(body.topicContextBlock) : '';

  if (!searchProjectSlug || !githubTopic || !userPrompt || !cursorModel) {
    const e = new Error('searchProjectSlug, githubTopic, prompt, and cursorModel are required for Cursor (global)');
    e.statusCode = 400;
    throw e;
  }

  const projectSlug = assertSafeProjectSlug(searchProjectSlug);
  const topicKey = safeTopicKey(githubTopic);

  const priorMd = readGlobalMdCapped(projectSlug, topicKey);
  let session = loadGlobalTopicSession(projectSlug, topicKey);
  const now0 = new Date().toISOString();
  if (!session) {
    session = {
      topicId: `global:${topicKey}`,
      fullName: projectSlug,
      createdAt: now0,
      updatedAt: now0,
      turns: [],
    };
  }

  let priorBlock = '';
  if (priorMd) {
    priorBlock += `\n\n## Prior global notes (from saved notes, may be truncated)\n${priorMd}\n`;
  }
  if (session.turns.length) {
    const last = session.turns[session.turns.length - 1];
    const ans = String(last.content || '').slice(-FOLLOWUP_CONTEXT_CHARS);
    priorBlock += `\n\n## Previous turn (context)\n**Q:** ${last.prompt}\n\n**A (excerpt):**\n${ans}\n`;
  }

  const userContent = [
    `# Search project: ${projectSlug}`,
    `\n## GitHub topic: ${githubTopic}\n`,
    topicContextBlock ? `\n## Context from this project (repos / topic)\n${topicContextBlock}\n` : '',
    priorBlock,
    '\n## Question\n',
    userPrompt,
  ].join('');

  const system =
    'You are a senior software engineer. Answer using the prior global notes, repository/topic summary from the user, and conversation context when present. Be concise and accurate.';

  return {
    contextMode: 'global',
    provider: 'cursor',
    cursorPack: {
      system,
      user: userContent,
      cursorModel,
      githubTopic,
      searchProjectSlug: projectSlug,
      sourceRepo: fullName || undefined,
    },
  };
}

app.get('/api/cursor-models', async () => {
  const seen = new Set();
  const models = [];
  function add(label) {
    const k = label.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    models.push({ id: label, label });
  }
  for (const d of CURSOR_BUILTIN_MODEL_LABELS) add(d);
  for (const e of CURSOR_MODELS_EXTRA) add(e);
  return { models };
});

app.post('/api/ai/keywords', async (req, reply) => {
  if (!OR_KEY) {
    reply.code(503);
    return { error: 'OPENROUTER_API_KEY not configured' };
  }
  const text = String(req.body?.text ?? '').trim();
  if (!text) {
    reply.code(400);
    return { error: 'text is required' };
  }
  if (text.length > 8000) {
    reply.code(400);
    return { error: 'text too long' };
  }
  try {
    const system =
      'You help users search GitHub for repositories. Given a plain-language description, respond with ONLY valid JSON (no markdown fences): an object with key "keywords" whose value is an array of short search strings. Use lowercase and keep multi-word phrases as natural phrases (spaces, not hyphens). Prefer 5–12 distinct phrases. No other keys or commentary.';
    const raw = await openRouterChat(KEYWORDS_MODEL, [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ]);
    const j = extractJsonObject(raw);
    let arr = Array.isArray(j.keywords) ? j.keywords : [];
    arr = arr
      .map((k) => String(k || '').trim().toLowerCase().replace(/\s+/g, ' '))
      .filter(Boolean)
      .map((k) => (k.length > MAX_KEYWORD_STRING_LEN ? k.slice(0, MAX_KEYWORD_STRING_LEN) : k));
    const seen = new Set();
    const out = [];
    for (const k of arr) {
      const key = k.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(k);
      if (out.length >= MAX_KEYWORDS_FROM_AI) break;
    }
    return { keywords: out };
  } catch (e) {
    reply.code(500);
    return { error: e.message || 'Keyword generation failed' };
  }
});

app.post('/api/ai/ask', async (req, reply) => {
  const body = req.body || {};
  const contextMode = body.contextMode === 'global' ? 'global' : 'repo';
  const aiProvider = String(body.aiProvider || 'openrouter').toLowerCase().replace(/_/g, '-');

  if (aiProvider === 'claude-code' || aiProvider === 'codex') {
    reply.code(501);
    return { error: 'This provider is not available yet. Choose OpenRouter or Cursor.' };
  }
  if (aiProvider !== 'openrouter' && aiProvider !== 'cursor') {
    reply.code(400);
    return { error: 'Invalid aiProvider' };
  }

  if (aiProvider === 'openrouter' && !OR_KEY) {
    reply.code(503);
    return { error: 'OPENROUTER_API_KEY not configured' };
  }

  if (contextMode === 'global') {
    if (aiProvider === 'cursor') {
      try {
        return handleGlobalCursorPack(body);
      } catch (e) {
        const code = e.statusCode && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 500;
        reply.code(code);
        return { error: e.message || 'Global Cursor pack failed' };
      }
    }
    try {
      return await handleGlobalAsk(body);
    } catch (e) {
      const code = e.statusCode && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 500;
      reply.code(code);
      return { error: e.message || 'Global ask failed' };
    }
  }

  const { fullName, prompt, userModel, cursorModel } = body;
  if (!fullName || !prompt) {
    reply.code(400);
    return { error: 'fullName and prompt are required' };
  }

  const fn = String(fullName).trim();
  const userPrompt = String(prompt).trim();

  if (aiProvider === 'openrouter') {
    if (!userModel || !String(userModel).trim()) {
      reply.code(400);
      return { error: 'userModel is required for OpenRouter' };
    }
  } else if (!cursorModel || !String(cursorModel).trim()) {
    reply.code(400);
    return { error: 'cursorModel is required for Cursor' };
  }

  const model = String(userModel || '').trim();
  const cursorModelStr = String(cursorModel || '').trim();

  await ensureClone(fn);

  const dir = repoPath(fn);
  let paths = await gitLsFiles(dir);
  paths = paths.filter((p) => !p.startsWith('USER_AI_DATA/'));

  const filteredPaths = await resolveFilteredPaths(userPrompt, paths);
  const fileBlock = buildFileContextBundle(dir, filteredPaths);

  let priorBlock = '';
  let session = loadSession(fn, THREAD_TOPIC_ID);
  if (session?.turns?.length) {
    const last = session.turns[session.turns.length - 1];
    const ans = String(last.content || '').slice(-FOLLOWUP_CONTEXT_CHARS);
    priorBlock = `\n\n## Previous turn (context)\n**Q:** ${last.prompt}\n\n**A (excerpt):**\n${ans}\n`;
  }

  const userContent = [
    `# Repository: ${fn}`,
    priorBlock,
    '\n## Question\n',
    userPrompt,
    '\n\n## Selected files\n',
    fileBlock,
  ].join('');

  const system =
    'You are a senior software engineer. Answer using the repository file excerpts and prior context when present. Be concise and accurate.';

  if (aiProvider === 'cursor') {
    return {
      contextMode: 'repo',
      provider: 'cursor',
      cursorPack: {
        system,
        user: userContent,
        cursorModel: cursorModelStr,
        fullName: fn,
        filteredPaths,
      },
    };
  }

  const content = await openRouterChat(model, [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ]);

  const now = new Date().toISOString();

  if (!session) {
    session = {
      topicId: THREAD_TOPIC_ID,
      fullName: fn,
      createdAt: now,
      updatedAt: now,
      turns: [],
    };
  }

  session.turns.push({
    prompt: userPrompt,
    content,
    userModel: model,
    filterModel: FILTER_MODEL,
    filteredPaths,
    ts: now,
  });
  session.topicId = THREAD_TOPIC_ID;

  saveSession(fn, session);

  return {
    session,
    lastTurn: session.turns[session.turns.length - 1],
    contextMode: 'repo',
  };
});

function isStaticPathAllowed(pathName) {
  const p = pathName.replace(/\\/g, '/');
  if (p.includes('..')) return false;
  const segs = p.split('/').filter(Boolean);
  if (segs[0] === 'server' || p.startsWith('server/')) return false;
  if (segs.includes('node_modules') || p.includes('node_modules/')) return false;
  if (segs[0] === '.git' || p.includes('/.git/')) return false;
  if (segs.some((s) => s.startsWith('.') || s === '.env' || s.endsWith('.env'))) return false;
  return true;
}

await app.register(fastifyStatic, {
  root: STATIC_ROOT,
  prefix: '/',
  index: ['index.html'],
  list: false,
  allowedPath: (pathName) => isStaticPathAllowed(pathName),
});

fs.mkdirSync(REPOS_ROOT, { recursive: true });
fs.mkdirSync(GLOBAL_CONTEXT_ROOT, { recursive: true });
fs.mkdirSync(PROJECTS_DIR, { recursive: true });

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`App: http://localhost:${PORT}/  (static from ${STATIC_ROOT})`);
    app.log.info(`API:  http://localhost:${PORT}/api/…`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
