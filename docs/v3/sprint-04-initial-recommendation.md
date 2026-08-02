# V3.2 — Prioridad inicial personalizada

## Valor visible

Inicio explica antes de crear la sesión por qué propone el tema prioritario. La razón puede proceder
de fallos, dudas, repasos programados, una valoración inicial baja o desconocida, práctica todavía
insuficiente o rendimiento observado.

## Transición de estimación a evidencia

La valoración inicial no se convierte en progreso. Solo modifica temporalmente la prioridad del
tema: pesa 1 sin preguntas distintas respondidas y desciende linealmente hasta 0 al alcanzar 20.
A partir de ese punto decide exclusivamente la evidencia real.

Los fallos activos, las dudas y los repasos vencidos conservan prioridad. La valoración tampoco
desbloquea Consolidación o Tribunal ni escribe en estadísticas, respuestas o cobertura.

## Catálogo compartido

El camino completo de la sesión recomendada separa ahora el propietario histórico del catálogo del
alumno. Las respuestas, estadísticas, incidencias y trazas continúan perteneciendo al estudiante,
pero pueden referenciar preguntas del catálogo compartido de su oposición activa.

Las vistas de fallos y dudas, el cálculo de fases, el cierre del test y la selección recomendada
usan la oposición del test y el usuario del progreso, no el `user_id` legado de la pregunta.

El perfil de preparación inscribe y activa ahora una oposición publicada dentro de la misma
transacción antes de validar sus temas. Un error posterior revierte el cambio, mientras que un
alumno nuevo sí puede configurar un catálogo que no poseía previamente.

## Contratos

- `get_initial_recommendation_context()` devuelve tema, razón, evidencia y peso vigente de la
  valoración.
- `create_recommended_test()` devuelve la misma explicación junto al reparto de la sesión y registra
  `recommended-v3.2` en su trazabilidad.
- Ambos contratos son `SECURITY INVOKER`, respetan RLS y solo operan sobre la oposición activa.

## Fuera de alcance

La fecha del examen y la disponibilidad semanal todavía no distribuyen carga. Eso pertenece a V3.3,
la hoja de ruta semanal replanificable.
