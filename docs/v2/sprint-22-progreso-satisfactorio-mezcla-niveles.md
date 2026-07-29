# Sprint 22 — Progreso satisfactorio y mezcla de niveles

## Objetivo

Cerrar dos fricciones detectadas durante el uso real:

- permitir una práctica final que combine Aprendizaje, Consolidación y Tribunal;
- hacer que el avance de cada tema sea visual, comprensible y satisfactorio sin confundir cobertura con dominio.

## Diagnóstico del Tema 13

La pregunta `SMS-T13-0069` («Cuantía del trienio») no fue rechazada durante la importación. Está activa, pertenece a Tribunal y apareció una vez en un test, pero quedó sin respuesta.

El centro de Progreso actuaba correctamente: solo cuenta como vista una pregunta respondida. El filtro «Nunca realizadas», en cambio, consideraba vista cualquier pregunta que hubiese aparecido en un test. Esa diferencia dejaba la pregunta fuera de los tests nuevos y mantenía el tema en `98/99` preguntas y `97/98` conceptos.

La corrección unifica el significado: una pregunta es «realizada» únicamente cuando tiene una respuesta efectiva (`correcta IS NOT NULL`). La pregunta pendiente volverá a ser seleccionable.

## Cambios funcionales

### Mezcladas como cuarta opción

- «Mezcladas» aparece junto a Aprendizaje, Consolidación y Tribunal.
- Se desbloquea cuando Tribunal está disponible en todos los temas seleccionados.
- Combina los tres niveles pedagógicos y equilibra la selección por tema y nivel.
- Conserva las modalidades independientes: selección inteligente, nunca realizadas, falladas y dudas.
- Los tests quedan identificados como «Niveles mezclados» en el historial.

### Progreso más claro

- Cada tema muestra un hito de recorrido: sin empezar, en marcha, casi recorrido o banco recorrido.
- Al quedar una o dos preguntas, se indica el número exacto necesario para completar la primera vuelta.
- Al completar el banco, la app reconoce el recorrido y orienta el siguiente avance hacia fallos, dudas y retención.
- Las etiquetas de evidencia hablan de práctica, no de dominio: una cobertura completa no demuestra por sí sola conocimiento consolidado.
- La ruta visual incorpora la cuarta etapa «Mezcladas».

## Persistencia

La migración `20260729232311_mixed_stage_practice.sql`:

- permite `mezcladas` en `tests.learning_stage`;
- añade `create_mixed_stage_test`;
- valida propiedad, desbloqueo de Tribunal y subapartados;
- selecciona preguntas de los tres niveles de forma atómica;
- considera nueva una pregunta aparecida pero aún no respondida;
- mantiene permisos privados y ejecución `SECURITY INVOKER`.

No cambia el formato CSV ni el generador de preguntas.

## Validación

- TypeScript sin errores.
- Build de producción correcto.
- Migración ejecutada de forma transaccional en producción y revertida.
- La prueba «nuevas» seleccionó exactamente `SMS-T13-0069`.
- La selección inteligente de 30 preguntas incluyó los tres niveles.
- Pruebas unitarias añadidas para desbloqueo, hitos de cobertura, historial y contrato SQL.

La suite local con Bun queda delegada al CI porque el binario no está disponible en el entorno de trabajo.
