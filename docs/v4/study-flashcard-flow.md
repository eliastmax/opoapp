# V4 — Flujo Avanzar + flashcards

## Objetivo

Cerrar el tramo operativo:

`Abrir unidad → estudiar → completar → cards → comprobar`

La unidad estudiada aporta **exposición**, no dominio. Las flashcards apoyan recuperación activa, pero el dominio conceptual sigue dependiendo principalmente de preguntas distintas y controles espaciados.

## Unidades de estudio

### `open_my_v4_study_unit(unit_id)`

- exige usuario autenticado y oposición activa;
- valida que la unidad pertenezca a esa oposición y esté activa;
- registra `first_opened_at` una sola vez y actualiza `last_opened_at`;
- devuelve contenido de la unidad, conceptos, cards y progreso actual.

### `complete_my_v4_study_unit(unit_id)`

- exige que la unidad haya sido abierta antes;
- registra la primera finalización y aumenta `completion_count`;
- dispara el refresco de dominio conceptual ya existente;
- devuelve cuántas cards están pendientes y cuántos conceptos están listos para pasar a comprobación;
- propone `nextStep = flashcards | verify | done`.

Los clientes autenticados ya no escriben directamente `study_unit_progress`: las mutaciones pasan por RPC validada.

## Flashcards

El usuario responde con tres opciones sencillas:

- `known` — **La sabía**;
- `unsure` — **Dudé**;
- `missed` — **No la sabía**.

### Espaciado

- primera `known`: +3 días;
- segunda `known` consecutiva: +7 días;
- tercera: +14 días;
- cuarta y siguientes: +30 días;
- `unsure`: +1 día y reinicia la racha segura;
- `missed`: +10 minutos y reinicia la racha segura.

La escala es deliberadamente explicable; no pretende replicar Anki ni introducir un algoritmo opaco.

### `get_my_v4_flashcard_queue(limit, unit_id?)`

Solo devuelve cards de unidades ya completadas y que estén realmente pendientes:

- nunca revisadas;
- falladas cuyo reintento ya vence;
- dudadas cuyo repaso ya vence;
- conocidas cuyo intervalo espaciado ya vence.

Orden inicial: reaprendizaje → nuevas → dudosas → repasos programados.

### `review_my_v4_flashcard(card_id, rating)`

- valida oposición, card activa y unidad completada;
- el servidor calcula racha e intervalo;
- inserta evidencia inmutable en `flashcard_reviews`;
- el trigger existente recalcula el dominio del concepto;
- devuelve fecha de siguiente repaso y cards aún pendientes en la unidad.

Los clientes autenticados ya no pueden insertar directamente evidencias de flashcard.

## Relación con dominio conceptual

- completar unidad puede mover `Unseen → Seen`;
- hacer cards puede mantener `Seen` y activar `needs_attention` si hay duda/fallo;
- cards acertadas nunca satisfacen los umbrales de preguntas para `Consolidating` o `Retained`;
- después de unidad + cards, el motor de Hoy puede proponer `verify` y `create_v4_concept_check()` crea las preguntas reales.

## Seguridad

Las escrituras siguen el patrón V4:

`public SECURITY INVOKER → private SECURITY DEFINER`

El escritor privado valida `auth.uid()` y oposición activa. Las funciones privadas no están en el esquema expuesto. `anon` y `PUBLIC` no reciben ejecución.

## Bucle operativo conseguido

`Hoy / Avanzar`
→ abrir unidad
→ estudiar contenido
→ completar
→ cards pendientes
→ respuestas La sabía / Dudé / No la sabía
→ refresco de concepto
→ comprobación dirigida
→ `complete_test`
→ nuevo estado conceptual
→ siguiente recomendación de Hoy
