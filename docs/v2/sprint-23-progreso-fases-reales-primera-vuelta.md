# Sprint 23 — Progreso con fases reales y primera vuelta

## Objetivo

Corregir la representación de Progreso para distinguir una fase pedagógica de una modalidad de
práctica y sustituir el lenguaje técnico centrado en el banco por un recorrido comprensible para el
estudiante.

## Cambios

- La ruta de Progreso muestra únicamente Aprendizaje, Consolidación y Tribunal.
- «Mezcladas» se mantiene como modalidad de práctica en Crear test y como identificación de esas
  sesiones, pero deja de presentarse como una cuarta fase.
- Cuando Tribunal está disponible, la ruta muestra «Ruta completada» y orienta a alternar práctica,
  fallos y repasos.
- Los hitos de cobertura pasan a expresarse como primera vuelta:
  - Aún no has empezado.
  - Primera vuelta en marcha.
  - A punto de completar la primera vuelta.
  - Primera vuelta completada.
- Completar la primera vuelta significa haber respondido todas las preguntas del tema al menos una
  vez. El mensaje aclara que todavía hay que corregir fallos y mantener el aprendizaje con repasos
  separados.

## Alcance técnico

El cambio afecta solo a presentación, textos y pruebas. No modifica consultas, cálculos de
cobertura, desbloqueos, retención, historial, formato CSV ni datos de Supabase.

## Validación

- Pruebas unitarias de los cuatro hitos de primera vuelta.
- Prueba de cierre de ruta sin presentar «Mezcladas» como fase.
- TypeScript, build de producción y lint de los archivos modificados.
