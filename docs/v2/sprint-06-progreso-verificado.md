# Sprint V2 — Progreso real y motivación veraz

## Objetivo

Mostrar únicamente avances demostrables. La aplicación no debe felicitar por acumular tests, repetir inmediatamente preguntas ni mejorar una nota que no tenga una línea base comparable.

## Alcance implementado

- Resumen de avances verificados durante los últimos 30 días.
- Fallos corregidos: una última respuesta correcta cuyo intento inmediatamente anterior fue incorrecto y está separado al menos 1 día.
- Retención confirmada: dos intentos consecutivos correctos de la misma pregunta, separados al menos 7 días.
- Comparación exacta entre los dos últimos intentos consecutivos de las mismas preguntas.
- Estados de comparación: `insuficiente`, `mejora_verificada`, `estable` y `descenso_observado`.
- Mensajes neutrales cuando todavía no existe evidencia comparable.
- Desglose compacto dentro de cada tema sin añadir gamificación.

## Reglas de comparación

La versión de métrica es `verified-progress-v1.0`.

- Solo se estudian como bloque reciente respuestas finales de los últimos 30 días.
- Cada pregunta se compara con su intento inmediatamente anterior y solo entra en el bloque comparable cuando ambos están separados al menos 7 días.
- Se exige un mínimo de 10 preguntas comparables.
- Las respuestas actuales deben proceder de al menos 2 tests y las anteriores de al menos 2 tests.
- Un cambio de 5 puntos o más se clasifica como `mejora_verificada`.
- Un cambio de -5 puntos o menos se clasifica como `descenso_observado`.
- Los cambios intermedios se clasifican como `estable`.
- Si falta cualquiera de las condiciones mínimas, no se muestra subida ni bajada porcentual.

## Interpretación

- «Fallo corregido» describe una corrección factual; no significa concepto dominado.
- «Retención» confirma que una respuesta correcta se mantuvo tras separación temporal; no significa dominio global.
- «Mejora verificada» compara exactamente las mismas preguntas y exige variedad de sesiones.
- La ausencia de avances verificados no significa ausencia de estudio: significa que todavía no hay prueba suficiente para afirmarlos.

## Seguridad y arquitectura

- El cálculo se realiza en `get_verified_progress_summary()`.
- La función es `SECURITY INVOKER` y conserva las políticas RLS.
- `anon` y `PUBLIC` no pueden ejecutarla.
- No se crean tablas de logros ni recompensas manipulables.
- No se modifica el historial ni se almacenan conclusiones permanentes.

## Decisiones de alcance

- No se implementan puntos, rachas, medallas ni clasificaciones.
- No se implementa todavía la fórmula completa de dominio por concepto ni el desbloqueo de niveles.
- No se crea todavía una sesión automática recomendada.
- No se modifica el importador, el CSV V2 ni los bancos existentes.

## Criterios de aceptación

1. Repetir inmediatamente una pregunta no genera retención confirmada.
2. Un solo test no permite mostrar una mejora porcentual.
3. Una comparación con menos de 10 preguntas permanece como insuficiente.
4. Solo aparece «Mejora verificada» con una subida mínima de 5 puntos.
5. Los fallos corregidos y las retenciones se muestran como hechos, no como dominio.
6. Sin cambios demostrables, la aplicación lo explica sin inventar recompensas.
7. Cada usuario solo puede consultar sus propios datos.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. Verifica la versión sincronizada desde GitHub sin regenerar código. En la pantalla `Progreso`, comprueba en móvil que «Avances verificados» muestra fallos corregidos, retenciones y temas que mejoran; que cada tema explica si la comparación es insuficiente, estable, positiva o negativa; y que los textos no se cortan ni desbordan. No cambies umbrales, fórmulas, migraciones ni mensajes. No añadas puntos, rachas, medallas o celebraciones. Si todo funciona, limita tu intervención a publicar la versión sincronizada.

## Prompt optimizado para el Generador de Preguntas

Mantén exactamente el esquema CSV V2 vigente de 25 columnas y todas las reglas de calidad aprobadas. No añadas columnas de progreso, motivación, retención, comparación o logros: se calculan exclusivamente a partir del historial real. Conserva denominaciones estables de `concepto` y `perspectiva`, y códigos únicos permanentes, porque permiten comparar la evolución de una misma pregunta y agrupar evidencia sin duplicidades artificiales.
