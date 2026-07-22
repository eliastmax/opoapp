# Sprint V2 — Simplificación de Crear test y bienvenida personalizada

## Objetivo

Reducir decisiones redundantes en la creación de tests y hacer la entrada a la aplicación más cercana sin recopilar datos personales innecesarios.

## Alcance implementado

- Se elimina de Crear test el selector visible «Fácil / Medio / Difícil».
- Se elimina la dificultad del resumen de configuración.
- Todas las modalidades continúan admitiendo internamente las tres dificultades.
- El nivel pedagógico —Aprendizaje, Consolidación o Tribunal— pasa a ser la decisión principal de preparación.
- Se conservan `dificultad_conceptual` y `dificultad_examen` en preguntas, CSV, base de datos y métricas.
- El título «Inicio» se sustituye por «Te damos la bienvenida, Nombre».
- El nombre procede del perfil; como alternativas se utilizan los metadatos de registro, la parte anterior al `@` del correo y, finalmente, «estudiante».
- No se pregunta sexo o género: la fórmula de bienvenida es neutral.
- El selector y el resumen muestran siempre «Tema N. Nombre» usando el campo estructurado `numero`.
- Si el nombre almacenado contiene un prefijo «Tema N» duplicado o incorrecto, se elimina antes de mostrarlo.

## Decisiones de alcance

- No se modifican ni regeneran los bancos existentes.
- No se elimina la dificultad del administrador de preguntas ni del modelo de datos.
- No se añade una preferencia avanzada de dificultad: el motor utiliza todo el abanico dentro del nivel elegido.
- No se modifica Supabase ni se requiere migración.

## Criterios de aceptación

1. Crear test no muestra controles ni resumen de dificultad.
2. Un test personalizado sigue pudiendo seleccionar preguntas fáciles, medias y difíciles internamente.
3. Tema, subapartados, nivel, cantidad y modalidad siguen funcionando.
4. Inicio muestra el nombre del usuario registrado.
5. La bienvenida funciona aunque falte el perfil y no utiliza género.
6. El CSV V2 mantiene exactamente sus 25 columnas.
7. El número mostrado en Crear test procede de `topics.numero` y no del texto libre del nombre.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. Sin regenerar la implementación sincronizada desde GitHub, publica y verifica en móvil: (1) que Crear test ya no muestre «Fácil / Medio / Difícil» ni una línea de dificultad en el resumen; (2) que los tests sigan creándose con Tema, Subapartados, Nivel de preparación, Número de preguntas y Modalidad; (3) que el selector y el resumen muestren siempre «Tema N. Nombre» usando el número estructurado, sin prefijos duplicados; (4) que Inicio muestre «Te damos la bienvenida, Nombre» usando el nombre de la cuenta; y (5) que una cuenta sin nombre tenga una alternativa legible. No preguntes sexo o género, no cambies Supabase y no alteres el CSV ni los bancos existentes.

## Prompt optimizado para el Generador de Preguntas

Mantén exactamente el CSV V2 vigente de 25 columnas. Aunque la dificultad ya no se elija manualmente en Crear test, conserva y calibra `dificultad_conceptual` y `dificultad_examen` con los valores `facil`, `medio` o `dificil`: siguen siendo metadatos internos para selección, análisis y robustez. Mantén también `nivel_pedagogico` como una dimensión diferente, con `aprendizaje`, `consolidacion` o `tribunal`. No confundas fase pedagógica con dificultad y no añadas columnas.
