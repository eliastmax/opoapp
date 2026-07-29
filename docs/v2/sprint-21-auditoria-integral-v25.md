# Sprint 21 — Auditoría integral y cierre técnico de V2.5

## Objetivo

Validar la oposición completa sin exigir una revisión manual de las 4.123
preguntas. El cierre combina controles automáticos sobre todo el banco, pruebas
transaccionales de los motores y una muestra manual pequeña centrada en la
experiencia de uso.

No cambia el contrato V2 de 25 columnas ni requiere cambios en el Generador.

## Auditoría del banco en producción

Fecha: 29 de julio de 2026.

- 24 temas y 4.123 preguntas en la cuenta principal.
- 4.123 preguntas activas.
- 1.351 preguntas de Aprendizaje.
- 1.414 preguntas de Consolidación.
- 1.358 preguntas de Tribunal.
- 0 códigos duplicados.
- 0 opciones repetidas dentro de una pregunta.
- 0 respuestas correctas inválidas.
- 0 preguntas sin concepto, perspectiva o referencia.
- Distribución de respuestas: A 1.036, B 1.027, C 1.030 y D 1.030.

La consulta reproducible está en
`supabase/audits/v25_bank_health.sql`.

## Coincidencia de enunciado revisada

La auditoría detectó un único enunciado exacto compartido por dos temas:

- `SMS-T08-0015`, basado en la Ley 4/1994, artículo 11.1.
- `SMS-T11-0156`, basado en la Ley 3/2009, artículo 39.1.

Ambas preguntas tratan el mismo órgano desde normas incluidas en temas
diferentes, utilizan opciones distintas y mantienen referencias propias. Se
conservan como solapamiento normativo transversal, no como duplicado accidental.

## Estrés transaccional de los motores

Se ejecutaron 132 creaciones de test dentro de una única transacción terminada
con `ROLLBACK`:

- 24 tests de Aprendizaje, uno por tema.
- 24 tests de Consolidación, uno por tema.
- 24 tests de Tribunal, uno por tema.
- 10 multitema de Aprendizaje.
- 10 multitema de Consolidación.
- 10 multitema de Tribunal.
- 10 simulacros de 100 preguntas.
- 20 sesiones recomendadas de 20 preguntas.

Resultado:

- 0 selecciones incompletas.
- 0 preguntas duplicadas dentro de un test.
- 0 errores de orden.
- 0 preguntas de un nivel distinto al solicitado.
- 0 fallos de cobertura temática.
- 0 datos persistidos después del `ROLLBACK`.

La prueba reproducible está en
`supabase/audits/v25_selection_stress.sql`.

## Automatización del repositorio

El repositorio dispone de comandos explícitos para pruebas, TypeScript y
validación completa. GitHub ejecuta automáticamente pruebas, TypeScript y build
en cada pull request dirigido a `main` y después de cada fusión.

El lint global conserva una deuda previa de formato en archivos generados y
componentes existentes. No se ha hecho una reformateación masiva dentro de este
sprint para evitar mezclar cambios sin relación. El lint sigue disponible como
comando independiente y su saneamiento deberá abordarse en un sprint técnico
separado.

## Validación manual pendiente

La automatización confirma integridad y selección, pero no sustituye la
percepción de claridad en móvil. Elías solo necesita completar estas cinco
acciones mientras estudia:

1. Una sesión recomendada.
2. Un test de nivel marcando una duda y dejando al menos un fallo.
3. Un multitema con varios temas ya estudiados.
4. Un simulacro.
5. Un repaso posterior y revisión del Historial.

No es necesario revisar todas las preguntas. Cualquier problema debe anotarse
con la pantalla, la acción realizada y lo que resultó confuso.

## Criterio de cierre

La V2.5 queda cerrada técnicamente. Su calibración pedagógica seguirá pendiente
hasta acumular suficientes tests reales, repeticiones y ciclos de retención. No
se modificarán pesos o umbrales únicamente a partir de pruebas sintéticas.
