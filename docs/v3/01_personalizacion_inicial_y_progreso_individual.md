# V3 — Personalización inicial y progreso individual

## Decisión de arquitectura

El banco de preguntas podrá ser común, pero todo dato de aprendizaje será individual por usuario:

- tests y respuestas;
- fallos y dudas activos;
- estadísticas por pregunta;
- nivel de retención;
- fechas de próximo repaso;
- progreso pedagógico;
- recomendaciones y hoja de ruta.

Una cuenta nueva parte siempre de cero respuestas y cero repasos. Nunca hereda el historial, los contadores ni las fechas de otro usuario.

## Arranque de una cuenta nueva

1. Registrar fecha de examen exacta o aproximada.
2. Solicitar una valoración percibida por tema mediante una escala breve.
3. Proponer un primer diagnóstico o una primera sesión a partir de esa valoración.
4. Empezar a programar repasos únicamente después de obtener respuestas reales.
5. Reducir gradualmente el peso de la valoración inicial conforme aumente la evidencia objetiva.

## Distinción necesaria

La valoración percibida no equivale a una respuesta correcta y no debe:

- aumentar preguntas respondidas;
- desbloquear niveles pedagógicos por sí sola;
- crear aciertos, fallos o rachas;
- generar fechas de repaso espaciado.

Sí puede:

- priorizar temas inicialmente;
- ajustar la cantidad de práctica diagnóstica;
- ordenar la hoja de ruta previa al examen;
- mejorar la explicación del siguiente paso recomendado.

## Estado de recomendación

- Sin respuestas: mostrar una llamada a completar la valoración inicial o iniciar un diagnóstico.
- Con poca evidencia: mostrar una recomendación provisional y explicarlo con lenguaje sencillo.
- Con evidencia suficiente: activar la recomendación plenamente personalizada.

El umbral exacto se decidirá con uso real. Como punto de partida para la V3, se evaluará considerar suficiente evidencia tras 20 respuestas válidas distribuidas en al menos dos sesiones, sin impedir que el repaso espaciado empiece desde el primer test.

## Nombres de materias

El campo `materia` de nuevos bancos debe usar un nombre breve, estable y descriptivo. No se admitirán etiquetas genéricas como `Parte específica` cuando el contenido permita una denominación más útil.

Nombres normalizados del banco actual:

- Tema 13: `Estatuto Marco del personal estatutario`.
- Tema 14: `Situaciones administrativas, permisos y licencias`.
- Tema 19: `Ley 39/2015 — Procedimiento administrativo común`.
- Temas 20–21: `Ley 40/2015 — Régimen jurídico del sector público`.
