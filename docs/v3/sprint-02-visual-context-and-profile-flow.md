# V3-VIS.0 — Contexto multioposición y preparación visual de V3.1

## Integrado con V3.0

- Inicio identifica de forma discreta la oposición activa sin competir con la sesión recomendada.
- Ajustes muestra la preparación actual con espacio suficiente para nombres largos.
- Los estados de carga, error, reintento y ausencia se derivan de contratos reales: `profiles.active_opposition_id` y `oppositions`.
- El componente es reutilizable y no permite todavía cambiar de oposición.

## Experiencia preparada para V3.1

El flujo presentacional se divide en cinco pasos: oposición, fecha, días, preguntas por sesión y
valoración por tema. La valoración utiliza 0, 25, 50, 75, 100 o «No sé» y recorre un tema cada vez
para funcionar con 24 temas o más sin crear una tabla densa en móvil.

Los componentes son controlados: reciben el borrador, notifican cambios y exponen guardado,
reintento y reanudación. No están conectados a una ruta ni simulan persistencia.

## Contrato operativo

| Dato necesario       | Tipo esperado                                        | Estados                                | Consumidor       | Si falta                                            |
| -------------------- | ---------------------------------------------------- | -------------------------------------- | ---------------- | --------------------------------------------------- | --- | ----- | ------------------- | ---------------- | ---------------------------------------- |
| Oposición elegida    | `oppositionId: uuid`                                 | activa, no disponible                  | Paso 1 y edición | bloquear avance con explicación                     |
| Fecha o periodo      | unión `exact`, `month`, `unknown` con valor nullable | completa, omitida, inválida            | Paso 2           | mantener el borrador y mostrar error de campo       |
| Días disponibles     | identificadores de días o equivalente estable        | uno o más                              | Paso 3           | pedir al menos uno                                  |
| Preguntas por sesión | entero positivo validado por backend                 | válido, fuera de rango                 | Paso 4           | conservar elección y explicar el rango              |
| Valoración por tema  | mapa `topicId -> 0                                   | 25                                     | 50               | 75                                                  | 100 | null` | pendiente, guardada | Paso 5 y edición | permitir «No sé»; nunca alterar progreso |
| Borrador/reanudación | perfil parcial con paso y tema actuales              | guardando, guardado, error, recuperado | flujo completo   | continuar solo en memoria y no prometer reanudación |

V3.1 concreta este contrato en `preparation_profiles`, `topic_self_assessments` y
`save_preparation_profile`. El flujo puede recuperar borradores, completar el perfil y editarlo sin
convertir las valoraciones subjetivas en progreso observado.
