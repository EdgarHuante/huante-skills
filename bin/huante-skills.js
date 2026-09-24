#!/usr/bin/env node
'use strict';

// Standalone installer: copies skills from this repository into Claude Code's
// skills directory (~/.claude/skills/<skill>/ or ./.claude/skills/<skill>/),
// so they run as /<skill>. The plugin marketplace is the other install path;
// see README.md. User-facing messages are in Spanish.

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { execFileSync, execSync } = require('child_process');
const catalog = require('../lib/catalog');

const ROOT = path.resolve(__dirname, '..');
const PKG = require(path.join(ROOT, 'package.json'));
const MARKER = '.huante-skills.json';

const USAGE = `Uso: huante-skills <comando> [skills...] [opciones]

Comandos:
  list                    Lista las skills disponibles y dónde están instaladas
  install [skills...]     Instala skills (sin nombres: selección interactiva)
  update [skills...]      Actualiza skills instaladas (sin nombres: todas)
  uninstall <skills...>   Elimina skills instaladas
  doctor                  Revisa el entorno (Node, Claude Code, gh)

Opciones:
  -a, --all               install: todas las skills del repositorio
  -p, --project           Usa ./.claude/skills del directorio actual
                          en lugar de ~/.claude/skills
  -f, --force             Sobrescribe o elimina sin preguntar
  -h, --help              Muestra esta ayuda
  -v, --version           Muestra la versión

Directorio de skills: $CLAUDE_CONFIG_DIR/skills si está definido; si no, ~/.claude/skills.`;

class CliError extends Error {}

function parseArgs(argv) {
  const args = { command: null, names: [], all: false, project: false, force: false, help: false, version: false };
  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') args.help = true;
    else if (arg === '-v' || arg === '--version') args.version = true;
    else if (arg === '-a' || arg === '--all') args.all = true;
    else if (arg === '-p' || arg === '--project') args.project = true;
    else if (arg === '-f' || arg === '--force') args.force = true;
    else if (arg.startsWith('-')) throw new CliError(`opción desconocida: ${arg}`);
    else if (!args.command) args.command = arg;
    else args.names.push(arg);
  }
  return args;
}

function globalSkillsDir() {
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return path.join(configDir, 'skills');
}

function projectSkillsDir() {
  return path.join(process.cwd(), '.claude', 'skills');
}

function destDir(args) {
  return args.project ? projectSkillsDir() : globalSkillsDir();
}

function readMarker(dir) {
  if (!fs.existsSync(dir)) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, MARKER), 'utf8'));
  } catch {
    return {}; // exists but was not installed by us
  }
}

function isManaged(marker) {
  return Boolean(marker && marker.package === PKG.name);
}

function gitRevision() {
  try {
    return execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function confirm(question) {
  if (!process.stdin.isTTY) return Promise.resolve(false);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [s/N] `, (answer) => {
      rl.close();
      resolve(/^(s|si|sí|y|yes)$/i.test(answer.trim()));
    });
  });
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function assertName(name) {
  if (!catalog.NAME_RE.test(name)) throw new CliError(`nombre de skill inválido: "${name}"`);
}

function resolveSkills(names) {
  const skills = catalog.listSkills(ROOT);
  const byName = new Map(skills.map((s) => [s.name, s]));
  return names.map((name) => {
    assertName(name);
    const skill = byName.get(name);
    if (!skill) {
      const list = skills.map((s) => s.name).join(', ') || '(ninguna)';
      throw new CliError(`la skill "${name}" no existe. Disponibles: ${list}`);
    }
    return skill;
  });
}

async function pickSkills() {
  const skills = catalog.listSkills(ROOT);
  if (!process.stdin.isTTY) {
    throw new CliError('falta el nombre de la skill (no hay terminal interactiva). Uso: huante-skills install <skill> | --all');
  }
  console.log('Skills disponibles:\n');
  skills.forEach((s, i) => {
    const description = (s.frontmatter && s.frontmatter.description) || '';
    const short = description.length > 70 ? `${description.slice(0, 70)}…` : description;
    console.log(`  ${String(i + 1).padStart(2)}) ${s.name.padEnd(20)} ${short}`);
  });
  const answer = await ask('\nSkills a instalar (números o nombres separados por coma; "all" para todas; vacío para cancelar): ');
  if (!answer) return [];
  if (answer.toLowerCase() === 'all') return skills;
  const names = answer.split(/[\s,]+/).filter(Boolean).map((token) => {
    const index = Number(token);
    if (Number.isInteger(index) && index >= 1 && index <= skills.length) return skills[index - 1].name;
    return token;
  });
  return resolveSkills([...new Set(names)]);
}

function copySkill(skill, dest) {
  if (catalog.findSymlinks(skill.dir).length) {
    throw new CliError(`no se instala "${skill.name}": contiene enlaces simbólicos`);
  }
  const target = path.join(dest, skill.name);
  const staging = `${target}.tmp-${process.pid}`;
  fs.mkdirSync(dest, { recursive: true });
  fs.rmSync(staging, { recursive: true, force: true });
  fs.cpSync(skill.dir, staging, { recursive: true });
  const marker = {
    package: PKG.name,
    skill: skill.name,
    plugin: skill.plugin,
    version: skill.version,
    revision: gitRevision(),
    installedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(staging, MARKER), JSON.stringify(marker, null, 2) + '\n');
  fs.rmSync(target, { recursive: true, force: true });
  fs.renameSync(staging, target);
  return target;
}

async function cmdInstall(args) {
  const dest = destDir(args);
  let skills;
  if (args.all) skills = catalog.listSkills(ROOT);
  else if (args.names.length) skills = resolveSkills(args.names);
  else skills = await pickSkills();
  if (!skills.length) {
    console.log('No se seleccionó nada. No se cambió nada.');
    return 1;
  }

  let failed = 0;
  for (const skill of skills) {
    const target = path.join(dest, skill.name);
    const marker = readMarker(target);
    if (marker && !args.force) {
      const what = isManaged(marker) ? `ya está instalada (v${marker.version})` : 'ya existe y NO la instaló huante-skills';
      const ok = await confirm(`"${skill.name}" ${what} en ${target}. ¿Sobrescribir?`);
      if (!ok) {
        console.log(`- Omitida ${skill.name} (usa --force para sobrescribir).`);
        failed++;
        continue;
      }
    }
    copySkill(skill, dest);
    console.log(`✓ Instalada ${skill.name} v${skill.version} en ${target}`);
  }
  if (failed < skills.length) {
    console.log(`\nAbre una nueva sesión de Claude Code (o reiníciala) y ejecuta la skill, p. ej. /${skills[0].name}`);
  }
  return failed ? 1 : 0;
}

function installedManaged(dest) {
  if (!fs.existsSync(dest)) return [];
  return fs
    .readdirSync(dest, { withFileTypes: true })
    .filter((e) => e.isDirectory() && isManaged(readMarker(path.join(dest, e.name))))
    .map((e) => e.name);
}

function cmdUpdate(args) {
  const dest = destDir(args);
  const names = args.names.length ? args.names : installedManaged(dest);
  if (!names.length) {
    console.log(`No hay skills instaladas por ${PKG.name} en ${dest}.`);
    return 0;
  }
  const available = new Set(catalog.listSkills(ROOT).map((s) => s.name));
  let failed = 0;
  for (const name of names) {
    assertName(name);
    const target = path.join(dest, name);
    const marker = readMarker(target);
    if (!marker) {
      console.error(`✗ ${name} no está instalada en ${target}. Ejecuta: huante-skills install ${name}`);
      failed++;
      continue;
    }
    if (!isManaged(marker)) {
      console.error(`✗ ${target} no fue instalada por ${PKG.name}; no se toca. Usa "install ${name} --force" para reemplazarla.`);
      failed++;
      continue;
    }
    if (!available.has(name)) {
      console.error(`✗ ${name} ya no existe en este repositorio. Elimínala con: huante-skills uninstall ${name}`);
      failed++;
      continue;
    }
    const [skill] = resolveSkills([name]);
    copySkill(skill, dest);
    const from = marker.version === skill.version ? `v${skill.version}` : `v${marker.version} → v${skill.version}`;
    console.log(`✓ Actualizada ${name} ${from} en ${target}`);
  }
  return failed ? 1 : 0;
}

async function cmdUninstall(args) {
  if (!args.names.length) throw new CliError('falta el nombre de la skill. Uso: huante-skills uninstall <skill>');
  const dest = destDir(args);
  let failed = 0;
  for (const name of args.names) {
    assertName(name);
    const target = path.join(dest, name);
    const marker = readMarker(target);
    if (!marker) {
      console.error(`✗ ${name} no está instalada en ${target}`);
      failed++;
      continue;
    }
    if (!isManaged(marker)) {
      console.error(`✗ ${target} no fue instalada por ${PKG.name}. No se elimina.`);
      failed++;
      continue;
    }
    if (!args.force && !(await confirm(`¿Eliminar ${target}?`))) {
      console.log(`- Se conserva ${name}.`);
      failed++;
      continue;
    }
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`✓ Desinstalada ${name} de ${target}`);
  }
  return failed ? 1 : 0;
}

function statusIn(dir, name) {
  const marker = readMarker(path.join(dir, name));
  if (!marker) return null;
  return isManaged(marker) ? `v${marker.version}` : 'no gestionada';
}

function cmdList() {
  const skills = catalog.listSkills(ROOT);
  const globalDir = globalSkillsDir();
  const projectDir = projectSkillsDir();
  console.log(`Skills en ${PKG.name} ${PKG.version}:\n`);
  for (const skill of skills) {
    const where = [];
    const g = statusIn(globalDir, skill.name);
    const p = statusIn(projectDir, skill.name);
    if (g) where.push(`global ${g}`);
    if (p) where.push(`proyecto ${p}`);
    const status = where.length ? where.join(', ') : 'no instalada';
    console.log(`  ${skill.name.padEnd(20)} v${String(skill.version).padEnd(8)} ${status}`);
  }
  console.log(`\nGlobal:   ${globalDir}\nProyecto: ${projectDir}`);
  return 0;
}

// Fixed command strings only (no user input); the shell resolves .cmd shims on Windows.
function probe(command) {
  try {
    const out = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, out: out.trim().split(/\r?\n/)[0] };
  } catch (err) {
    return { ok: false, out: (err.stderr || err.message || '').toString().trim().split(/\r?\n/)[0] };
  }
}

function cmdDoctor() {
  const lines = [];
  const major = Number(process.versions.node.split('.')[0]);
  lines.push([major >= 18, `Node.js ${process.versions.node}`, 'se requiere Node 18+']);
  const claude = probe('claude --version');
  lines.push([claude.ok, `Claude Code: ${claude.ok ? claude.out : 'no está en el PATH'}`, 'https://claude.com/claude-code']);
  const gh = probe('gh --version');
  lines.push([gh.ok, `GitHub CLI: ${gh.ok ? gh.out : 'no está en el PATH'}`, 'lo necesita pr-fix: https://cli.github.com']);
  if (gh.ok) {
    const auth = probe('gh auth status');
    lines.push([auth.ok, `gh auth: ${auth.ok ? 'sesión iniciada' : 'sin sesión'}`, 'ejecuta: gh auth login']);
  }
  const { errors } = catalog.validateRepo(ROOT);
  lines.push([errors.length === 0, `Catálogo: ${errors.length ? `${errors.length} error(es)` : 'válido'}`, 'ejecuta: npm run validate']);
  lines.push([true, `Directorio de skills: ${globalSkillsDir()}`, '']);
  let bad = 0;
  for (const [ok, text, hint] of lines) {
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${text}${ok || !hint ? '' : `  (${hint})`}`);
  }
  return bad ? 1 : 0;
}

const COMMANDS = {
  list: cmdList,
  install: cmdInstall,
  update: cmdUpdate,
  uninstall: cmdUninstall,
  doctor: cmdDoctor,
};

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}\n\n${USAGE}`);
    return 1;
  }
  if (args.version) {
    console.log(PKG.version);
    return 0;
  }
  if (args.help || !args.command) {
    console.log(USAGE);
    return args.help ? 0 : 1;
  }
  const handler = COMMANDS[args.command];
  if (!handler) {
    console.error(`Error: comando desconocido "${args.command}"\n\n${USAGE}`);
    return 1;
  }
  try {
    return (await handler(args)) ?? 0;
  } catch (err) {
    if (!(err instanceof CliError)) throw err;
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

main().then((code) => process.exit(code));
