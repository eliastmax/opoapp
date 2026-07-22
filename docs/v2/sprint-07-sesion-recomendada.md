# Sprint V2 — Sesión recomendada automática

## Objetivo

Permitir que el usuario empiece un entrenamiento útil sin tener que decidir tema, subapartados o dificultad. La aplicación utiliza exclusivamente su banco y su historial; no llama a servicios externos ni genera preguntas.

## Alcance implementado

- Tarjeta principal «Sesión recomendada» en Inicio.
- Selector rápido de 5, 10 o 20 preguntas, con 10 como valor inicial.
- Creación atómica mediante `create_recommended_test(p_question_count)`.
- Composición objetivo: 40 % repaso prioritario, 30 % tema actual, 20 % puntos débiles y 10 % retención o preguntas nuevas.
- Redistribución automática cuando una categoría no tiene existencias suficientes.
- Exclusión de duplicados dentro de la sesión.
- Penalización de preguntas presentes en el test anterior para favorecer variedad.
- Registro explicable de cada selección en `test_question_selection`.
- Resumen de la composición al crear la sesión y detalle ya disponible en Resultados.
- Conservación completa de «Crear test personalizado».

## Cómo interpreta cada grupo

- **Repaso prioritario:** fallos activos y dudas activas.
- **Tema actual:** tema predominante en el último test completado. Sin historial, se usa el primer tema numerado que tenga preguntas activas.
- **Puntos débiles:** preguntas contestadas al menos dos veces con menos del 70 % de acierto o con una racha incorrecta activa.
- **Retención o nuevas:** preguntas todavía no vistas, con revisión vencida o no vistas durante al menos 14 días.
- **Variedad:** reserva para completar el número solicitado cuando faltan preguntas en los grupos anteriores.

Los grupos son exclusivos y se asignan por prioridad. Una pregunta que sea a la vez fallo y pertenezca al tema actual cuenta como repaso prioritario, evitando duplicarla.

## Seguridad y arquitectura

- La función es `SECURITY INVOKER` y obtiene el usuario mediante `auth.uid()`.
- `PUBLIC` y `anon` no pueden ejecutarla; solo `authenticated` y `service_role`.
- La creación del test, su traza y sus respuestas ocurre dentro de una única transacción.
- No se modifica el esquema CSV V2 ni los bancos ya importados.
- La sesión reutiliza las estadísticas, vistas de fallos/dudas y trazabilidad del motor inteligente existente.

## Decisiones de alcance

- No se usa IA ni una API externa para seleccionar.
- No se oculta ni elimina la creación manual.
- No se implementa todavía el desbloqueo Aprendizaje–Consolidación–Tribunal.
- No se añade una configuración compleja: la sesión automática solo pregunta la cantidad.
- Los porcentajes son una meta de composición; la disponibilidad real puede obligar a redistribuir.

## Criterios de aceptación

1. El usuario puede crear una sesión de 5, 10 o 20 preguntas con una sola decisión.
2. Nunca aparece dos veces la misma pregunta en una sesión.
3. La falta de fallos, dudas o puntos débiles no impide crear el test si existen preguntas activas.
4. El test se crea completo o no se crea; no quedan tests vacíos por un error intermedio.
5. El resultado explica los motivos de selección mediante la traza existente.
6. La creación manual continúa funcionando sin cambios.
7. Un usuario no puede seleccionar ni consultar preguntas ajenas.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre el proyecto `OpoTest Study`; no modifiques `OpoTest: V2`. Sin regenerar ni reescribir la implementación sincronizada desde GitHub, publica y comprueba en móvil la nueva tarjeta «Sesión recomendada» de Inicio. Verifica los tamaños 5, 10 y 20; que el botón crea un test y abre su primera pregunta; que con categorías sin existencias la app redistribuye; que el test no contiene duplicados; que Resultados conserva la explicación de selección; y que «Crear test personalizado» sigue funcionando. No cambies porcentajes, reglas, migraciones, textos ni el CSV V2. Si todo es correcto, limita la intervención a publicar la versión sincronizada.

## Prompt optimizado para el Generador de Preguntas

Mantén exactamente el CSV V2 vigente de 25 columnas y las reglas jurídicas y pedagógicas aprobadas. No añadas columnas para sesión recomendada, prioridad, historial, retención, fallo, duda, peso o desbloqueo: la aplicación calcula todo ello a partir del uso real. Conserva códigos únicos y estables y valores coherentes de tema, subapartado, concepto, perspectiva, nivel pedagógico y dificultad, porque el motor los utiliza para distribuir y explicar la selección. No generes variantes triviales para inflar el banco.
