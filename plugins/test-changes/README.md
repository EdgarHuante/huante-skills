# test-changes

Crea y ejecuta las pruebas de los cambios recién implementados en un proyecto Amplify Gen 2 + React + TypeScript, siguiendo la guía interna de pruebas unitarias y de servicio con Vitest. Detecta el alcance real con git, prueba solo el comportamiento nuevo o modificado, ejecuta las pruebas, TypeScript y cobertura, y reporta qué se probó y qué no. No hace commit ni modifica código de producción sin confirmación.

```text
/test-changes                            # cambios de la rama actual (base detectada)
/test-changes --base origin/integration  # base explícita
/test-changes src/features/query         # limita el alcance a una ruta
```

Instalada como plugin: `/test-changes:test-changes …`.

Definición completa: [`skills/test-changes/SKILL.md`](skills/test-changes/SKILL.md). Instalación, uso y limitaciones: [README principal](../../README.md).
