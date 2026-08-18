# Diseño de OpoTest Study V3

La V3 añade planificación personalizada sobre el núcleo validado de la V2. No sustituye el progreso medido ni modifica los bancos de preguntas.

## Principio central

La aplicación combina tres fuentes claramente diferenciadas:

1. percepción inicial del estudiante;
2. evidencia real obtenida en los tests;
3. tiempo y disponibilidad hasta el examen.

La percepción subjetiva sirve para comenzar con mejores recomendaciones, pero pierde peso conforme existe evidencia real.

## Documentos

- [Valoración inicial, fecha de examen y hoja de ruta adaptativa](01-valoracion-inicial-y-hoja-ruta.md).
- [V3.0: base multioposición y catálogo compartido](sprint-01-base-multioposicion.md).
- [V3-VIS.0: contexto multioposición y preparación visual de V3.1](sprint-02-visual-context-and-profile-flow.md).
- [V3.1: perfil de preparación persistente](sprint-03-preparation-profile.md).
- [V3.2: prioridad inicial personalizada](sprint-04-initial-recommendation.md).
- [V3.3: hoja de ruta semanal derivada](sprint-05-weekly-roadmap.md).
- [V3.4: adaptación, explicabilidad y validación](sprint-06-adaptation-validation.md).

## Estado

V3.0, V3-VIS.0, V3.1, V3.2 y V3.3 están implementadas. V3.2 incorpora la autovaloración como señal temporal del motor: empieza con peso alto cuando no hay evidencia y desaparece al alcanzar 20 preguntas distintas respondidas. La autovaloración continúa aislada del progreso, los niveles y la retención.

V3.3 calcula una ruta semanal replanificable a partir de la disponibilidad y los resultados reales y ya está integrada visualmente en Inicio.

V3.4 cierra el núcleo adaptativo: alinea las explicaciones de la hoja semanal con V3.2, distingue una valoración desconocida de una valoración baja, representa de forma explícita la ausencia de preguntas activas, refresca la ruta tras cambios relevantes, limita visualmente el progreso al 100 % cuando se supera el objetivo y corrige el desplazamiento del detalle de Progreso en móvil. No cambia la fórmula de prioridad, la retención, los desbloqueos ni el contrato CSV V2.
