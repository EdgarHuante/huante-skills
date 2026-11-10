# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones con [SemVer](https://semver.org/lang/es/). Cada skill se versiona en su `plugin.json`; `package.json` versiona el CLI.

## [Sin publicar]

### Agregado

- Skill **`pap-spec` 0.1.0**: de una historia de Jira a specs cortos por fases, listos para `/spec-impl`.
  - Recibe solo la clave (`/pap-spec PAP-38`): lee título, descripción, criterios, subtareas y tarjetas relacionadas con las herramientas de Atlassian; si no están disponibles, pide pegar la tarjeta.
  - Configuración por proyecto en `.claude/pap-skills.json` (sitio de Jira, carpeta de docs, pizarra del diagrama, ramas protegidas); nada de la empresa queda en la skill.
  - Investiga el código (subagentes en paralelo cuando el cambio es amplio) y pregunta solo decisiones funcionales que el código no responde.
  - Divide en fases por cambio funcional, numeradas por orden de implementación: `docs/<CLAVE>/specs/feat/<CLAVE>/NN-<slug>.md`, slug en inglés con guiones, rama `feat/<CLAVE>/NN-<slug>`; una rama por spec, la `01` creada a partir de la rama actual (nunca escribe en ramas protegidas) y cada siguiente a partir de la anterior.
  - Revisión de Atomic Design, Feature-Based Architecture, KISS, DRY, Escalabilidad y **Gamificación** (eventos del registro de actividad, p. ej. `AppLogs`) que corrige los specs antes de mostrarlos.
  - Cada criterio de aceptación etiquetado con su subtarea; separa verificaciones automáticas de manuales; sección "Diagramas" con los cambios exactos para la pizarra configurada.
  - Pausa obligatoria con 5 opciones; tras aprobar marca `Aprobado`, ofrece commit y entrega los comandos `/spec-impl` en orden.

### Cambiado

- Skill **`spec-flow` 0.2.0**: specs en español con estructura `ggin-N`.
  - Todo el texto del spec (títulos, secciones, explicaciones) en español; identificadores de código tal como existen en el proyecto, en backticks, sin traducir ni inventar.
  - Un identificador `ggin-N` por corrida: `MAX(N) + 1` sobre carpetas `docs/ggin-N/` y archivos `docs/ggin-N.md` (sin asumir números consecutivos; `ggin-01` si no hay ninguno). Se calcula en el contexto de sesión y se reverifica antes de escribir; se mantiene fijo en las iteraciones de la pausa.
  - Ruta `docs/ggin-N/specs/feat/ggin-N/<slug>.md` con slug funcional en inglés; rama derivada `feat/ggin-N/<slug>` registrada en el encabezado (`**Rama:**`). Reemplaza `specs/NN-slug.md`.
  - Estructura del spec en español (Objetivo, Contexto, Alcance, Comportamiento esperado, Requisitos funcionales, Consideraciones técnicas, Áreas afectadas, Plan de implementación, Arquitectura y diseño, Criterios de aceptación, Dependencias, Pruebas, Decisiones…), estados `Borrador`/`Aprobado`.
  - Veredictos de arquitectura `Cumple` / `Requiere ajuste` / `No aplica`, un subencabezado por principio, reflejando el spec ya ajustado.
  - Verificación obligatoria (idioma, id, estructura, naming, rama, arquitectura, alcance) antes de la pausa.
  - No crea ramas; antes de entregar a `/spec-impl` comprueba que soporte la convención `ggin` y, si no, se detiene y lo indica.

### Agregado

- Skill **`spec-flow` 0.1.0**: convierte un prompt informal en uno o varios specs listos para `/spec-impl`.
  - Investiga el proyecto real (CLAUDE.md, docs, specs previos, feature, componentes, hooks, modelos, tests) antes de escribir; pregunta solo decisiones funcionales que el código no responde.
  - Decide entre 1 y N specs por cambio funcional, con chequeos anti-división (nada de un spec por archivo, ni specs de solo tipos/tests/docs) y dependencias explícitas.
  - Revisión Atomic Design, Feature-Based Architecture, KISS, DRY y escalabilidad que corrige los specs antes de mostrarlos; sección `Architecture & Design` breve en cada spec.
  - Un archivo `specs/NN-slug.md` por spec con el formato del `template.md` de `/spec`, en estado `Draft`.
  - Pausa obligatoria con resumen y 5 opciones; nada se implementa sin aprobación explícita.
  - Tras aprobar: marca `Approved`, ofrece commit de los specs y entrega cada spec a `/spec-impl`, una rama por spec en orden de dependencias.

### Cambiado

- Skill **`test-changes` 0.5.0**: resuelve las líneas en rojo de `Uncovered Line #s`.
  - Explica el color del reporte de texto: rojo (`% Lines` < 100) son líneas que nunca se ejecutaron; amarillo (`% Lines` = 100) son ramas no tomadas. Como la salida capturada no trae colores, el color se deduce de `% Lines`.
  - Lleva un registro por archivo de cada rango rojo: `cubierto` por una prueba real o `justificado` (inalcanzable desde comportamiento público) con la razón y la aprobación del usuario. Las líneas amarillas dentro del diff reciben el mismo trato.
  - Cumplir los umbrales ya no basta: un archivo del cambio con líneas rojas sin explicar deja la corrida INCOMPLETE (nuevo criterio de término).
  - Guía para diagnosticar por qué una línea sigue en rojo (callback no disparado o no esperado, callback entregado a un mock, módulo mockeado con `vi.mock`, prueba fuera del `include`, reporte desactualizado).
  - Prohíbe comentarios `/* v8 ignore */`, `/* istanbul ignore */` y `/* c8 ignore */` para ocultar líneas.
  - El resumen incluye el registro de líneas rojas por archivo.
- Skill **`test-changes` 0.4.0**: el resumen termina con una tabla de todas las pruebas de los archivos del cambio (archivo, nombre completo `describe › it`, tipo, estado nueva/modificada/existente, resultado) y una línea de totales. Nombres y resultados salen de una última corrida con reporter JSON, no de memoria.
- Skill **`test-changes` 0.3.0**: revisión final de lint y tipos.
  - ESLint con las opciones del script `lint` del proyecto, pero solo sobre los archivos que tocó la corrida y los del cambio; corrige sus pruebas, pregunta antes de tocar producción y reporta lo previo.
  - Usa el script `typecheck` del proyecto en lugar de `npx tsc --noEmit`, para incluir también los tsconfig de pruebas de backend (p. ej. `amplify/tsconfig.test.json`).
  - Lint y typecheck pasan a ser criterios de término.
  - Deja fuera explícitamente los comandos de todo el programa (`test:unit`, `test:cov`, `test:legacy`, `lint` sobre `.`, `build`).
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
