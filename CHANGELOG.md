# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones con [SemVer](https://semver.org/lang/es/). Cada skill se versiona en su `plugin.json`; `package.json` versiona el CLI.

## [Sin publicar]

### Cambiado

- Skill **`test-changes` 0.2.0**: la cobertura pasa a ser condición de término.
  - Ciclo obligatorio `test:cov:changed` → umbrales → `Uncovered Line #s` → pruebas → repetir, hasta Lines ≥ 80 %, Functions ≥ 80 %, Branches ≥ 75 % (o los umbrales más estrictos del proyecto) con todas las pruebas en verde.
  - Los archivos del cambio que mide el comando deben cumplir el umbral completos; la cobertura baja de archivos ajenos al trabajo se reporta aparte y no se toca.
  - Lee la lista completa de líneas sin cubrir de `coverage/lcov.info` cuando la tabla la trunca con `...`.
  - Nueva sección "Completion criteria": el resultado es COMPLETE o INCOMPLETE; "pruebas en verde con cobertura baja" nunca es éxito.
  - Se quitó el tope de 2 rondas; solo se detiene antes si lo que falta no se puede cubrir con pruebas reales, y entonces pregunta.


### Agregado

- Skill **`test-changes` 0.1.0**: crea y ejecuta las pruebas de los cambios recién implementados siguiendo la guía de pruebas unitarias y de servicio con Vitest (Amplify Gen 2 + React + TypeScript).
  - Detecta el alcance con git (commits de la rama desde la base, staged, unstaged, untracked, borrados y renombrados) y separa el trabajo actual de cambios ajenos; si hay duda, pregunta o se detiene sin modificar archivos.
  - Prueba comportamiento, no archivos: matriz comportamiento → unit / int / sin prueba; no duplica pruebas existentes y actualiza las que quedaron obsoletas.
  - Pruebas junto al código (`*.unit.test.ts(x)`, `*.int.test.ts`), reutilizando `test/mocks`, `test/helpers` y `testing/index.ts`.
  - Usa `pnpm test:cov:changed` (o el script equivalente del proyecto) como diagnóstico al inicio, lo cruza con git, crea las pruebas que faltan para los cambios y lo vuelve a ejecutar hasta cerrar los huecos reales; termina con `npx tsc --noEmit`.
  - Pruebas de servicio solo con confirmación.
  - No modifica código de producción sin confirmación ni oculta fallos (`.skip`, `@ts-ignore`, umbrales).

## [0.2.0] - 2026-09-24

### Agregado

- `npx huante-skills` sin comando abre la selección interactiva de skills (solo en una terminal; sin terminal muestra la ayuda y sale con código 1).
- Paquete listo para npm: `homepage`, `bugs` y `prepublishOnly` (corre los tests antes de publicar).

### Cambiado

- README: `npx huante-skills` como instalación principal y sección "Publicar una versión".

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
