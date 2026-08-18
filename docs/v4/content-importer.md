# V4 — Importador controlado de contenido

## Objetivo

Convertir un `V4StudyContentPackage` ya validado en datos V4 persistidos sin INSERTs manuales, sin UUIDs portátiles y sin estados parciales.

RPC:

`import_v4_study_content(p_package jsonb)`

## Seguridad

La función es `SECURITY INVOKER`.

Requisitos para importar:

- sesión autenticada;
- la oposición del paquete debe existir, estar publicada y ser la oposición activa del usuario;
- el usuario debe figurar en `opposition_admins` para esa oposición;
- las políticas RLS de las tablas V4 siguen aplicándose durante toda la operación.

`PUBLIC` y `anon` no pueden ejecutar la función.

## Atomicidad

Una llamada al RPC se ejecuta dentro de una única transacción de PostgreSQL.

Si una unidad, concepto, pregunta o card tiene una referencia inválida, la función lanza error y se revierte toda la llamada. No puede quedar medio paquete importado.

## Estrategia de actualización

### Unidades

Se hace upsert por `(opposition_id, code)`.

El código estable identifica la unidad; títulos, posición, resumen, fuentes y demás contenido pueden actualizarse.

`sourceSubtopicName` es solo una pista de compatibilidad con la estructura anterior. Se guarda `subtopic_id` únicamente si ese nombre identifica de manera unívoca un subtema dentro del tema.

### Conceptos

Se hace upsert por `(opposition_id, code)` y la unidad referenciada debe existir en el mismo tema.

### Preguntas

Para cada `questionCode` incluido:

1. la pregunta debe existir, estar activa y pertenecer al tema/oposición del paquete;
2. se eliminan sus asociaciones conceptuales anteriores;
3. se inserta exactamente el concepto primario del paquete y, cuando existan, los secundarios.

Las preguntas no incluidas en un paquete parcial conservan sus mapeos existentes.

### Flashcards

Dentro de cada concepto incluido, el paquete es autoritativo sobre las cards activas:

1. se desactivan las cards anteriores del concepto;
2. las cards incluidas se insertan o reactivan/actualizan por código estable.

No se borran cards antiguas porque `flashcard_reviews` puede necesitar conservar la relación histórica.

El catálogo admitido queda fijado también en base de datos:

- `direct`;
- `contrast`;
- `number_or_deadline`;
- `exception`;
- `mini_case`.

## Auditoría

Cada importación correcta crea una fila en `study_content_imports` con:

- oposición;
- tema;
- versión del contrato;
- revisión de fuente declarada;
- número de unidades;
- conceptos;
- mapeos de preguntas;
- flashcards;
- administrador que importó;
- fecha/hora.

No se almacena una segunda copia completa del paquete en la base de datos: el paquete versionado en Git es la fuente de revisión, mientras la tabla conserva el historial operativo de importaciones.

## Flujo esperado

`generar → validateV4StudyContentPackage → revisión humana → import_v4_study_content → verificación post-importación`

La RPC no sustituye el validador TypeScript; actúa como segunda barrera de integridad y autorización.

## Piloto Tema 18

El paquete `topic18SilencePilotPackage` es el primer candidato para probar el importador.

Antes de cargarlo se verificó en producción que sus 19 códigos de pregunta:

- existen;
- están activos;
- pertenecen a `auxiliar-administrativo-sms`;
- pertenecen al Tema 18.

La primera prueba del RPC debe hacerse de forma transaccional/reversible o con verificación completa inmediata antes de considerar el slice cargado.