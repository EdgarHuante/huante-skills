'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const catalog = require('../lib/catalog');
const { REPO_ROOT, copyRepo, tempDir, runCli } = require('./helpers');

function scaffold(root, ...args) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'new-skill.js'), ...args, root], {
    encoding: 'utf8',
  });
}

test('adding a second skill keeps the catalog valid and installable', () => {
  const root = copyRepo();
  const r = scaffold(root, 'demo-skill', 'Demo skill used by the tests.');
  assert.strictEqual(r.status, 0, r.stderr);

  assert.deepStrictEqual(catalog.validateRepo(root).errors, []);
  const names = catalog.listSkills(root).map((s) => s.name);
  const existing = catalog.listSkills(REPO_ROOT).map((s) => s.name);
  assert.deepStrictEqual(names, ['demo-skill', ...existing].sort());

  const configDir = tempDir('cfg');
  const install = runCli(root, ['install', '--all'], { configDir });
  assert.strictEqual(install.code, 0, install.stderr);
  for (const name of names) {
    assert.ok(fs.existsSync(path.join(configDir, 'skills', name, 'SKILL.md')), `${name} not installed`);
  }
  const update = runCli(root, ['update'], { configDir });
  assert.strictEqual(update.code, 0, update.stderr);
  assert.match(update.stdout, /Actualizada demo-skill/);
  assert.match(update.stdout, /Actualizada pr-fix/);
});

test('new-skill refuses duplicates and invalid names', () => {
  const root = copyRepo();
  assert.strictEqual(scaffold(root, 'pr-fix', 'duplicate').status, 1);
  assert.strictEqual(scaffold(root, 'Bad_Name', 'invalid').status, 1);
});
