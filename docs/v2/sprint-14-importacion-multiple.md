# Sprint V2 — Importación múltiple de CSV

## Objetivo

Permitir seleccionar, validar e importar varios bancos CSV en una sola operación, evitando repetir manualmente el mismo proceso para cada lote.

## Alcance implementado

- El selector admite uno o varios archivos `.csv` simultáneamente.
- Cada archivo conserva su nombre, formato detectado, delimitador, número de filas válidas y errores.
- Se siguen admitiendo exactamente V1 básico de 13 columnas, V1 enriquecido de 16 y V2 de 25.
- Los archivos se combinan en una única vista previa global.
- Se detectan códigos y enunciados duplicados tanto dentro de cada CSV como entre archivos diferentes.
- Los errores muestran archivo, fila, campo y motivo.
- Las preguntas nuevas, enriquecibles, existentes sin cambios y conflictivas se calculan sobre el lote completo.
- La confirmación envía todos los archivos válidos juntos a `import_questions_batch`.
- La importación continúa siendo transaccional: si la base rechaza una fila, no se guarda parcialmente el lote.
- Los conflictos con preguntas ya existentes se muestran y se omiten, igual que en el importador anterior.

## Decisiones de alcance

- No se modifica el contrato CSV ni se añaden columnas.
- No se modifica Supabase ni la RPC existente.
- No se fusionan físicamente los CSV ni se crea un archivo nuevo.
- Un error estructural o de contenido bloquea la confirmación del conjunto para evitar importaciones incompletas inadvertidas.
- Las advertencias de similitud continúan siendo informativas y no bloqueantes.

## Criterios de aceptación

1. El usuario puede seleccionar varios CSV en una sola acción.
2. Cada archivo muestra claramente si es válido o contiene errores.
3. Los duplicados entre archivos se detectan antes de importar.
4. La vista previa presenta totales globales y procedencia de cada incidencia.
5. Con errores no se habilita la confirmación.
6. Sin errores, una única confirmación importa el lote completo.
7. Los formatos V1 de 13/16 columnas y V2 de 25 siguen funcionando sin regresiones.
8. Las preguntas ya almacenadas conservan las reglas de conflicto, enriquecimiento y omisión vigentes.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. El Sprint 14 ya está implementado en GitHub. Sincroniza y publica sin regenerar código. Verifica en móvil: (1) el selector de Importar permite elegir varios CSV; (2) cada archivo muestra nombre, formato, filas válidas y errores; (3) se aceptan V1-13, V1-16 y V2-25; (4) un código o enunciado duplicado entre archivos bloquea la confirmación e identifica ambos archivos; (5) los errores indican archivo y fila; (6) un lote correcto muestra totales globales y se importa con una sola confirmación; y (7) la importación de un único archivo sigue funcionando. No cambies Supabase, la RPC, el CSV ni los bancos.

## Prompt optimizado para el Generador de Preguntas

No se requiere ningún cambio en el Generador de Preguntas. Mantén exactamente el contrato CSV V2 vigente de 25 columnas, los códigos permanentes y los catálogos cerrados. Cada CSV debe seguir siendo válido por sí mismo; la posibilidad de seleccionarlos juntos pertenece únicamente al importador de la aplicación.
