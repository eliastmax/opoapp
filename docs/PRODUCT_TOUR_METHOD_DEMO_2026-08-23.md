# OpoTest Study — Tutorial como demostración del método

Contrato de UX para la iteración del tutorial posterior a PR #128, actualizado tras la revisión visual móvil posterior a PR #129.

## Principio
Mantener 6 pasos principales. Estudio y Crear test se convierten en demostraciones guiadas con subescenas internas. Todo se ejecuta sobre superficies y contenido reales del producto; no usar mockups.

## Narrativa
1. Hoy — orientación inicial: este es el punto de partida y aquí aparece la sesión recomendada. No explicar todavía el ciclo completo.
2. Temario — saber dónde está todo.
3. Unidad — avanzar por partes.
4. Cómo estudias — idea central, claves, confusiones, trampas y flashcards.
5. Cómo practicas — configurar test, entender niveles, simular una pregunta, mostrar una selección y después el feedback.
6. Progreso — entender qué avanza y qué necesita atención. Después volver a Hoy para cerrar el ciclo con sentido, cuando el usuario ya entiende el método.

## Estudio · paso 4
Subescenas dentro de `4 de 6`:
- Idea central: entender qué necesita aprenderse.
- Claves de examen: qué merece especial atención.
- No lo confundas: distinguir conceptos próximos.
- Trampas frecuentes: matices que pueden provocar error.
- Flashcard: recuperar antes de mirar, con flip visual pregunta → respuesta.

El orden visual de la vista preview debe coincidir con el orden del tour para que el recorrido sea descendente y continuo: resumen → claves → confusiones → trampas → flashcard.

Seleccionar una unidad real que tenga la mayor riqueza disponible: resumen, claves, confusiones, trampas y flashcards. Si una sección no existe, no mostrar un target vacío.

El spotlight no puede tapar el contenido que intenta explicar. En móvil debe reservar desde el primer cálculo el espacio real del coach mark, recortar targets excesivamente altos al área visible y hacer una corrección final de scroll antes de revelar el popover.

## Crear test · paso 5
Subescenas dentro de `5 de 6`:
- Elegir contenido y formato.
- Explicar Aprendizaje → Consolidación → Tribunal como etapas de entrenamiento, no como fácil/medio/difícil.
- Aprendizaje: base, reglas esenciales y comprensión.
- Consolidación: excepciones, relaciones y aplicación segura.
- Tribunal: casos, matices y discriminación exigente.
- Explicar que OpoTest recomienda avanzar según evidencia de práctica; no exponer requisitos numéricos durante onboarding.
- Mezcladas se presenta después como combinación de los tres niveles para mantener el tema completo.
- Simular configuración de un test.
- Simular `Iniciar test` sin crear un intento persistido.
- Mostrar una pregunta real del catálogo.
- Mostrar primero una opción incorrecta seleccionándose visualmente, con una microanimación de pulsación/selección.
- Solo después enseñar feedback: elegida, correcta y explicación.

La selección simulada debe ser visible antes de la corrección; no saltar directamente de pregunta neutra a estado rojo/verde.

En el bloque de corrección, las etiquetas `Tu respuesta simulada` y especialmente `Respuesta correcta` deben tener jerarquía tipográfica más fuerte que el texto de la respuesta. La respuesta en sí no debe competir en negrita con la etiqueta.

## Progreso y cierre · paso 6
La primera escena de `6 de 6` se queda en Progreso y explica únicamente lo que la pantalla muestra: conocimientos en comprobación, consolidando, retenidos y temas que requieren atención.

La segunda escena de `6 de 6` vuelve a Hoy y cierra el círculo:
- todo lo estudiado y practicado genera evidencia;
- esa evidencia vuelve a Hoy;
- OpoTest propone el siguiente paso;
- CTA final `Empezar mi sesión`.

El mensaje global `Siempre sabrás qué hacer después` pertenece al cierre, no al primer contacto con la app.

## Contrato read-only
Durante el tutorial:
- no crear tests;
- no crear test_answers;
- no completar unidades;
- no registrar revisiones de flashcards;
- no modificar mastery;
- no crear fallos ni dudas;
- no modificar roadmap;
- no alterar estadísticas ni historial.

El modo preview puede leer catálogo y mantener estado visual local efímero únicamente.

## Movimiento y composición
- Spotlight viajero: el popover desaparece, el foco se desplaza con scroll y el nuevo popover aparece al asentarse.
- Scroll coreografiado: posicionar cada target dejando espacio para target + coach mark y cabeceras sticky.
- Reserva inicial conservadora para la altura del popover en móvil; no esperar a una segunda medición para evitar solapamientos.
- Segunda corrección de scroll al finalizar el desplazamiento para compensar navegadores móviles y contenedores anidados.
- Target con halo/relieve sutil de una sola vez; sin pulso continuo.
- Coach marks compactos para que el producto real sea protagonista.
- Indicador interno discreto, p. ej. `Dentro de una unidad · 2/6` o `Crear un test · 3/10`, sin añadir pasos globales.
- Flashcard con flip 3D suave (~300–380 ms).
- Controles del test con selección secuencial suave (120–180 ms).
- Opción simulada con una pulsación visual breve antes del feedback.
- Feedback de pregunta con fade + translateY corto.
- Sin confetti, rebotes, manos/cursor falsos ni animación decorativa continua.

## Cierre
Progreso explica qué está pasando. Hoy cierra después el método completo. CTA final `Empezar mi sesión` comienza la sesión real.
