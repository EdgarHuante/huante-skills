# huante-skills

Repositorio personal de skills para [Claude Code](https://claude.com/claude-code). Cada skill se distribuye de dos formas desde el mismo código:

1. **`npx huante-skills`** (CLI en npm, sin dependencias): copia la skill a `~/.claude/skills/<skill>/` para usarla como `/<skill>`.
2. **Plugin marketplace** (mecanismo oficial de Claude Code): se instala y actualiza con `/plugin`.

## Skills

| Skill | Versión | Qué hace |
| --- | --- | --- |
| [`pr-fix`](plugins/pr-fix/README.md) | 0.1.0 | Implementa las correcciones pedidas en el Code Review de un Pull Request de GitHub: entiende el proyecto, relaciona cada comentario con el código, planifica cambios mínimos, pide confirmación cuando hace falta, implementa, valida con los comandos reales del proyecto y reporta el estado de cada comentario. Nunca hace commit, push ni escribe en GitHub sin confirmación explícita. |
| [`test-changes`](plugins/test-changes/README.md) | 0.4.0 | Crea y ejecuta las pruebas de los cambios recién implementados (Vitest, Amplify Gen 2 + React + TypeScript): detecta el alcance con git, decide unitarias vs de servicio, escribe las pruebas junto al código, ejecuta pruebas, TypeScript y cobertura, y reporta qué se probó y qué quedó sin probar. Solo prueba el cambio actual; no hace commit ni cambia código de producción sin confirmación. |

## Requisitos

- **Claude Code** (probado con 2.1.281).
- **Node.js 18+**, solo para el CLI (las skills no necesitan Node).
- **git**.
- Para `pr-fix`: **GitHub CLI (`gh`)** con sesión iniciada:

  ```sh
  gh auth login
  gh auth status
  ```

- Para `test-changes`: proyecto con **Vitest** configurado y un script de cobertura de cambios (`test:cov:changed` o equivalente; también usa `test:feature` y `test:changed` si existen). Las pruebas de servicio requieren un sandbox de Amplify de pruebas ya desplegado.

## Instalación

### Opción A — `npx` (recomendada, `/pr-fix` sin prefijo)

```sh
npx huante-skills
```

Abre la selección interactiva: muestra las skills, eliges con números, nombres o `all`, y las copia a `~/.claude/skills/`. Reinicia Claude Code (o abre una sesión nueva) y usa `/pr-fix`.

Directo, sin preguntas:

```sh
npx huante-skills install pr-fix
npx huante-skills install --all
```

- Por defecto instala en `~/.claude/skills/` (o `$CLAUDE_CONFIG_DIR/skills/` si defines esa variable): disponible en todos los proyectos.
- Con `--project` instala en `./.claude/skills/` del directorio actual: solo ese proyecto (puedes versionarlo para tu equipo).
- Cada skill instalada lleva un `.huante-skills.json` con versión, commit y fecha.

Sin npm (directo desde GitHub o con un clon):

```sh
npx github:EdgarHuante/huante-skills install pr-fix

git clone https://github.com/EdgarHuante/huante-skills.git
cd huante-skills
node bin/huante-skills.js            # selección interactiva
```

### Opción B — Plugin marketplace de Claude Code

Dentro de Claude Code:

```text
/plugin marketplace add EdgarHuante/huante-skills
/plugin install pr-fix@huante-skills
```

O desde la terminal:

```sh
claude plugin marketplace add EdgarHuante/huante-skills
claude plugin install pr-fix@huante-skills
```

Reinicia Claude Code. La skill queda con el nombre del plugin como prefijo: `/pr-fix:pr-fix 123`.

`/plugin` sin argumentos abre el gestor interactivo (ver, desactivar o desinstalar). También funciona con un clon local: `claude plugin marketplace add C:/ruta/a/huante-skills`.

> Usa solo **una** de las dos opciones para la misma skill; si tienes ambas verás `/pr-fix` y `/pr-fix:pr-fix` a la vez.

## Actualización

**npx:**

```sh
npx huante-skills@latest update         # todas las skills instaladas por el CLI
npx huante-skills@latest update pr-fix  # solo esa
```

`@latest` evita que npx use una versión vieja en caché. Con un clon: `git pull && node bin/huante-skills.js update`.

**Plugin marketplace:**

```sh
claude plugin marketplace update huante-skills
claude plugin update pr-fix@huante-skills
```

(o `/plugin` → marketplace → actualizar). Claude Code detecta la actualización por el campo `version` de `plugins/<skill>/.claude-plugin/plugin.json`. Reinicia Claude Code después.

## Comandos del CLI

```sh
huante-skills                           # selección interactiva (en una terminal)
huante-skills list                      # skills disponibles y dónde están instaladas
huante-skills install [skills...]       # sin nombres: selección interactiva
huante-skills install --all             # todas
huante-skills update [skills...]        # sin nombres: todas las instaladas por el CLI
huante-skills uninstall <skills...>     # pide confirmación
huante-skills doctor                    # revisa Node, Claude Code, gh y el catálogo
```

| Opción | Efecto |
| --- | --- |
| `-a`, `--all` | `install`: todas las skills del repositorio |
| `-p`, `--project` | Usa `./.claude/skills` en lugar de `~/.claude/skills` |
| `-f`, `--force` | Sobrescribe o elimina sin preguntar |
| `-h`, `--help` / `-v`, `--version` | Ayuda / versión |

Garantías:

- `update` y `uninstall` solo tocan skills instaladas por `huante-skills`. Una skill tuya con el mismo nombre nunca se sobrescribe ni se borra, salvo con `install <skill> --force`.
- Sin terminal interactiva (CI, scripts) las confirmaciones cuentan como "no"; usa `--force`.
- No instala skills que contengan enlaces simbólicos.
- La copia es atómica: se escribe en un directorio temporal y luego se reemplaza.

## Uso de `pr-fix`

```text
/pr-fix                                          # PR de la rama actual (o elige entre tus PRs abiertos)
/pr-fix 123                                      # PR #123 del repo actual
/pr-fix https://github.com/org/repo/pull/123     # por URL (debe ser el repo abierto)
```

(Instalada como plugin: `/pr-fix:pr-fix …`.)

Ejecuta la skill **dentro del checkout del proyecto**, en la rama del PR. Flujo resumido:

```text
Precondiciones (gh, sesión, repo git, cambios sin commit)
  → Resolver PR (argumento, rama actual o selección)
  → Rama local = rama del PR (y al día con el remoto)
  → Reunir feedback: reviews, hilos inline (con estado resuelto/obsoleto), comentarios generales
  → Entender el proyecto: CLAUDE.md, AGENTS.md, docs/specs, arquitectura, usos, flujo de datos, tests, historial
  → Analizar cada comentario: código afectado → contexto → interpretación → cambio mínimo → riesgo
  → Plan + confirmaciones (ambiguos, riesgo medio/alto, cambios de comportamiento)
  → Implementar solo lo aprobado
  → Validar con los comandos reales del proyecto (tests, lint, typecheck, build)
  → Resumen por comentario + borradores de respuesta
  → (Opcional, solo si lo pides y confirmas) commit / push / responder / resolver hilos
```

Estados por comentario: `pending`, `understood`, `needs-clarification`, `approved`, `fixed`, `no-change` (con motivo), `skipped`, `blocked` (con motivo).

Ejemplo de resumen:

```text
C1 · fixed      · src/parts/api.ts:42      · maneja 404 devolviendo null (src/parts/api.ts)
C2 · fixed      · src/parts/api.ts:88      · usa formatPrice existente
C3 · no-change  · src/ui/PartForm.tsx:17   · already-addressed (línea 17 ya valida el campo)
C4 · blocked    · (review @luis)           · needs product decision: ¿stock negativo permitido?

Validación: ✓ pnpm lint · ✓ pnpm typecheck · ✗ pnpm test (fallo previo, no relacionado: test/legacy.spec.ts)
```

El progreso se guarda en `~/.claude/pr-fix/sessions/<owner>__<repo>__<pr>.json`; si interrumpes, al relanzar `/pr-fix` ofrece continuar.

### Permisos que usa

- Lectura en GitHub con `gh` (`gh pr view`, `gh pr list`, `gh pr diff`, `gh api graphql` de solo lectura).
- Lectura del proyecto, edición de archivos del proyecto (solo lo aprobado), ejecución de los comandos de validación que tú apruebes.
- Escrituras (commit, push, respuestas, resolver hilos, re-solicitar review) solo si las pides y confirmas la vista previa.

Mantén los permisos de Claude Code en modo con confirmación; no uses "bypass permissions" con esta skill.

### Limitaciones

- Carga hasta 100 hilos de review y 50 comentarios por hilo (avisa si hay más).
- La skill trabaja sobre el checkout local; no clona repos ni corrige PRs de otro repositorio distinto al abierto.
- No resuelve fallos de CI que ningún comentario menciona, ni conflictos de merge.
- Solo usa comandos de validación que existen en el repo; si el proyecto no tiene tests/lint, lo reporta y no inventa.
- En `claude -p` (modo no interactivo) no puede preguntar: se detiene y muestra lo que necesita decidir.

## Uso de `test-changes`

```text
/test-changes                            # cambios de la rama actual (base detectada)
/test-changes --base origin/integration  # base explícita
/test-changes src/features/query         # limita el alcance a una ruta del cambio
```

(Instalada como plugin: `/test-changes:test-changes …`.)

Ejecútala dentro del proyecto, al terminar una implementación y antes del commit (o con los commits ya hechos en la rama). Flujo resumido:

```text
pnpm test:cov:changed (diagnóstico inicial: archivos afectados, cobertura, líneas sin cubrir)
  → Descubrir cambios con git y cruzarlos con el diagnóstico (si hay duda de alcance, pregunta o se detiene)
  → Entender el comportamiento nuevo/modificado (archivo completo, usos, specs, schema y allow.*)
  → Revisar pruebas existentes (vitest.config, scripts, test/mocks, test/helpers, testing/index.ts)
  → Matriz: comportamiento → unit / int / sin prueba, usando las líneas sin cubrir del diff
  → Escribir o actualizar *.unit.test.ts(x) / *.int.test.ts junto al código
  → Ejecutar las pruebas (servicio solo con confirmación)
  → Ciclo obligatorio: pnpm test:cov:changed → ¿Lines ≥ 80 %, Functions ≥ 80 %, Branches ≥ 75 %?
      no → leer Uncovered Line #s → pruebas de comportamiento real → repetir
  → pnpm exec eslint (solo archivos que tocó la corrida) → pnpm typecheck (incluye amplify/tsconfig.test.json)
  → Resumen: COMPLETE / INCOMPLETE, archivos analizados, pruebas creadas/actualizadas, comandos, cobertura antes → después, pendientes
    y la tabla con todas las pruebas de los archivos del cambio (nueva / modificada / existente, resultado)
```

La cobertura es condición de término: con pruebas en verde pero cobertura bajo los mínimos (o los umbrales más estrictos del proyecto) la skill sigue escribiendo pruebas. Los archivos del cambio que mide el comando deben quedar completos sobre el umbral, incluido el código que ya existía en ellos; la cobertura baja de archivos ajenos al trabajo actual se reporta aparte y no se toca. No corre comandos que prueban todo el programa (`test:unit`, `test:cov`, `test:legacy`, `lint` sobre `.`, `build`): sus fallas son de código ajeno al cambio. Si no puede llegar al umbral con pruebas reales (código muerto, rama imposible), termina como **INCOMPLETE** y pregunta; nunca baja umbrales ni escribe pruebas sin aserciones.

Si el proyecto no tiene `test:cov:changed`, busca el script equivalente en `package.json`; si no hay, usa Vitest con `--coverage.include` sobre los archivos cambiados, sin crear scripts nuevos.

Ejemplo de resumen:

```text
Resultado: COMPLETE
Alcance: base origin/integration · 3 commits + 2 archivos sin commit
  M src/features/query/model/builders.ts · source
  A src/features/query/hooks/useBuilderLabels.ts · source
  M amplify/data/resource.ts · amplify (nueva regla allow.owner en Builder)

Pruebas nuevas:
  src/features/query/hooks/useBuilderLabels.unit.test.ts
    T1 devuelve el nombre del constructor cuando el id existe — unit
    T2 muestra el id cuando el constructor no existe (??) — unit
  amplify/data/builder-auth.int.test.ts
    T4 el dueño puede actualizar su registro — int
    T5 otro usuario no puede actualizarlo — int
Pruebas actualizadas:
  src/features/query/model/builders.unit.test.ts · T3 ordena por nombre, no por id
Sin prueba: src/features/query/index.ts (re-export, estructural)

✓ pnpm test:feature -- query unit — 24 passed
✓ pnpm test:int — 2 passed
✓ pnpm test:cov:changed — antes 38% líneas → después 91% líneas, 86% ramas (meta 80%)
  queda sin cubrir builders.ts:57 (rama defensiva inalcanzable)
✓ pnpm exec eslint --max-warnings 0 <5 archivos tocados>
✓ pnpm typecheck
Código de producción modificado: ninguno

| # | Archivo | Prueba | Tipo | Estado | Resultado |
| --- | --- | --- | --- | --- | --- |
| 1 | hooks/useBuilderLabels.unit.test.ts | useBuilderLabels › devuelve el nombre del constructor cuando el id existe | unit | nueva | ✓ |
| 2 | model/builders.unit.test.ts | builders › ordena por nombre, no por id | unit | modificada | ✓ |
| 3 | amplify/data/builder-auth.int.test.ts | otro usuario no puede actualizarlo | int | nueva | ✓ |

26 pruebas · 4 nuevas · 1 modificada · 21 existentes · 26 ✓ · 0 ✗
```

### Limitaciones

- Pensada para la guía de Vitest en Amplify Gen 2 + React + TypeScript; en otros proyectos sigue las convenciones que encuentre, pero no configura Vitest desde cero sin preguntar.
- No despliega sandboxes: las pruebas de servicio se ejecutan solo si ya hay uno configurado y confirmas.
- Si la base remota está desactualizada, el alcance puede incluir cambios de más; usa `--base` o haz `git fetch` antes.
- En `claude -p` (modo no interactivo) no puede preguntar: si el alcance es dudoso se detiene sin modificar archivos.

## Estructura del repositorio

```text
huante-skills/
├── .claude-plugin/
│   └── marketplace.json          # catálogo: lista de plugins (una skill = un plugin)
├── plugins/
│   ├── pr-fix/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json       # nombre, versión, descripción
│   │   ├── README.md
│   │   └── skills/
│   │       └── pr-fix/
│   │           └── SKILL.md      # la skill
│   └── test-changes/             # misma estructura
├── bin/huante-skills.js          # CLI de instalación (sin dependencias)
├── lib/catalog.js                # lectura y validación del catálogo (CLI, scripts y tests)
├── scripts/
│   ├── new-skill.js              # crea una skill nueva y la registra
│   └── validate.js               # valida catálogo, manifiestos y SKILL.md
├── test/                         # node:test
├── .github/workflows/ci.yml
├── CLAUDE.md                     # convenciones para trabajar en este repo con Claude Code
├── SECURITY.md
├── CHANGELOG.md
└── package.json
```

Una skill = un plugin, para que cada una se instale, actualice y versione por separado.

## Agregar una skill nueva

```sh
npm run new-skill -- mi-skill "Qué hace y cuándo usarla."
```

Esto crea `plugins/mi-skill/.claude-plugin/plugin.json`, `plugins/mi-skill/skills/mi-skill/SKILL.md` y registra la entrada en `.claude-plugin/marketplace.json`. Después:

1. Escribe el `SKILL.md` (frontmatter `name` = nombre de la carpeta, `description` ≤ 1024 caracteres que diga qué hace y cuándo usarla).
2. Agrega la fila en la tabla "Skills" de este README.
3. `npm test` (incluye `claude plugin validate` si tienes Claude Code instalado).
4. Commit, push. Ya se puede instalar con `/plugin install mi-skill@huante-skills` o `huante-skills install mi-skill`.

Para publicar cambios en una skill existente, sube `version` en su `plugin.json` (semver) y anota el cambio en `CHANGELOG.md`; sin subir versión, `/plugin update` no ve la actualización.

## Desarrollo

```sh
npm test            # tests + validación del catálogo + claude plugin validate
npm run validate    # solo validación del catálogo
node bin/huante-skills.js doctor
```

Probar una skill sin instalarla: `claude --plugin-dir plugins/pr-fix`.

## Publicar una versión (mantenedor)

1. Sube `version` en `package.json` (CLI) y/o en `plugins/<skill>/.claude-plugin/plugin.json` (skill) y anota el cambio en `CHANGELOG.md`.
2. `npm test`.
3. Commit, `git tag -a v<versión> -m v<versión>` y `git push --follow-tags` (el tag debe ser anotado para que `--follow-tags` lo suba).
4. `npm publish` (requiere `npm login`; `prepublishOnly` vuelve a correr los tests).

El marketplace de plugins no necesita publicación: lee directamente la rama `main` de GitHub.

## Desinstalar

```sh
npx huante-skills uninstall pr-fix                    # opción A
npx huante-skills uninstall test-changes
claude plugin uninstall pr-fix@huante-skills         # opción B
claude plugin marketplace remove huante-skills
rm -rf ~/.claude/pr-fix                               # opcional: sesiones guardadas de pr-fix
```

## Seguridad

Ver [SECURITY.md](SECURITY.md).

## Créditos

La estructura de reglas de seguridad y confirmaciones de `pr-fix` está inspirada en la skill `pr-review` de [abis-skills](https://github.com/gabrielciprianoo/abis-skills). Este repositorio es independiente y no depende de él.

## Licencia

MIT
