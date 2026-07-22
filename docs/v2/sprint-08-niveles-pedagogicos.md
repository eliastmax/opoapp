# Sprint V2 — Aprendizaje, Consolidación y Tribunal

## Objetivo

Convertir los tres niveles pedagógicos ya presentes en las preguntas en una progresión real por tema. El avance depende de conocimiento demostrado, cobertura y retención; no del número bruto de tests.

## Alcance implementado

- Cada tema dispone de Aprendizaje, Consolidación y Tribunal.
- Aprendizaje está disponible desde el inicio.
- Consolidación se desbloquea con dominio de Aprendizaje, variedad suficiente, tres sesiones y ausencia de conceptos críticos.
- Tribunal se desbloquea con dominio global, robustez, cobertura de Consolidación, retención separada y ausencia de conceptos críticos.
- Progreso muestra la fase recomendada, qué fases están disponibles y qué evidencia falta para avanzar.
- Crear test permite elegir fase y restringe todas las modalidades a preguntas de esa fase.
- Una fase bloqueada puede practicarse en modo libre tras confirmación explícita. Se guarda en historial, pero no cuenta para desbloquear fases.
- La sesión recomendada automática respeta la fase recomendada de cada tema.
- Los tests conservan la fase y si fueron realizados en modo libre.
- Las preguntas antiguas sin `nivel_pedagogico` se tratan como Aprendizaje.

## Reglas de desbloqueo V1.0

### Consolidación

- Dominio de Aprendizaje igual o superior al 90 %.
- Cobertura de preguntas distintas de Aprendizaje igual o superior al 80 %.
- Cobertura de perspectivas de Aprendizaje igual o superior al 85 %.
- Al menos tres sesiones completadas.
- Ningún concepto crítico de Aprendizaje por debajo del 70 % con evidencia mínima.

### Tribunal

- Consolidación desbloqueada.
- Dominio global igual o superior al 92 %.
- Robustez igual o superior al 80 % entre perspectivas y dificultades con evidencia suficiente.
- Cobertura de preguntas distintas de Consolidación igual o superior al 90 %.
- Al menos dos evidencias de retención correcta separadas siete días o más.
- Ningún concepto crítico activo.

## Decisiones técnicas

- Las métricas usan la última respuesta de cada pregunta distinta para evitar inflar el progreso repitiendo.
- Los tests en modo libre se excluyen del cálculo de desbloqueos.
- No se añaden columnas al CSV ni se regeneran bancos existentes.
- Se añaden a `tests` los campos `learning_stage` y `stage_free_mode`.
- La lógica sensible reside en funciones transaccionales de Supabase y se limita al usuario autenticado mediante RLS.
- Versión de métrica: `learning-stages-v1.0`.

## Criterios de aceptación

1. Progreso muestra los tres niveles por tema sin convertir la pantalla en una lista extensa.
2. Crear test selecciona por defecto el nivel recomendado del tema.
3. No puede iniciarse una fase bloqueada como progreso normal.
4. El acceso en modo libre exige confirmación y queda identificado.
5. Todas las modalidades respetan el nivel elegido.
6. La sesión recomendada no introduce preguntas de fases aún no recomendadas.
7. Repetir actividad no basta por sí solo para desbloquear una fase.
8. Los bancos V2 actuales siguen siendo compatibles sin cambios.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre el proyecto `OpoTest Study`, vinculado al dominio `https://opoapp.lovable.app`; no modifiques `OpoTest: V2`. Sincroniza la versión ya implementada en GitHub y publícala sin regenerar la arquitectura. Verifica en móvil: (1) que «Crear test personalizado» aparezca inmediatamente debajo de «Siguiente sesión recomendada» en Inicio; (2) que Progreso muestre Aprendizaje, Consolidación y Tribunal por tema, con la fase recomendada y los requisitos pendientes; (3) que Crear test seleccione el nivel recomendado y que una fase bloqueada solo pueda abrirse mediante la confirmación «Entrar en modo libre»; (4) que el modo libre indique que queda en historial pero no cuenta para desbloqueos; (5) que el resultado muestre nivel y modo libre cuando corresponda; (6) que «Copiar informe para ChatGPT» incluya el banco completo realizado con enunciado, opciones, respuesta elegida y correcta completas, explicación y referencia. No alteres el esquema CSV de 25 columnas ni las preguntas existentes. Ejecuta las migraciones versionadas incluidas en el repositorio antes de publicar y no crees cambios directos sin migración.

## Prompt optimizado para el Generador de Preguntas

Mantén exactamente el CSV V2 vigente de 25 columnas, sin añadir campos de progreso o de usuario. `nivel_pedagogico` es obligatorio y solo admite `aprendizaje`, `consolidacion` o `tribunal`. Clasifica cada pregunta por la habilidad que realmente exige: Aprendizaje para fijación y comprensión clara; Consolidación para excepciones, comparaciones, relaciones y aplicación segura; Tribunal para casos, matices y discriminación jurídicamente exigente. No eleves el nivel solo por redactar opciones más largas o introducir trampas formales. Conserva `concepto` y `perspectiva` de forma estable y específica porque se usan para cobertura, robustez y desbloqueo. Mantén una única respuesta inequívoca, distractores plausibles y referencias justificables en el temario principal. No regeneres preguntas ya validadas únicamente para adaptar la aplicación.
