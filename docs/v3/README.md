# Diseño de OpoTest Study V3

La V3 añadirá planificación personalizada sobre el núcleo validado de la V2. No sustituirá el progreso medido ni modificará los bancos de preguntas.

## Principio central

La aplicación combinará tres fuentes claramente diferenciadas:

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

## Estado

V3.0, V3-VIS.0 y V3.1 están implementadas. V3.2 incorpora la autovaloración como señal temporal
del motor: empieza con peso alto cuando no hay evidencia y desaparece al alcanzar 20 preguntas
distintas respondidas. La autovaloración continúa aislada del progreso, los niveles y la retención.
