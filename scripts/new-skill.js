#!/usr/bin/env node
'use strict';

// Scaffolds a new skill as its own plugin and registers it in the marketplace.
// Usage: node scripts/new-skill.js <name> "<description>" [repo-root]

const fs = require('fs');
const path = require('path');
const { NAME_RE, readMarketplace } = require('../lib/catalog');

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const [name, description, rootArg] = process.argv.slice(2);
const root = path.resolve(rootArg || path.join(__dirname, '..'));

if (!name || !description) fail('uso: node scripts/new-skill.js <nombre> "<descripción>"');
if (!NAME_RE.test(name) || name.length > 64) fail(`nombre inválido "${name}": usa kebab-case, máximo 64 caracteres`);

const pluginDir = path.join(root, 'plugins', name);
if (fs.existsSync(pluginDir)) fail(`plugins/${name} ya existe`);

const marketplaceFile = path.join(root, '.claude-plugin', 'marketplace.json');
const marketplace = readMarketplace(root);
if (marketplace.plugins.some((p) => p.name === name)) fail(`"${name}" ya está en marketplace.json`);

const skillDir = path.join(pluginDir, 'skills', name);
fs.mkdirSync(path.join(pluginDir, '.claude-plugin'), { recursive: true });
fs.mkdirSync(skillDir, { recursive: true });

const plugin = {
  name,
  version: '0.1.0',
  description,
  author: marketplace.owner,
  license: 'MIT',
};
fs.writeFileSync(path.join(pluginDir, '.claude-plugin', 'plugin.json'), JSON.stringify(plugin, null, 2) + '\n');

const skill = `---
name: ${name}
description: ${JSON.stringify(description)}
---

# /${name}

Describe what this skill does, the steps Claude must follow and the rules it must respect.
`;
fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skill);

marketplace.plugins.push({ name, description, source: `./plugins/${name}`, category: 'development' });
fs.writeFileSync(marketplaceFile, JSON.stringify(marketplace, null, 2) + '\n');

console.log(`✓ Creado plugins/${name}/ (plugin.json + skills/${name}/SKILL.md) y registrado en marketplace.json`);
console.log('  Siguiente: escribe el SKILL.md y ejecuta npm test.');
