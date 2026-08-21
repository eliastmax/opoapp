# Content Factory.8 — Source Coverage Closure

Factory.8 añade un único cierre genérico entre Family Resolver y coverage/generation. Factory.7 permanece intacta.

## Principio

El mapa mastery debe representar todo conocimiento material del corpus canónico, aunque inicialmente no exista ninguna pregunta que lo sondee.

## Pipeline

`CanonicalPageText[] → SemanticSourceSpan[] → question-backed family resolution → Source Coverage Closure → mastery final → mappings → coverage → generation → capacity → QA → import`.

Source Coverage Closure vuelve a segmentar de forma determinista cada `SemanticSourceSpan` en chunks candidatos, de modo que no depende de que el parser upstream haya producido spans finos. La operación semántica `resolveSourceCoverage(packet)` decide por cada zona canónica:

- `ATTACH_TO_EXISTING_FAMILY`: nueva faceta de un mastery ya representado.
- `CREATE_SOURCE_FAMILY`: núcleo material nuevo; puede crear además una unit source-only.
- `IGNORE_NONMATERIAL`: solo encabezados sin conocimiento, ejemplos puramente gráficos, restos de formato o texto no evaluable, siempre con rationale.

Un chunk grueso puede recibir varias decisiones acotadas por `sourceExcerpt`, permitiendo separar contenido ya cubierto y contenido descubierto dentro del mismo span.

## Source-only

Una family creada desde fuente nace con `origin=source_only`, `generationRequired=true`, `questionCodes=[]`, source scope canónico no vacío y código estable. El validator `pre_generation` admite este estado. El validator `import_ready` lo rechaza hasta que generación cree una pregunta con `conceptCode` desde nacimiento y su primary mapping.

Las estructuras ya aprobadas usan replay y no ejecutan Source Coverage Closure ni se reinterpretan.

## Tests mínimos

Los fixtures cubren: sección material sin semillas; attach a family existente; ignore no material; span grueso mixto; 0q válido pre-generation; 0q inválido import-ready; generación con conceptCode-at-birth + primary mapping; replay aprobado sin operaciones semánticas.
