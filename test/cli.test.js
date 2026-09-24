'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { REPO_ROOT, tempDir, copyRepo, runCli, readJson } = require('./helpers');

const MARKER = '.huante-skills.json';

test('list shows pr-fix as not installed', () => {
  const r = runCli(REPO_ROOT, ['list'], { configDir: tempDir('cfg') });
  assert.strictEqual(r.code, 0, r.stderr);
  assert.match(r.stdout, /pr-fix\s+v\d+\.\d+\.\d+\s+no instalada/);
});

test('install copies the skill with a marker and refuses to overwrite without --force', () => {
  const configDir = tempDir('cfg');
  const r = runCli(REPO_ROOT, ['install', 'pr-fix'], { configDir });
  assert.strictEqual(r.code, 0, r.stderr);
  const target = path.join(configDir, 'skills', 'pr-fix');
  assert.ok(fs.existsSync(path.join(target, 'SKILL.md')));
  const marker = readJson(path.join(target, MARKER));
  assert.strictEqual(marker.package, 'huante-skills');
  assert.strictEqual(marker.skill, 'pr-fix');

  const again = runCli(REPO_ROOT, ['install', 'pr-fix'], { configDir });
  assert.strictEqual(again.code, 1, 'without a TTY the overwrite prompt must count as "no"');
  assert.match(again.stdout, /Omitida pr-fix/);

  const forced = runCli(REPO_ROOT, ['install', 'pr-fix', '--force'], { configDir });
  assert.strictEqual(forced.code, 0, forced.stderr);

  const list = runCli(REPO_ROOT, ['list'], { configDir });
  assert.match(list.stdout, /pr-fix\s+v\S+\s+global v/);
});

test('install without names and without a TTY fails cleanly', () => {
  const r = runCli(REPO_ROOT, ['install'], { configDir: tempDir('cfg') });
  assert.strictEqual(r.code, 1);
  assert.match(r.stderr, /falta el nombre de la skill/);
});

test('install and uninstall reject unknown and path-like names', () => {
  const configDir = tempDir('cfg');
  const unknown = runCli(REPO_ROOT, ['install', 'nope'], { configDir });
  assert.strictEqual(unknown.code, 1);
  assert.match(unknown.stderr, /no existe/);
  const traversal = runCli(REPO_ROOT, ['uninstall', '../x', '--force'], { configDir });
  assert.strictEqual(traversal.code, 1);
  assert.match(traversal.stderr, /nombre de skill inválido/);
});

test('--project installs into ./.claude/skills of the current directory', () => {
  const cwd = tempDir('proj');
  const r = runCli(REPO_ROOT, ['install', 'pr-fix', '--project'], { configDir: tempDir('cfg'), cwd });
  assert.strictEqual(r.code, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(cwd, '.claude', 'skills', 'pr-fix', 'SKILL.md')));
});

test('update picks up a new version from the repository', () => {
  const root = copyRepo();
  const configDir = tempDir('cfg');
  assert.strictEqual(runCli(root, ['install', 'pr-fix'], { configDir }).code, 0);

  const manifestFile = path.join(root, 'plugins/pr-fix/.claude-plugin/plugin.json');
  const manifest = readJson(manifestFile);
  const oldVersion = manifest.version;
  manifest.version = '9.9.9';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  fs.appendFileSync(path.join(root, 'plugins/pr-fix/skills/pr-fix/SKILL.md'), '\n<!-- updated -->\n');

  const r = runCli(root, ['update'], { configDir });
  assert.strictEqual(r.code, 0, r.stderr);
  assert.ok(r.stdout.includes(`v${oldVersion} → v9.9.9`), r.stdout);
  const target = path.join(configDir, 'skills', 'pr-fix');
  assert.strictEqual(readJson(path.join(target, MARKER)).version, '9.9.9');
  assert.match(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), /<!-- updated -->/);
});

test('update and uninstall never touch skills not installed by huante-skills', () => {
  const configDir = tempDir('cfg');
  const own = path.join(configDir, 'skills', 'pr-fix');
  fs.mkdirSync(own, { recursive: true });
  fs.writeFileSync(path.join(own, 'SKILL.md'), 'mine');

  const update = runCli(REPO_ROOT, ['update', 'pr-fix'], { configDir });
  assert.strictEqual(update.code, 1);
  assert.match(update.stderr, /no fue instalada por huante-skills/);
  const uninstall = runCli(REPO_ROOT, ['uninstall', 'pr-fix', '--force'], { configDir });
  assert.strictEqual(uninstall.code, 1);
  assert.strictEqual(fs.readFileSync(path.join(own, 'SKILL.md'), 'utf8'), 'mine');
});

test('uninstall removes a managed skill', () => {
  const configDir = tempDir('cfg');
  runCli(REPO_ROOT, ['install', 'pr-fix'], { configDir });
  const r = runCli(REPO_ROOT, ['uninstall', 'pr-fix', '--force'], { configDir });
  assert.strictEqual(r.code, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(configDir, 'skills', 'pr-fix')));
});

test('uninstall without --force and without a TTY keeps the skill', () => {
  const configDir = tempDir('cfg');
  runCli(REPO_ROOT, ['install', 'pr-fix'], { configDir });
  const r = runCli(REPO_ROOT, ['uninstall', 'pr-fix'], { configDir });
  assert.strictEqual(r.code, 1);
  assert.ok(fs.existsSync(path.join(configDir, 'skills', 'pr-fix', 'SKILL.md')));
});
