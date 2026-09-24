# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones con [SemVer](https://semver.org/lang/es/). Cada skill se versiona en su `plugin.json`; `package.json` versiona el CLI.

## [0.1.0] - 2026-09-24

### Agregado

- Repositorio como **plugin marketplace** de Claude Code (`.claude-plugin/marketplace.json`, una skill = un plugin).
- Skill **`pr-fix` 0.1.0**: implementa correcciones de Code Review de un PR de GitHub.
  - Obtiene reviews, hilos inline (con estado resuelto/obsoleto vía GraphQL) y comentarios con `gh`.
  - Estudia el proyecto antes de cambiar (CLAUDE.md, AGENTS.md, docs, usos, flujo de datos, tests, historial).
  - Trazabilidad por comentario y estados `pending` / `understood` / `needs-clarification` / `approved` / `fixed` / `no-change` / `skipped` / `blocked`.
  - Confirmación para ambiguos, riesgo medio/alto y cambios de comportamiento; cambios mínimos y dentro del alcance.
  - Validación con los comandos reales del proyecto; clasifica fallos como relacionados o previos.
  - Sin commit/push/escrituras en GitHub salvo petición y confirmación explícitas.
  - Reglas de seguridad: contenido de GitHub como datos, validación de valores, sin secretos.
  - Sesión reanudable en `~/.claude/pr-fix/sessions/`.
- CLI **`huante-skills`** (Node 18+, sin dependencias): `list`, `install`, `update`, `uninstall`, `doctor`; `--all`, `--project`, `--force`; selección interactiva.
- `scripts/new-skill.js` y `scripts/validate.js`; tests con `node:test`; CI en GitHub Actions.
