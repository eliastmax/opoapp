# V4 — Sesión diaria y debrief

## Objetivo

Dar identidad y continuidad al plan de **Hoy** sin convertir la sesión en una nueva fuente de dominio.

`plan de Hoy → sesión persistida → bloques → evidencia real → debrief`

La sesión coordina. El dominio sigue derivándose exclusivamente de unidades, flashcards y preguntas.

## Sesión diaria

Una oposición activa puede tener una sesión recomendada por fecha local. Antes de empezar cualquier bloque, el usuario puede cambiar el tiempo disponible y reemplazar el plan. Una vez iniciado un bloque, el plan queda estable para permitir reanudarlo.

La sesión guarda:

- fecha local;
- minutos disponibles y planificados;
- estado `active | completed | closed_early`;
- bloques ordenados;
- snapshot del estado conceptual previo para bloques conceptuales.

No genera deuda para el día siguiente.

## Bloques

Estados:

`planned → in_progress → completed`

Un bloque también puede quedar `skipped` sin penalizar dominio.

Tipos:

- `review`;
- `repair`;
- `advance`;
- `verify`.

Los bloques se empiezan en orden. La sesión puede cerrarse antes de tiempo solo cuando no existe un bloque en progreso; los bloques pendientes se marcan como omitidos.

### Evidencia al completar

- `advance` exige que la unidad haya sido completada después de iniciar el bloque;
- `review / repair / verify` exigen un test V4 completado cuyo `selection_concept_id` y `selection_group` correspondan al concepto y tipo del bloque.

La sesión nunca puede afirmar por sí sola que un concepto se ha aprendido.

## Reanudar

`get_my_v4_daily_session(local_date)` devuelve la sesión y todos sus bloques con su estado, referencias y timestamps. La futura interfaz puede reconstruir exactamente dónde estaba el usuario.

## Debrief

`get_my_v4_daily_debrief(session_id)` vuelve a refrescar el dominio de los conceptos trabajados y devuelve:

- bloques completados / omitidos;
- conceptos que subieron de estado;
- conceptos que llegaron a `Retained`;
- atenciones resueltas y pendientes;
- tests y preguntas realmente respondidas;
- aciertos, fallos y dudas;
- flashcards revisadas y distribución `known / unsure / missed`;
- próxima revisión conceptual;
- `messageCode` determinista para que la UI redacte el cierre sin IA generativa.

Ejemplos de `messageCode`:

- `session_complete`;
- `session_complete_attention`;
- `session_closed_early`;
- `session_closed_early_attention`;
- `session_in_progress`.

## Principio de producto

Cerrar antes una sesión no genera castigo ni deuda. El debrief describe lo ocurrido y el motor de Hoy recalculará desde evidencia real la próxima vez.

## Seguridad

Las dos tablas de coordinación tienen RLS y acceso directo de lectura únicamente para el propietario. Las escrituras pasan por el patrón V4:

`public SECURITY INVOKER → private SECURITY DEFINER`

Los identificadores de oposición, unidad, concepto y test se validan en servidor. El snapshot previo se obtiene del cache de dominio reconstruible; el cliente no puede declarar estados de dominio.
