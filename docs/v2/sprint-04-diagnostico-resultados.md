# Sprint V2 — Diagnóstico de resultados y exportación útil

## Objetivo

Convertir el resultado de un test en una acción de estudio concreta sin presentar como diagnóstico robusto lo que todavía es una muestra aislada.

## Alcance implementado

- La revisión muestra la letra y el texto completo de la respuesta elegida.
- La revisión muestra la letra y el texto completo de la respuesta correcta.
- Los fallos y dudas se agrupan por concepto.
- Se muestran las perspectivas evaluadas y las referencias estructuradas disponibles.
- La referencia combina documento, apartado, subapartado y páginas sin inventar campos ausentes.
- Se puede copiar un informe textual del test para ChatGPT.
- El informe no exporta el banco completo y advierte que un único test no constituye un diagnóstico robusto.

## Decisiones de alcance

- Esta versión diagnostica el test actual con hechos observables.
- No califica todavía un error como recurrente usando un único test.
- La comparación entre periodos se implementará junto al Centro de progreso y los estados de evidencia.
- No se modifican Supabase, el esquema CSV ni el Generador de Preguntas.

## Criterios de aceptación

1. «Tu respuesta» muestra letra y opción completa o «Sin responder».
2. «Respuesta correcta» muestra letra y opción completa.
3. Solo aparecen en «Qué repasar» los conceptos con fallo o duda.
4. Una misma referencia no se duplica dentro de un concepto.
5. Las páginas solo se muestran cuando existen en la pregunta.
6. El informe copiado contiene resultado, incidencias y referencias.
7. El informe declara expresamente su nivel limitado de evidencia.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. Verifica la versión sincronizada desde GitHub sin regenerar código. En Resultados comprueba que «Tu respuesta» y «Respuesta correcta» muestran letra y texto completo; que «Qué repasar» agrupa únicamente fallos y dudas por concepto con sus referencias; y que «Copiar informe para ChatGPT» genera un resumen sin incluir el banco completo. No implementes cambios adicionales.

## Prompt optimizado para el Generador de Preguntas

Mantén exactamente el esquema CSV V2 vigente de 25 columnas. Continúa cumplimentando `concepto`, `perspectiva`, `apartado`, `subapartado`, `documento_referencia`, `pagina_inicio`, `pagina_fin` y `referencia_fuente` con las reglas aprobadas, ya que la aplicación los utiliza para indicar qué repasar. No añadas campos de diagnóstico, recurrencia ni evidencia: se calculan dinámicamente a partir del uso.
