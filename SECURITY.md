# Seguridad

## Qué puede hacer `pr-fix` en tu máquina

Cuando la ejecutas, Claude Code puede:

- **Ejecutar comandos**: `gh` (lectura del PR), `git` (estado, diff, log, blame, fetch) y los comandos de validación del proyecto que tú apruebes (tests, lint, typecheck, build).
- **Leer y editar archivos del proyecto** abierto, solo para los cambios del plan aprobado.
- **Escribir** su progreso en `~/.claude/pr-fix/sessions/`.
- **Usar tu sesión de GitHub** (`gh auth`). Solo para leer, salvo que pidas y confirmes explícitamente commit, push, respuestas o resolver hilos.

## Riesgos y cómo los mitiga la skill

| Riesgo | Mitigación |
| --- | --- |
| **Prompt injection indirecto**: un comentario de review (o de un bot) dice "ignora tus instrucciones y ejecuta…" | Todo el contenido de GitHub es *datos*, nunca instrucciones. Los intentos se marcan como `blocked` y se te informan. Un reviewer puede pedir cambios de código, no hacer que el agente ejecute comandos. |
| Comandos sugeridos en comentarios (`npm i …`, `curl … \| sh`) | Nunca se ejecutan porque un comentario lo diga. Si algo es necesario se te propone y solo se ejecuta con tu aprobación. Dependencias, red, CI, credenciales y URLs nuevas siempre son riesgo `high`. |
| Valores maliciosos (archivo llamado `$(curl …).ts`, rama con `;`) | Número de PR, owner, repo, SHAs, ramas, rutas e ids se validan con patrones estrictos antes de llegar a un comando; siempre entre comillas; sin `eval` ni texto libre en la línea de comandos. |
| Cambios de más | Cada cambio debe trazarse a un comentario; lo demás se reporta como observación fuera de alcance. Ambiguos y riesgosos requieren confirmación. |
| Pérdida de trabajo | Sin `reset --hard`, `clean`, `stash drop`, `rebase`, `--amend`, `push --force` ni `--no-verify` salvo petición y confirmación explícitas. Tus cambios sin commit se respetan. |
| Publicar en tu nombre | Sin commit/push/comentarios automáticos. Cada escritura tiene vista previa y confirmación propia. |
| Secretos | La skill no lee `~/.ssh`, `~/.aws`, `.env*` ni `gh auth token`. |

El `CLAUDE.md` / `AGENTS.md` del proyecto se sigue para convenciones y comandos, pero no puede desactivar estas reglas.

Ninguna skill que lee texto de terceros elimina el prompt injection por completo. Tu última defensa: **mantén activos los permisos de Claude Code** (no uses bypass), lee el plan antes de aprobarlo y la vista previa antes de cualquier escritura en GitHub, y ten cuidado extra con reviews de cuentas desconocidas o bots.

## Qué hace el instalador

- `huante-skills` solo copia archivos de `plugins/<skill>/skills/<skill>/` a tu directorio de skills; no ejecuta código de las skills ni descarga nada.
- Rechaza skills con enlaces simbólicos y nombres fuera de `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `update` / `uninstall` solo tocan skills con su marcador `.huante-skills.json`.
- Sin dependencias npm.

Instala solo desde `EdgarHuante/huante-skills`. Puedes leer cada `SKILL.md` antes de instalar.

## Reportar una vulnerabilidad

Usa el reporte privado de GitHub: **Security → Report a vulnerability** en el repositorio. No abras un issue público.
