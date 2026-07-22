# Sprint V2 — Renovación visual de Inicio y Crear test

## Objetivo

Hacer la aplicación más atractiva, cercana e intuitiva sin modificar el comportamiento validado del motor, los bancos de preguntas ni Supabase.

## Alcance implementado

- Sistema visual común con fondo sutil, tarjetas más limpias, jerarquía tipográfica y estados de foco accesibles.
- Navegación inferior más legible, con una marca visual clara para la sección activa.
- Inicio reorganizado alrededor de la sesión recomendada, la actividad y el repaso pendiente.
- Fallos y dudas aparecen como acciones separadas y directas, sin gamificación ni mensajes engañosos.
- Último resultado y acceso al progreso se muestran de forma compacta.
- Crear test se divide en tres bloques: Contenido, Nivel de preparación y Formato del test.
- Los selectores de Materia y Tema se sustituyen por hojas adaptadas a móvil.
- Materias y temas muestran el número en una etiqueta separada y el nombre completo en varias líneas.
- Los selectores permiten buscar por número o nombre y señalan claramente la opción elegida.
- El botón «Iniciar test» permanece visible sobre la navegación inferior mientras se configura el test.
- Corrección posterior: los botones personalizados de Materia y Tema propagan al diálogo sus eventos y atributos de accesibilidad, por lo que ambos selectores se abren correctamente.

## Decisiones de alcance

- No se modifica el motor inteligente ni la progresión Aprendizaje–Consolidación–Tribunal.
- No se modifica Supabase ni se añade ninguna migración.
- No se cambia el CSV V2 de 25 columnas ni se regeneran bancos existentes.
- Test, Resultados y Progreso conservan por ahora su composición; reciben solo los estilos comunes. Su revisión visual queda para sprints posteriores.
- Se prioriza claridad, accesibilidad y uso móvil frente a efectos decorativos o gamificación.

## Criterios de aceptación

1. Inicio permite distinguir en pocos segundos el siguiente paso, la actividad y los repasos pendientes.
2. Crear test muestra Materia y Tema sin cortar los nombres largos.
3. La búsqueda de Materia acepta tanto nombres como números de tema.
4. Elegir una materia reinicia de forma segura tema y subapartados, como antes.
5. Los niveles bloqueados, el modo libre, las modalidades y los subapartados mantienen su funcionamiento.
6. El botón final es accesible en móvil y no queda oculto por la navegación.
7. No existen cambios de base de datos ni del contrato CSV.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. El código del Sprint 10 ya está sincronizado desde GitHub. No lo regeneres ni cambies lógica. Actualiza el proyecto y publica. Verifica en móvil: (1) Inicio muestra una sesión recomendada destacada, actividad compacta y acciones separadas para fallos y dudas; (2) Crear test está dividido en Contenido, Nivel de preparación y Formato; (3) los selectores de Materia y Tema se abren como hojas móviles, permiten buscar y muestran una etiqueta `Tema N` o `Temas N–M` junto al nombre completo sin recortes; (4) seleccionar materia, tema, subapartados, nivel, cantidad y modalidad sigue funcionando; (5) el botón `Iniciar test` permanece visible sobre la barra inferior; y (6) no hay solapamientos a 360 px de ancho. No cambies Supabase, el motor, las 25 columnas del CSV ni los bancos existentes.

## Prompt optimizado para el Generador de Preguntas

No se requiere ningún cambio en el generador por este sprint visual. Mantén exactamente el CSV V2 vigente de 25 columnas, sus catálogos cerrados y todos los metadatos. Continúa distinguiendo `nivel_pedagogico` de `dificultad_conceptual` y `dificultad_examen`. No añadas campos visuales, etiquetas de interfaz ni columnas nuevas: la aplicación deriva la presentación de Materia y Tema a partir de los datos estructurados ya existentes.
