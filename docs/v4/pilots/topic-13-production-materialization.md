# T13-CONTENT.3 — Materialización controlada en producción

Estado actual: **banco V2 materializado y verificado; importación V4 pendiente del gate de Quality**.

Este documento distingue deliberadamente entre el estado real de producción y el paquete V4 ya preparado. La base de datos es la fuente de verdad: en la última comprobación directa, Tema 13 tiene 144 preguntas activas y todavía 0 unidades / 0 conceptos / 0 relaciones `primary` / 0 flashcards V4.

## Banco V2 — materializado

Antes de T13-CONTENT.3, Tema 13 tenía 99 preguntas activas. Las 45 preguntas aprobadas `SMS-T13-0100` a `SMS-T13-0144` se validaron con el contrato V2 real de 25 columnas y se materializaron exclusivamente mediante `import_questions_batch(jsonb)`.

Resultado agregado del importador V2:

- insertadas: 45;
- enriquecidas: 0;
- omitidas: 0.

Verificación directa posterior:

- preguntas activas Tema 13: 144;
- códigos nuevos presentes: 45/45, exactamente `0100-0144`;
- duplicados de código: 0;
- preguntas nuevas fuera de Tema 13: 0;
- preguntas nuevas inactivas: 0;
- opciones vacías o duplicadas: 0;
- claves inválidas: 0;
- filas con metadatos V2 esperados ausentes: 0;
- distribución del lote nuevo: A 11 / B 11 / C 11 / D 12.

Se inspeccionaron directamente en producción las filas `0100`, `0106`, `0112`, `0126`, `0138` y `0144`, incluyendo sus 25 campos V2 y su estado activo.

## Paquete V4 final — preparado, no importado todavía

El paquete canónico final está en `src/lib/v4-pilots/topic-13-estatuto-marco-materialized.ts`. Mantiene sin alteración los 99 `primary` originales y añade exactamente los 45 `primary` aprobados, sin `secondary` nuevos.

Dimensiones del paquete preparado:

- 18 `study_units`;
- 34 `concepts`;
- 144 `questionMappings` primary;
- 68 `flashcards`.

Los tests del paquete fijan además:

- 144/144 códigos mapeados una sola vez como primary;
- 34/34 conceptos con al menos 4 preguntas primary;
- 0 `coverage_gap` en el paquete;
- 0 conceptos con cobertura cero;
- conservación exacta de los splits aprobados por Gobernanza;
- contrato V2 completo de 25 columnas para las 45 preguntas nuevas;
- distribución A 11 / B 11 / C 11 / D 12;
- alcance corregido de `SMS-T13-0106` conforme al artículo 73.1.a.

## Estado V4 real de producción antes del import

Comprobación directa actual en Supabase:

- preguntas activas Tema 13: **144**;
- unidades V4 activas: **0**;
- conceptos V4 activos: **0**;
- relaciones `primary` V4: **0**;
- flashcards V4 activas: **0**.

Por tanto, la cobertura 34/34 es actualmente una propiedad validada del **paquete preparado**, no todavía una cobertura materializada en producción. No debe describirse como producción real hasta ejecutar y verificar `import_v4_study_content`.

## Gate pendiente

La importación V4 solo puede ejecutarse cuando el HEAD vigente del PR haya pasado el workflow estándar `Quality` (`bun run check`: tests + TypeScript + build). El run #108 del HEAD anterior terminó como `action_required` sin ejecutar jobs, por lo que no se considera un Quality verde y bloquea correctamente el import V4.

Una vez exista un HEAD verde se seguirá, sin atajos, esta secuencia:

1. preflight transaccional de `import_v4_study_content` con el JSON exacto del paquete validado y `ROLLBACK`;
2. verificación de que producción sigue V4 0/0/0/0 tras el rollback;
3. importación atómica real mediante `import_v4_study_content`;
4. verificación directa de 18 unidades / 34 conceptos / 144 primary / 68 flashcards;
5. cálculo de cobertura contra las filas reales de producción;
6. pruebas de compatibilidad V2/V3 y advisors finales.

## Cobertura esperada del paquete preparado

| Concepto | Primary |
|---|---:|
| C01 | 4 |
| C02 | 6 |
| C03 | 4 |
| C04 | 4 |
| C05 | 4 |
| C30 | 4 |
| C31 | 4 |
| C06 | 4 |
| C32 | 4 |
| C07 | 4 |
| C08 | 4 |
| C09 | 4 |
| C10 | 4 |
| C11 | 4 |
| C12 | 4 |
| C13 | 4 |
| C14 | 4 |
| C15 | 4 |
| C16 | 6 |
| C17 | 4 |
| C33 | 4 |
| C18 | 4 |
| C19 | 4 |
| C20 | 4 |
| C21 | 4 |
| C22 | 4 |
| C23 | 5 |
| C24 | 6 |
| C25 | 4 |
| C26 | 5 |
| C27 | 4 |
| C34 | 4 |
| C28 | 4 |
| C29 | 4 |

## Seguridad de ejecución

- no se ha hecho `INSERT` manual en `questions`;
- no se hará `INSERT` manual en `study_units`, `concepts`, `question_concepts` ni `flashcards`;
- no se ha aplicado DDL ni migración para T13-CONTENT.3;
- el PR #62 permanece draft y sin fusionar;
- no se ha iniciado trabajo de Tema 18 ni Tema 19;
- no se ha modificado UI.
