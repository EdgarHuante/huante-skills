# pap-spec

Convierte una historia de Jira en specs cortos por fases, aterrizados al proyecto real y listos para implementarse con `/spec-impl`, una rama por spec. Lee la tarjeta, sus criterios de aceptación y sus subtareas desde Jira; investiga el código (con subagentes en paralelo cuando el cambio es amplio); divide la historia en fases numeradas por orden de implementación (`01-`, `02-`…), nunca por archivo; revisa cada spec contra Atomic Design, Feature-Based Architecture, KISS, DRY, escalabilidad y gamificación (eventos del registro de actividad, por ejemplo `AppLogs`) y lo corrige; escribe cada spec **en español** en `docs/<CLAVE>/specs/feat/<CLAVE>/NN-<slug>.md` con cada criterio etiquetado con su subtarea y una sección "Diagramas" para la pizarra del equipo; y **se detiene** para tu aprobación.

```text
/pap-spec PAP-38
/pap-spec PAP-38 el número debe ser obligatorio
```

Instalada como plugin: `/pap-spec:pap-spec PAP-38`.

- Crea la rama del spec `01` (`feat/<CLAVE>/01-<slug>`) a partir de la rama en la que estés, y escribe ahí todos los specs. Nunca escribe en `main`, `dev` ni otras ramas protegidas.
- Las ramas de las fases siguientes se crean al implementar, cada una a partir de la anterior.
- No escribe código ni hace commit sin tu confirmación.

## Configuración

Necesita un archivo `.claude/pap-skills.json` en la raíz del proyecto (si no existe, la skill te pide los datos y ofrece crearlo):

```json
{
  "jira": { "site": "tu-sitio.atlassian.net" },
  "docsRoot": "docs",
  "diagram": {
    "title": "Nombre de la pizarra",
    "url": "https://tu-sitio.atlassian.net/wiki/spaces/XXX/whiteboard/123",
    "section": "Modificaciones propuestas",
    "legend": "Gris con borde rojo = nuevo o modificado; negritas = texto que cambia",
    "parts": ["Lista 'Qué cambia en esta propuesta'", "Área 'Tarjetas en Jira'"]
  },
  "protectedBranches": ["main", "dev"]
}
```

## Requisitos

- Herramientas de Atlassian (MCP) conectadas en Claude Code para leer Jira. Sin ellas, la skill te pide pegar la tarjeta.
- La skill **`/spec-impl`** para implementar los specs aprobados.

Definición completa: [`skills/pap-spec/SKILL.md`](skills/pap-spec/SKILL.md). Instalación, uso y limitaciones: [README principal](../../README.md).
