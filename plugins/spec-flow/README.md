# spec-flow

Convierte un prompt informal (idea, descripción de tarjeta, varias funcionalidades mezcladas) en uno o varios specs pequeños, claros y aterrizados al proyecto real, listos para implementarse en PRs pequeñas con `/spec-impl`. Investiga código y documentación, mejora los requisitos sin inventar, decide entre 1 y N specs por cambio funcional (nunca por archivo), revisa cada spec contra Atomic Design, Feature-Based Architecture, KISS, DRY y escalabilidad corrigiéndolo antes de mostrarlo, asigna un `ggin-N` por corrida (`MAX(N)` en `docs/` + 1), escribe cada spec **en español** (identificadores de código sin traducir) en `docs/ggin-N/specs/feat/ggin-N/<slug>.md`, cuya rama es `feat/ggin-N/<slug>`, y **se detiene** para tu revisión.

```text
/spec-flow <prompt con el cambio>
```

Instalada como plugin: `/spec-flow:spec-flow …`.

Requiere las skills `/spec` y `/spec-impl` ([Klerith/fernando-skills](https://github.com/Klerith/fernando-skills)): usa el `template.md` de `/spec` como formato y entrega la implementación a `/spec-impl`, que debe aceptar rutas `docs/ggin-N/...` y ramas `feat/ggin-N/<slug>`.

Definición completa: [`skills/spec-flow/SKILL.md`](skills/spec-flow/SKILL.md). Instalación, uso y limitaciones: [README principal](../../README.md).
