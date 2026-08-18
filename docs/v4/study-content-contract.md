# V4 — Contrato de contenido de estudio

## Objetivo

Definir una estructura estable para generar y validar contenido de estudio antes de conectarlo al motor adaptativo.

Este contrato permite producir resúmenes, claves y flashcards de forma homogénea y enlazarlas después con preguntas y estados conceptuales.

## Estructura canónica

Cada contenido pertenece a:

- oposición;
- tema;
- unidad de estudio;
- concepto.

Los identificadores de concepto deben ser estables y no depender únicamente de texto libre. Ejemplo conceptual:

`T13-RD-PRES-FMG`

El formato exacto del identificador podrá evolucionar, pero nunca debe reutilizarse para un conocimiento distinto.

## Paquete mínimo de una unidad

Cada unidad de estudio debe declarar:

- `title`: nombre corto y comprensible;
- `topic_number`: tema al que pertenece;
- `estimated_minutes`: duración estimada, normalmente 3–10 minutos;
- `concept_ids`: conceptos cubiertos;
- `source_refs`: fuentes normativas o documentales;
- `study_summary`: explicación suficiente para comprender el bloque;
- `exam_keys`: elementos de alta relevancia para examen;
- `confusions`: diferencias con conceptos próximos cuando existan;
- `traps`: excepciones, literalidades, plazos, cifras o formulaciones que inducen error;
- `mnemonics`: opcional y solo cuando aporte;
- `cards`: recuperación activa asociada a conceptos concretos.

## Reglas del resumen

El resumen debe:

1. enseñar una unidad concreta, no resumir un tema entero;
2. mantener la terminología jurídica o técnica de la fuente;
3. distinguir reglas, excepciones y comparaciones;
4. evitar contenido ornamental;
5. poder leerse en pocos minutos;
6. indicar la fuente que lo respalda;
7. no introducir doctrina no contenida o no validada por la fuente de referencia.

## Reglas de las flashcards

Cada card debe:

- estar asociada al menos a un `concept_id`;
- comprobar una pieza de conocimiento recuperable;
- evitar depender de memorizar el texto exacto de otra card;
- ser breve;
- admitir una respuesta claramente evaluable;
- evitar pistas accidentales en el enunciado;
- no ser la única evidencia utilizada para declarar un concepto dominado.

Tipos iniciales recomendados:

- pregunta-respuesta directa;
- contraste entre conceptos próximos;
- completar plazo/cifra/regla;
- identificar excepción;
- mini supuesto de recuperación rápida cuando sea apropiado.

## Relación con preguntas

Las preguntas de test deben vincularse a los mismos conceptos del contenido.

Relación deseada:

`concepto ↔ unidad de estudio ↔ flashcards ↔ preguntas`

Una pregunta puede medir más de un concepto, pero debe declarar un único concepto `primary` como máximo y conceptos `secondary` cuando proceda.

Atribución inicial de evidencia:

- las respuestas históricas y ordinarias aportan evidencia fuerte al concepto `primary`;
- los `secondary` sirven para diagnóstico y comprobación dirigida;
- cuando V4 selecciona expresamente una pregunta para un concepto, `test_question_selection.selection_concept_id` identifica el conocimiento que se está comprobando.

Así una sola respuesta no multiplica artificialmente el dominio de varios conceptos.

## Evidencia y contenido

El contenido no debe modificar directamente el dominio del usuario.

- abrir una unidad no es evidencia de dominio;
- marcarla como leída/completada es exposición;
- responder cards aporta evidencia ligera;
- preguntas distintas aportan evidencia fuerte;
- respuestas correctas separadas en el tiempo aportan evidencia de retención.

El modelo vigente exige para `Consolidando`:

- al menos 4 preguntas distintas;
- al menos 3 respuestas correctas seguras;
- precisión segura mínima del 70 %;
- al menos 2 sesiones distintas.

Una respuesta correcta marcada como duda no es evidencia segura.

Para `Retenido` se requieren además controles diferidos correctos a +3 y +7 días, con al menos 2 preguntas y 2 sesiones distintas de retención.

## Cobertura mínima del banco

El contenido y el banco deben cumplir el mismo contrato.

> Un concepto canónico con menos de 4 preguntas primarias activas tiene `coverage_gap` y no debe considerarse preparado para demostrar dominio completo.

No se rebaja el umbral para maquillar el estado. El generador debe proponer preguntas adicionales offline cuando falte cobertura, y esas preguntas deben validarse antes de producción.

El auditor `auditV4ConceptCoverage` es la referencia de código para detectar:

- preguntas sin concepto primario;
- conceptos con menos de 4 preguntas primarias;
- asignaciones primarias duplicadas;
- cobertura real ignorando preguntas o conceptos inactivos.

## Generador futuro

El Generador de contenido de estudio deberá recibir una fuente validada y producir un paquete estructurado con:

1. unidades;
2. conceptos estables;
3. resumen de cada unidad;
4. claves de examen;
5. confusiones y trampas;
6. cards;
7. referencias exactas;
8. propuesta de asociación con preguntas existentes;
9. auditoría de cobertura conceptual;
10. propuestas de nuevas preguntas cuando exista `coverage_gap`.

La generación nunca se importará directamente a producción sin validación previa.

## Escala real del banco

Snapshot auditado el 19/08/2026:

- 4.308 preguntas activas en total;
- 4.123 de Auxiliar Administrativo SMS;
- 24 temas SMS con preguntas;
- 3.017 etiquetas distintas en el campo textual `concepto`.

El campo `questions.concepto` es una señal excelente para construir el mapa, pero no es el identificador canónico V4: en algunos temas casi cada pregunta tiene una etiqueta distinta.

El mapeo se propondrá automáticamente usando tema, subtema, apartado, concepto textual, objetivo de aprendizaje, tipo de trampa, fuente, pregunta y explicación; después se validará humanamente.

## Piloto V4

El contenido V4 se validará primero en 3 temas con banco de preguntas suficiente. No se generará la oposición completa antes de comprobar que el ciclo conceptual funciona.

Temas candidatos actuales: 13, 18 y 19.

Criterio de éxito del piloto:

- un fallo conduce al concepto correcto;
- el concepto conduce al bloque de estudio correcto;
- las cards ejercitan el mismo conocimiento;
- el retest mide ese conocimiento con preguntas distintas;
- el sistema puede volver a comprobarlo más adelante sin repetir mecánicamente la misma pregunta;
- cada concepto destinado a dominio completo supera la auditoría mínima de cobertura.

## Decisiones cerradas para la foundation V4

Quedan fijados antes de activar la experiencia:

- 4 preguntas distintas como mínimo de consolidación;
- 70 % de precisión segura y 3 aciertos seguros;
- 2 sesiones distintas;
- cards como evidencia ligera, nunca suficiente por sí sola;
- controles de retención a +3 y +7 días para llegar a `Retenido`;
- retroceso máximo de un estado ante inestabilidad reciente;
- `Necesita atención` basado en evidencia reciente, no en errores históricos eternos;
- una pregunta repetida no aumenta la cantidad de evidencia distinta;
- un concepto primario por pregunta como regla de atribución ordinaria;
- secundarios permitidos para diagnóstico y comprobación dirigida.
