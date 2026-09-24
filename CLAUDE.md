# CLAUDE.md

Repository of Claude Code skills distributed as a plugin marketplace and through the `huante-skills` CLI.

## Layout

- `.claude-plugin/marketplace.json` — catalog. One plugin per skill, `source: "./plugins/<name>"`.
- `plugins/<name>/.claude-plugin/plugin.json` — plugin manifest; `version` (semver) drives `/plugin update`.
- `plugins/<name>/skills/<name>/SKILL.md` — the skill. Frontmatter `name` must equal the folder name.
- `lib/catalog.js` — single source of truth for reading/validating the catalog (used by CLI, scripts, tests).
- `bin/huante-skills.js` — zero-dependency installer CLI. User-facing messages in Spanish.

## Rules

- No npm dependencies. Node 18+ built-ins only.
- New skill: `npm run new-skill -- <name> "<description>"` (creates the plugin and registers it in the marketplace).
- Changing a skill: bump its `plugin.json` version and add a `CHANGELOG.md` entry.
- SKILL.md files are written in English; README, SECURITY and CHANGELOG in Spanish.
- Run `npm test` before committing (includes `claude plugin validate` when `claude` is on PATH).
