# Sprint 18 · Simulacro de examen (V2.5)

## Objetivo

Ofrecer una medición neutral y cronometrada, distinta de las sesiones adaptativas de aprendizaje y repaso.

## Alcance implementado

- Pantalla propia de configuración del simulacro.
- Tamaños disponibles: 30, 50 y 100 preguntas.
- Duraciones disponibles: 30, 60, 90 y 120 minutos.
- Selección de todo el banco activo del usuario.
- Distribución proporcional al tamaño de cada tema, con presencia mínima por tema cuando el número de preguntas lo permite.
- Mayor probabilidad para contenidos con frecuencia histórica alta o media.
- Ausencia deliberada de adaptación a fallos, dudas o rendimiento individual.
- Cronómetro persistente calculado desde la hora de inicio guardada en el servidor.
- Corrección automática al agotarse el tiempo.
- Resultado con tiempo utilizado y desglose por tema.
- Identificación diferenciada en el historial.

## Límites deliberados

- La puntuación es el porcentaje de aciertos de la app. No se aplica todavía una penalización por error porque no se ha configurado una regla oficial por oposición.
- El simulacro solo representa los temas cargados. La interfaz advierte cuando el banco todavía no contiene el programa completo.
- No sustituye a la sesión recomendada: el simulacro mide; la sesión recomendada entrena debilidades.

## Implementación técnica

- Columna nullable `tests.exam_duration_minutes`.
- RPC transaccional `create_exam_simulation`.
- Algoritmo registrado: `simulation-v1.0`.
- Migraciones:
  - `20260723225913_exam_simulation.sql`;
  - `20260723230523_allow_simulation_selection_group.sql`.
- Función con `SECURITY INVOKER`, validación de autenticación y revocación para `anon`.
- El catálogo cerrado de trazabilidad admite `simulacro` y conserva
  `repaso_programado`, utilizado por los motores anteriores.

## Validación requerida

- Crear un simulacro y comprobar el reparto entre temas.
- Cerrar y volver a abrir el test para confirmar que el reloj no se reinicia.
- Agotar un simulacro corto de prueba y confirmar la corrección automática.
- Finalizarlo manualmente y verificar tiempo, resultado y desglose por tema.
- Confirmar que los tests normales continúan sin cronómetro.
