# V4 — Motor de dominio y compositor de Hoy

## Objetivo

Cerrar el tramo operativo entre evidencia real y una recomendación diaria clara:

`evidencia → estado conceptual → cache → prioridad → bloque de Hoy`

La UI no decide si un conocimiento está dominado. Tampoco puede escribir directamente `user_concept_mastery`.

## 1. Cache de dominio reconstruible

`user_concept_mastery` sigue siendo una cache, no una fuente de verdad.

Fuentes canónicas:

- `test_answers`;
- `test_question_selection` para atribución dirigida y checkpoints;
- `study_unit_progress`;
- `flashcard_reviews`.

`refresh_my_v4_concept_mastery()` reconstruye el estado exclusivamente desde esas fuentes.

### Seguridad

La función es `SECURITY DEFINER` de forma intencionada porque los clientes autenticados solo tienen `SELECT` sobre `user_concept_mastery` y no deben poder autodeclararse `retained`.

Protecciones:

- exige `auth.uid()`;
- solo trabaja sobre la oposición activa del usuario;
- no recibe ningún estado ni métrica calculada por el cliente;
- `p_concept_id` solo sirve para limitar el concepto recalculado;
- `search_path` vacío y referencias de esquema explícitas;
- `PUBLIC` y `anon` no pueden ejecutarla;
- solo `authenticated` recibe `EXECUTE`.

## 2. Contrato de evaluación

La implementación PostgreSQL conserva el contrato de `src/lib/concept-mastery.ts` y `src/lib/v4-mastery-config.ts`:

- `Unseen`: sin exposición;
- `Seen`: unidad completada, cards o primera evidencia;
- `Verifying`: al menos 2 preguntas distintas;
- `Consolidating`: al menos 4 preguntas distintas, 3 seguras, >=70 % de precisión segura y 2 sesiones;
- `Retained`: además, controles dirigidos satisfactorios en checkpoints >=3 y >=7 días, con al menos 2 preguntas y 2 sesiones distintas.

Una respuesta correcta marcada como duda no cuenta como evidencia segura.

Repetir una pregunta actualiza su situación, pero no aumenta el número de preguntas distintas.

Dos señales inseguras recientes pueden bajar como máximo un nivel de dominio por evaluación. Un fallo aislado puede activar `needs_attention` sin destruir de golpe un estado retenido.

## 3. Próxima revisión

Intervalos base:

- atención activa: +1 día;
- `Seen` / `Verifying`: +1 día;
- `Consolidating`: +3 días antes del primer control, +7 tras un control;
- `Retained`: +14 días y después +30 cuando ya existen tres controles satisfactorios.

La fecha se calcula desde la evidencia más reciente relevante. Si el historial es antiguo al activar V4, la fecha puede quedar ya vencida: el compositor lo tratará como trabajo pendiente en vez de posponerlo artificialmente desde el día del bootstrap.

## 4. Actualización automática

El cache se refresca de forma dirigida cuando:

- un test pasa a `completado`;
- una unidad cambia su `completed_at`;
- se inserta una revisión de flashcard.

El trigger de finalización de test solo recalcula los conceptos realmente tocados por las preguntas del test.

`prepare_my_v4_today_context()` ejecuta además un refresh completo al entrar en la experiencia V4. Esto permite proyectar respuestas V2/V3 históricas la primera vez que se activa un concepto nuevo.

Antes de mapear los 24 temas completos habrá que medir el coste de ese bootstrap completo y, si es necesario, sustituirlo por invalidación incremental por versión de contenido. Los triggers ya cubren el mantenimiento ordinario posterior.

## 5. Contexto de Hoy

`prepare_my_v4_today_context()` devuelve por concepto:

- tema, unidad y concepto;
- tiempo estimado de unidad;
- finalización de unidad;
- estado y atención;
- siguiente revisión;
- precisión y cantidad de evidencia;
- preguntas primarias y cards disponibles;
- última evidencia;
- posición del tema en la hoja de ruta semanal V3 cuando existe.

Así V4 no crea un segundo plan semanal desconectado: el avance puede preferir el tema que V3 ya considera prioritario.

## 6. Compositor determinista

`composeV4TodayPlan()` recibe el contexto y los minutos disponibles.

Orden visible:

1. **Repasar** — un concepto consolidando/retenido cuya revisión ya vence.
2. **Corregir** — un concepto con fallo, duda o card inestable reciente.
3. **Avanzar** — una unidad aún no completada, priorizando la hoja de ruta semanal cuando existe.
4. **Comprobar** — un concepto `Seen`/`Verifying` que necesita preguntas distintas para generar evidencia suficiente.

Máximo inicial: un bloque de cada tipo.

El plan nunca supera los minutos indicados. Con menos de 20 minutos utiliza bloques compactos mínimos.

## 7. Checkpoints dirigidos

Cuando un bloque de `Repasar` requiere preguntas, el compositor devuelve `retentionCheckpointDays`:

- `Consolidating` sin control previo → 3;
- `Consolidating` con un control → 7;
- `Retained` con dos controles → 14;
- `Retained` con tres o más → 30.

Ese valor todavía no crea un test. El futuro creador de comprobaciones deberá persistirlo en `test_question_selection.retention_checkpoint_days` junto al `selection_concept_id`.

## 8. Guardas de calidad

- un concepto con menos de 4 preguntas primarias activas no recibe un bloque normal de `Comprobar` para fingir que puede consolidarse;
- las cards apoyan el aprendizaje, nunca sustituyen preguntas de examen;
- `nothing_due` es un resultado válido: el motor no inventa actividad para llenar tiempo;
- el compositor es puro y testeable; no muta base de datos;
- la cache puede reconstruirse desde evidencia original.

## Siguiente pieza

Tras validar este motor con el piloto del Tema 18, el siguiente backend operativo es el **creador de comprobaciones V4**: seleccionar preguntas distintas para un concepto, crear el test y registrar `selection_concept_id` + checkpoint. Con esa pieza, el plan de Hoy podrá convertirse directamente en acciones ejecutables por la futura interfaz.
