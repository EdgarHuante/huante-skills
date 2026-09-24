'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `huante-skills-${prefix}-`));
}

// Copy of the repository without .git / node_modules, to mutate safely in tests.
function copyRepo() {
  const dest = path.join(tempDir('repo'), 'repo');
  fs.cpSync(REPO_ROOT, dest, {
    recursive: true,
    filter: (src) =>
      !path.relative(REPO_ROOT, src).split(path.sep).some((part) => part === '.git' || part === 'node_modules'),
  });
  return dest;
}

// Runs the CLI of `root` with an isolated Claude config dir and no TTY.
function runCli(root, args, { configDir, cwd } = {}) {
  const result = spawnSync(process.execPath, [path.join(root, 'bin', 'huante-skills.js'), ...args], {
    cwd: cwd || root,
    encoding: 'utf8',
    input: '',
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { REPO_ROOT, tempDir, copyRepo, runCli, readJson };
