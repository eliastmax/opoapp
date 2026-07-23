# Sprint 16 — Retención programada

## Objetivo

Convertir el historial de respuestas en un calendario de comprobaciones espaciadas. La aplicación debe volver a preguntar un contenido cuando ya ha pasado tiempo suficiente para aportar evidencia de retención, sin premiar repeticiones inmediatas.

## Reglas `retention-v1.0`

| Evidencia                         | Próxima comprobación |
| --------------------------------- | -------------------: |
| Respuesta incorrecta              |                1 día |
| Respuesta marcada como duda       |                1 día |
| Primera respuesta correcta segura |               3 días |
| Segunda confirmación espaciada    |               7 días |
| Tercera confirmación espaciada    |              14 días |
| Cuarta confirmación y posteriores |              30 días |

- Un acierto anterior a la fecha prevista actualiza las estadísticas normales, pero no aumenta el nivel de retención ni aleja la siguiente comprobación.
- Un fallo o una duda reinician el nivel de retención.
- Una aparición sin respuesta y sin duda no modifica el calendario.
- Los intervalos son una calibración inicial versionada, no una afirmación universal sobre la memoria.

## Alcance implementado

- `question_statistics.retention_level` conserva el nivel interno de cada pregunta entre 0 y 4.
- `next_review_at`, ya existente, pasa a calcularse al completar cada test.
- `calculate_retention_state` contiene una transición pura y comprobable para evitar divergencias entre casos.
- `complete_test` actualiza estadísticas y calendario dentro de la misma operación idempotente.
- Los datos anteriores se convierten de manera conservadora:
  - fallos y dudas activos comienzan en recuperación;
  - un último acierto seguro comienza en el primer nivel y recibe su primera comprobación tres días después de activar el sistema;
  - no se conceden niveles superiores sin evidencia temporal comprobable.
- `get_retention_review_summary` devuelve los repasos vencidos por tema para el usuario autenticado.
- La sesión recomendada incluye los repasos vencidos dentro de su 40 % de repaso prioritario.
- Fallos y dudas siguen por delante de los repasos programados.
- Los repasos vencidos de niveles pedagógicos anteriores pueden aparecer, pero nunca se introducen preguntas de niveles futuros bloqueados.
- La antigüedad del vencimiento aumenta moderadamente la prioridad, con un límite para conservar variedad.
- El motor queda identificado como `recommended-v3.0`.

## Experiencia de usuario

- Inicio muestra cuántos repasos programados hay para hoy.
- Un icono de información explica de forma sencilla:
  - los intervalos 3, 7, 14 y 30 días;
  - que fallos y dudas regresan antes;
  - que repetir el mismo día no hace avanzar.
- Progreso muestra los repasos pendientes dentro de cada tema.
- Cuando un tema tiene repasos vencidos, su siguiente paso dirige a la sesión recomendada.
- No se añade una nueva configuración ni se obliga al usuario a gestionar fechas manualmente.

## Seguridad y rendimiento

- Las funciones son `SECURITY INVOKER`.
- Todas las consultas filtran por `auth.uid()`.
- `PUBLIC` y `anon` no pueden ejecutar las funciones.
- La consulta de vencimientos reutiliza el índice parcial existente sobre `user_id` y `next_review_at`.
- No se crean tablas expuestas nuevas.
- La actualización mantiene el bloqueo e idempotencia ya existentes en `complete_test`.

## Criterios de aceptación

1. Un primer acierto seguro programa el repaso a 3 días.
2. Un acierto realizado antes de la fecha prevista no aumenta el nivel.
3. Un acierto realizado al vencer avanza a 7, 14 y después 30 días.
4. Un fallo o una duda programan una comprobación al día siguiente y reinician el nivel.
5. Una pregunta sin respuesta y sin duda conserva su calendario anterior.
6. Finalizar dos veces el mismo test no duplica estadísticas ni avances.
7. Inicio y Progreso muestran únicamente los repasos del usuario autenticado.
8. La sesión recomendada prioriza repasos vencidos sin duplicados y sin desbloquear niveles futuros.
9. Los tests manuales, bancos existentes e importador mantienen su funcionamiento.
10. El usuario puede entender el sistema mediante el icono de información sin leer documentación técnica.

## Prompt optimizado para Lovable

```text
Trabaja exclusivamente sobre OpoTest Study, sincronizado con GitHub y publicado en opoapp.lovable.app. No modifiques OpoTest: V2.

El Sprint 16 de retención programada ya está implementado y versionado. Sin reinterpretar su arquitectura:

1. Ejecuta la migración versionada retention_v1 incluida en el repositorio.
2. Publica el código sincronizado desde GitHub.
3. Comprueba en móvil que Inicio muestra los repasos programados para hoy dentro de la tarjeta «Sesión recomendada».
4. Comprueba que el icono de información abre una explicación breve de los intervalos 3–7–14–30, los repasos tempranos de fallos/dudas y que repetir el mismo día no hace avanzar.
5. Comprueba que Progreso muestra los repasos vencidos por tema.
6. Verifica que una sesión recomendada puede incorporar preguntas con motivo «Repaso programado para comprobar la retención».

No cambies los intervalos, los porcentajes de composición, los niveles pedagógicos, Supabase fuera de la migración, el importador, las 25 columnas V2 ni los bancos de preguntas. No generes una implementación alternativa.
```

## Prompt optimizado del Generador de Preguntas

No requiere modificaciones. Mantén exactamente el contrato V2 vigente de 25 columnas. No añadas fechas, intervalos, nivel de retención, contadores de uso ni prioridad de repaso al CSV: son datos personales y dinámicos calculados por la aplicación. Conserva códigos estables, tema, subapartado, concepto, perspectiva y nivel pedagógico coherentes porque permiten variar las comprobaciones sin generar reformulaciones triviales.
