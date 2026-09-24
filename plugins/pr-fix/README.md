# pr-fix

Implementa las correcciones pedidas en el Code Review de un Pull Request de GitHub, con trazabilidad por comentario, confirmaciones y validación real del proyecto. Nunca hace commit, push ni escribe en GitHub sin confirmación explícita.

```text
/pr-fix                 # PR de la rama actual
/pr-fix 123             # PR #123
/pr-fix <URL del PR>
```

Instalada como plugin: `/pr-fix:pr-fix …`.

Requiere `gh` con sesión (`gh auth login`) y ejecutarse dentro del checkout del proyecto.

Definición completa: [`skills/pr-fix/SKILL.md`](skills/pr-fix/SKILL.md). Instalación, uso y limitaciones: [README principal](../../README.md).
