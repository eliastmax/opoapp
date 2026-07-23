# Sprint 17 · Tests multitema equilibrados (V2.5)

## Objetivo

Permitir que el usuario practique un bloque real de estudio sin tener que crear un test tema por tema.

## Alcance implementado

- Tres ámbitos de contenido en `Crear test`:
  - un tema;
  - varios temas elegidos por el usuario;
  - todo lo que el usuario tiene cargado.
- Selector compacto y buscable para varios temas.
- Una pregunta como mínimo por tema seleccionado.
- Selección transaccional en base de datos: el test se crea completo o no se crea.
- Reparto inicial casi igual entre temas y redistribución de plazas si un tema no tiene suficientes preguntas compatibles.
- Prioridad dentro de cada tema para fallos, dudas, repasos vencidos, preguntas nuevas, rendimiento bajo y retención.
- Penalización de las preguntas usadas en el último test para reducir repeticiones.
- Compatibilidad con las modalidades mezcladas, nuevas, falladas y dudas.
- Respeto de Aprendizaje, Consolidación y Tribunal:
  - el nivel solo se considera desbloqueado si lo está en todos los temas;
  - el usuario puede entrar expresamente en modo libre.
- Desglose visible por tema en los resultados, con aciertos, total y porcentaje.
- Los tests de un solo tema conservan su funcionamiento anterior.

## Reglas funcionales

- Un test multitema requiere al menos dos temas.
- El número de preguntas no puede ser inferior al número de temas.
- Solo se aceptan temas pertenecientes al usuario autenticado.
- Si un filtro deja un tema sin preguntas, el motor redistribuye sus plazas y avisa de la cobertura real.
- El resultado se identifica internamente con el prefijo `multitema_`.

## Implementación técnica

- RPC: `create_multi_topic_test`.
- Algoritmo registrado: `multi-topic-v1.0`.
- Migración: `20260723223949_multi_topic_tests.sql`.
- La función usa `SECURITY INVOKER`, valida propiedad y autenticación, y no concede ejecución a `anon`.

## Validación requerida

- Crear un test con varios temas y comprobar el reparto.
- Probar las cuatro modalidades.
- Confirmar el bloqueo conjunto de niveles y el modo libre.
- Completar el test y revisar que el desglose por tema coincide con las preguntas realizadas.
- Confirmar que los tests de un tema siguen funcionando.
