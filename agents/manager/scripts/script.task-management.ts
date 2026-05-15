#!/usr/bin/env -S npx tsx
// @ts-nocheck

import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "jsonc-parser";
import { fileURLToPath } from "node:url";

type TaskStatus =
  | "pending"
  | "planned"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked"
  | "cancelled";

type SubTask = {
  sub_task_id: number;
  [key: string]: unknown;
};

type Task = {
  github_issue_id: number;
  title?: string;
  status?: TaskStatus;
  blocked_reason?: string;
  sub_tasks?: SubTask[];
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  [key: string]: unknown;
};

const DEFAULT_TASKS_FILE = "agents/manager/data/tasks/tasks.index.jsonc";
const DEFAULT_DONE_TASKS_FILE = "agents/manager/data/tasks/done/tasks.done.jsonc";
const TEAM_CONFIG_FILE = "agents/manager/configs/config.manager.jsonc";
const MANAGER_DOC_FILE = "agents/manager/docs/manager.index.md";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function resolveProjectRoot(): string {
  // Script lives at: <root>/agents/manager/scripts/script.task-management.ts
  return path.resolve(SCRIPT_DIR, "../../..");
}

const PROJECT_ROOT = resolveProjectRoot();

function nowIso(): string {
  return new Date().toISOString();
}

function toNumber(value: string, label: string): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid ${label}: "${value}"`);
  }
  return num;
}

function parseJsonArg<T>(raw: string, label: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(
      `Invalid JSON for ${label}: ${(error as Error).message}\nInput: ${raw}`,
    );
  }
}

function resolveFilePath(fileArg?: string): string {
  if (!fileArg) {
    return path.resolve(PROJECT_ROOT, DEFAULT_TASKS_FILE);
  }
  if (path.isAbsolute(fileArg)) {
    return fileArg;
  }
  return path.resolve(process.cwd(), fileArg);
}

async function readTasks(filePath: string): Promise<Task[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array in tasks file: ${filePath}`);
  }

  return parsed as Task[];
}

async function writeTasks(filePath: string, tasks: Task[]): Promise<void> {
  const content = `${JSON.stringify(tasks, null, 2)}\n`;
  await fs.writeFile(filePath, content, "utf8");
}

async function readTasksFileOrEmpty(filePath: string): Promise<Task[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.trim()) {
      return [];
    }
    const parsed = parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected array in tasks file: ${filePath}`);
    }
    return parsed as Task[];
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function resolvePlanDir(tasksFilePath: string, planDirArg?: string): string {
  if (planDirArg) {
    return path.isAbsolute(planDirArg) ? planDirArg : path.resolve(process.cwd(), planDirArg);
  }
  return path.resolve(path.dirname(tasksFilePath), "in_plan");
}

async function rebuildAssignedUserTodayFiles(tasks: Task[], planDir: string): Promise<void> {
  await fs.mkdir(planDir, { recursive: true });

  const todayTasks = tasks.filter((task) =>
    ["today", "now"].includes(String(task.when ?? "").toLowerCase()),
  );

  const grouped = todayTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const user = String(task.assigned_user ?? "").trim() || "unknown-user";
    (acc[user] ??= []).push(task);
    return acc;
  }, {});

  for (const [user, list] of Object.entries(grouped)) {
    const file = path.join(planDir, `${user}.today.jsonc`);
    await fs.writeFile(file, `${JSON.stringify(list, null, 2)}\n`, "utf8");
  }

  const counts = Object.entries(grouped)
    .map(([user, list]) => `${user}:${list.length}`)
    .join(", ");

  console.log(`today tasks: ${todayTasks.length}`);
  console.log(`today files: ${counts || "none"}`);
}

async function rebuildAssignedUserWeekFiles(tasks: Task[], planDir: string): Promise<void> {
  await fs.mkdir(planDir, { recursive: true });

  const weekTasks = tasks.filter((task) => String(task.when ?? "").toLowerCase() === "week");

  const grouped = weekTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const user = String(task.assigned_user ?? "").trim() || "unknown-user";
    (acc[user] ??= []).push(task);
    return acc;
  }, {});

  for (const [user, list] of Object.entries(grouped)) {
    const file = path.join(planDir, `${user}.week.jsonc`);
    await fs.writeFile(file, `${JSON.stringify(list, null, 2)}\n`, "utf8");
  }

  const counts = Object.entries(grouped)
    .map(([user, list]) => `${user}:${list.length}`)
    .join(", ");

  console.log(`week tasks: ${weekTasks.length}`);
  console.log(`week files: ${counts || "none"}`);
}

async function syncTasksSchedule(tasks: Task[], planDir: string): Promise<void> {
  await rebuildAssignedUserTodayFiles(tasks, planDir);
  await rebuildAssignedUserWeekFiles(tasks, planDir);
}

function isCancelledTaskStatus(status: unknown): boolean {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "cancelled" || normalized === "canceled";
}

function separateCancelledTasks(tasks: Task[]): { kept: Task[]; removed: Task[] } {
  const kept: Task[] = [];
  const removed: Task[] = [];
  for (const task of tasks) {
    if (isCancelledTaskStatus(task.status)) {
      removed.push(task);
    } else {
      kept.push(task);
    }
  }
  return { kept, removed };
}

function parseSyncTasksArgs(args: string[]): { planDir?: string; noGithub: boolean } {
  let noGithub = false;
  const positionals: string[] = [];
  for (const arg of args) {
    if (arg === "--no-github") {
      noGithub = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown sync-tasks option: ${arg}`);
    }
    positionals.push(arg);
  }
  if (positionals.length > 1) {
    throw new Error("Usage: sync-tasks [planDir] [--no-github]");
  }
  return { planDir: positionals[0], noGithub };
}

function tryCloseGithubIssueForCancelledTask(githubIssueId: number): void {
  try {
    execFileSync(
      "gh",
      [
        "issue",
        "close",
        String(githubIssueId),
        "--comment",
        "Cancelled task removed from tasks index (task-management sync-tasks).",
      ],
      { cwd: PROJECT_ROOT, stdio: ["ignore", "pipe", "pipe"] },
    );
    console.log(`github: closed issue #${githubIssueId}`);
  } catch (err) {
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString?.()?.trim();
    const message = stderr || (err as Error).message || String(err);
    console.warn(`github: could not close issue #${githubIssueId}: ${message}`);
  }
}

async function purgeCancelledTasksFromFiles(
  filePath: string,
  tasks: Task[],
  options: { closeGithub: boolean },
): Promise<Task[]> {
  const { kept, removed } = separateCancelledTasks(tasks);
  if (removed.length === 0) {
    console.log("cancelled removed from index: 0");
    return tasks;
  }

  if (options.closeGithub) {
    for (const task of removed) {
      if (typeof task.github_issue_id === "number" && Number.isFinite(task.github_issue_id)) {
        tryCloseGithubIssueForCancelledTask(task.github_issue_id);
      }
    }
  }

  await writeTasks(filePath, kept);
  console.log(
    `cancelled removed from index: ${removed.length} (${removed.map((t) => t.github_issue_id).join(", ")})`,
  );
  return kept;
}

function toRepoRelativePosixPath(absPath: string): string {
  const rel = path.relative(PROJECT_ROOT, absPath);
  return `./${rel.split(path.sep).join("/")}`;
}

function isDoneTaskStatus(status: unknown): boolean {
  return String(status ?? "").toLowerCase() === "done";
}

function separateDoneTasks(tasks: Task[]): { kept: Task[]; done: Task[] } {
  const kept: Task[] = [];
  const done: Task[] = [];
  for (const task of tasks) {
    if (isDoneTaskStatus(task.status)) {
      done.push(task);
    } else {
      kept.push(task);
    }
  }
  return { kept, done };
}

function mergeDoneTasks(existingDone: Task[], incomingDone: Task[]): Task[] {
  const byIssueId = new Map<number, Task>();
  for (const task of existingDone) {
    if (typeof task.github_issue_id === "number" && Number.isFinite(task.github_issue_id)) {
      byIssueId.set(task.github_issue_id, task);
    }
  }
  for (const task of incomingDone) {
    byIssueId.set(task.github_issue_id, task);
  }
  return Array.from(byIssueId.values()).sort((a, b) => a.github_issue_id - b.github_issue_id);
}

async function moveDoneTasksToDoneFile(indexFilePath: string, tasks: Task[]): Promise<Task[]> {
  const { kept, done } = separateDoneTasks(tasks);
  if (done.length === 0) {
    console.log("done moved to done file: 0");
    return tasks;
  }

  const doneFilePath = path.resolve(PROJECT_ROOT, DEFAULT_DONE_TASKS_FILE);
  const existingDone = await readTasksFileOrEmpty(doneFilePath);
  const mergedDone = mergeDoneTasks(existingDone, done);

  await writeTasks(indexFilePath, kept);
  await writeTasks(doneFilePath, mergedDone);

  console.log(
    `done moved to done file: ${done.length} (${done.map((t) => t.github_issue_id).join(", ")})`,
  );
  return kept;
}

function donePathSegmentsForTask(task: Task): string[] {
  const branch = String(task.branch_name ?? "").trim();
  if (branch) {
    const parts = branch.split("/").filter(Boolean);
    for (const p of parts) {
      if (p === "." || p === "..") {
        throw new Error(`Invalid branch_name for task #${task.github_issue_id}: ${branch}`);
      }
    }
    if (parts.length === 0) {
      return [String(task.github_issue_id)];
    }
    return parts;
  }
  return [String(task.github_issue_id)];
}

async function tryMoveDoneTaskFolder(task: Task): Promise<{ moved: boolean; newRelPath?: string }> {
  try {
    const from = await getTaskFolderPath(task.github_issue_id);
    if (!from) {
      return { moved: false };
    }

    const doneRoot = path.resolve(PROJECT_ROOT, "agents/manager/data/tasks/done");
    const segments = donePathSegmentsForTask(task);
    const toDir = path.join(doneRoot, ...segments);

    const relToDoneRoot = path.relative(doneRoot, toDir);
    if (relToDoneRoot.startsWith("..") || path.isAbsolute(relToDoneRoot)) {
      throw new Error(`Invalid done path for task #${task.github_issue_id}`);
    }

    await fs.mkdir(path.dirname(toDir), { recursive: true });

    if (path.resolve(from) === path.resolve(toDir)) {
      return { moved: false };
    }

    await fs.rename(from, toDir);
    const newRelPath = toRepoRelativePosixPath(toDir);
    console.log(`done: moved task #${task.github_issue_id} → ${newRelPath}`);
    return { moved: true, newRelPath };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      console.warn(`done: folder already exists for task #${task.github_issue_id}, skip move`);
      return { moved: false };
    }
    console.warn(`done: move failed for task #${task.github_issue_id}: ${(err as Error).message}`);
    return { moved: false };
  }
}

/** For tasks with status done: set non-done sub_tasks to done, move in_plan folder to done/{branch_name}. */
async function normalizeDoneTasks(tasks: Task[]): Promise<boolean> {
  let changed = false;

  for (const task of tasks) {
    if (!isDoneTaskStatus(task.status)) {
      continue;
    }

    if (Array.isArray(task.sub_tasks) && task.sub_tasks.length > 0) {
      let subChanged = false;
      for (const st of task.sub_tasks) {
        const s = String(st.status ?? "").toLowerCase();
        if (s === "done" || s === "cancelled") {
          continue;
        }
        st.status = "done";
        subChanged = true;
      }
      if (subChanged) {
        task.updated_at = nowIso();
        changed = true;
      }
    }

    const move = await tryMoveDoneTaskFolder(task);
    if (move.moved && move.newRelPath) {
      task.in_plan_task_directory = move.newRelPath;
      task.updated_at = nowIso();
      changed = true;
    }
  }

  return changed;
}

function findTaskIndex(tasks: Task[], githubIssueId: number): number {
  return tasks.findIndex((task) => task.github_issue_id === githubIssueId);
}

function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function printHelp(): void {
  console.log(`
task-management command list

Usage:
  bun task-management <command> [args]
  npm run task-management -- <command> [args]
  npx tsx ./agents/manager/scripts/script.task-management.ts <command> [args]

Commands:
  help
  list-tasks [filtersJson]
  get-task <githubIssueId>
  print-task-file-tree <githubIssueId>
  sync-tasks [planDir] [--no-github]
  rebuild-today-files [planDir]
  rebuild-week-files [planDir]
  print-team-config
  print-documentation
  create-task <taskJson>
  update-task <githubIssueId> <patchJson>
  delete-task <githubIssueId>
  set-status <githubIssueId> <status> [blockedReason]
  add-sub-task <githubIssueId> <subTaskJson>
  update-sub-task <githubIssueId> <subTaskId> <patchJson>
  delete-sub-task <githubIssueId> <subTaskId>

Options:
  --file <path>   custom tasks index file
  --no-github     with sync-tasks: skip closing GitHub issues (still drop cancelled rows from index)

Example:
  bun task-management get-task 7
  bun task-management help
  bun task-management print-task-file-tree 7
  bun task-management sync-tasks
  bun task-management print-team-config
  bun task-management print-documentation
  npm run task-management -- create-task '{"github_issue_id":7,"title":"New task","status":"pending"}'
`);
}

function extractFileOption(args: string[]): { cleanArgs: string[]; filePath?: string } {
  const cleanArgs: string[] = [];
  let filePath: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--file") {
      filePath = args[i + 1];
      i += 1;
      continue;
    }
    cleanArgs.push(args[i]);
  }

  return { cleanArgs, filePath };
}

async function getTaskFolderPath(githubIssueId: number): Promise<string | null> {
  const inPlanPath = path.resolve(PROJECT_ROOT, "agents/manager/data/tasks/in_plan");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(inPlanPath);
  } catch {
    return null;
  }

  const marker = `.${githubIssueId}.`;
  const matches = entries
    .filter((entry) => entry.includes(marker))
    .sort((a, b) => a.localeCompare(b));
  if (matches.length === 0) {
    return null;
  }
  return path.join(inPlanPath, matches[matches.length - 1]);
}

async function collectTaskFileTree(taskDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(path.relative(taskDir, fullPath));
      }
    }
  }

  await walk(taskDir);
  return files.sort((a, b) => a.localeCompare(b));
}

function formatTreeLines(items: string[]): string {
  type Node = { [name: string]: Node };
  const root: Node = {};

  for (const item of items) {
    const parts = item.split("/").filter(Boolean);
    let node = root;
    for (const part of parts) {
      node[part] = node[part] ?? {};
      node = node[part];
    }
  }

  function walk(node: Node, prefix = ""): string[] {
    const names = Object.keys(node).sort((a, b) => a.localeCompare(b));
    const lines: string[] = [];

    names.forEach((name, index) => {
      const isLast = index === names.length - 1;
      const branch = isLast ? "└── " : "├── ";
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      lines.push(`${prefix}${branch}${name}`);
      lines.push(...walk(node[name], childPrefix));
    });

    return lines;
  }

  return walk(root).join("\n");
}

function formatTaskFileTree(taskDir: string, files: string[]): string {
  const rootLabel = path.relative(PROJECT_ROOT, taskDir);
  if (files.length === 0) {
    return `${rootLabel}\n└── (no files)`;
  }
  const lines = formatTreeLines(files);
  return `${rootLabel}\n${lines}`;
}

async function readTeamConfig(): Promise<unknown> {
  const configPath = path.resolve(PROJECT_ROOT, TEAM_CONFIG_FILE);
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = parse(raw) as Record<string, unknown> | null;
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid config file: ${configPath}`);
  }
  return parsed.team ?? [];
}

async function readManagerDocumentation(): Promise<string> {
  const docPath = path.resolve(PROJECT_ROOT, MANAGER_DOC_FILE);
  return fs.readFile(docPath, "utf8");
}

async function main(): Promise<void> {
  const { cleanArgs, filePath: fileArg } = extractFileOption(process.argv.slice(2));
  const [command, ...args] = cleanArgs;
  const filePath = resolveFilePath(fileArg);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "help") {
    printHelp();
    return;
  }

  if (command === "print-documentation" || command === "print-docs") {
    const docs = await readManagerDocumentation();
    process.stdout.write(docs.endsWith("\n") ? docs : `${docs}\n`);
    return;
  }

  const tasks = await readTasks(filePath);

  // *******READ*******
  if (command === "list-tasks") {
    const filters = args[0] ? parseJsonArg<Record<string, unknown>>(args[0], "filtersJson") : null;
    const filtered = filters
      ? tasks.filter((task) =>
          Object.entries(filters).every(([key, value]) => {
            const taskValue = task[key];
            if (Array.isArray(value) && Array.isArray(taskValue)) {
              return value.every((needle) => taskValue.includes(needle));
            }
            return taskValue === value;
          }),
        )
      : tasks;

    printJson(filtered);
    return;
  }

  if (command === "get-task") {
    if (!args[0]) {
      throw new Error("Missing githubIssueId");
    }
    const githubIssueId = toNumber(args[0], "githubIssueId");
    const task = tasks.find((item) => item.github_issue_id === githubIssueId) ?? null;
    const taskDir = await getTaskFolderPath(githubIssueId);
    const taskFileTree = taskDir
      ? formatTaskFileTree(taskDir, await collectTaskFileTree(taskDir))
      : "(task folder not found)";
    printJson({
      task,
      task_file_tree: taskFileTree,
    });
    return;
  }

  if (command === "print-task-file-tree") {
    if (!args[0]) {
      throw new Error("Missing githubIssueId");
    }
    const githubIssueId = toNumber(args[0], "githubIssueId");
    const taskDir = await getTaskFolderPath(githubIssueId);
    if (!taskDir) {
      console.log("(task folder not found)");
      return;
    }
    const taskFileTree = formatTaskFileTree(taskDir, await collectTaskFileTree(taskDir));
    console.log(taskFileTree);
    return;
  }

  if (command === "sync-tasks") {
    const { planDir, noGithub } = parseSyncTasksArgs(args);
    const resolvedPlanDir = resolvePlanDir(filePath, planDir);
    const kept = await purgeCancelledTasksFromFiles(filePath, tasks, { closeGithub: !noGithub });
    const doneNormalized = await normalizeDoneTasks(kept);
    if (doneNormalized) {
      await writeTasks(filePath, kept);
    }
    const activeTasks = await moveDoneTasksToDoneFile(filePath, kept);
    await syncTasksSchedule(activeTasks, resolvedPlanDir);
    return;
  }

  if (command === "rebuild-today-files") {
    const planDir = resolvePlanDir(filePath, args[0]);
    await rebuildAssignedUserTodayFiles(tasks, planDir);
    return;
  }

  if (command === "rebuild-week-files") {
    const planDir = resolvePlanDir(filePath, args[0]);
    await rebuildAssignedUserWeekFiles(tasks, planDir);
    return;
  }

  if (command === "print-team-config") {
    const teamConfig = await readTeamConfig();
    printJson(teamConfig);
    return;
  }

  // *******CREATE*******
  if (command === "create-task") {
    if (!args[0]) {
      throw new Error("Missing taskJson");
    }

    const input = parseJsonArg<Task>(args[0], "taskJson");
    if (typeof input.github_issue_id !== "number") {
      throw new Error("taskJson.github_issue_id must be a number");
    }
    if (!input.title || typeof input.title !== "string") {
      throw new Error("taskJson.title is required");
    }

    const existingIndex = findTaskIndex(tasks, input.github_issue_id);
    if (existingIndex !== -1) {
      throw new Error(`Task already exists for github_issue_id=${input.github_issue_id}`);
    }

    const created: Task = {
      ...input,
      sub_tasks: Array.isArray(input.sub_tasks) ? input.sub_tasks : [],
      blocked_reason: typeof input.blocked_reason === "string" ? input.blocked_reason : "",
      created_at: input.created_at ?? nowIso(),
      updated_at: nowIso(),
      closed_at: input.closed_at ?? "",
    };

    tasks.push(created);
    await writeTasks(filePath, tasks);
    printJson(created);
    return;
  }

  // *******UPDATE*******
  if (command === "update-task") {
    if (!args[0] || !args[1]) {
      throw new Error("Usage: update-task <githubIssueId> <patchJson>");
    }

    const githubIssueId = toNumber(args[0], "githubIssueId");
    const patch = parseJsonArg<Partial<Task>>(args[1], "patchJson");
    const index = findTaskIndex(tasks, githubIssueId);
    if (index === -1) {
      throw new Error(`Task not found for github_issue_id=${githubIssueId}`);
    }

    tasks[index] = {
      ...tasks[index],
      ...patch,
      github_issue_id: tasks[index].github_issue_id,
      updated_at: nowIso(),
    };

    await writeTasks(filePath, tasks);
    printJson(tasks[index]);
    return;
  }

  if (command === "set-status") {
    if (!args[0] || !args[1]) {
      throw new Error("Usage: set-status <githubIssueId> <status> [blockedReason]");
    }

    const githubIssueId = toNumber(args[0], "githubIssueId");
    const nextStatus = args[1] as TaskStatus;
    const blockedReason = args[2];
    const index = findTaskIndex(tasks, githubIssueId);
    if (index === -1) {
      throw new Error(`Task not found for github_issue_id=${githubIssueId}`);
    }

    const current = tasks[index];
    current.status = nextStatus;
    current.blocked_reason = nextStatus === "blocked" ? blockedReason ?? current.blocked_reason ?? "" : "";
    current.closed_at = nextStatus === "done" || nextStatus === "cancelled" ? nowIso() : "";
    current.updated_at = nowIso();

    await writeTasks(filePath, tasks);
    printJson(current);
    return;
  }

  // *******DELETE*******
  if (command === "delete-task") {
    if (!args[0]) {
      throw new Error("Missing githubIssueId");
    }
    const githubIssueId = toNumber(args[0], "githubIssueId");
    const index = findTaskIndex(tasks, githubIssueId);
    if (index === -1) {
      throw new Error(`Task not found for github_issue_id=${githubIssueId}`);
    }

    const [deleted] = tasks.splice(index, 1);
    await writeTasks(filePath, tasks);
    printJson(deleted);
    return;
  }

  // *******SUB_TASKS*******
  if (command === "add-sub-task") {
    if (!args[0] || !args[1]) {
      throw new Error("Usage: add-sub-task <githubIssueId> <subTaskJson>");
    }

    const githubIssueId = toNumber(args[0], "githubIssueId");
    const subTaskInput = parseJsonArg<Record<string, unknown>>(args[1], "subTaskJson");
    const index = findTaskIndex(tasks, githubIssueId);
    if (index === -1) {
      throw new Error(`Task not found for github_issue_id=${githubIssueId}`);
    }

    const task = tasks[index];
    task.sub_tasks = Array.isArray(task.sub_tasks) ? task.sub_tasks : [];
    const nextId =
      task.sub_tasks.length === 0
        ? 1
        : Math.max(...task.sub_tasks.map((subTask) => Number(subTask.sub_task_id) || 0)) + 1;

    const createdSubTask: SubTask = {
      ...subTaskInput,
      sub_task_id: nextId,
    };

    task.sub_tasks.push(createdSubTask);
    task.updated_at = nowIso();
    await writeTasks(filePath, tasks);
    printJson(createdSubTask);
    return;
  }

  if (command === "update-sub-task") {
    if (!args[0] || !args[1] || !args[2]) {
      throw new Error("Usage: update-sub-task <githubIssueId> <subTaskId> <patchJson>");
    }

    const githubIssueId = toNumber(args[0], "githubIssueId");
    const subTaskId = toNumber(args[1], "subTaskId");
    const patch = parseJsonArg<Record<string, unknown>>(args[2], "patchJson");
    const index = findTaskIndex(tasks, githubIssueId);
    if (index === -1) {
      throw new Error(`Task not found for github_issue_id=${githubIssueId}`);
    }

    const task = tasks[index];
    task.sub_tasks = Array.isArray(task.sub_tasks) ? task.sub_tasks : [];
    const subTaskIndex = task.sub_tasks.findIndex((subTask) => subTask.sub_task_id === subTaskId);
    if (subTaskIndex === -1) {
      throw new Error(`Sub-task not found: sub_task_id=${subTaskId}`);
    }

    task.sub_tasks[subTaskIndex] = {
      ...task.sub_tasks[subTaskIndex],
      ...patch,
      sub_task_id: task.sub_tasks[subTaskIndex].sub_task_id,
    };
    task.updated_at = nowIso();

    await writeTasks(filePath, tasks);
    printJson(task.sub_tasks[subTaskIndex]);
    return;
  }

  if (command === "delete-sub-task") {
    if (!args[0] || !args[1]) {
      throw new Error("Usage: delete-sub-task <githubIssueId> <subTaskId>");
    }

    const githubIssueId = toNumber(args[0], "githubIssueId");
    const subTaskId = toNumber(args[1], "subTaskId");
    const index = findTaskIndex(tasks, githubIssueId);
    if (index === -1) {
      throw new Error(`Task not found for github_issue_id=${githubIssueId}`);
    }

    const task = tasks[index];
    task.sub_tasks = Array.isArray(task.sub_tasks) ? task.sub_tasks : [];
    const subTaskIndex = task.sub_tasks.findIndex((subTask) => subTask.sub_task_id === subTaskId);
    if (subTaskIndex === -1) {
      throw new Error(`Sub-task not found: sub_task_id=${subTaskId}`);
    }

    const [deletedSubTask] = task.sub_tasks.splice(subTaskIndex, 1);
    task.updated_at = nowIso();
    await writeTasks(filePath, tasks);
    printJson(deletedSubTask);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
