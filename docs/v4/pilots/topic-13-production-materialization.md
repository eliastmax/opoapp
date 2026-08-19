# T13-CONTENT.3 — Materialización controlada en producción

Estado: **materializado y verificado en producción**. Este documento sustituye cualquier referencia operativa previa a cobertura meramente prospectiva; los documentos de T13-CONTENT.2 conservan el histórico del diseño y de la auditoría de huecos.

## Banco V2

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

Se inspeccionaron directamente en producción, entre otras, las filas `0100`, `0106`, `0112`, `0126`, `0138` y `0144`.

## Paquete V4 final

El paquete canónico final está en `src/lib/v4-pilots/topic-13-estatuto-marco-materialized.ts`. Mantiene sin alteración los 99 `primary` originales y añade exactamente los 45 `primary` aprobados, sin `secondary` nuevos.

Dimensiones finales:

- 18 `study_units`;
- 34 `concepts`;
- 144 `questionMappings` primary;
- 68 `flashcards`.

El artefacto exacto usado para la importación fue exportado por CI desde el paquete TypeScript validado. Antes de la llamada al RPC se verificó:

- tamaño: 69.325 bytes;
- MD5: `749a3c330fbc37e0bbdfa1d19e3df3be`;
- versión: `4.0`;
- 18 unidades / 34 conceptos / 144 mappings / 68 cards.

Se realizó un preflight transaccional con `import_v4_study_content` y `ROLLBACK`; tras él, producción continuó en 144 preguntas y V4 0/0/0/0. Solo después se ejecutó la importación atómica real mediante `import_v4_study_content`.

## Verificación V4 real

Comprobación directa en Supabase tras el import:

- preguntas activas Tema 13: **144**;
- unidades activas: **18**;
- conceptos activos: **34**;
- relaciones `primary`: **144**;
- flashcards activas: **68**;
- conceptos con al menos 4 preguntas primary: **34/34**;
- `coverage_gap`: **0**;
- conceptos con cobertura cero: **0**;
- preguntas con más de un primary: **0**;
- preguntas nuevas sin relación canónica: **0**.

### Cobertura final por concepto

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

Los conceptos sensibles de Gobernanza (`C03`, `C05`, `C30`, `C31`, `C06`, `C32`, `C17`, `C33`, `C25`, `C27`, `C34`, `C28`, `C29`) se inspeccionaron directamente tras el import y conservan las relaciones primary aprobadas.

## Compatibilidad V2/V3

Las 45 nuevas siguen siendo filas ordinarias de `public.questions`, con su jerarquía V2 normal y disponibles para los mecanismos ordinarios del banco. No se introdujo DDL ni se modificaron las funciones/rutas de creación de test, recomendación, selección inteligente o `complete_test`.

Se verificó además que existen temas fuera de los pilotos V4 con preguntas activas y cero relaciones `question_concepts`, por lo que el mapeo V4 no se ha convertido en requisito global para utilizar una pregunta. `complete_test` se probó de forma reversible dentro de transacción cuando existía un test incompleto disponible; cualquier cambio de esa prueba se revirtió.

## Seguridad de ejecución

- no hubo `INSERT` manual en `questions`;
- no hubo `INSERT` manual en `study_units`, `concepts`, `question_concepts` ni `flashcards`;
- no se aplicó DDL ni migración;
- los intentos de transporte intermedios que no ofrecían garantías suficientes se descartaron antes de llamar al importador V4 y sus buffers efímeros se eliminaron;
- la importación V4 real tomó únicamente el JSON cuyo tamaño y MD5 coincidían con el artefacto aprobado por CI.
