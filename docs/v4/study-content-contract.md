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

Una pregunta puede medir más de un concepto cuando sea necesario, pero debe distinguirse el concepto principal de los secundarios si el algoritmo necesita atribuir evidencia.

## Evidencia y contenido

El contenido no debe modificar directamente el dominio del usuario.

- abrir una unidad no es evidencia;
- marcarla como leída es exposición;
- responder cards aporta evidencia ligera;
- preguntas distintas aportan evidencia mayor;
- respuestas correctas separadas en el tiempo aportan retención.

## Generador futuro

El Generador de contenido de estudio deberá recibir una fuente validada y producir un paquete estructurado con:

1. unidades;
2. conceptos estables;
3. resumen de cada unidad;
4. claves de examen;
5. confusiones y trampas;
6. cards;
7. referencias exactas;
8. propuesta de asociación con preguntas existentes.

La generación nunca se importará directamente a producción sin validación previa.

## Piloto V4

El contenido V4 se validará primero en 3 temas con banco de preguntas suficiente. No se generará la oposición completa antes de comprobar que el ciclo conceptual funciona.

Criterio de éxito del piloto:

- un fallo conduce al concepto correcto;
- el concepto conduce al bloque de estudio correcto;
- las cards ejercitan el mismo conocimiento;
- el retest mide ese conocimiento con preguntas distintas;
- el sistema puede volver a comprobarlo más adelante sin repetir mecánicamente la misma pregunta.

## Decisiones pendientes antes de migraciones V4

No crear todavía tablas de producción para estados conceptuales hasta cerrar:

- umbrales para `En comprobación`, `Consolidando` y `Retenido`;
- peso exacto de cards frente a preguntas;
- número mínimo de preguntas distintas;
- ventanas temporales de retención;
- política de retroceso tras nuevos fallos;
- atribución cuando una pregunta mide varios conceptos.
