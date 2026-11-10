# pap-diagram

Aplica en la pizarra de Confluence del equipo los cambios que piden los specs de una historia de Jira (sección "Diagramas" de los specs que escribe `/pap-spec`). Usa la clave solo para encontrar los specs en `docs/<CLAVE>/specs/feat/<CLAVE>/NN-*.md`; nunca diseña cambios a partir de la tarjeta. Revisa el estado de cada spec, te muestra la lista de cambios (forma, texto actual, texto nuevo, estilo, viñetas) y espera tu confirmación; edita la pizarra con Claude in Chrome forma por forma, verificando cada una; te reporta qué cambió y qué te toca hacer a mano; y anota cada spec con `**Diagrama:** aplicado <fecha>` para no duplicar cambios si la vuelves a correr.

```text
/pap-diagram PAP-38
```

Instalada como plugin: `/pap-diagram:pap-diagram PAP-38`.

- Si no hay specs de la historia, se detiene y sugiere `/pap-spec <CLAVE>`.
- Formas nuevas, conexiones y la tarjeta de Jira te las deja como pendientes con el texto exacto: copiar y pegar en estas pizarras no es confiable.
- Si la pizarra está en solo lectura, se detiene y te lo indica.

## Configuración

Usa el mismo `.claude/pap-skills.json` que `/pap-spec` (bloque `diagram`: título, URL, sección, leyenda y partes a actualizar).

## Requisitos

- **Claude in Chrome** conectado, con la sesión de Confluence iniciada en tu navegador.
- Specs escritos con `/pap-spec` (o con la misma estructura y una sección `## Diagramas`).

Definición completa: [`skills/pap-diagram/SKILL.md`](skills/pap-diagram/SKILL.md). Instalación, uso y limitaciones: [README principal](../../README.md).
