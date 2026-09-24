# huante-skills

Repositorio personal de skills para [Claude Code](https://claude.com/claude-code). Cada skill se distribuye de dos formas desde el mismo código:

1. **Plugin marketplace** (mecanismo oficial de Claude Code): se instala y actualiza con `/plugin`.
2. **CLI `huante-skills`** (Node, sin dependencias): copia la skill a `~/.claude/skills/<skill>/` para usarla como `/<skill>`.

## Skills

| Skill | Versión | Qué hace |
| --- | --- | --- |
| [`pr-fix`](plugins/pr-fix/README.md) | 0.1.0 | Implementa las correcciones pedidas en el Code Review de un Pull Request de GitHub: entiende el proyecto, relaciona cada comentario con el código, planifica cambios mínimos, pide confirmación cuando hace falta, implementa, valida con los comandos reales del proyecto y reporta el estado de cada comentario. Nunca hace commit, push ni escribe en GitHub sin confirmación explícita. |

## Requisitos

- **Claude Code** (probado con 2.1.281).
- **Node.js 18+**, solo para el CLI (las skills no necesitan Node).
- **git**.
- Para `pr-fix`: **GitHub CLI (`gh`)** con sesión iniciada:

  ```sh
  gh auth login
  gh auth status
  ```

## Instalación

### Opción A — Plugin marketplace (recomendada)

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

Reinicia Claude Code. La skill queda con el nombre del plugin como prefijo:

```text
/pr-fix:pr-fix 123
```

`/plugin` sin argumentos abre el gestor interactivo: ahí puedes ver el marketplace, elegir skills, desactivarlas o desinstalarlas.

También funciona con un clon local (útil mientras desarrollas): `claude plugin marketplace add C:/ruta/a/huante-skills`.

### Opción B — CLI (`/pr-fix` sin prefijo)

Sin clonar (npx descarga el repo de GitHub):

```sh
npx github:EdgarHuante/huante-skills install pr-fix
```

Con un clon local:

```sh
git clone https://github.com/EdgarHuante/huante-skills.git
cd huante-skills
node bin/huante-skills.js install            # selección interactiva
node bin/huante-skills.js install pr-fix     # directo
node bin/huante-skills.js install --all      # todas
```

Reinicia Claude Code (o abre una sesión nueva) y usa `/pr-fix`.

- Por defecto instala en `~/.claude/skills/` (o `$CLAUDE_CONFIG_DIR/skills/` si defines esa variable): disponible en todos los proyectos.
- Con `--project` instala en `./.claude/skills/` del directorio actual: solo ese proyecto (puedes versionarlo para tu equipo).
- Cada skill instalada lleva un `.huante-skills.json` con versión, commit y fecha.

> Usa solo **una** de las dos opciones para la misma skill; si tienes ambas verás `/pr-fix` y `/pr-fix:pr-fix` a la vez.

## Actualización

**Plugin marketplace:**

```sh
claude plugin marketplace update huante-skills
claude plugin update pr-fix@huante-skills
```

(o `/plugin` → marketplace → actualizar). Claude Code detecta la actualización por el campo `version` de `plugins/<skill>/.claude-plugin/plugin.json`. Reinicia Claude Code después.

**CLI:**

```sh
npx github:EdgarHuante/huante-skills update           # sin clonar
git pull && node bin/huante-skills.js update          # con clon local
```

`update` sin nombres actualiza todas las skills que instaló el CLI; `update pr-fix` solo esa.

## Comandos del CLI

```sh
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

(Con la opción A: `/pr-fix:pr-fix …`.)

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

## Estructura del repositorio

```text
huante-skills/
├── .claude-plugin/
│   └── marketplace.json          # catálogo: lista de plugins (una skill = un plugin)
├── plugins/
│   └── pr-fix/
│       ├── .claude-plugin/
│       │   └── plugin.json       # nombre, versión, descripción
│       ├── README.md
│       └── skills/
│           └── pr-fix/
│               └── SKILL.md      # la skill
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

## Desinstalar

```sh
claude plugin uninstall pr-fix@huante-skills         # opción A
claude plugin marketplace remove huante-skills
huante-skills uninstall pr-fix                        # opción B
rm -rf ~/.claude/pr-fix                               # opcional: sesiones guardadas de pr-fix
```

## Seguridad

Ver [SECURITY.md](SECURITY.md).

## Créditos

La estructura de reglas de seguridad y confirmaciones de `pr-fix` está inspirada en la skill `pr-review` de [abis-skills](https://github.com/gabrielciprianoo/abis-skills). Este repositorio es independiente y no depende de él.

## Licencia

MIT
