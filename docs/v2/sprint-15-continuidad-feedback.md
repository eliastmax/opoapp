# Sprint 15 — Continuidad de tests y feedback contextual

## Objetivo

Evitar que salir de un test obligue a empezar de nuevo y conseguir que el resultado final oriente y motive sin exagerar lo que demuestra una sola sesión.

## Alcance implementado

- Inicio muestra el último test sin terminar justo después de la sesión recomendada.
- La tarjeta indica cuántas preguntas están respondidas y el progreso acumulado.
- «Continuar test» abre la primera pregunta todavía sin responder.
- Si todas están respondidas, abre la última para permitir revisar y corregir.
- El test puede descartarse mediante una confirmación explícita.
- Al descartarlo se eliminan el test y sus respuestas guardadas, sin afectar a preguntas ni tests terminados.
- El resultado utiliza mensajes contextuales según el porcentaje:
  - 100 %;
  - entre 90 % y 99 %;
  - entre 75 % y 89 %;
  - entre 60 % y 74 %;
  - menos de 60 %.
- Un 100 % con dudas se diferencia de un 100 % sin dudas.
- Los mensajes negativos se formulan como diagnóstico y siguiente paso, no como juicio sobre la capacidad del usuario.

## Decisiones

- No se utiliza un `popup` bloqueante: el mensaje forma parte de la cabecera del resultado y puede consultarse después.
- Un test perfecto no se presenta como «tema dominado». Una sesión aislada, especialmente si es corta, no acredita por sí sola dominio estable.
- Solo se muestra el último test incompleto para mantener Inicio sencillo.
- No se añaden tablas ni migraciones: las respuestas ya se guardaban una a una y las relaciones existentes eliminan los datos dependientes al descartar el test.
- No cambia el importador ni el formato de los bancos.

## Criterios de aceptación

- Al salir de un test respondido parcialmente, Inicio ofrece reanudarlo.
- Al reanudarlo, se conservan las respuestas y se abre la primera pendiente.
- Descartar exige confirmación y hace desaparecer la tarjeta.
- Un test completado deja de aparecer como test en curso.
- El mensaje final corresponde al porcentaje y considera fallos, preguntas sin responder y dudas.
- Ningún mensaje predice el aprobado ni declara dominado un tema.
- La experiencia funciona en pantalla móvil y no bloquea el acceso al detalle de fallos.

## Prompt optimizado para Lovable

```text
Trabaja exclusivamente sobre el proyecto OpoTest Study sincronizado con GitHub. No modifiques OpoTest: V2.

El Sprint 15 ya está implementado en código. Revisa y publica el estado sincronizado sin reinterpretar el alcance:

1. En Inicio, después de «Sesión recomendada» y antes de «Crear test personalizado», debe aparecer el último test incompleto.
2. Debe mostrar respuestas guardadas, total y barra de progreso.
3. «Continuar test» debe abrir la primera pregunta sin responder; si no quedan pendientes, la última.
4. El icono de descarte debe abrir confirmación y eliminar solo ese test incompleto y sus respuestas.
5. En Resultados, conserva el mensaje contextual integrado según 100, 90–99, 75–89, 60–74 o menos de 60.
6. Distingue un 100 % con dudas de un 100 % sin dudas.
7. No uses mensajes como «tema dominado» ni predicciones de aprobado.

No cambies Supabase, el importador CSV, las 25 columnas V2, los bancos existentes ni la lógica de selección inteligente. Comprueba especialmente la experiencia móvil y no realices cambios ajenos al sprint.
```

## Prompt optimizado del Generador de Preguntas

No requiere cambios. El generador debe mantener exactamente el contrato V2 vigente de 25 columnas. Los mensajes de resultado se calculan en la aplicación a partir del rendimiento del usuario y no deben incluirse en el CSV ni redactarse durante la generación de preguntas.
