'use strict';

// Runs Claude Code's own validator when the `claude` CLI is on PATH.
// Set SKIP_CLAUDE_VALIDATE=1 to skip it (e.g. in CI without Claude Code).

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const catalog = require('../lib/catalog');
const { REPO_ROOT } = require('./helpers');

// One command string with shell: true resolves claude.cmd on Windows without the DEP0190 warning.
function claude(args) {
  const r = spawnSync(`claude ${args}`, { encoding: 'utf8', shell: true });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const available = !process.env.SKIP_CLAUDE_VALIDATE && claude('--version').code === 0;
const skip = available ? false : 'claude CLI not available';

function validate(target) {
  return claude(`plugin validate "${target}"`);
}

test('claude plugin validate accepts the marketplace', { skip }, () => {
  const r = validate(REPO_ROOT);
  assert.strictEqual(r.code, 0, r.out);
});

test('claude plugin validate accepts every plugin', { skip }, () => {
  for (const plugin of catalog.listPlugins(REPO_ROOT)) {
    const r = validate(plugin.dir);
    assert.strictEqual(r.code, 0, `${plugin.name}: ${r.out}`);
  }
});
