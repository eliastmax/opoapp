# V3 — Valoración inicial por tema y hoja de ruta adaptativa

## 1. Problema que resuelve

Un usuario nuevo todavía no tiene historial. El motor V2 sabe qué preguntas son nuevas, pero no sabe qué temas lleva estudiados ni cuánto tiempo queda para el examen. Por ello, las primeras recomendaciones pueden ser técnicamente correctas pero poco personales.

La V3 utilizará una valoración inicial por tema, la fecha objetivo y una disponibilidad realista para ofrecer desde el primer día una ruta de tests útil. Después sustituirá progresivamente esa estimación por evidencia observada.

## 2. Decisión fundamental

La valoración declarada y el progreso demostrado nunca se mezclarán como si fueran el mismo dato.

- **Preparación estimada:** lo que el usuario cree saber al comenzar.
- **Preparación observada:** lo que los tests permiten sostener con evidencia.

La interfaz podrá enseñar ambos valores, pero el segundo irá ganando prioridad. Así se consigue personalización inmediata sin presentar una percepción subjetiva como dominio real.

## 3. Configuración inicial

### 3.1. Fecha del examen

El usuario podrá elegir:

- fecha exacta;
- mes aproximado;
- fecha estimada;
- todavía no se conoce.

Se guardará también el grado de precisión. Si la fecha es aproximada, la aplicación hablará de planificación orientativa y evitará falsas cuentas atrás exactas.

### 3.2. Valoración tema por tema

Para evitar una precisión ficticia y hacer asumible valorar 24 temas, se utilizarán cinco niveles con porcentaje asociado:

- 0 % — No empezado.
- 25 % — Primer contacto.
- 50 % — Tengo una base.
- 75 % — Bastante preparado.
- 100 % — Muy preparado.
- No sé valorarlo — Sin estimación inicial.

La pantalla mostrará pocos temas cada vez, permitirá guardar y continuar más tarde y ofrecerá aplicar una valoración a varios temas. El porcentaje podrá modificarse posteriormente, pero conservará la fecha de la valoración.

### 3.3. Ritmo disponible

La planificación preguntará únicamente datos que pueda utilizar:

- días habituales de práctica por semana;
- cantidad cómoda de preguntas por sesión;
- días concretos opcionales, sin obligar a fijar un horario rígido.

La unidad principal será la sesión o el número de preguntas, no horas de estudio que la aplicación no puede comprobar.

## 4. Funcionamiento de las recomendaciones

### 4.1. Al comenzar

Sin historial suficiente, se priorizarán:

- temas con preparación estimada baja;
- temas todavía no evaluados;
- contenidos relevantes disponibles en el banco;
- cobertura equilibrada antes de concentrar demasiadas repeticiones.

### 4.2. Cuando aparece evidencia

Cada pregunta distinta respondida reduce la dependencia de la estimación inicial. La transición debe ser gradual:

- evidencia inexistente: domina la valoración inicial;
- evidencia inicial: se combinan estimación y resultados;
- evidencia suficiente o robusta: domina el progreso observado.

No se fijará todavía una fórmula definitiva. Se calibrará con uso real y deberá quedar explicada en términos comprensibles.

### 4.3. Según el tiempo restante

La hoja de ruta tendrá tres orientaciones, sin convertirlas en calendarios rígidos:

- **Cobertura:** conocer todos los temas y detectar carencias.
- **Consolidación:** reforzar errores, dudas y retención.
- **Preparación de examen:** aumentar Tribunal, mezcla y simulación.

La fecha del examen modifica el reparto entre estas orientaciones, pero nunca desbloquea Tribunal sin la evidencia mínima acordada.

## 5. Hoja de ruta semanal

La pantalla principal mostrará:

- objetivo de sesiones o preguntas de la semana;
- reparto recomendado por temas;
- sesión recomendada para hoy;
- progreso semanal realizado;
- explicación breve de por qué se propone cada bloque.

Si el usuario no cumple un día, la aplicación redistribuye lo pendiente sin mensajes de culpa ni acumulaciones imposibles. La ruta se recalcula al completar tests, cambiar la fecha, modificar disponibilidad o incorporar nuevos temas.

## 6. Modelo de datos propuesto

### `exam_goals`

- `id`;
- `user_id`;
- `name`;
- `target_date` nullable;
- `date_precision`: `exacta`, `mes`, `estimada`, `desconocida`;
- `weekly_practice_days`;
- `preferred_questions_per_session`;
- `active`;
- fechas de creación y actualización.

### `topic_self_assessments`

- `user_id`;
- `topic_id`;
- `estimated_percentage` nullable;
- `assessment_label`;
- `assessed_at`;
- restricción única por usuario y tema para el estado vigente, conservando historial si se decide versionar.

### Planificación

La primera versión debe calcular la hoja de ruta a partir de datos fuente, evitando guardar un porcentaje de progreso mutable. Solo se almacenarán instantáneas si resultan necesarias para explicar cambios o auditar recomendaciones.

## 7. Experiencia de usuario

- Configuración inicial breve, divisible y omisible.
- Posibilidad de corregir la fecha y las valoraciones.
- Diferenciación visual entre «Lo que estimaste» y «Lo que has demostrado».
- Explicaciones sencillas: «Te proponemos este tema porque lo valoraste bajo y aún tenemos poca evidencia».
- Sin promesas de aprobado, rankings, rachas obligatorias ni penalizaciones por faltar.

## 8. Sprints V3 propuestos

### V3.1. Perfil de examen y valoración inicial

Alta de fecha exacta o aproximada, disponibilidad y valoración de temas.

### V3.2. Prioridad inicial personalizada

Incorporación prudente de la autovaloración al motor, con pérdida progresiva de peso ante evidencia real.

### V3.3. Hoja de ruta semanal

Objetivo semanal, reparto por temas, sesión de hoy y replanificación sencilla.

### V3.4. Adaptación y validación

Explicabilidad, cambios de fecha, semanas incumplidas, calibración y pruebas de no regresión.

## 9. Criterios de aceptación futuros

1. Un usuario sin historial recibe recomendaciones diferentes según su valoración inicial.
2. La fecha aproximada no se presenta como exacta.
3. La evidencia real termina teniendo más peso que la autopercepción.
4. El progreso observado no aumenta por subir manualmente una valoración.
5. La hoja de ruta nunca recomienda más preguntas de las disponibles.
6. Un día incumplido no genera una carga acumulada inasumible.
7. Cada recomendación puede explicarse en lenguaje sencillo.
8. La V3 mantiene compatibilidad total con los bancos V2 de 25 columnas.

## 10. Prompt futuro para Lovable

No ejecutar durante la V2. Trabaja exclusivamente sobre `OpoTest Study`. Implementa primero el Sprint V3.1 sin modificar el motor vigente: crea un perfil de objetivo de examen con fecha exacta, mes aproximado, fecha estimada o desconocida; registra días habituales y preguntas preferidas por sesión; y añade una valoración inicial por tema con 0 %, 25 %, 50 %, 75 %, 100 % o «No sé valorarlo». Distingue siempre preparación estimada de progreso observado. Permite omitir, guardar y continuar. Aplica RLS por usuario, migración versionada, pruebas y diseño móvil. No cambies el CSV ni uses todavía estas valoraciones para alterar recomendaciones.

## 11. Prompt futuro para el Generador de Preguntas

La V3 no cambia el formato del banco. Mantén exactamente las 25 columnas V2 y sus catálogos. La fecha de examen, la disponibilidad y la valoración inicial son datos privados del estudiante y nunca deben incluirse en el CSV ni utilizarse para generar afirmaciones sobre su dominio. Conserva metadatos de tema, concepto, perspectiva, nivel pedagógico y frecuencia para que la aplicación pueda planificar con el banco existente.
