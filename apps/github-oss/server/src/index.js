import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import simpleGit from 'simple-git';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** App root (`apps/github-oss`): HTML, data/, `.env` */
const APP_ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(APP_ROOT, '.env') });

const PORT = Number(process.env.PORT) || 3847;
const STATIC_ROOT = path.resolve(process.env.STATIC_ROOT || APP_ROOT);
/** Monorepo root (ragent.claude.sh, github-projects/). Default: two levels above apps/github-oss. */
const REPO_ROOT = path.resolve(
  process.env.REPO_ROOT || path.join(STATIC_ROOT, '..', '..'),
);
const RAGENT_CLAUDE_SH = path.join(REPO_ROOT, 'ragent.claude.sh');
const RAGENT_CURSOR_SH = path.join(REPO_ROOT, 'ragent.cursor.sh');
const AI_PROVIDERS = new Set(['openrouter', 'claude', 'cursor']);
const GITHUB_INSTALLER_SKILL = 'agents/dev/.claude/skills/github-installer/SKILL.md';
const GITHUB_OSS_SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills', 'github-oss');
const GITHUB_OSS_SKILLS_REL = '.claude/skills/github-oss';
const AI_CLONE_LOG_DIR = path.join(APP_ROOT, 'data', 'ai-clone-logs');
const INSTALL_TIMEOUT_MS = Number(process.env.AI_INSTALL_TIMEOUT_MS) || 45 * 60 * 1000;
const START_CONFIG_PATH = path.join(REPO_ROOT, 'start.config.jsonc');
const PROJECT_INIT_TIMEOUT_MS = Number(process.env.PROJECT_INIT_TIMEOUT_MS) || 30 * 60 * 1000;
const OR_KEY = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || '';
const GH_TOKENS = (process.env.GITHUB_TOKEN || '').split(',').map(s => s.trim()).filter(Boolean);
const GH_TOKEN = GH_TOKENS[0] || ''; // legacy single-token compat
const FILTER_MODEL = process.env.FILTER_MODEL || 'minimax/minimax-m2.5';
const KEYWORDS_MODEL = process.env.OPENROUTER_KEYWORDS_MODEL || 'google/gemini-2.5-flash';
const OR_API = 'https://openrouter.ai/api/v1';
/** Extra Cursor IDE model labels for Ask AI dropdown (comma-separated). */
const CURSOR_MODELS_EXTRA = (process.env.CURSOR_MODELS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
/** Extra Claude Code model ids for Ask AI dropdown (comma-separated). */
const CLAUDE_MODELS_EXTRA = (process.env.CLAUDE_MODELS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Display names aligned with Cursor's model picker (see cursor.com/docs/models); order = preferred defaults first. */
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

/** Claude Code `--model` values (aliases or full ids). */
const CLAUDE_BUILTIN_MODEL_LABELS = [
  'sonnet',
  'opus',
  'haiku',
  'claude-sonnet-4-5',
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-opus-4-5',
  'claude-haiku-4-5',
  'claude-haiku-4-6',
];

const MAX_KEYWORDS_FROM_AI = 20;
const MAX_KEYWORD_STRING_LEN = 120;

const MAX_PATHS_LIST = 2500;
const MAX_FILTERED_FILES = 25;
const MAX_BYTES_PER_FILE = 100_000;

const PROJECTS_DIR = path.join(STATIC_ROOT, 'data', 'projects');
const DEFAULT_COLLECTION_OUTPUT_FOLDER = 'research/docs';
const GITHUB_PROJECTS_ROOT = path.join(REPO_ROOT, 'github-projects');
const PROJECTS_INDEX_PATH = path.join(GITHUB_PROJECTS_ROOT, '!index.jsonc');
const DEFAULT_CLONE_COLLECTION = 'favourite';
const GP_COLLECTIONS_HIDDEN = new Set(['misc']);

/** Safe basename for data/projects/<fname>.json (slug only, no path segments). */
function assertSafeProjectFname(fname) {
  const s = String(fname || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(s)) {
    const e = new Error(
      'Invalid project file name — use lowercase letters, digits, dashes, underscores (e.g. content-factory_oss).',
    );
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
  const repoCount = Array.isArray(raw.repos)
    ? raw.repos.filter((r) => !(r && r.deleted)).length
    : raw.repoCount != null
      ? Number(raw.repoCount)
      : 0;
  return {
    _fname,
    schemaVersion: raw.schemaVersion ?? 1,
    name: raw.name || _fname,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    languages: Array.isArray(raw.languages) ? raw.languages : [],
    repoCount: Number.isFinite(repoCount) ? repoCount : 0,
    topLangs: Array.isArray(raw.topLangs) ? raw.topLangs : [],
    createdAt: raw.createdAt || '',
    seeded: !!raw.seeded,
    searchOptions: raw.searchOptions && typeof raw.searchOptions === 'object' ? raw.searchOptions : undefined,
    keywordCounts:
      raw.keywordCounts && typeof raw.keywordCounts === 'object' && !Array.isArray(raw.keywordCounts)
        ? raw.keywordCounts
        : {},
    partial: !!raw.partial,
    searchError: String(raw.searchError || ''),
    deleted: !!raw.deleted,
    deletedAt: raw.deletedAt || '',
  };
}

/** Parse JSONC (JSON with // comments) safely preserving URLs inside strings. */
function parseJsonc(text) {
  return JSON.parse(
    text.replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*/g, (m, str) => str ?? ''),
  );
}

function assertSafeCollectionName(name) {
  const s = String(name || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(s) || GP_COLLECTIONS_HIDDEN.has(s)) {
    const e = new Error('Invalid collection name');
    e.statusCode = 400;
    throw e;
  }
  return s;
}

function sanitizeRelativeOutputFolder(raw) {
  const s = String(raw || DEFAULT_COLLECTION_OUTPUT_FOLDER).trim().replace(/\\/g, '/');
  if (!s || s.includes('..')) {
    const e = new Error('Invalid output folder');
    e.statusCode = 400;
    throw e;
  }
  const norm = path.normalize(s).replace(/^(\.\/)+/, '');
  if (norm.startsWith('..') || path.isAbsolute(norm)) {
    const e = new Error('Invalid output folder');
    e.statusCode = 400;
    throw e;
  }
  return norm;
}

function resolveCollectionOutputDir(outputFolder) {
  const rel = sanitizeRelativeOutputFolder(outputFolder);
  const dir = path.resolve(REPO_ROOT, rel);
  const rootNorm = path.normalize(REPO_ROOT + path.sep);
  if (!dir.startsWith(rootNorm)) {
    const e = new Error('Output folder must be under repository root');
    e.statusCode = 400;
    throw e;
  }
  return dir;
}

function buildCollectionAskContext(collectionName, detail, clientRepos) {
  const lines = [
    `# GitHub collection: ${collectionName}`,
    '',
    `Projects on disk: ${detail.projectCount}`,
    '',
  ];
  const clientByFn = new Map();
  if (Array.isArray(clientRepos)) {
    for (const r of clientRepos) {
      const fn = String(r.full_name || r.fullName || '').trim();
      if (fn) clientByFn.set(fn.toLowerCase(), r);
    }
  }
  const seen = new Set();
  for (const p of detail.projects) {
    const fn = p.fullName || '';
    const key = (fn || p.projectDir).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const cr = fn ? clientByFn.get(fn.toLowerCase()) : null;
    lines.push(`## ${fn || p.projectDir}`);
    if (p.github) lines.push(`- GitHub: ${p.github}`);
    lines.push(`- Installed on disk: ${p.installed ? 'yes' : 'no'}`);
    if (cr) {
      if (cr.description) lines.push(`- Description: ${String(cr.description).slice(0, 500)}`);
      if (cr.language) lines.push(`- Language: ${cr.language}`);
      if (cr.stars != null) lines.push(`- Stars: ${cr.stars}`);
    }
    lines.push('');
  }
  for (const [fn, cr] of clientByFn) {
    if (seen.has(fn)) continue;
    lines.push(`## ${cr.full_name || fn}`);
    if (cr.description) lines.push(`- Description: ${String(cr.description).slice(0, 500)}`);
    lines.push('');
  }
  return lines.join('\n').slice(0, 120000);
}

function collectionAskFileName(collectionName) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safe = String(collectionName).replace(/[^a-z0-9_-]+/gi, '-');
  return `${safe}-ask-${ts}.md`;
}

function writeCollectionAskMarkdown(outputDir, collectionName, userPrompt, answer, meta = {}) {
  fs.mkdirSync(outputDir, { recursive: true });
  const fileName = collectionAskFileName(collectionName);
  const filePath = path.join(outputDir, fileName);
  const relFolder = path.relative(REPO_ROOT, outputDir).replace(/\\/g, '/');
  const md = [
    `# Collection ask: ${collectionName}`,
    '',
    `**Saved:** ${new Date().toISOString()}`,
    `**Folder:** \`${relFolder}/\``,
    ...(meta.provider ? [`**Provider:** ${meta.provider}`, `**Model:** ${meta.model || '—'}`] : []),
    '',
    '## Question',
    '',
    userPrompt,
    '',
    '## Answer',
    '',
    answer,
    '',
  ].join('\n');
  fs.writeFileSync(filePath, md, 'utf8');
  return {
    filePath,
    fileName,
    relativePath: path.join(relFolder, fileName).replace(/\\/g, '/'),
    outputFolder: relFolder,
  };
}

function assertSafeProjectDirName(name) {
  const s = String(name || '').trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(s)) {
    const e = new Error('Invalid project directory name');
    e.statusCode = 400;
    throw e;
  }
  return s;
}

function projectDirFromFullName(fullName) {
  const parts = String(fullName || '').trim().split('/');
  return assertSafeProjectDirName(parts[1] || parts[0].replace(/\//g, '__'));
}

function repoDirInCollection(collection, projectDir) {
  const coll = assertSafeCollectionName(collection);
  const proj = assertSafeProjectDirName(projectDir);
  const projectRoot = path.join(GITHUB_PROJECTS_ROOT, coll, proj);
  const normRoot = path.normalize(projectRoot);
  if (!normRoot.startsWith(path.normalize(GITHUB_PROJECTS_ROOT + path.sep))) {
    const e = new Error('Path escapes github-projects');
    e.statusCode = 400;
    throw e;
  }
  return path.join(projectRoot, 'repo');
}

function projectRootInCollection(collection, projectDir) {
  return path.dirname(repoDirInCollection(collection, projectDir));
}

function listGithubProjectCollections() {
  if (!fs.existsSync(GITHUB_PROJECTS_ROOT)) return [];
  return fs
    .readdirSync(GITHUB_PROJECTS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !GP_COLLECTIONS_HIDDEN.has(d.name))
    .map((d) => d.name)
    .sort((a, b) => {
      if (a === DEFAULT_CLONE_COLLECTION) return -1;
      if (b === DEFAULT_CLONE_COLLECTION) return 1;
      return a.localeCompare(b);
    });
}

function listProjectsInCollection(collection) {
  const coll = assertSafeCollectionName(collection);
  const dir = path.join(GITHUB_PROJECTS_ROOT, coll);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

/** Projects under github-projects/<collection>/ with index + install metadata. */
function listCollectionProjectsDetail(collection) {
  const coll = assertSafeCollectionName(collection);
  const indexByDir = {};
  for (const e of readGithubProjectsIndex()) {
    if (String(e.collection || '') !== coll || !e.progect_name) continue;
    const m = String(e.github || '').match(/github\.com\/([^/?#]+\/[^/?#.]+)/i);
    indexByDir[e.progect_name] = {
      fullName: m ? m[1] : '',
      github: e.github || '',
    };
  }
  return listProjectsInCollection(coll).map((projectDir) => {
    const idx = indexByDir[projectDir] || {};
    const repoDir = repoDirInCollection(coll, projectDir);
    const installed = fs.existsSync(path.join(repoDir, '.git'));
    return {
      projectDir,
      fullName: idx.fullName || '',
      github: idx.github || (idx.fullName ? githubUrlFromFullName(idx.fullName) : ''),
      installed,
    };
  });
}

function describeCollection(name) {
  const coll = assertSafeCollectionName(name);
  const projects = listCollectionProjectsDetail(coll);
  return { name: coll, projects, projectCount: projects.length };
}

function readGithubProjectsIndex() {
  if (!fs.existsSync(PROJECTS_INDEX_PATH)) return [];
  try {
    return parseJsonc(fs.readFileSync(PROJECTS_INDEX_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function githubUrlFromFullName(fullName) {
  return `https://github.com/${String(fullName || '').trim()}`;
}

function upsertGithubProjectsIndexEntry({ collection, progect_name, github }) {
  const coll = assertSafeCollectionName(collection);
  const proj = assertSafeProjectDirName(progect_name);
  const url = String(github || '').trim();
  if (!url) return;
  const entries = readGithubProjectsIndex();
  const list = Array.isArray(entries) ? [...entries] : [];
  const slug = url.match(/github\.com\/([^/?#]+\/[^/?#.]+)/i)?.[1]?.toLowerCase();
  let found = false;
  for (const e of list) {
    const eSlug = String(e.github || '')
      .match(/github\.com\/([^/?#]+\/[^/?#.]+)/i)?.[1]
      ?.toLowerCase();
    if ((slug && eSlug === slug) || e.progect_name === proj) {
      e.collection = coll;
      e.progect_name = proj;
      e.github = url;
      found = true;
      break;
    }
  }
  if (!found) {
    list.push({
      progect_name: proj,
      collection: coll,
      github: url,
      languages: [],
      description: '',
    });
  }
  fs.mkdirSync(path.dirname(PROJECTS_INDEX_PATH), { recursive: true });
  fs.writeFileSync(PROJECTS_INDEX_PATH, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
}

function findInstalledProject(fullName) {
  const fn = String(fullName || '').trim().toLowerCase();
  if (!fn.includes('/')) return null;

  try {
    const entries = readGithubProjectsIndex();
    for (const e of Array.isArray(entries) ? entries : []) {
      if (!e.github || !e.collection || !e.progect_name) continue;
      const m = String(e.github).match(/github\.com\/([^/?#]+\/[^/?#.]+)/i);
      if (!m || m[1].toLowerCase() !== fn) continue;
      const repoDir = repoDirInCollection(e.collection, e.progect_name);
      if (fs.existsSync(path.join(repoDir, '.git'))) {
        return {
          collection: e.collection,
          projectDir: e.progect_name,
          repoDir,
          projectRoot: projectRootInCollection(e.collection, e.progect_name),
        };
      }
    }
  } catch { /* scan below */ }

  const projectDir = projectDirFromFullName(fullName);
  for (const collection of listGithubProjectCollections()) {
    const repoDir = repoDirInCollection(collection, projectDir);
    if (fs.existsSync(path.join(repoDir, '.git'))) {
      return {
        collection,
        projectDir,
        repoDir,
        projectRoot: projectRootInCollection(collection, projectDir),
      };
    }
  }

  const miscDir = path.join(GITHUB_PROJECTS_ROOT, 'misc', projectDir, 'repo');
  if (fs.existsSync(path.join(miscDir, '.git'))) {
    return {
      collection: 'misc',
      projectDir,
      repoDir: miscDir,
      projectRoot: path.dirname(miscDir),
    };
  }
  return null;
}

/**
 * Target clone path: existing install, else favourite/<repo-name>/repo, else misc.
 */
function repoPath(fullName) {
  const installed = findInstalledProject(fullName);
  if (installed) return installed.repoDir;
  try {
    return repoDirInCollection(DEFAULT_CLONE_COLLECTION, projectDirFromFullName(fullName));
  } catch {
    const repoName = fullName.split('/')[1] || fullName.replace('/', '__');
    return path.join(GITHUB_PROJECTS_ROOT, 'misc', repoName, 'repo');
  }
}

function repoIsInstalledAt(dir) {
  return fs.existsSync(path.join(dir, '.git'));
}

function safeLogSlug(fullName) {
  return String(fullName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '__')
    .slice(0, 120);
}

function buildGithubInstallerPrompt(fullName, opts = {}) {
  const lines = [
    `Run the github-installer skill at ${GITHUB_INSTALLER_SKILL}.`,
    '',
    `Target repository: ${fullName}`,
    `GitHub URL: https://github.com/${fullName}`,
  ];
  const slug = String(opts.searchProjectSlug || '').trim();
  const pname = String(opts.projectName || '').trim();
  const collection = String(opts.collection || '').trim();
  const projectDir = String(opts.projectDir || '').trim();
  if (collection) {
    lines.push(`Target collection: github-projects/${collection}/`);
    if (projectDir) lines.push(`Target project folder: ${projectDir}`);
    lines.push(`Clone into: github-projects/${collection}/${projectDir || '<repo-name>'}/repo`);
  }
  if (slug) lines.push(`OSS search project slug (collection hint): ${slug}`);
  if (pname) lines.push(`OSS project display name: ${pname}`);
  lines.push(
    '',
    'Create github-projects/{collection}/{project}/repo layout and {project}.init.sh (clone/pull + deps).',
    'Use start.config.jsonc: path github-projects/{collection}/{project}/repo, init bash ../{project}.init.sh.',
    'After writing {project}.init.sh, run: bash github-projects/{collection}/{project}/{project}.init.sh',
    '',
    'Complete all github-installer skill steps for this repository.',
  );
  return lines.join('\n');
}

function normalizeAiProvider(raw) {
  const p = String(raw || 'openrouter')
    .toLowerCase()
    .replace(/_/g, '-');
  if (p === 'claude-code') return 'claude';
  return p;
}

function assertSafeSkillName(name) {
  const s = String(name || '').trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(s)) {
    const e = new Error('Invalid skill name');
    e.statusCode = 400;
    throw e;
  }
  return s;
}

function githubOssSkillPath(name) {
  const safe = assertSafeSkillName(name);
  const skillDir = path.join(GITHUB_OSS_SKILLS_DIR, safe);
  const skillPath = path.join(skillDir, 'SKILL.md');
  const rootNorm = path.normalize(GITHUB_OSS_SKILLS_DIR + path.sep);
  const skillNorm = path.normalize(skillPath);
  if (!skillNorm.startsWith(rootNorm)) {
    const e = new Error('Skill path escapes github-oss skills folder');
    e.statusCode = 400;
    throw e;
  }
  return { name: safe, skillDir, skillPath };
}

function titleFromSkillContent(content, fallback) {
  const text = String(content || '');
  const frontmatterName = text.match(/^---\s*[\s\S]*?\bname:\s*["']?([^"'\n]+)["']?\s*[\s\S]*?---/);
  if (frontmatterName) return frontmatterName[1].trim();
  const heading = text.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

function readGithubOssSkills() {
  if (!fs.existsSync(GITHUB_OSS_SKILLS_DIR)) return [];
  return fs
    .readdirSync(GITHUB_OSS_SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      try {
        const { name, skillPath } = githubOssSkillPath(entry.name);
        if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isFile()) return null;
        const content = fs.readFileSync(skillPath, 'utf8');
        return {
          name,
          title: titleFromSkillContent(content, name),
          relativePath: `${GITHUB_OSS_SKILLS_REL}/${name}/SKILL.md`,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title) || a.name.localeCompare(b.name));
}

function ragentScriptBasename(which) {
  return which === 'cursor' ? 'ragent.cursor.sh' : 'ragent.claude.sh';
}

function ragentScriptPath(which) {
  return which === 'cursor' ? RAGENT_CURSOR_SH : RAGENT_CLAUDE_SH;
}

function assertRagentAvailable(which = 'claude') {
  const script = ragentScriptPath(which);
  if (!fs.existsSync(script)) {
    const e = new Error(`${ragentScriptBasename(which)} not found at ${script}`);
    e.statusCode = 503;
    throw e;
  }
}

function repoIsInstalled(fullName) {
  const installed = findInstalledProject(fullName);
  if (installed) return repoIsInstalledAt(installed.repoDir);
  return repoIsInstalledAt(repoPath(fullName));
}

function openAiRagentLog(fullName, label) {
  const logSlug = safeLogSlug(fullName);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(AI_CLONE_LOG_DIR, { recursive: true });
  const logFile = path.join(AI_CLONE_LOG_DIR, `${logSlug}__${label}__${ts}.log`);
  const logFd = fs.openSync(logFile, 'a');
  fs.writeSync(logFd, `[github-oss] ${label} ${new Date().toISOString()} ${fullName}\n`);
  return { logFile, logFd };
}

function ragentShellCommand(which, ragentArgs) {
  const script = ragentScriptBasename(which);
  const parts = [`./${script}`, ...ragentArgs].map((a) => JSON.stringify(a));
  return `cd ${JSON.stringify(REPO_ROOT)} && bash ${parts.join(' ')}`;
}

function spawnRagentDetached(which, ragentArgs, { fullName, label }) {
  assertRagentAvailable(which);
  const script = ragentScriptBasename(which);
  const { logFile, logFd } = openAiRagentLog(fullName, label);
  const child = spawn('bash', [script, ...ragentArgs], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env },
  });
  child.unref();
  fs.closeSync(logFd);
  return {
    pid: child.pid,
    logFile,
    command: ragentShellCommand(which, ragentArgs),
    repoRoot: REPO_ROOT,
    ragent: script,
    ...(which === 'claude' && label === 'github-installer' ? { skill: GITHUB_INSTALLER_SKILL } : {}),
  };
}

function runRagentSync(which, ragentArgs, { fullName, label }) {
  assertRagentAvailable(which);
  const script = ragentScriptBasename(which);
  const { logFile, logFd } = openAiRagentLog(fullName, label);
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [script, ...ragentArgs], {
      cwd: REPO_ROOT,
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env },
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`ragent timed out after ${INSTALL_TIMEOUT_MS}ms (log: ${logFile})`));
    }, INSTALL_TIMEOUT_MS);
    child.on('error', (err) => {
      clearTimeout(timer);
      fs.closeSync(logFd);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      fs.closeSync(logFd);
      if (code === 0) {
        resolve({ logFile, command: ragentShellCommand(which, ragentArgs) });
        return;
      }
      reject(new Error(`ragent exited with code ${code} (log: ${logFile})`));
    });
  });
}

function buildRagentAskArgs(which, workspaceDir, prompt, agentModel) {
  const absWorkspace = path.resolve(workspaceDir);
  const args =
    which === 'cursor'
      ? ['--workspace', absWorkspace, '--trust', '-p', prompt]
      : [
          '--add-dir',
          path.relative(REPO_ROOT, absWorkspace).replace(/\\/g, '/') || '.',
          '-p',
          prompt,
        ];
  if (agentModel) {
    args.splice(args.length - 2, 0, '--model', agentModel);
  }
  return args;
}

function launchRagentAsk(which, { workspaceDir, prompt, fullName, label, agentModel }) {
  const ragentArgs = buildRagentAskArgs(which, workspaceDir, prompt, agentModel);
  const launched = spawnRagentDetached(which, ragentArgs, { fullName, label });
  return { ...launched, agentModel: agentModel || null };
}

async function runGithubInstaller(fullName, opts = {}, { sync = false } = {}) {
  const prompt = buildGithubInstallerPrompt(fullName, opts);
  const ragentArgs = ['-p', prompt];
  if (sync) {
    return runRagentSync('claude', ragentArgs, { fullName, label: 'github-installer' });
  }
  return spawnRagentDetached('claude', ragentArgs, { fullName, label: 'github-installer' });
}

function readStartConfigServices() {
  if (!fs.existsSync(START_CONFIG_PATH)) return [];
  try {
    const config = parseJsonc(fs.readFileSync(START_CONFIG_PATH, 'utf8'));
    return Array.isArray(config.services) ? config.services : [];
  } catch {
    return [];
  }
}

/** start.config.jsonc github-project for github-projects/<collection>/<projectDir>/repo */
function findGithubProjectService(collection, projectDir) {
  const relPath = `github-projects/${collection}/${projectDir}/repo`.replace(/\\/g, '/');
  for (const s of readStartConfigServices()) {
    if (String(s.type || '') !== 'github-project') continue;
    const p = String(s.path || '').replace(/\\/g, '/');
    if (p === relPath) return s;
  }
  return null;
}

/** Run bash ../{project}.init.sh from repo cwd (same as rinit / start.config init). */
function runGithubProjectInitFromConfig(collection, projectDir, fullName) {
  const service = findGithubProjectService(collection, projectDir);
  const initCmd = String(service?.init || '').trim();
  if (!initCmd) return Promise.resolve(null);

  const repoDir = repoDirInCollection(collection, projectDir);
  fs.mkdirSync(repoDir, { recursive: true });
  const { logFile, logFd } = openAiRagentLog(fullName, 'project-init');

  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', initCmd], {
      cwd: repoDir,
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env },
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`project init timed out after ${PROJECT_INIT_TIMEOUT_MS}ms (log: ${logFile})`));
    }, PROJECT_INIT_TIMEOUT_MS);
    child.on('error', (err) => {
      clearTimeout(timer);
      fs.closeSync(logFd);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      fs.closeSync(logFd);
      if (code === 0) {
        resolve({ logFile, serviceName: service.name, initCmd });
        return;
      }
      reject(new Error(`project init exited with code ${code} (log: ${logFile})`));
    });
  });
}

/** Install via github-installer skill when missing; shallow pull when already cloned. */
async function ensureRepoInstalled(fullName, opts = {}, branch = null) {
  const dir = repoPath(fullName);
  if (repoIsInstalled(fullName)) {
    return ensureClone(fullName, branch);
  }
  await runGithubInstaller(fullName, opts, { sync: true });
  if (!repoIsInstalled(fullName)) {
    const e = new Error(
      `github-installer completed but ${fullName} is not at ${dir}. Check logs under ${AI_CLONE_LOG_DIR}`,
    );
    e.statusCode = 500;
    throw e;
  }
  return dir;
}

async function ensureCloneAt(dir, fullName, branch) {
  fs.mkdirSync(dir, { recursive: true });
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
  if (fs.existsSync(path.join(dir, '.git'))) {
    ensureDefaultNotesForInstalledRepo(fullName);
  }
  return dir;
}

async function ensureClone(fullName, branch) {
  return ensureCloneAt(repoPath(fullName), fullName, branch);
}

/**
 * Clone or move github-projects/<collection>/<project>/repo.
 * Moves the whole project folder when already installed under another collection.
 */
async function installRepoToCollection(fullName, collection, opts = {}) {
  const fn = String(fullName || '').trim();
  if (!/^[^/\s]+\/[^/\s]+$/.test(fn)) {
    const e = new Error('fullName must be owner/repo');
    e.statusCode = 400;
    throw e;
  }
  const coll = assertSafeCollectionName(collection || DEFAULT_CLONE_COLLECTION);
  const projectDir = projectDirFromFullName(fn);
  const targetRepoDir = repoDirInCollection(coll, projectDir);
  const targetProjectRoot = projectRootInCollection(coll, projectDir);

  const existing = findInstalledProject(fn);
  let moved = false;
  if (existing && path.resolve(existing.repoDir) !== path.resolve(targetRepoDir)) {
    if (fs.existsSync(targetProjectRoot)) {
      const e = new Error(`Project folder already exists: ${targetProjectRoot}`);
      e.statusCode = 409;
      throw e;
    }
    fs.mkdirSync(path.dirname(targetProjectRoot), { recursive: true });
    fs.renameSync(existing.projectRoot, targetProjectRoot);
    moved = true;
  } else {
    fs.mkdirSync(targetRepoDir, { recursive: true });
  }

  if (!repoIsInstalledAt(targetRepoDir)) {
    await runGithubInstaller(
      fn,
      {
        searchProjectSlug: opts.searchProjectSlug,
        projectName: opts.projectName,
        collection: coll,
        projectDir,
      },
      { sync: true },
    );
    if (!repoIsInstalledAt(targetRepoDir)) {
      const e = new Error(
        `github-installer completed but ${fn} is not at ${targetRepoDir}. Check logs under ${AI_CLONE_LOG_DIR}`,
      );
      e.statusCode = 500;
      throw e;
    }
  } else {
    await ensureCloneAt(targetRepoDir, fn, opts.branch || null);
    const configured = findGithubProjectService(coll, projectDir);
    if (configured?.init) {
      await runGithubProjectInitFromConfig(coll, projectDir, fn);
    }
  }

  upsertGithubProjectsIndexEntry({
    collection: coll,
    progect_name: projectDir,
    github: githubUrlFromFullName(fn),
  });

  ensureDefaultNotesFile(coll, projectDir, fn);

  return {
    ok: true,
    fullName: fn,
    collection: coll,
    projectDir,
    path: targetRepoDir,
    moved,
    fromCollection: moved ? existing.collection : null,
    cloned: repoIsInstalledAt(targetRepoDir),
  };
}

function repoDocsDir(collection, projectDir) {
  return path.join(projectRootInCollection(collection, projectDir), 'docs');
}

/** Not shown as UI tabs — structured sidecars only. */
const INTERNAL_DOC_FILES = new Set(['session.json', 'notes.json', 'notes-log.md']);

function sanitizeDocFileName(name) {
  const base = path.basename(String(name || '').trim());
  if (!base || base.includes('..') || !/^[\w.-]+\.md$/i.test(base)) return null;
  return base;
}

function listRepoDocTabFiles(collection, projectDir) {
  const dir = repoDocsDir(collection, projectDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !INTERNAL_DOC_FILES.has(f))
    .map((name) => {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      return { name, mtime: st.mtimeMs, size: st.size };
    })
    .sort((a, b) => a.mtime - b.mtime);
}

function allocateNewRepoDocFile(collection, projectDir) {
  const docsDir = repoDocsDir(collection, projectDir);
  fs.mkdirSync(docsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').slice(0, 19);
  let name = `qa-${ts}.md`;
  let n = 1;
  while (fs.existsSync(path.join(docsDir, name))) {
    name = `qa-${ts}-${n}.md`;
    n += 1;
  }
  return name;
}

function readRepoDocFileContent(collection, projectDir, docFile) {
  const safe = sanitizeDocFileName(docFile);
  if (!safe) return null;
  const docsDir = repoDocsDir(collection, projectDir);
  const p = path.join(docsDir, safe);
  if (fs.existsSync(p)) return { name: safe, content: fs.readFileSync(p, 'utf8') };
  if (/^readme\.md$/i.test(safe) && fs.existsSync(docsDir)) {
    for (const f of fs.readdirSync(docsDir)) {
      if (/^readme\.md$/i.test(f)) {
        return { name: f, content: fs.readFileSync(path.join(docsDir, f), 'utf8') };
      }
    }
  }
  return { name: safe, content: '' };
}

function appendRepoDocAiTurn(fullName, docFile, turn, opts = {}) {
  const { fullName: fn, collection, projectDir } = resolveRepoDocsPlacement(fullName, opts);
  const docsDir = repoDocsDir(collection, projectDir);
  fs.mkdirSync(docsDir, { recursive: true });
  let safe = sanitizeDocFileName(docFile);
  if (!safe) safe = allocateNewRepoDocFile(collection, projectDir);
  const filePath = path.join(docsDir, safe);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `# ${fn}\n\n`, 'utf8');
  }
  const entry = { ...turn, ts: turn.ts || new Date().toISOString() };
  fs.appendFileSync(filePath, formatRepoAiTurnMarkdown(entry), 'utf8');
  return {
    docFile: safe,
    content: fs.readFileSync(filePath, 'utf8'),
    collection,
    projectDir,
    docsPath: docsDir,
    fullName: fn,
  };
}

function repoAiSessionPath(collection, projectDir) {
  return path.join(repoDocsDir(collection, projectDir), 'session.json');
}

function repoAiLogMdPath(collection, projectDir) {
  return path.join(repoDocsDir(collection, projectDir), 'qa-log.md');
}

function loadRepoAiSessionFromPlacement({ collection, projectDir, fullName }) {
  const sessionPath = repoAiSessionPath(collection, projectDir);
  if (!fs.existsSync(sessionPath)) {
    return {
      fullName: fullName || '',
      collection,
      projectDir,
      turns: [],
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    const turns = Array.isArray(raw.turns) ? raw.turns : [];
    return {
      fullName: raw.fullName || fullName || '',
      collection: raw.collection || collection,
      projectDir: raw.projectDir || projectDir,
      turns,
    };
  } catch {
    return { fullName: fullName || '', collection, projectDir, turns: [] };
  }
}

function loadRepoAiSession(fullName) {
  const installed = findInstalledProject(fullName);
  if (!installed) return null;
  return loadRepoAiSessionFromPlacement({
    collection: installed.collection,
    projectDir: installed.projectDir,
    fullName,
  });
}

function formatRepoAiTurnMarkdown(turn) {
  const ts = turn.ts || new Date().toISOString();
  const model = turn.userModel || turn.provider || '—';
  return `\n\n## ${ts}\n\n**Model:** ${model}\n\n**Q:** ${turn.prompt || ''}\n\n**A:**\n\n${turn.content || ''}\n\n---\n`;
}

function resolveRepoDocsPlacement(fullName, opts = {}) {
  const fn = String(fullName || '').trim();
  let collection = String(opts.collection || '').trim();
  let projectDir = String(opts.projectDir || '').trim();
  const installed = findInstalledProject(fn);
  if (installed) {
    collection = installed.collection;
    projectDir = installed.projectDir;
  } else {
    if (!collection) collection = DEFAULT_CLONE_COLLECTION;
    if (!projectDir) {
      try {
        projectDir = projectDirFromFullName(fn);
      } catch {
        projectDir = fn.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'project';
      }
    }
  }
  return { fullName: fn, collection, projectDir };
}

function appendRepoAiTurn(fullName, turn, opts = {}) {
  const { fullName: fn, collection, projectDir } = resolveRepoDocsPlacement(fullName, opts);
  const docsDir = repoDocsDir(collection, projectDir);
  fs.mkdirSync(docsDir, { recursive: true });
  const session = loadRepoAiSessionFromPlacement({ collection, projectDir, fullName: fn });
  const entry = {
    ...turn,
    ts: turn.ts || new Date().toISOString(),
  };
  session.turns.push(entry);
  session.fullName = fn;
  session.collection = collection;
  session.projectDir = projectDir;
  fs.writeFileSync(repoAiSessionPath(collection, projectDir), JSON.stringify(session, null, 2), 'utf8');
  fs.appendFileSync(repoAiLogMdPath(collection, projectDir), formatRepoAiTurnMarkdown(entry), 'utf8');
  return { session, collection, projectDir, docsPath: docsDir };
}

function defaultNotesMdContent(fullName) {
  const fn = String(fullName || '').trim();
  const ts = new Date().toISOString();
  return `# Notes — ${fn}\n\n<!-- Created ${ts} — edit freely -->\n\n`;
}

/** Create docs/notes.md for every cloned project (idempotent). */
function ensureDefaultNotesFile(collection, projectDir, fullName) {
  const docsDir = repoDocsDir(collection, projectDir);
  fs.mkdirSync(docsDir, { recursive: true });
  const notesMdPath = path.join(docsDir, 'notes.md');
  if (!fs.existsSync(notesMdPath)) {
    fs.writeFileSync(notesMdPath, defaultNotesMdContent(fullName), 'utf8');
    return true;
  }
  return false;
}

function ensureDefaultNotesForInstalledRepo(fullName) {
  const installed = findInstalledProject(fullName);
  if (!installed || !repoIsInstalledAt(installed.repoDir)) return false;
  return ensureDefaultNotesFile(installed.collection, installed.projectDir, fullName);
}

function repoNotesPath(collection, projectDir) {
  return path.join(repoDocsDir(collection, projectDir), 'notes.json');
}

function repoNotesLogPath(collection, projectDir) {
  return path.join(repoDocsDir(collection, projectDir), 'notes-log.md');
}

function loadRepoNotesFromPlacement({ collection, projectDir, fullName }) {
  const notesPath = repoNotesPath(collection, projectDir);
  if (!fs.existsSync(notesPath)) {
    return { fullName: fullName || '', collection, projectDir, notes: [] };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
    const notes = Array.isArray(raw.notes) ? raw.notes : [];
    return {
      fullName: raw.fullName || fullName || '',
      collection: raw.collection || collection,
      projectDir: raw.projectDir || projectDir,
      notes,
    };
  } catch {
    return { fullName: fullName || '', collection, projectDir, notes: [] };
  }
}

function loadRepoNotes(fullName) {
  const installed = findInstalledProject(fullName);
  if (installed) {
    return loadRepoNotesFromPlacement({
      collection: installed.collection,
      projectDir: installed.projectDir,
      fullName,
    });
  }
  try {
    const { collection, projectDir } = resolveRepoDocsPlacement(fullName, {});
    if (fs.existsSync(repoNotesPath(collection, projectDir))) {
      return loadRepoNotesFromPlacement({ collection, projectDir, fullName });
    }
  } catch { /* no placement */ }
  return null;
}

function formatRepoNoteMarkdown(note) {
  const ts = note.ts || new Date().toISOString();
  return `\n\n## ${ts}\n\n${note.text || ''}\n\n---\n`;
}

function appendRepoNote(fullName, text, opts = {}) {
  const body = String(text || '').trim();
  if (!body) {
    const e = new Error('Note text is required');
    e.statusCode = 400;
    throw e;
  }
  const { fullName: fn, collection, projectDir } = resolveRepoDocsPlacement(fullName, opts);
  const docsDir = repoDocsDir(collection, projectDir);
  fs.mkdirSync(docsDir, { recursive: true });
  const store = loadRepoNotesFromPlacement({ collection, projectDir, fullName: fn });
  const note = {
    id: `n_${Date.now().toString(36)}`,
    text: body,
    ts: new Date().toISOString(),
  };
  store.notes.push(note);
  store.fullName = fn;
  store.collection = collection;
  store.projectDir = projectDir;
  fs.writeFileSync(repoNotesPath(collection, projectDir), JSON.stringify(store, null, 2), 'utf8');
  fs.appendFileSync(repoNotesLogPath(collection, projectDir), formatRepoNoteMarkdown(note), 'utf8');
  ensureDefaultNotesFile(collection, projectDir, fn);
  const notesMdPath = path.join(docsDir, 'notes.md');
  fs.appendFileSync(notesMdPath, formatRepoNoteMarkdown(note), 'utf8');
  return {
    note,
    collection,
    projectDir,
    docsPath: docsDir,
    notes: store.notes,
    docFile: 'notes.md',
  };
}

function cloneStatusForRepo(fullName) {
  const installed = findInstalledProject(fullName);
  if (!installed || !repoIsInstalledAt(installed.repoDir)) {
    return {
      installed: false,
      collection: '',
      projectDir: '',
      aiTurnCount: 0,
      docFileCount: 0,
    };
  }
  ensureDefaultNotesFile(installed.collection, installed.projectDir, fullName);
  const session = loadRepoAiSessionFromPlacement({
    collection: installed.collection,
    projectDir: installed.projectDir,
    fullName,
  });
  const docFiles = listRepoDocTabFiles(installed.collection, installed.projectDir);
  return {
    installed: true,
    collection: installed.collection,
    projectDir: installed.projectDir,
    aiTurnCount: session.turns.length,
    docFileCount: docFiles.length,
  };
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

app.get('/api/collections', async () => {
  const names = listGithubProjectCollections();
  const collections = names.map((name) => describeCollection(name));
  return { collections, defaultCollection: DEFAULT_CLONE_COLLECTION };
});

app.get('/api/collections/:name', async (req, reply) => {
  try {
    return describeCollection(req.params.name);
  } catch (e) {
    reply.code(e.statusCode || 400);
    return { error: e.message || 'Invalid collection' };
  }
});

app.post('/api/collections', async (req, reply) => {
  const name = String((req.body || {}).name || '').trim();
  try {
    const coll = assertSafeCollectionName(name);
    const dir = path.join(GITHUB_PROJECTS_ROOT, coll);
    if (fs.existsSync(dir)) {
      reply.code(409);
      return { error: `Collection "${coll}" already exists` };
    }
    fs.mkdirSync(dir, { recursive: true });
    return { ok: true, name: coll, path: dir };
  } catch (e) {
    reply.code(e.statusCode || 400);
    return { error: e.message || 'Invalid collection name' };
  }
});

app.get('/api/repos/ai-session', async (req, reply) => {
  const fullName = String(req.query?.fullName || '').trim();
  if (!fullName || !/^[^/\s]+\/[^/\s]+$/.test(fullName)) {
    reply.code(400);
    return { error: 'fullName query param required (owner/repo)' };
  }
  const session = loadRepoAiSession(fullName);
  if (!session) {
    return {
      fullName,
      collection: '',
      projectDir: '',
      turns: [],
      docsPath: null,
    };
  }
  return {
    ...session,
    docsPath: repoDocsDir(session.collection, session.projectDir),
  };
});

app.get('/api/repos/docs', async (req, reply) => {
  const fullName = String(req.query?.fullName || '').trim();
  if (!fullName || !/^[^/\s]+\/[^/\s]+$/.test(fullName)) {
    reply.code(400);
    return { error: 'fullName query param required (owner/repo)' };
  }
  try {
    const { collection, projectDir } = resolveRepoDocsPlacement(fullName, {
      collection: req.query?.collection,
      projectDir: req.query?.projectDir,
    });
    const files = listRepoDocTabFiles(collection, projectDir);
    return {
      fullName,
      collection,
      projectDir,
      files,
      docsPath: repoDocsDir(collection, projectDir),
    };
  } catch (e) {
    reply.code(400);
    return { error: e.message || 'Invalid placement' };
  }
});

app.get('/api/repos/docs/file', async (req, reply) => {
  const fullName = String(req.query?.fullName || '').trim();
  const docFile = String(req.query?.file || '').trim();
  if (!fullName || !docFile) {
    reply.code(400);
    return { error: 'fullName and file query params required' };
  }
  try {
    const { collection, projectDir } = resolveRepoDocsPlacement(fullName, {
      collection: req.query?.collection,
      projectDir: req.query?.projectDir,
    });
    const read = readRepoDocFileContent(collection, projectDir, docFile);
    if (!read) {
      reply.code(400);
      return { error: 'Invalid doc file name' };
    }
    return {
      fullName,
      collection,
      projectDir,
      file: read.name,
      content: read.content,
      docsPath: repoDocsDir(collection, projectDir),
    };
  } catch (e) {
    reply.code(400);
    return { error: e.message || 'Failed to read doc file' };
  }
});

/* ── GitHub API proxy (token stays server-side) ─────────────────────── */

// Per-token rate-limit reset timestamps (ms). Cleared once elapsed.
const ghTokenResetAt = new Map();

function ghMakeHeaders(token) {
  const h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function ghEarliestResetMs() {
  let min = Infinity;
  for (const ms of ghTokenResetAt.values()) if (ms < min) min = ms;
  return min === Infinity ? 0 : min;
}

async function ghFetch(url) {
  const now = Date.now();

  // Separate available tokens from rate-limited ones
  const available = GH_TOKENS.filter(t => (ghTokenResetAt.get(t) || 0) <= now);
  // If all tokens are rate-limited, still try the one that resets soonest as a last resort
  const tokensToTry = available.length > 0
    ? available
    : GH_TOKENS.length > 0
      ? [GH_TOKENS.reduce((a, b) => ((ghTokenResetAt.get(a) || 0) < (ghTokenResetAt.get(b) || 0) ? a : b))]
      : [null]; // no tokens configured — unauthenticated

  let lastRes = null;

  for (const token of tokensToTry) {
    const signal = AbortSignal.timeout(55000);
    let res = await fetch(url, { headers: ghMakeHeaders(token), signal });

    // Bad/expired token — skip to next token rather than falling back to unauth mid-loop
    if (res.status === 401 && token) {
      lastRes = res;
      continue;
    }

    if (res.status !== 403 && res.status !== 429) return res; // success or unrelated error

    // Rate-limited — record reset time for this token and try the next one
    const resetHeader = res.headers.get('x-ratelimit-reset');
    const retryAfter = res.headers.get('retry-after');
    const resetMs = retryAfter
      ? Date.now() + Number(retryAfter) * 1000
      : resetHeader
        ? Number(resetHeader) * 1000
        : Date.now() + 60_000;
    if (token) ghTokenResetAt.set(token, resetMs);
    lastRes = res;
  }

  // All tokens failed — try unauthenticated as final fallback (for public repos)
  if (lastRes?.status === 401 && GH_TOKENS.length > 0) {
    return fetch(url, { headers: ghMakeHeaders(null), signal: AbortSignal.timeout(55000) });
  }

  return lastRes; // all tokens exhausted — caller gets the 403/429
}

/** GET /api/github/api?url=https://api.github.com/... — proxy JSON GitHub REST (token server-side). */
app.get('/api/github/api', async (req, reply) => {
  const url = String(req.query.url || '').trim();
  if (!url.startsWith('https://api.github.com/')) {
    reply.code(400);
    return { error: 'url must be a https://api.github.com/ API URL' };
  }
  let res;
  try {
    res = await ghFetch(url);
  } catch (e) {
    reply.code(502);
    return { error: e.message || 'GitHub request failed' };
  }
  for (const h of ['retry-after', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
    const v = res.headers.get(h);
    if (v) reply.header(h, v);
  }
  // If all tokens are exhausted, expose the earliest reset so the client can show it
  if ((res.status === 403 || res.status === 429) && GH_TOKENS.length > 1) {
    const earliest = ghEarliestResetMs();
    if (earliest > 0) reply.header('x-gh-all-tokens-reset', String(Math.ceil(earliest / 1000)));
  }
  const text = await res.text();
  reply.code(res.status);
  if (!text) return res.ok ? {} : { error: `GitHub ${res.status}` };
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 500) || `GitHub ${res.status}` };
  }
});

/** Encode owner/repo for GitHub API paths (do not encode the slash). */
function githubRepoApiPath(repo) {
  const parts = String(repo || '').trim().split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return parts.map((p) => encodeURIComponent(p)).join('/');
}

function decodeGitHubContentPayload(content, encoding) {
  if (content == null || content === '') return '';
  const enc = String(encoding || 'base64').toLowerCase();
  if (enc === 'utf-8' || enc === 'utf8') return String(content);
  const b64 = String(content).replace(/\s/g, '');
  return Buffer.from(b64, 'base64').toString('utf8');
}

/** Root-level readme.md / README.md (case-insensitive). */
function findRootReadmePath(paths) {
  const candidates = (paths || []).filter((p) => p && !p.includes('/') && /^readme\.md$/i.test(p));
  if (!candidates.length) return null;
  const rank = (p) => (p === 'README.md' ? 0 : p === 'readme.md' ? 1 : 2);
  candidates.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return candidates[0];
}

async function githubFetchRawFileText(repo, branch, fpath) {
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${fpath}`;
  const authHeaders = GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {};
  let res = await fetch(rawUrl, { headers: authHeaders });
  if (!res.ok && GH_TOKEN) res = await fetch(rawUrl);
  if (!res.ok) return null;
  return res.text();
}

async function githubFetchRepoReadmeText(repo, branchHint) {
  const repoPath = githubRepoApiPath(repo);
  if (!repoPath) return { error: 'Invalid repo slug' };
  const res = await ghFetch(`https://api.github.com/repos/${repoPath}/readme`);
  if (res.ok) {
    const data = await res.json();
    return {
      text: decodeGitHubContentPayload(data.content || '', data.encoding || 'base64'),
      path: data.path || 'README.md',
    };
  }
  if (res.status !== 404) return { error: `GitHub ${res.status}` };

  const tree = await githubRepoTreePaths(repo, branchHint);
  const readmePath = findRootReadmePath(tree.paths);
  if (!readmePath) return { error: 'No README found in repository root' };

  const branch = tree.branch || branchHint || 'main';
  const contentsRes = await ghFetch(
    `https://api.github.com/repos/${repoPath}/contents/${encodeURIComponent(readmePath)}?ref=${encodeURIComponent(branch)}`,
  );
  if (contentsRes.ok) {
    const data = await contentsRes.json();
    if (data.content) {
      return {
        text: decodeGitHubContentPayload(data.content, data.encoding || 'base64'),
        path: data.path || readmePath,
      };
    }
  }

  const rawText = await githubFetchRawFileText(repo, branch, readmePath);
  if (rawText != null) return { text: rawText, path: readmePath };
  return { error: 'Could not load README file' };
}

/** GET /api/github/readme?repo=owner/name&branch=main */
app.get('/api/github/readme', async (req, reply) => {
  const repo = String(req.query.repo || '').trim();
  const branchHint = String(req.query.branch || '').trim();
  if (!repo || !/^[^/\s]+\/[^/\s]+$/.test(repo)) { reply.code(400); return { error: 'repo required' }; }
  const result = await githubFetchRepoReadmeText(repo, branchHint);
  if (result.error) {
    reply.code(result.error.includes('404') ? 404 : 502);
    return { error: result.error };
  }
  return { content: result.text || '', encoding: 'utf8', path: result.path || 'README.md' };
});

/** Resolve blob paths via GitHub commits + recursive git trees API. Tries hinted branch, repo default, main, master. */
async function githubRepoTreePaths(repo, branchHint) {
  const branchesToTry = [];
  const hint = String(branchHint || '').trim();
  if (hint) branchesToTry.push(hint);

  const repoPath = githubRepoApiPath(repo);
  if (!repoPath) return { paths: [], branch: branchHint || 'main', truncated: false, error: 'Invalid repo slug' };

  const repoRes = await ghFetch(`https://api.github.com/repos/${repoPath}`);
  if (repoRes.ok) {
    const repoData = await repoRes.json();
    const def = String(repoData.default_branch || '').trim();
    if (def && !branchesToTry.includes(def)) branchesToTry.push(def);
  }
  for (const fallback of ['main', 'master']) {
    if (!branchesToTry.includes(fallback)) branchesToTry.push(fallback);
  }

  let lastError = 'Could not load repository tree from GitHub';
  for (const branch of branchesToTry) {
    const commitRes = await ghFetch(
      `https://api.github.com/repos/${repoPath}/commits/${encodeURIComponent(branch)}`,
    );
    if (!commitRes.ok) {
      let msg = `GitHub ${commitRes.status} for branch "${branch}"`;
      try {
        const errBody = await commitRes.json();
        if (errBody && errBody.message) msg = `${msg}: ${errBody.message}`;
      } catch { /* ignore */ }
      lastError = msg;
      continue;
    }
    const commit = await commitRes.json();
    const treeSha = commit?.commit?.tree?.sha;
    if (!treeSha) {
      lastError = `No tree SHA for branch "${branch}"`;
      continue;
    }
    const treeRes = await ghFetch(
      `https://api.github.com/repos/${repoPath}/git/trees/${treeSha}?recursive=1`,
    );
    if (!treeRes.ok) {
      let msg = `GitHub ${treeRes.status} loading tree for "${branch}"`;
      try {
        const errBody = await treeRes.json();
        if (errBody && errBody.message) msg = `${msg}: ${errBody.message}`;
      } catch { /* ignore */ }
      lastError = msg;
      continue;
    }
    const tree = await treeRes.json();
    const paths = (tree.tree || []).filter((x) => x.type === 'blob' && x.path).map((x) => x.path);
    return { paths, branch, truncated: !!tree.truncated };
  }
  return { paths: [], branch: hint || 'main', truncated: false, error: lastError };
}

/** GET /api/github/tree?repo=owner/name&branch=main */
app.get('/api/github/tree', async (req, reply) => {
  const repo = String(req.query.repo || '').trim();
  const branchHint = String(req.query.branch || '').trim();
  if (!repo || !/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    reply.code(400);
    return { error: 'repo required' };
  }
  const result = await githubRepoTreePaths(repo, branchHint);
  if (result.error && !result.paths.length) {
    reply.code(result.error.includes('404') ? 404 : 502);
    return { error: result.error, paths: [], branch: result.branch, truncated: false };
  }
  return result;
});

/** GET /api/github/commit-count?repo=owner/name&branch=main */
app.get('/api/github/commit-count', async (req, reply) => {
  const repo   = String(req.query.repo   || '').trim();
  const branch = String(req.query.branch || 'main').trim();
  if (!repo || !/^[^/\s]+\/[^/\s]+$/.test(repo)) { reply.code(400); return { error: 'repo required' }; }
  const repoPath = githubRepoApiPath(repo);
  if (!repoPath) { reply.code(400); return { error: 'repo required' }; }
  const res = await ghFetch(`https://api.github.com/repos/${repoPath}/commits?per_page=1&sha=${encodeURIComponent(branch)}`);
  if (!res.ok) { reply.code(res.status); return { error: `GitHub ${res.status}` }; }
  const link = res.headers.get('link') || '';
  const m = link.match(/page=(\d+)>; rel="last"/);
  if (m) return { count: parseInt(m[1], 10) };
  const arr = await res.json().catch(() => []);
  return { count: Array.isArray(arr) ? arr.length : null };
});

/** GET /api/github/raw?repo=owner/name&branch=main&path=package.json */
app.get('/api/github/raw', async (req, reply) => {
  const repo   = String(req.query.repo   || '').trim();
  const branch = String(req.query.branch || 'main').trim();
  const fpath  = String(req.query.path   || '').trim();
  if (!repo || !/^[^/\s]+\/[^/\s]+$/.test(repo) || !fpath) { reply.code(400); return { error: 'repo and path required' }; }
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${fpath}`;
  const authHeaders = GH_TOKEN ? { 'Authorization': `Bearer ${GH_TOKEN}` } : {};
  let res = await fetch(rawUrl, { headers: authHeaders });
  // raw.githubusercontent.com returns 404 (not 401) for bad/expired tokens — retry unauthenticated
  if (!res.ok && GH_TOKEN) res = await fetch(rawUrl);
  if (!res.ok) { reply.code(res.status); return { error: `GitHub ${res.status}` }; }
  const text = await res.text();
  reply.header('Content-Type', 'text/plain; charset=utf-8');
  return reply.send(text);
});

/** DELETE /api/repos/docs/file — remove a doc file from disk. */
app.delete('/api/repos/docs/file', async (req, reply) => {
  const body = req.body || {};
  const fullName = String(body.fullName || '').trim();
  const docFile = String(body.file || '').trim();
  if (!fullName || !/^[^/\s]+\/[^/\s]+$/.test(fullName)) { reply.code(400); return { error: 'fullName required' }; }
  const safe = sanitizeDocFileName(docFile);
  if (!safe) { reply.code(400); return { error: 'Invalid doc file name' }; }
  try {
    const { collection, projectDir } = resolveRepoDocsPlacement(fullName, {
      collection: body.collection, projectDir: body.projectDir,
    });
    const filePath = path.join(repoDocsDir(collection, projectDir), safe);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { ok: true, fullName, file: safe };
  } catch (e) {
    reply.code(400);
    return { error: e.message || 'Failed to delete doc file' };
  }
});

/** Overwrite a specific doc file for a repo (create or replace). */
app.post('/api/repos/docs/write', async (req, reply) => {
  const body = req.body || {};
  const fullName = String(body.fullName || '').trim();
  const docFile = String(body.file || '').trim();
  const content = String(body.content || '');
  if (!fullName || !/^[^/\s]+\/[^/\s]+$/.test(fullName)) {
    reply.code(400);
    return { error: 'fullName (owner/repo) required' };
  }
  const safe = sanitizeDocFileName(docFile);
  if (!safe) {
    reply.code(400);
    return { error: 'Invalid doc file name' };
  }
  try {
    const { collection, projectDir } = resolveRepoDocsPlacement(fullName, {
      collection: body.collection,
      projectDir: body.projectDir,
    });
    const docsDir = repoDocsDir(collection, projectDir);
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, safe), content, 'utf8');
    return { ok: true, fullName, collection, projectDir, file: safe, docsPath: docsDir };
  } catch (e) {
    reply.code(400);
    return { error: e.message || 'Failed to write doc file' };
  }
});

/**
 * Seed a cloned repo's docs/ folder with staged temp_files (readme/stack/notes).
 * Called by project.html right after a repo is cloned. Existing non-empty docs
 * are never overwritten, so post-clone edits are preserved.
 */
app.post('/api/repos/docs/seed', async (req, reply) => {
  const body = req.body || {};
  const fullName = String(body.fullName || '').trim();
  if (!fullName || !/^[^/\s]+\/[^/\s]+$/.test(fullName)) {
    reply.code(400);
    return { error: 'fullName (owner/repo) required' };
  }
  const files = Array.isArray(body.files) ? body.files : [];
  try {
    const { collection, projectDir } = resolveRepoDocsPlacement(fullName, {
      collection: body.collection,
      projectDir: body.projectDir,
    });
    const docsDir = repoDocsDir(collection, projectDir);
    fs.mkdirSync(docsDir, { recursive: true });
    const written = [];
    const skipped = [];
    for (const f of files) {
      const safe = sanitizeDocFileName(f && f.name);
      if (!safe) continue;
      const p = path.join(docsDir, safe);
      if (fs.existsSync(p) && fs.readFileSync(p, 'utf8').trim()) {
        skipped.push(safe);
        continue;
      }
      fs.writeFileSync(p, String((f && f.text) || ''), 'utf8');
      written.push(safe);
    }
    return { ok: true, fullName, collection, projectDir, written, skipped, docsPath: docsDir };
  } catch (e) {
    reply.code(400);
    return { error: e.message || 'Failed to seed docs' };
  }
});

app.get('/api/repos/notes', async (req, reply) => {
  const fullName = String(req.query?.fullName || '').trim();
  if (!fullName) {
    reply.code(400);
    return { error: 'fullName query param required' };
  }
  const notes = loadRepoNotes(fullName);
  if (!notes) {
    try {
      const { collection, projectDir } = resolveRepoDocsPlacement(fullName, {
        collection: req.query?.collection,
        projectDir: req.query?.projectDir,
      });
      return {
        fullName,
        collection,
        projectDir,
        notes: [],
        docsPath: repoDocsDir(collection, projectDir),
      };
    } catch (e) {
      return { fullName, collection: '', projectDir: '', notes: [], docsPath: null };
    }
  }
  return {
    ...notes,
    docsPath: repoDocsDir(notes.collection, notes.projectDir),
  };
});

app.post('/api/repos/notes', async (req, reply) => {
  const body = req.body || {};
  const fullName = String(body.fullName || '').trim();
  const text = String(body.text || '').trim();
  if (!fullName) {
    reply.code(400);
    return { error: 'fullName is required' };
  }
  try {
    const saved = appendRepoNote(fullName, text, {
      collection: body.collection,
      projectDir: body.projectDir,
    });
    return {
      ok: true,
      fullName,
      collection: saved.collection,
      projectDir: saved.projectDir,
      note: saved.note,
      notes: saved.notes,
      docsPath: saved.docsPath,
    };
  } catch (e) {
    reply.code(e.statusCode || 500);
    return { error: e.message || 'Failed to save note' };
  }
});

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
      if (raw && raw.deleted) continue;
      const meta = projectCardMetaFromFileJson(raw, base);
      if (meta) projects.push(meta);
    } catch {
      /* skip broken file */
    }
  }
  projects.sort((a, b) => String(a._fname || '').localeCompare(String(b._fname || '')));
  return { projects };
});

app.post('/api/projects/save', async (req, reply) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    reply.code(400);
    return { error: 'JSON body required' };
  }
  const overwrite = !!body.overwrite;
  const toWrite = { ...body };
  delete toWrite.overwrite;
  let safe;
  try {
    safe = assertSafeProjectFname(toWrite._fname);
  } catch (e) {
    reply.code(e.statusCode || 400);
    return { error: e.message };
  }
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  if (fs.existsSync(safe.filePath) && !overwrite) {
    reply.code(409);
    return {
      error: `Project file already exists: ${safe.fname}.json — pick another name or delete the existing project.`,
    };
  }
  fs.writeFileSync(safe.filePath, JSON.stringify(toWrite), 'utf8');
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
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(safe.filePath, 'utf8'));
  } catch (e) {
    reply.code(500);
    return { error: 'Could not read project file' };
  }
  if (!raw || typeof raw !== 'object') {
    reply.code(500);
    return { error: 'Invalid project file' };
  }
  raw.deleted = true;
  raw.deletedAt = new Date().toISOString();
  fs.writeFileSync(safe.filePath, JSON.stringify(raw), 'utf8');
  return { ok: true, deleted: true };
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

app.post('/api/repos/clone-status', async (req, reply) => {
  const body = req.body || {};
  const raw = Array.isArray(body.fullNames) ? body.fullNames : [];
  const fullNames = raw
    .map((n) => String(n || '').trim())
    .filter((n) => /^[^/\s]+\/[^/\s]+$/.test(n));
  if (fullNames.length > 500) {
    reply.code(400);
    return { error: 'At most 500 fullNames per request' };
  }
  const statuses = {};
  for (const fullName of fullNames) {
    statuses[fullName] = cloneStatusForRepo(fullName);
  }
  return { statuses };
});

app.post('/api/repos/ensure', async (req) => {
  const body = req.body || {};
  const { fullName, branch } = body;
  if (!fullName || typeof fullName !== 'string') {
    const e = new Error('fullName required');
    e.statusCode = 400;
    throw e;
  }
  const fn = fullName.trim();
  const collection = String(body.collection || DEFAULT_CLONE_COLLECTION).trim();
  const result = await installRepoToCollection(fn, collection, {
    branch: branch || null,
    searchProjectSlug: body.searchProjectSlug,
    projectName: body.projectName,
  });
  return { ...result, path: result.path, cloned: result.cloned };
});

app.post('/api/repos/install-to-collection', async (req, reply) => {
  const body = req.body || {};
  const fullName = String(body.fullName || '').trim();
  const collection = String(body.collection || DEFAULT_CLONE_COLLECTION).trim();
  if (!fullName || !/^[^/\s]+\/[^/\s]+$/.test(fullName)) {
    reply.code(400);
    return { error: 'fullName must be owner/repo' };
  }
  try {
    return await installRepoToCollection(fullName, collection, {
      branch: body.branch || null,
      searchProjectSlug: body.searchProjectSlug,
      projectName: body.projectName,
    });
  } catch (e) {
    reply.code(e.statusCode || 500);
    return { error: e.message || 'Install to collection failed' };
  }
});

app.post('/api/repos/ai-clone', async (req, reply) => {
  const body = req.body || {};
  const fullName = String(body.fullName || '').trim();
  const collection = String(body.collection || DEFAULT_CLONE_COLLECTION).trim();
  if (!fullName || !/^[^/\s]+\/[^/\s]+$/.test(fullName)) {
    reply.code(400);
    return { error: 'fullName must be owner/repo' };
  }
  const projectDir = projectDirFromFullName(fullName);
  const installerOpts = {
    searchProjectSlug: body.searchProjectSlug,
    projectName: body.projectName,
    collection,
    projectDir,
  };
  try {
    if (body.prepareTarget !== false && !repoIsInstalled(fullName)) {
      fs.mkdirSync(repoDirInCollection(collection, projectDir), { recursive: true });
    }
    const launched = await runGithubInstaller(fullName, installerOpts, { sync: false });
    return {
      ok: true,
      fullName,
      collection,
      projectDir,
      cloned: repoIsInstalled(fullName),
      ...launched,
    };
  } catch (e) {
    reply.code(e.statusCode || 500);
    return { error: e.message || 'AI clone failed' };
  }
});

app.post('/api/collections/:name/ai-ask', async (req, reply) => {
  let collName;
  try {
    collName = assertSafeCollectionName(req.params.name);
  } catch (e) {
    reply.code(e.statusCode || 400);
    return { error: e.message };
  }
  const body = req.body || {};
  const userPrompt = String(body.prompt || '').trim();
  if (!userPrompt) {
    reply.code(400);
    return { error: 'prompt is required' };
  }
  const aiProvider = normalizeAiProvider(body.aiProvider);
  if (!AI_PROVIDERS.has(aiProvider)) {
    reply.code(400);
    return { error: 'Invalid aiProvider (use openrouter, claude, or cursor)' };
  }
  let outputDir;
  try {
    outputDir = resolveCollectionOutputDir(body.outputFolder);
  } catch (e) {
    reply.code(e.statusCode || 400);
    return { error: e.message };
  }
  const detail = describeCollection(collName);
  const contextBlock = buildCollectionAskContext(collName, detail, body.repos);

  if (aiProvider === 'openrouter') {
    if (!OR_KEY) {
      reply.code(503);
      return { error: 'OPENROUTER_API_KEY not configured' };
    }
    const model = String(body.userModel || '').trim();
    if (!model) {
      reply.code(400);
      return { error: 'userModel is required for OpenRouter' };
    }
    try {
      const system =
        'You are a senior software engineer analyzing a curated GitHub collection. Use the project list and metadata. Be concise and accurate.';
      const content = await openRouterChat(model, [
        { role: 'system', content: system },
        { role: 'user', content: `${contextBlock}\n\n## Question\n\n${userPrompt}` },
      ]);
      const saved = writeCollectionAskMarkdown(outputDir, collName, userPrompt, content, {
        provider: 'openrouter',
        model,
      });
      return {
        ok: true,
        provider: 'openrouter',
        collection: collName,
        ...saved,
        lastTurn: { prompt: userPrompt, content, userModel: model },
      };
    } catch (e) {
      reply.code(500);
      return { error: e.message || 'Collection ask failed' };
    }
  }

  const agentModel = String(
    aiProvider === 'cursor' ? body.cursorModel : body.claudeModel || '',
  ).trim();
  if (!agentModel) {
    reply.code(400);
    return {
      error:
        aiProvider === 'cursor'
          ? 'cursorModel is required for Cursor'
          : 'claudeModel is required for Claude',
    };
  }
  const relFolder = path.relative(REPO_ROOT, outputDir).replace(/\\/g, '/');
  const pending = writeCollectionAskMarkdown(
    outputDir,
    collName,
    userPrompt,
    '_Agent is running — check the terminal log. The agent should replace this section with the full answer._',
    { provider: aiProvider, model: agentModel },
  );
  const relFile = pending.relativePath;
  const agentPrompt = [
    `Collection analysis for "${collName}".`,
    `Read ${relFile} for repository context and the user's question.`,
    `Write your complete answer into ${relFolder}/ as a new markdown file (e.g. ${collName}-answer.md). Include the question and a clear answer section.`,
  ].join(' ');
  try {
    const launched = launchRagentAsk(aiProvider, {
      workspaceDir: REPO_ROOT,
      prompt: agentPrompt,
      fullName: `collection:${collName}`,
      label: `collection-${aiProvider}-ask`,
      agentModel,
    });
    return {
      ok: true,
      provider: aiProvider,
      collection: collName,
      ...pending,
      ragentLaunch: { ...launched, prompt: agentPrompt, collection: collName },
      lastTurn: {
        prompt: userPrompt,
        content: `Launched ${aiProvider} agent.\n\n\`${launched.command || ''}\``,
        userModel: agentModel,
      },
    };
  } catch (e) {
    const code = e.statusCode && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 500;
    reply.code(code);
    return { error: e.message || 'Collection ragent ask failed' };
  }
});

function listAgentModels(builtin, extra) {
  const seen = new Set();
  const models = [];
  function add(label) {
    const k = label.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    models.push({ id: label, label });
  }
  for (const d of builtin) add(d);
  for (const e of extra) add(e);
  return models;
}

app.get('/api/cursor-models', async () => ({
  models: listAgentModels(CURSOR_BUILTIN_MODEL_LABELS, CURSOR_MODELS_EXTRA),
}));

app.get('/api/claude-models', async () => ({
  models: listAgentModels(CLAUDE_BUILTIN_MODEL_LABELS, CLAUDE_MODELS_EXTRA),
}));

app.get('/api/ai/skills', async () => ({
  folder: GITHUB_OSS_SKILLS_REL,
  skills: readGithubOssSkills(),
}));

app.get('/api/ai/skills/:name', async (req, reply) => {
  try {
    const { name, skillPath } = githubOssSkillPath(req.params.name);
    if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isFile()) {
      reply.code(404);
      return { error: 'Skill not found' };
    }
    const content = fs.readFileSync(skillPath, 'utf8');
    return {
      name,
      title: titleFromSkillContent(content, name),
      relativePath: `${GITHUB_OSS_SKILLS_REL}/${name}/SKILL.md`,
      content,
    };
  } catch (e) {
    reply.code(e.statusCode || 500);
    return { error: e.message || 'Failed to read skill' };
  }
});

app.post('/api/ai/skills', async (req, reply) => {
  const body = req.body || {};
  try {
    const { name, skillDir, skillPath } = githubOssSkillPath(body.name);
    const content = String(body.content || '').trimEnd();
    if (!content.trim()) {
      reply.code(400);
      return { error: 'content is required' };
    }
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillPath, `${content}\n`, 'utf8');
    return {
      ok: true,
      name,
      title: titleFromSkillContent(content, name),
      relativePath: `${GITHUB_OSS_SKILLS_REL}/${name}/SKILL.md`,
      skills: readGithubOssSkills(),
    };
  } catch (e) {
    reply.code(e.statusCode || 500);
    return { error: e.message || 'Failed to save skill' };
  }
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
  const aiProvider = normalizeAiProvider(body.aiProvider);

  if (!AI_PROVIDERS.has(aiProvider)) {
    reply.code(400);
    return { error: 'Invalid aiProvider (use openrouter, claude, or cursor)' };
  }

  if (aiProvider === 'openrouter' && !OR_KEY) {
    reply.code(503);
    return { error: 'OPENROUTER_API_KEY not configured' };
  }

  const { fullName, prompt, userModel, cursorModel, claudeModel } = body;
  if (!fullName || !prompt) {
    reply.code(400);
    return { error: 'fullName and prompt are required' };
  }

  const fn = String(fullName).trim();
  const userPrompt = String(prompt).trim();
  const preferredCollection = String(body.collection || DEFAULT_CLONE_COLLECTION).trim();
  const installOpts = {
    searchProjectSlug: body.searchProjectSlug,
    projectName: body.projectName,
    collection: preferredCollection,
  };
  const cursorModelStr = String(cursorModel || '').trim();
  const claudeModelStr = String(claudeModel || '').trim();

  if (aiProvider === 'openrouter' && (!userModel || !String(userModel).trim())) {
    reply.code(400);
    return { error: 'userModel is required for OpenRouter' };
  }
  if (aiProvider === 'cursor' && !cursorModelStr) {
    reply.code(400);
    return { error: 'cursorModel is required for Cursor' };
  }
  if (aiProvider === 'claude' && !claudeModelStr) {
    reply.code(400);
    return { error: 'claudeModel is required for Claude' };
  }

  if (aiProvider === 'claude' || aiProvider === 'cursor') {
    let installResult;
    try {
      installResult = await installRepoToCollection(fn, preferredCollection, {
        searchProjectSlug: body.searchProjectSlug,
        projectName: body.projectName,
      });
    } catch (e) {
      const code = e.statusCode && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 500;
      reply.code(code);
      return { error: e.message || 'Repository install failed' };
    }
    const dir = repoPath(fn);
    const agentModel = aiProvider === 'cursor' ? cursorModelStr : claudeModelStr;
    const launched = launchRagentAsk(aiProvider, {
      workspaceDir: dir,
      prompt: userPrompt,
      fullName: fn,
      label: `${aiProvider}-ask`,
      agentModel,
    });
    const turn = {
      prompt: userPrompt,
      content: `Launched ${aiProvider} agent in terminal.\n\n\`${launched.command || ''}\``,
      provider: aiProvider,
      userModel: agentModel,
    };
    let docFile = sanitizeDocFileName(body.docFile);
    const tabContext = String(body.tabContext || '').slice(0, 120000);
    const tabLabel = String(body.tabLabel || '').trim();
    if (tabContext && tabLabel) {
      turn.tabContext = tabLabel;
    }
    const saved = appendRepoDocAiTurn(fn, docFile, turn, {
      collection: installResult.collection,
      projectDir: installResult.projectDir,
    });
    return {
      contextMode: 'repo',
      provider: aiProvider,
      collection: saved.collection,
      projectDir: saved.projectDir,
      docFile: saved.docFile,
      docContent: saved.content,
      lastTurn: turn,
      ragentLaunch: {
        ...launched,
        fullName: fn,
        repoDir: dir,
        prompt: userPrompt,
      },
    };
  }

  const model = String(userModel || '').trim();

  let installResult;
  try {
    installResult = await installRepoToCollection(fn, preferredCollection, {
      searchProjectSlug: body.searchProjectSlug,
      projectName: body.projectName,
    });
  } catch (e) {
    const code = e.statusCode && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 500;
    reply.code(code);
    return { error: e.message || 'Repository install failed' };
  }

  const dir = repoPath(fn);
  const paths = await gitLsFiles(dir);
  const filteredPaths = await resolveFilteredPaths(userPrompt, paths);
  const fileBlock = buildFileContextBundle(dir, filteredPaths);

  let docFile = sanitizeDocFileName(body.docFile);
  const tabContext = String(body.tabContext || '').slice(0, 120000);
  const tabLabel = String(body.tabLabel || '').trim();
  let priorDoc = '';
  if (docFile) {
    const read = readRepoDocFileContent(
      installResult.collection,
      installResult.projectDir,
      docFile,
    );
    if (read) priorDoc = read.content;
  }

  const userParts = [`# Repository: ${fn}`];
  if (tabContext && tabLabel) {
    userParts.push(`\n## Tab context (${tabLabel})\n\n`, tabContext);
  }
  if (priorDoc && docFile) {
    userParts.push(`\n\n## Prior content in docs/${docFile}\n\n`, priorDoc);
  }
  userParts.push('\n\n## Question\n', userPrompt, '\n\n## Selected files\n', fileBlock);
  const userContent = userParts.join('');

  const system = docFile
    ? 'You are a senior software engineer. Answer using the tab context, prior doc content, and repository file excerpts. Be concise and accurate. Your answer will be appended to the doc file.'
    : 'You are a senior software engineer. Answer using the repository file excerpts. Be concise and accurate.';

  const content = await openRouterChat(model, [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ]);

  const lastTurn = {
    prompt: userPrompt,
    content,
    userModel: model,
    provider: 'openrouter',
    filterModel: FILTER_MODEL,
    filteredPaths,
    ts: new Date().toISOString(),
  };
  const saved = appendRepoDocAiTurn(fn, docFile, lastTurn, {
    collection: installResult.collection,
    projectDir: installResult.projectDir,
  });

  return {
    provider: 'openrouter',
    collection: saved.collection,
    projectDir: saved.projectDir,
    docFile: saved.docFile,
    docContent: saved.content,
    lastTurn,
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
