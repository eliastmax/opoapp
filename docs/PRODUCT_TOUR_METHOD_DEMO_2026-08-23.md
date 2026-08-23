# OpoTest Study — Tutorial como demostración del método

Contrato de UX para la iteración del tutorial posterior a PR #128.

## Principio
Mantener 6 pasos principales. Estudio y Crear test se convierten en demostraciones guiadas con subescenas internas. Todo se ejecuta sobre superficies y contenido reales del producto; no usar mockups.

## Narrativa
1. Hoy — saber por dónde empezar.
2. Temario — saber dónde está todo.
3. Unidad — avanzar por partes.
4. Cómo estudias — idea central, claves, confusiones, trampas y flashcards.
5. Cómo practicas — configurar test, entender niveles, simular una pregunta y feedback.
6. Progreso — entender qué avanza, qué necesita atención y cómo esa evidencia orienta lo siguiente.

## Estudio · paso 4
Subescenas dentro de `4 de 6`:
- Idea central: entender qué necesita aprenderse.
- Claves de examen: qué merece especial atención.
- No lo confundas: distinguir conceptos próximos.
- Trampas frecuentes: matices que pueden provocar error.
- Flashcard: recuperar antes de mirar, con flip visual pregunta → respuesta.

Seleccionar una unidad real que tenga la mayor riqueza disponible: resumen, claves, confusiones, trampas y flashcards. Si una sección no existe, no mostrar un target vacío.

## Crear test · paso 5
Subescenas dentro de `5 de 6`:
- Elegir contenido y formato.
- Explicar Aprendizaje → Consolidación → Tribunal como etapas de entrenamiento, no como fácil/medio/difícil.
- Aprendizaje: base, reglas esenciales y comprensión.
- Consolidación: excepciones, relaciones y aplicación segura.
- Tribunal: casos, matices y discriminación exigente.
- Explicar que OpoTest recomienda avanzar según evidencia de práctica; no exponer requisitos numéricos durante onboarding.
- Mezcladas se presenta después como combinación de los tres niveles para mantener el tema completo.
- Simular configuración de un test con controles reales.
- Simular `Iniciar test` sin crear un intento persistido.
- Mostrar una pregunta real del catálogo, seleccionar visualmente una opción y enseñar feedback, preferentemente con un fallo simulado para explicar el valor de errores y dudas.

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
- Target con halo/relieve sutil de una sola vez; sin pulso continuo.
- Coach marks compactos para que el producto real sea protagonista.
- Indicador interno discreto, p. ej. `Dentro de una unidad · 2/5` o `Crear un test · 3/6`, sin añadir pasos globales.
- Flashcard con flip 3D suave (~300–380 ms).
- Controles del test con selección secuencial suave (120–180 ms).
- Feedback de pregunta con fade + translateY corto.
- Sin confetti, rebotes, manos/cursor falsos ni animación decorativa continua.

## Cierre
Progreso explica que estudiar, recordar y practicar genera evidencia sobre qué avanza y qué sigue necesitando trabajo. CTA final `Empezar mi sesión` vuelve a Hoy.
