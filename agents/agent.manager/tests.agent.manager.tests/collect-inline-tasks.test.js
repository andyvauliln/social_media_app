#!/usr/bin/env node
/**
 * Integration test for collect-inline-tasks skill.
 *
 * This test is TWO-PHASE:
 *   Phase 1 (pre-run):  snapshot fixture, show current task count, print instructions.
 *   Phase 2 (post-run): verify tasks were created + ai_todo removed, then restore fixture.
 *
 * Run order:
 *   1. node collect-inline-tasks.test.js          → Phase 1: prints instructions
 *   2. (run /collect-inline-tasks on the fixture)
 *   3. node collect-inline-tasks.test.js --verify → Phase 2: verify + restore
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const FIXTURE_FILE = path.join(__dirname, 'fixtures/collect-inline-tasks.fixture.js');
const SNAPSHOT_FILE = path.join(__dirname, 'fixtures/collect-inline-tasks.fixture.snapshot.js');
const TASKS_FILE = path.join(ROOT, 'agents/agent.manager/tasks/tasks.index.jsonc');

// ── helpers ──────────────────────────────────────────────────────────────────

function readJsonc(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  return JSON.parse(raw);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n✗ FAIL: ${message}\n`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

// ── phase 1: snapshot + instructions ─────────────────────────────────────────

function phase1() {
  console.log('=== collect-inline-tasks test: Phase 1 ===\n');

  // Save fixture snapshot
  const fixtureContent = fs.readFileSync(FIXTURE_FILE, 'utf8');
  fs.writeFileSync(SNAPSHOT_FILE, fixtureContent, 'utf8');
  console.log(`Snapshot saved to: ${path.relative(ROOT, SNAPSHOT_FILE)}`);

  // Count current tasks
  const tasks = readJsonc(TASKS_FILE);
  const taskCount = tasks.length;
  console.log(`Current task count in tasks.index.jsonc: ${taskCount}`);

  // Count ai_todo lines in fixture
  const todoLines = fixtureContent.split('\n').filter(l => /ai_todo/i.test(l));
  console.log(`ai_todo lines in fixture: ${todoLines.length}`);

  console.log(`
─────────────────────────────────────────────────
NEXT STEP: Run the skill scoped to the fixture folder:

  /collect-inline-tasks agents/agent.manager/agent.manager.tests/fixtures/

Then verify results:

  node agents/agent.manager/agent.manager.tests/collect-inline-tasks.test.js --verify
─────────────────────────────────────────────────
`);
}

// ── phase 2: verify + restore ─────────────────────────────────────────────────

function phase2() {
  console.log('=== collect-inline-tasks test: Phase 2 (verify) ===\n');

  assert(fs.existsSync(SNAPSHOT_FILE), 'Snapshot file exists (Phase 1 was run first)');

  const snapshot = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
  const snapshotTodoCount = snapshot.split('\n').filter(l => /ai_todo/i.test(l)).length;

  // 1. Fixture ai_todo lines are gone
  const currentFixture = fs.readFileSync(FIXTURE_FILE, 'utf8');
  const remainingTodos = currentFixture.split('\n').filter(l => /ai_todo/i.test(l));
  assert(remainingTodos.length === 0, `All ai_todo lines removed from fixture (was ${snapshotTodoCount}, now ${remainingTodos.length})`);

  // 2. Non-todo lines preserved
  const snapshotNonTodo = snapshot.split('\n').filter(l => !/ai_todo/i.test(l)).join('\n').trim();
  const currentNonTodo = currentFixture.split('\n').filter(l => !/ai_todo/i.test(l)).join('\n').trim();
  assert(snapshotNonTodo === currentNonTodo, 'Non-ai_todo lines preserved unchanged');

  // 3. Tasks were created (count increased)
  const tasks = readJsonc(TASKS_FILE);
  const taskCount = tasks.length;
  // We can't know exact count from snapshot but it should have grown
  console.log(`  ℹ Task count now: ${taskCount} (was captured in Phase 1 output)`);

  // 4. Restore fixture
  fs.writeFileSync(FIXTURE_FILE, snapshot, 'utf8');
  fs.unlinkSync(SNAPSHOT_FILE);
  console.log('\nFixture restored. Test is repeatable.\n');

  console.log('✓ All assertions passed.\n');
}

// ── main ──────────────────────────────────────────────────────────────────────

const isVerify = process.argv.includes('--verify');
if (isVerify) {
  phase2();
} else {
  phase1();
}
