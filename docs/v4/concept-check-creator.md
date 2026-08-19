# V4 — Creador de comprobaciones conceptuales

## Objetivo

Convertir los bloques `Repasar`, `Corregir` y `Comprobar` del motor de Hoy en tests reales, pequeños y dirigidos a un concepto canónico.

El creador no sustituye `create_smart_test()` ni `create_recommended_test()`. Es una ruta específica para evidencia conceptual V4.

## Contrato

RPC pública:

`create_v4_concept_check(p_concept_id, p_question_count, p_mode)`

Modos:

- `review`: 1–2 preguntas; solo para `Consolidating`/`Retained`, sin atención activa y cuando `next_review_on` ya vence;
- `repair`: 1–3 preguntas; exige `needs_attention = true`;
- `verify`: 2–4 preguntas; exige `Seen`/`Verifying`, sin atención activa y cobertura mínima de 4 preguntas primarias.

El número pedido es exacto. Si no se puede construir la comprobación completa, la operación falla y no crea un test parcial.

## Retención

El cliente **no puede enviar** `retention_checkpoint_days`.

Para `review`, el servidor recalcula primero el estado desde evidencia canónica y deriva:

- `Consolidating` sin control previo → +3;
- `Consolidating` con un control → +7;
- `Retained` con dos controles → +14;
- `Retained` con tres o más → +30.

También exige que `next_review_on <= CURRENT_DATE`.

Esto evita crear un +7 inmediatamente después del +3 o fabricar metadata de retención desde el frontend.

## Selección de preguntas

V1 usa únicamente preguntas **primarias** activas del concepto.

Prioriza, por orden:

1. preguntas nunca usadas en una comprobación dirigida de ese concepto;
2. menor número de usos dirigidos;
3. evitar la pregunta del test completado inmediatamente anterior;
4. menor presencia en los tres tests recientes;
5. preguntas todavía no respondidas cuando hay empate;
6. las menos recientemente usadas;
7. id estable como desempate final.

El objetivo no es aleatoriedad por sí misma, sino maximizar evidencia distinta y reducir memorización de formulaciones.

## Persistencia

Cada test se crea como `tipo = 'v4_concept_check'` y usa las tablas existentes:

- `tests`;
- `test_question_selection`;
- `test_answers`.

`test_question_selection` registra:

- `selection_concept_id`;
- checkpoint derivado cuando procede;
- `algorithm_version = 'v4-concept-check-v1'`;
- grupo `concept_review`, `concept_repair` o `concept_verify`.

Al completar el test, el trigger V4 ya existente refresca automáticamente `user_concept_mastery`.

## Integridad y seguridad

`authenticated` conserva la capacidad necesaria para los creadores V2/V3, pero la policy de INSERT impide que una inserción directa tenga `selection_concept_id` o `retention_checkpoint_days` no nulos.

La escritura V4 vive en `private.create_v4_concept_check()` como `SECURITY DEFINER`, fuera del esquema expuesto. La función pública es un wrapper `SECURITY INVOKER` y no acepta user id, estado, métricas ni checkpoint.

El escritor privado:

- exige `auth.uid()`;
- resuelve la oposición activa;
- recalcula dominio antes de autorizar el modo;
- solo usa conceptos activos de esa oposición;
- crea test, selección y respuestas en una única transacción.

## Resultado esperado del bucle

`Hoy → bloque dirigido → create_v4_concept_check → test normal → complete_test → trigger de mastery → nuevo estado → nuevo Hoy`

Con esta pieza, los bloques conceptuales de Hoy ya pueden convertirse en acciones reales sin una segunda infraestructura de tests.
