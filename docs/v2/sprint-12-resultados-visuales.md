# Sprint V2 — Resultados visuales y orientados al repaso

## Objetivo

Hacer que la pantalla de resultados muestre primero lo que el estudiante necesita comprender y repasar, y relegar los detalles secundarios a zonas desplegables.

## Alcance implementado

- Resumen compacto con porcentaje, aciertos, fallos y preguntas sin responder.
- Los fallos y dudas aparecen inmediatamente después del resumen.
- Se elimina la dificultad visible de la revisión.
- Cada tarjeta muestra el texto completo de la respuesta elegida y la correcta.
- «Qué repasar» aparece destacado dentro de la pregunta correspondiente.
- Explicación y fuente mantienen una jerarquía clara sin mostrar concepto u objetivo de aprendizaje.
- El siguiente paso se adapta a fallos, dudas o resultado perfecto.
- Se eliminan acciones duplicadas de revisión.
- Desglose por tema, explicación de la selección e informe para ChatGPT pasan a apartados desplegables.
- El banco completo realizado continúa incluido en el informe copiable para ChatGPT.
- Cuando no existen fallos ni dudas, la revisión completa queda plegada inicialmente.
- Ajuste posterior: la explicación se presenta como bloque «Por qué», con tamaño y contraste equivalentes a la importancia pedagógica de las respuestas.
- El bloque «Por qué» utiliza icono, color suave y texto de peso normal para facilitar la lectura sin competir visualmente con las respuestas.

## Decisiones de alcance

- No se modifica la corrección, el historial ni la activación de fallos y dudas.
- No se cambia el motor inteligente ni su trazabilidad.
- No se muestra un desglose visible por dificultad, aunque sus metadatos permanecen en la base de datos.
- No se modifica Supabase, el CSV V2 ni los bancos existentes.

## Criterios de aceptación

1. Tras el resumen aparecen directamente los fallos o dudas del test.
2. Las respuestas elegida y correcta se muestran completas.
3. «Qué repasar», explicación y fuente se distinguen con facilidad.
4. No aparecen concepto, objetivo de aprendizaje ni dificultad.
5. Repetir falladas y repetir dudas conservan su comportamiento.
6. El informe para ChatGPT sigue incluyendo el banco completo realizado.
7. Los detalles secundarios no ocupan espacio hasta que el usuario los abre.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. El Sprint 12 ya está sincronizado desde GitHub. No regeneres código ni cambies lógica. Actualiza y publica, y verifica en móvil: (1) el resumen muestra porcentaje, aciertos, fallos y sin responder; (2) los fallos o dudas aparecen inmediatamente después; (3) cada tarjeta muestra respuesta elegida y correcta completas, qué repasar, explicación y fuente; (4) no se muestran dificultad, concepto ni objetivo; (5) repetir falladas y dudas funciona; (6) desglose, selección e informe están plegados; (7) el informe copiado contiene el banco completo; y (8) un test perfecto permite desplegar la revisión completa. No cambies Supabase, motor, CSV ni bancos.

## Prompt optimizado para el Generador de Preguntas

Mantén exactamente el CSV V2 vigente de 25 columnas y todos sus metadatos. `concepto`, `objetivo_aprendizaje`, `dificultad_conceptual` y `dificultad_examen` continúan siendo necesarios para selección, diagnóstico y análisis aunque no se muestren directamente en la tarjeta de resultados. En `explicacion`, comienza con una justificación directa de por qué la respuesta correcta es válida y desarrolla después la distinción o el matiz decisivo. Escribe texto plano, sin Markdown ni marcas de formato. No añadas ni elimines columnas.\n\n## Mejora futura aplazada\n\nSi se desea destacar solo el fragmento decisivo de una explicación, el Generador deberá entregarlo con una marca estructurada y la aplicación tendrá que interpretarla de forma segura. No se intenta deducir automáticamente ese fragmento ni se modifica todavía el formato CSV, para mantener la compatibilidad de todos los bancos existentes.
