# Sprint V2 — Experiencia de realización de test

## Objetivo

Aprovechar mejor el espacio móvil durante un test, reducir distracciones y facilitar la lectura y selección de respuestas sin alterar ninguna regla del test.

## Alcance implementado

- La navegación general se oculta únicamente mientras hay un test en curso.
- El encabezado de progreso se compacta y permanece visible al desplazarse.
- Se muestra la posición actual y el número de preguntas pendientes con mensajes breves.
- Se elimina de la pregunta la etiqueta visible de dificultad, ya retirada previamente de Crear test.
- La pregunta gana jerarquía visual sin ocupar una tarjeta sobredimensionada.
- «Marcar como duda» se convierte en una acción compacta junto al enunciado.
- Las respuestas utilizan letras más claras, separación contenida y un estado seleccionado inequívoco.
- Anterior y Siguiente permanecen fijos al pie de la pantalla.
- En la última pregunta, el botón principal cambia a «Finalizar».
- La cabecera incluye una salida pequeña y visible, protegida por confirmación para evitar abandonos accidentales.
- Se mantienen áreas táctiles cómodas y estados de foco accesibles.

## Decisiones de alcance

- No se modifica la selección de preguntas, el guardado de respuestas ni la finalización del test.
- No se introduce corrección inmediata: el usuario continúa viendo los resultados al finalizar.
- No se modifica Supabase ni se requiere migración.
- Salir no corrige el test ni altera los fallos activos; simplemente devuelve al usuario a Inicio.
- No se cambia el CSV V2 ni ningún banco existente.
- El progreso superior sigue representando la posición dentro del test; el texto lateral informa de las preguntas aún sin responder.

## Criterios de aceptación

1. Durante un test no aparece la navegación general de Inicio, Crear, Progreso, Importar y Ajustes.
2. Pregunta, respuestas y controles aprovechan el ancho disponible sin perder legibilidad.
3. La respuesta seleccionada queda claramente diferenciada.
4. Marcar y desmarcar una duda sigue funcionando.
5. Anterior y Siguiente permanecen accesibles en pantallas móviles.
6. Llegar a la última pregunta mantiene el diálogo de confirmación existente.
7. No se modifica ningún dato ni contrato de importación.
8. El botón «Salir» pide confirmación y permite continuar el test si se pulsó por error.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. El Sprint 11 ya está sincronizado desde GitHub. No regeneres código ni cambies lógica. Actualiza y publica, y verifica en móvil: (1) la navegación general desaparece solo durante un test; (2) el progreso compacto permanece arriba; (3) `Salir` es visible pero secundario y pide confirmación; (4) cancelar la salida permite continuar sin cambios; (5) confirmar la salida vuelve a Inicio sin corregir el test; (6) el botón de duda funciona y cambia de estado; (7) las cuatro respuestas se pueden seleccionar; (8) Anterior y Siguiente permanecen fijos abajo; y (9) `Finalizar` conserva su confirmación y corrección. No cambies Supabase, el motor, el CSV ni los bancos.

## Prompt optimizado para el Generador de Preguntas

No se requiere ningún cambio en el generador por este sprint de interfaz. Mantén exactamente el CSV V2 vigente de 25 columnas y todos sus metadatos, incluidas `dificultad_conceptual`, `dificultad_examen` y `nivel_pedagogico`. La dificultad continúa siendo información interna aunque no se muestre durante el test. No añadas columnas ni adaptes el texto de las preguntas a la interfaz.
