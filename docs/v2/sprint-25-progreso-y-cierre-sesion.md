# Sprint 25 — Progreso coherente y cierre de sesión útil

## Objetivo

Hacer que el avance resulte comprensible en dos momentos clave: al consultar un tema y al terminar
un test. El sprint no cambia cómo se calcula el progreso; ordena y traduce mejor la evidencia que ya
existe.

## Panel de detalle de Progreso

- La ruta completada y el mantenimiento se presentan como dimensiones compatibles.
- Un tema con las tres fases disponibles conserva «Ruta completada» aunque tenga repasos pendientes.
- Los repasos vencidos se expresan como «Mantenimiento pendiente» y no invalidan el logro anterior.
- El nombre oficial completo queda disponible en un detalle desplegable y deja de desplazar la acción
  recomendada.
- La siguiente acción aparece antes que las métricas secundarias.
- Los porcentajes de cobertura se redondean visualmente a enteros; el valor almacenado no se modifica.
- La base de práctica aparece como una métrica secundaria, sin competir con la fase o con el estado de
  mantenimiento.

## Cierre de sesión

Después del resultado se añade «Impacto de la sesión». Solo muestra hechos respaldados por la
trazabilidad de selección y por la respuesta actual:

- preguntas nuevas trabajadas;
- fallos activos acertados esta vez, siempre que la respuesta sea correcta y no esté marcada como duda;
- repasos programados confirmados, con la misma exigencia de respuesta segura;
- puntos débiles reforzados;
- actividad neutral de la sesión cuando el test no conserva trazabilidad de selección.

El resumen muestra como máximo tres hechos. No declara un tema dominado, no convierte un acierto
inmediato en retención y no inventa cambios de fase.

La acción principal se decide así:

1. revisar fallos;
2. revisar dudas cuando no hay fallos;
3. hacer otro test cuando no hay contenido prioritario que revisar.

La repetición de fallos o dudas queda después de la revisión de las explicaciones, para favorecer la
comprensión antes de volver a responder.

## Validación

- Estados del mapa: sin empezar, Aprendizaje, Consolidación, Tribunal y ruta completada.
- Detalle de ruta completada con y sin mantenimiento pendiente.
- Filtros: Todos, En curso, Atención y Completados.
- Porcentajes decimales redondeados únicamente en presentación.
- Impacto con preguntas nuevas, fallos, dudas, retención, puntos débiles y ausencia de trazabilidad.
- Regresión de pruebas, TypeScript, lint y build de producción.

## Alcance técnico

El sprint es exclusivamente de presentación y composición en cliente. No modifica RPC, migraciones,
tablas, desbloqueos, retención, historial, bancos ni el contrato CSV V2 de 25 columnas.

## Instrucción de publicación para Lovable

Sincroniza el `main` de `eliastmax/opoapp` y publica la versión existente de OpoTest Study. No
regeneres código ni uses edición asistida. Comprueba en móvil el detalle de un tema con ruta completada
y repasos pendientes, y el cierre de un test con fallos o dudas.

## Generador de preguntas

No requiere cambios en el Generador; se mantiene el contrato V2 de 25 columnas.
