# Sprint 19 — Historial útil y legible

## Objetivo

Convertir el historial técnico de tests en una pantalla que permita reconocer rápidamente la
actividad anterior, recuperar sesiones incompletas y consultar resultados.

## Alcance implementado

- Resumen de tests terminados, preguntas respondidas y porcentaje global de acierto.
- El acierto global se calcula de forma ponderada sobre respuestas emitidas, no promediando
  porcentajes de tests de tamaños diferentes.
- Filtros para ver todos los tests, terminados, pendientes o simulacros.
- Denominaciones comprensibles para tests personalizados, repasos, multitema y simulacros.
- Tarjetas diferenciadas por modalidad, fecha, número de preguntas, duración y resultado.
- Acceso directo al resultado de los tests terminados.
- Acceso para continuar los tests incompletos.
- Estado vacío con acceso a la creación del primer test.

## Límites

- No se modifican tests, respuestas ni estadísticas.
- No se añaden tablas, RPC ni migraciones.
- Los datos continúan aislados por usuario mediante las políticas existentes.
- El resumen describe actividad histórica; no se presenta como dominio del temario.

## Validación

- Etiquetas y filtros probados mediante tests unitarios.
- Cálculo ponderado probado con tests de distinto tamaño y preguntas sin responder.
- TypeScript y compilación de producción sin errores.
