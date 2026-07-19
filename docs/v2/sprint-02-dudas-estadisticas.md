# Sprint V2 — Dudas activas y estadísticas por pregunta

## Objetivo

Permitir que el usuario marque una pregunta como duda durante un test, pueda repasarla después y conservar estadísticas fiables que servirán de base al futuro motor de selección inteligente.

## Alcance implementado

- Botón visible para marcar o desmarcar una duda antes de finalizar el test.
- La duda no altera la respuesta elegida ni su corrección.
- El resultado distingue una respuesta correcta con duda de una respuesta correcta segura.
- Revisión conjunta de fallos y dudas, manteniendo explicación y referencia.
- Test directo de dudas desde Inicio, Resultados o Crear test.
- Una duda permanece activa hasta que la pregunta se completa de nuevo sin marcarla.
- Estadísticas privadas por usuario y pregunta: apariciones, respuestas, aciertos, fallos, dudas, rachas y fechas relevantes.
- Actualización atómica y exactamente una vez al completar cada test.

## Decisiones de producto

- Las estadísticas se almacenan, pero todavía no se muestran como dominio o recomendaciones. Primero deben alimentar el motor inteligente en un sprint posterior.
- Una aparición sin respuesta y sin duda no elimina una duda anterior.
- No se añaden columnas al CSV. `marked_doubt` y las estadísticas son datos de uso del alumno, no contenido del banco de preguntas.
- No se modifica el Generador de Preguntas V2 en este sprint.

## Criterios de aceptación

1. Se puede marcar y desmarcar una pregunta sin cambiar su respuesta.
2. Una respuesta correcta marcada aparece como «Correcta · Con duda».
3. La pregunta aparece en «Preguntas con duda» al finalizar el test.
4. Se puede crear un test compuesto exclusivamente por dudas activas.
5. Al completar esa pregunta de nuevo sin marcarla, deja de estar activa como duda.
6. Repetir la llamada de finalización de un test no duplica estadísticas.
7. Un usuario no puede leer estadísticas ni dudas de otro usuario.

## Prompt de control para Lovable

Trabaja exclusivamente sobre el proyecto `OpoTest Study`. No modifiques `OpoTest: V2`. Verifica, sin rediseñar ni regenerar código, que el despliegue contiene el botón de duda durante el test, la revisión de fallos y dudas, y la creación de tests de dudas. Si la sincronización desde GitHub ya incluye estas funciones, limita la actuación a informar del commit desplegado y del resultado de la verificación.

## Prompt de control para el Generador de Preguntas

Mantén exactamente el esquema CSV V2 vigente de 25 columnas. No añadas `marked_doubt`, contadores, rachas ni fechas de estudio: son datos de uso generados por la aplicación para cada usuario y no metadatos de la pregunta. Este sprint no requiere regenerar ni modificar preguntas.
