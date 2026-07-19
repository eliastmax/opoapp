# Sprint V2 — Centro de progreso y estados de evidencia

## Objetivo

Mostrar el avance por materia y tema con métricas comprensibles que no se inflen por responder repetidamente las mismas preguntas ni presenten conclusiones fuertes con pocos datos.

## Alcance implementado

- Nueva pantalla `Progreso`, agrupada por materia y tema.
- Cobertura calculada con preguntas distintas respondidas sobre preguntas activas.
- Acierto actual calculado con la última respuesta completada de cada pregunta distinta.
- Tests completados con actividad en el tema.
- Conceptos y perspectivas vistos frente a los disponibles en el banco activo.
- Fallos y dudas activos del tema.
- Cuatro estados de evidencia: `sin_base`, `inicial`, `suficiente` y `robusta`.
- Orientación prudente sobre el siguiente paso.
- Acceso al historial desde el Centro de progreso.

## Reglas de cálculo

La versión de métrica es `progress-v1.0`.

- `cobertura = preguntas distintas respondidas / preguntas activas`.
- `acierto actual = últimas respuestas correctas / preguntas distintas respondidas`.
- Una pregunta repetida sustituye su resultado anterior para el dominio actual; no aumenta la cobertura.
- `sin_base`: ninguna pregunta distinta respondida.
- `inicial`: menos de 3 tests o menos del mínimo entre el banco y el máximo de 10 preguntas o el 20 % del banco.
- `suficiente`: alcanza la base inicial, pero todavía tiene menos de 5 tests, menos del mínimo entre el banco y el máximo de 20 preguntas o el 40 % del banco, o menos de 7 días entre la primera y la última actividad.
- `robusta`: supera las condiciones anteriores. No significa tema dominado; significa que la lectura del dato tiene una base más sólida.

## Seguridad y arquitectura

- El cálculo se realiza en `get_topic_progress_summary()`.
- La función es `SECURITY INVOKER` y conserva las políticas RLS del usuario autenticado.
- `anon` y `PUBLIC` no pueden ejecutarla.
- No se guarda una puntuación de progreso mutable: se deriva del historial y del banco activo.

## Decisiones de alcance

- El porcentaje global de Inicio se denomina «Acierto histórico» para distinguirlo del dominio actual.
- El Centro de progreso sustituye a Resultados en la navegación principal; el historial sigue disponible dentro del Centro.
- Este sprint no desbloquea niveles pedagógicos ni crea todavía una sesión automática recomendada.
- No se modifica el CSV V2 ni se añaden columnas al Generador de Preguntas.

## Criterios de aceptación

1. Los temas se agrupan por su materia correcta.
2. Repetir una pregunta no aumenta el número de preguntas distintas vistas.
3. El dominio refleja la última respuesta de cada pregunta distinta.
4. Sin respuestas no aparece un porcentaje de dominio engañoso.
5. Con evidencia inicial se advierte que el dato todavía puede variar mucho.
6. Fallos y dudas activos aparecen por tema.
7. Un usuario no puede consultar el progreso de otro usuario.
8. El historial de tests sigue siendo accesible.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. Verifica la versión sincronizada desde GitHub sin regenerar código. En la nueva pantalla `Progreso`, comprueba en móvil que las materias y temas se agrupan correctamente; que cobertura, acierto actual, tests, conceptos, perspectivas, fallos y dudas sean legibles; que los estados de evidencia no se corten; y que «Ver historial de tests» abra el historial existente. No cambies fórmulas, migraciones, textos ni alcance. Si todo funciona, limita tu intervención a publicar la versión sincronizada.

## Prompt optimizado para el Generador de Preguntas

Mantén exactamente el esquema CSV V2 vigente de 25 columnas. Continúa cumplimentando de forma consistente `materia`, `numero_tema`, `tema`, `concepto`, `perspectiva` y `nivel_pedagogico`, porque la aplicación utiliza esos metadatos para medir cobertura y variedad por tema. No añadas columnas de progreso, dominio, evidencia, fallos, dudas ni estadísticas: se calculan dinámicamente a partir del uso real. Evita fragmentar un mismo concepto con variantes nominales innecesarias; usa una denominación estable cuando represente la misma unidad conceptual.
