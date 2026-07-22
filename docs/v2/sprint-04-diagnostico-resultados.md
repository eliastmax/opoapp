# Sprint V2 — Diagnóstico de resultados y exportación útil

## Objetivo

Convertir el resultado de un test en una acción de estudio concreta sin presentar como diagnóstico robusto lo que todavía es una muestra aislada.

## Alcance implementado

- La revisión muestra la letra y el texto completo de la respuesta elegida.
- La revisión muestra la letra y el texto completo de la respuesta correcta.
- Tras el resumen numérico se muestran primero los fallos, sin anteponer un diagnóstico general.
- Los fallos, las dudas y todas las respuestas quedan separados en pestañas; la pestaña inicial es «Fallos» cuando existen.
- Cada respuesta fallada muestra una indicación compacta y exacta de «Qué repasar» a partir de su referencia estructurada.
- La revisión no muestra al usuario los campos internos `concepto` ni `objetivo_aprendizaje`.
- La referencia combina documento, apartado, subapartado y páginas sin inventar campos ausentes.
- Se puede copiar un informe textual del test para ChatGPT.
- El informe no exporta el banco completo y advierte que un único test no constituye un diagnóstico robusto.

## Decisiones de alcance

- Esta versión diagnostica el test actual con hechos observables.
- No califica todavía un error como recurrente usando un único test.
- La comparación entre periodos se implementará junto al Centro de progreso y los estados de evidencia.
- No se modifican Supabase, el esquema CSV ni el Generador de Preguntas.
- `concepto` y `objetivo_aprendizaje` se conservan en los datos para selección y métricas, aunque no se enseñen en la tarjeta de corrección.

## Criterios de aceptación

1. «Tu respuesta» muestra letra y opción completa o «Sin responder».
2. «Respuesta correcta» muestra letra y opción completa.
3. Cuando hay fallos, aparecen inmediatamente después del resumen del resultado.
4. Cada tarjeta muestra «Qué repasar» y «Fuente», pero no «Concepto» ni «Objetivo».
5. Las páginas solo se muestran cuando existen en la pregunta.
6. Las dudas y la revisión completa siguen disponibles sin desplazar a los fallos de la primera posición.
7. El informe copiado contiene resultado, incidencias y referencias.
8. El informe declara expresamente su nivel limitado de evidencia.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. Verifica la versión sincronizada desde GitHub sin regenerar código. En Resultados, después del resumen numérico, muestra directamente «Tus fallos». Separa Fallos, Dudas y Todas en pestañas y abre Fallos por defecto cuando existan. Dentro de cada tarjeta conserva la pregunta, la respuesta elegida completa, la respuesta correcta completa, la explicación y la fuente. Elimina de la vista las líneas «Concepto» y «Objetivo» y sustitúyelas por una única línea «Qué repasar» construida con documento, apartado, subapartado y páginas disponibles. No muestres un bloque general de «Qué repasar» antes de los fallos. No cambies Supabase, el CSV ni el motor de selección.

## Prompt optimizado para el Generador de Preguntas

Mantén exactamente el esquema CSV V2 vigente de 25 columnas. Cumplimenta con precisión `apartado`, `subapartado`, `documento_referencia`, `pagina_inicio`, `pagina_fin` y `referencia_fuente`, porque alimentan la línea «Qué repasar» de cada fallo. Conserva también `concepto`, `objetivo_aprendizaje` y `perspectiva` para el funcionamiento interno, aunque no se muestren en la tarjeta de corrección. No añadas columnas.
