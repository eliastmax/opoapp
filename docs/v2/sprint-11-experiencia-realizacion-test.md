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
- Se mantienen áreas táctiles cómodas y estados de foco accesibles.

## Decisiones de alcance

- No se modifica la selección de preguntas, el guardado de respuestas ni la finalización del test.
- No se introduce corrección inmediata: el usuario continúa viendo los resultados al finalizar.
- No se modifica Supabase ni se requiere migración.
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

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. El Sprint 11 ya está sincronizado desde GitHub. No regeneres código ni cambies lógica. Actualiza y publica, y verifica en móvil: (1) la navegación general desaparece solo durante un test; (2) el progreso compacto permanece arriba; (3) no se muestra dificultad; (4) el botón de duda funciona y cambia de estado; (5) las cuatro respuestas se pueden seleccionar y la elegida queda destacada; (6) Anterior y Siguiente permanecen fijos abajo sin tapar respuestas; (7) la última pregunta muestra `Finalizar` y abre el diálogo existente; y (8) al terminar vuelve a funcionar la navegación normal. No cambies Supabase, el motor, el CSV ni los bancos.

## Prompt optimizado para el Generador de Preguntas

No se requiere ningún cambio en el generador por este sprint de interfaz. Mantén exactamente el CSV V2 vigente de 25 columnas y todos sus metadatos, incluidas `dificultad_conceptual`, `dificultad_examen` y `nivel_pedagogico`. La dificultad continúa siendo información interna aunque no se muestre durante el test. No añadas columnas ni adaptes el texto de las preguntas a la interfaz.
