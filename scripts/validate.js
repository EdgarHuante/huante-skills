#!/usr/bin/env node
'use strict';

// Validates the catalog: marketplace.json, every plugin.json and every SKILL.md.
// Usage: node scripts/validate.js [repo-root]

const path = require('path');
const { validateRepo, listSkills } = require('../lib/catalog');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const { errors, warnings } = validateRepo(root);

for (const warning of warnings) console.warn(`! ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`);
  console.error(`\n${errors.length} error(es).`);
  process.exit(1);
}
const skills = listSkills(root);
console.log(`✓ Catálogo válido: ${skills.length} skill(s): ${skills.map((s) => s.name).join(', ')}`);
