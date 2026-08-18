# V4 — Modelo de dominio conceptual

## Objetivo

OpoTest debe estimar el estado de un concepto sin confundir exposición, memoria inmediata y dominio real. El modelo es deliberadamente conservador: leer, acertar flashcards o repetir una misma pregunta no basta para declarar que un concepto está consolidado o retenido.

## Estados visibles

1. `unseen` — No trabajado.
2. `seen` — Visto.
3. `verifying` — En comprobación.
4. `consolidating` — Consolidando.
5. `retained` — Retenido.

Las banderas `needsAttention` y `nextReviewDelayDays` son independientes del estado. Un concepto retenido puede necesitar atención puntual sin perder automáticamente el estado.

## Qué cuenta como evidencia

### Unidad de estudio

Completar una unidad puede llevar un concepto a `seen`, pero nunca más allá por sí solo.

### Flashcards

Las flashcards sirven para recuperación activa y prioridad de repaso. No prueban dominio por sí solas y nunca hacen avanzar un concepto más allá de `seen` sin preguntas asociadas.

Un fallo en una card puede activar `needsAttention` y acercar el siguiente repaso.

### Preguntas

Las preguntas son la evidencia principal de dominio.

- Solo cuentan preguntas distintas para ampliar la cantidad de evidencia.
- Repetir la misma pregunta puede actualizar el estado actual de esa pregunta, pero no aumenta `distinctQuestions`.
- Una respuesta correcta marcada con duda no es una respuesta segura.
- La precisión segura se calcula sobre el último intento de cada pregunta distinta.
- Las sesiones distintas importan: una única sesión no basta para consolidar un concepto.

## Umbrales iniciales V4.0

### Visto → En comprobación

Se necesitan al menos 2 preguntas distintas respondidas sobre el concepto.

### En comprobación → Consolidando

Se requieren simultáneamente:

- 4 preguntas distintas como mínimo;
- 3 respuestas seguras correctas como mínimo;
- precisión segura >= 70 %;
- evidencia repartida en al menos 2 sesiones distintas.

Estos son umbrales iniciales de producto, no una verdad científica. Se validarán con uso real antes de endurecer o relajar el modelo.

### Consolidando → Retenido

Además de conservar las condiciones de consolidación, se requieren comprobaciones diferidas reales:

- al menos una comprobación programada a partir de 3 días;
- al menos una comprobación programada a partir de 7 días;
- ambas superadas con respuestas seguras;
- usando al menos 2 preguntas distintas;
- repartidas en al menos 2 sesiones distintas.

Por tanto, una buena sesión hoy no puede producir `retained` hoy.

## Inestabilidad y retroceso

Una respuesta incorrecta aislada no destruye un concepto retenido. Activa `needsAttention` y adelanta el próximo repaso a 1 día.

Se considera inestabilidad reciente cuando aparecen al menos 2 resultados no seguros entre las últimas 3 preguntas distintas o 2 resultados no seguros consecutivos.

Si el concepto ya tenía un estado superior y la evidencia actual exige retroceso, una evaluación nunca baja más de un estado a la vez:

- `retained` → `consolidating`;
- `consolidating` → `verifying`.

Esto evita que un mal día borre artificialmente semanas de evidencia.

## Calendario inicial de revisión

Sin atención activa:

- `seen` / `verifying`: volver a comprobar en 1 día;
- `consolidating` sin primer checkpoint superado: 3 días;
- `consolidating` con primer checkpoint superado: 7 días;
- `retained` con 2 checkpoints: 14 días;
- `retained` con 3 o más checkpoints: 30 días.

Con `needsAttention`, el siguiente repaso vuelve a 1 día independientemente del estado.

## Ejemplos

### Lee el resumen y acierta 20 cards

Estado: `seen`.

Motivo: existe exposición y recuperación de memoria, pero ninguna comprobación mediante preguntas.

### Acierta 2 preguntas diferentes

Estado: `verifying`.

Todavía no hay suficiente amplitud ni separación temporal.

### Acierta 4 preguntas diferentes en la misma sesión

Estado: `verifying`.

Aunque la precisión sea alta, falta evidencia en una segunda sesión.

### 3/4 seguras en dos sesiones

Estado: `consolidating`.

La precisión segura es 75 % y existe variedad temporal mínima.

### Consolida y después supera controles a +3 y +7 días

Estado: `retained`.

### Concepto retenido y falla una pregunta nueva

Estado: `retained` + `needsAttention`.

OpoTest lo prioriza pronto, pero no borra el historial positivo.

### Concepto retenido y falla dos preguntas nuevas consecutivas

Estado: `consolidating` + `needsAttention`.

Existe evidencia reciente suficiente para rebajar confianza, pero solo un nivel.

## Principios que este modelo protege

- Actividad no significa dominio.
- Memorizar una pregunta no significa dominar un concepto.
- Las dudas no son evidencia segura.
- El conocimiento debe demostrarse con preguntas diferentes y en más de un momento.
- Retención requiere tiempo real.
- Un error aislado no borra el progreso.
- Los fallos generan una acción concreta de repaso, no castigo.

## Estado de implementación

La primera versión existe como lógica pura en `src/lib/concept-mastery.ts` y se valida con tests unitarios en `src/lib/__tests__/concept-mastery.test.ts`.

Todavía no está conectada a Supabase ni a la interfaz. No debe persistirse como contrato definitivo de datos hasta validar estos umbrales y diseñar la relación `pregunta ↔ concepto`.
