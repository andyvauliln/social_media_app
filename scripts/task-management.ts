#!/usr/bin/env -S npx tsx
// @ts-nocheck

import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "jsonc-parser";

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

const DEFAULT_TASKS_FILE = "agents/agent.manager/tasks/tasks.index.jsonc";

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
  return path.resolve(process.cwd(), fileArg ?? DEFAULT_TASKS_FILE);
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
  npm run task-management -- <command> [args]
  npx tsx ./scripts/task-management.ts <command> [args]

Commands:
  list-tasks [filtersJson]
  get-task <githubIssueId>
  create-task <taskJson>
  update-task <githubIssueId> <patchJson>
  delete-task <githubIssueId>
  set-status <githubIssueId> <status> [blockedReason]
  add-sub-task <githubIssueId> <subTaskJson>
  update-sub-task <githubIssueId> <subTaskId> <patchJson>
  delete-sub-task <githubIssueId> <subTaskId>

Options:
  --file <path>   custom tasks index file

Example:
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

async function main(): Promise<void> {
  const { cleanArgs, filePath: fileArg } = extractFileOption(process.argv.slice(2));
  const [command, ...args] = cleanArgs;
  const filePath = resolveFilePath(fileArg);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
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
    printJson(task);
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
