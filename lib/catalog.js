'use strict';

// Reads the repository catalog: .claude-plugin/marketplace.json lists the
// plugins, and every plugin ships one or more skills under
// plugins/<plugin>/skills/<skill>/SKILL.md. Used by the CLI, the validator
// and the tests, so all of them agree on what a valid skill is.

const fs = require('fs');
const path = require('path');

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Minimal YAML frontmatter parser: flat `key: value` pairs, optionally quoted.
// Enough for SKILL.md headers; anything nested is kept as raw text.
function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    data[kv[1]] = value;
  }
  return { data, body: text.slice(match[0].length) };
}

function readMarketplace(root) {
  return readJson(path.join(root, '.claude-plugin', 'marketplace.json'));
}

function pluginDirFromSource(root, source) {
  if (typeof source !== 'string' || !source.startsWith('./')) return null;
  return path.resolve(root, source);
}

function listPlugins(root) {
  const marketplace = readMarketplace(root);
  return (marketplace.plugins || []).map((entry) => {
    const dir = pluginDirFromSource(root, entry.source);
    const manifestPath = dir && path.join(dir, '.claude-plugin', 'plugin.json');
    const manifest = manifestPath && fs.existsSync(manifestPath) ? readJson(manifestPath) : null;
    return { name: entry.name, entry, dir, manifest };
  });
}

function listSkills(root) {
  const skills = [];
  for (const plugin of listPlugins(root)) {
    const skillsDir = plugin.dir && path.join(plugin.dir, 'skills');
    if (!skillsDir || !fs.existsSync(skillsDir)) continue;
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(skillsDir, entry.name);
      const skillFile = path.join(dir, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      const fm = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
      skills.push({
        name: entry.name,
        plugin: plugin.name,
        version: plugin.manifest && plugin.manifest.version,
        dir,
        frontmatter: fm ? fm.data : null,
      });
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function findSymlinks(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) found.push(full);
    else if (entry.isDirectory()) found.push(...findSymlinks(full));
  }
  return found;
}

function validateRepo(root) {
  const errors = [];
  const warnings = [];
  const rel = (p) => path.relative(root, p).split(path.sep).join('/');

  let marketplace;
  try {
    marketplace = readMarketplace(root);
  } catch (err) {
    return { errors: [`.claude-plugin/marketplace.json: ${err.message}`], warnings };
  }
  if (!NAME_RE.test(marketplace.name || '')) errors.push('marketplace.json: "name" debe estar en kebab-case');
  if (!marketplace.owner || !marketplace.owner.name) errors.push('marketplace.json: "owner.name" es obligatorio');
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    errors.push('marketplace.json: "plugins" debe ser un arreglo no vacío');
    return { errors, warnings };
  }

  const pluginNames = new Set();
  const listedDirs = new Set();
  for (const plugin of listPlugins(root)) {
    const where = `marketplace plugin "${plugin.name}"`;
    if (!NAME_RE.test(plugin.name || '')) errors.push(`${where}: el nombre debe estar en kebab-case`);
    if (pluginNames.has(plugin.name)) errors.push(`${where}: nombre de plugin duplicado`);
    pluginNames.add(plugin.name);
    if (!plugin.entry.description) errors.push(`${where}: "description" es obligatorio`);
    if (plugin.entry.source !== `./plugins/${plugin.name}`) {
      errors.push(`${where}: "source" debe ser "./plugins/${plugin.name}"`);
    }
    if (!plugin.dir || !fs.existsSync(plugin.dir)) {
      errors.push(`${where}: el directorio ${plugin.entry.source} no existe`);
      continue;
    }
    listedDirs.add(path.resolve(plugin.dir));
    if (!plugin.manifest) {
      errors.push(`${where}: falta .claude-plugin/plugin.json`);
      continue;
    }
    if (plugin.manifest.name !== plugin.name) {
      errors.push(`${rel(plugin.dir)}/.claude-plugin/plugin.json: "name" debe ser "${plugin.name}"`);
    }
    if (!SEMVER_RE.test(plugin.manifest.version || '')) {
      errors.push(`${rel(plugin.dir)}/.claude-plugin/plugin.json: "version" debe ser semver (x.y.z)`);
    }
    const links = findSymlinks(plugin.dir);
    for (const link of links) errors.push(`${rel(link)}: no se permiten enlaces simbólicos`);
    const skillsDir = path.join(plugin.dir, 'skills');
    const hasSkill =
      fs.existsSync(skillsDir) &&
      fs.readdirSync(skillsDir, { withFileTypes: true }).some((e) => e.isDirectory());
    if (!hasSkill) errors.push(`${where}: no hay skills en ${rel(skillsDir)}/`);
  }

  const pluginsRoot = path.join(root, 'plugins');
  if (fs.existsSync(pluginsRoot)) {
    for (const entry of fs.readdirSync(pluginsRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && !listedDirs.has(path.resolve(pluginsRoot, entry.name))) {
        errors.push(`plugins/${entry.name}: no está registrado en .claude-plugin/marketplace.json`);
      }
    }
  }

  const skillNames = new Map();
  for (const plugin of listPlugins(root)) {
    const skillsDir = plugin.dir && path.join(plugin.dir, 'skills');
    if (!skillsDir || !fs.existsSync(skillsDir)) continue;
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
      const where = rel(skillFile);
      if (!fs.existsSync(skillFile)) {
        errors.push(`${where}: no existe`);
        continue;
      }
      if (skillNames.has(entry.name)) {
        errors.push(`${where}: el nombre de skill "${entry.name}" ya se usa en el plugin "${skillNames.get(entry.name)}"`);
      }
      skillNames.set(entry.name, plugin.name);
      const fm = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
      if (!fm) {
        errors.push(`${where}: falta el frontmatter YAML (--- ... ---)`);
        continue;
      }
      const { name, description } = fm.data;
      if (name !== entry.name) errors.push(`${where}: el "name" del frontmatter debe ser "${entry.name}"`);
      if (!NAME_RE.test(name || '') || name.length > MAX_NAME) {
        errors.push(`${where}: "name" debe estar en kebab-case, máximo ${MAX_NAME} caracteres`);
      }
      if (!description) errors.push(`${where}: el "description" del frontmatter es obligatorio`);
      else if (description.length > MAX_DESCRIPTION) {
        errors.push(`${where}: "description" supera ${MAX_DESCRIPTION} caracteres`);
      }
      if (!fm.body.trim()) errors.push(`${where}: el cuerpo está vacío`);
    }
  }

  return { errors, warnings };
}

module.exports = {
  NAME_RE,
  SEMVER_RE,
  parseFrontmatter,
  readMarketplace,
  listPlugins,
  listSkills,
  findSymlinks,
  validateRepo,
};
