# T13-CONTENT.3 — Materialización controlada en producción

Estado actual: **Tema 13 materializado y verificado en V2 y V4; pendiente únicamente del gate final de Gobernanza para cerrar/fusionar**.

La base de datos es la fuente de verdad. La materialización se hizo sin DDL, sin `INSERT` manual y usando exclusivamente los dos RPC existentes: `import_questions_batch(jsonb)` para las preguntas ordinarias V2 e `import_v4_study_content(jsonb)` para el contenido V4.

## 1. Banco V2

Antes de T13-CONTENT.3, Tema 13 tenía 99 preguntas activas. Las 45 preguntas aprobadas `SMS-T13-0100` a `SMS-T13-0144` se validaron con el contrato V2 real de 25 columnas y se materializaron mediante `import_questions_batch(jsonb)`.

Resultado agregado del importador V2:

- insertadas: 45;
- enriquecidas: 0;
- omitidas: 0.

Verificación directa posterior:

- preguntas activas Tema 13: **144**;
- códigos nuevos presentes: **45/45**, exactamente `0100-0144`;
- duplicados de código: **0**;
- preguntas nuevas fuera de Tema 13: **0**;
- preguntas nuevas inactivas: **0**;
- opciones vacías o duplicadas: **0**;
- claves inválidas: **0**;
- filas con metadatos V2 esperados ausentes: **0**;
- distribución del lote nuevo: **A 11 / B 11 / C 11 / D 12**.

Se inspeccionaron directamente en producción las filas `0100`, `0106`, `0112`, `0126`, `0138` y `0144`, incluyendo sus 25 campos V2 y su estado activo.

## 2. Paquete V4 importado

El paquete canónico final está en `src/lib/v4-pilots/topic-13-estatuto-marco-materialized.ts`. Mantiene los 99 `primary` originales y añade exactamente los 45 `primary` aprobados, sin `secondary` nuevos.

El handoff exacto utilizado para la importación fue generado por el propio paquete que pasó Quality y validado antes de escribir:

- contrato: `4.0`;
- bytes UTF-8: `69.325`;
- caracteres: `68.381`;
- MD5: `749a3c330fbc37e0bbdfa1d19e3df3be`;
- SHA-256: `e425818f388d7dbad6fc41c16de695f09feb7830a5ab2a545c0ff7881df63472`;
- 18 unidades;
- 34 conceptos;
- 144 mappings primary;
- 68 flashcards.

### Preflight reversible

Antes de la escritura V4 real se ejecutó `import_v4_study_content` dentro de una transacción con `ROLLBACK` usando ese JSON exacto. El RPC devolvió 18/34/144/68 y el hash/longitud coincidieron. Tras el rollback se verificó de nuevo producción en 0 unidades / 0 conceptos / 0 primary / 0 flashcards y 0 registros de importación para Tema 13.

### Importación V4 real

Con el HEAD limpio y **Quality #114 SUCCESS** antes del import, se ejecutó el mismo paquete exacto mediante `import_v4_study_content`.

Resultado del RPC:

- `importId`: `e925633a-fca3-4cf0-a6e2-c95deced6e8f`;
- opposition: `auxiliar-administrativo-sms`;
- topic: 13;
- unidades: 18;
- conceptos: 34;
- mappings: 144;
- flashcards: 68.

`study_content_imports` confirma el mismo `importId`, contrato `4.0`, oposición/tema correctos, 18/34/144/68 e importación por el administrador esperado.

## 3. Estado V4 real de producción

Verificación independiente tras el commit de la transacción:

- preguntas activas Tema 13: **144**;
- unidades V4 activas: **18**;
- conceptos V4 activos: **34**;
- relaciones `primary`: **144**;
- flashcards V4 activas: **68**;
- registros de importación Tema 13: **1**.

Integridad:

- conceptos con >=4 preguntas primary activas: **34/34**;
- `coverage_gap`: **0**;
- conceptos sin cobertura: **0**;
- mínimo de primaries por concepto: **4**;
- máximo: **6**;
- preguntas Tema 13 con más de un primary: **0**;
- preguntas nuevas `0100-0144` sin primary: **0**.

## 4. Cobertura real por concepto

| Concepto | Primary |
|---|---:|
| C01 | 4 |
| C02 | 6 |
| C03 | 4 |
| C04 | 4 |
| C05 | 4 |
| C06 | 4 |
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
| C28 | 4 |
| C29 | 4 |
| C30 | 4 |
| C31 | 4 |
| C32 | 4 |
| C33 | 4 |
| C34 | 4 |

Relaciones sensibles comprobadas directamente:

- C03: `0011-0013 + 0100`;
- C05: `0018 + 0101-0103`;
- C30: `0019 + 0104-0106`;
- C31: `0020 + 0107-0109`;
- C06: `0021-0022 + 0110-0111`;
- C32: `0023 + 0112-0114`;
- C17: `0059 + 0122-0124`;
- C33: `0060-0061 + 0125-0126`;
- C25: `0087-0088 + 0133-0134`;
- C27: `0094 + 0135-0137`;
- C34: `0095 + 0138-0140`;
- C28: `0096-0097 + 0141-0142`;
- C29: `0098-0099 + 0143-0144`.

## 5. Compatibilidad V2/V3

Se ejercitaron los RPC reales con el usuario autenticado y `ROLLBACK` para no dejar historial de prueba:

- `create_level_test`: crea correctamente un test normal de consolidación de 30 preguntas;
- `create_recommended_test`: crea correctamente una sesión recomendada de 10 preguntas;
- `create_smart_test`: crea correctamente un test inteligente de 30 preguntas, sin necesitar excepción de solapamiento;
- `complete_test`: completa correctamente un test reversible de 5 preguntas sin responder y devuelve `0/0/5/0.00`;
- los IDs usados en las pruebas de compatibilidad no persistieron tras el rollback.

Las 45 nuevas son preguntas ordinarias activas: 16 están etiquetadas `consolidacion` y 29 `tribunal`, por lo que participan en los mismos pools normales del banco. Fuera de Tema 13 siguen existiendo **4.190 preguntas activas sin ningún mapping V4**, confirmando que V4 no es requisito global ni secuestra el uso ordinario del banco.

## 6. Advisors

No hubo DDL en este sprint.

Security Advisor final:

- mantiene únicamente el WARN preexistente `Leaked Password Protection Disabled`; no es una regresión de T13-CONTENT.3.

Performance Advisor final:

- mantiene INFO preexistentes sobre FKs sin índice de cobertura y varios índices no usados;
- no se introdujo ninguna regresión nueva derivada de DDL porque no hubo cambios de esquema.

## 7. Anomalías y trazabilidad

Durante la ejecución se detectó que una versión anterior de la documentación afirmaba prematuramente que V4 ya estaba importado, mientras la lectura directa de Supabase seguía mostrando 0/0/0/0. Se corrigió la documentación antes de la importación real; la base de datos se trató siempre como fuente de verdad.

Un run anterior de GitHub Quality (#108) quedó en `action_required` sin ejecutar jobs. Un commit normal posterior volvió a disparar el workflow con normalidad; el gate previo a la importación real fue **Quality #114 SUCCESS** sobre un HEAD limpio, sin helpers ni modificaciones temporales del workflow.

## 8. Seguridad de ejecución

- ningún `INSERT` manual en `questions`;
- ningún `INSERT` manual en `study_units`, `concepts`, `question_concepts` ni `flashcards`;
- ningún DDL ni migración para T13-CONTENT.3;
- no se modificó UI;
- no se inició Tema 18 ni Tema 19;
- PR #62 debe permanecer draft y sin fusionar hasta el gate final de Gobernanza.
