# T13-CONTENT.2.1 — Auditoría final de preguntas dirigidas

Estado: lote candidato revisado editorialmente y preparado con contrato V2 completo. **No dado de alta en `questions`, no incluido todavía en `questionMappings`, no importado y no fusionado.**

El lote autoritativo se obtiene en `topic-13-coverage-gap-questions-reviewed.ts`. La salida inicial se conserva en `topic-13-coverage-gap-questions.ts` para trazabilidad. `topic-13-v2-question-candidates.ts` proyecta las 45 candidatas al contrato V2 real de 25 columnas sin crear una vía paralela de preguntas V4.

## Cobertura objetivo

- Preguntas originales: 99.
- Conceptos definitivos: 34.
- Conceptos con >=4 preguntas originales: 12.
- Conceptos con gap antes del lote: 22.
- Preguntas nuevas exactas necesarias: 45.
- Cobertura actual tras T13-CONTENT.3: 34/34 conceptos con al menos 4 preguntas primarias reales en producción.

## Posición de respuestas

La aplicación actual no baraja las opciones al renderizar un test: consume `opcion_a`, `opcion_b`, `opcion_c`, `opcion_d` en ese orden. Por tanto, el reparto inicial A:7 / B:33 / C:4 / D:1 constituía una pista real.

El lote final reordena únicamente la posición de las mismas opciones después de la revisión jurídica, sin cambiar su contenido, y queda:

- A: 11
- B: 11
- C: 11
- D: 12

`question-batch-quality.ts` incorpora un guard reutilizable contra desequilibrios extremos. El test específico exige además el reparto exacto anterior y comprueba que el antiguo 7/33/4/1 sea rechazado por el guard.

## Preguntas nuevas y dimensión adicional

| Código | Concepto | Dimensión añadida | Fuente |
|---|---|---|---|
| SMS-T13-0100 | C03 Adquisición | Mini caso: causa justificada/no imputable evita el decaimiento automático | art. 20.3 |
| SMS-T13-0101 | C05 Nacionalidad | Alcance: nacionalidad tomada en consideración para el nombramiento | art. 23 |
| SMS-T13-0102 | C05 Nacionalidad | Temporalidad de la excepción: adquisición simultánea vs posterior | arts. 23 y 28.1 |
| SMS-T13-0103 | C05 Nacionalidad | Mini caso: pérdida de nacionalidad adicional no utilizada para acceder | art. 23 |
| SMS-T13-0104 | C30 Separación | Efecto extintivo de la separación firme | arts. 21.c, 24 y 73.1.a |
| SMS-T13-0105 | C30 Separación | Gravedad habilitante: solo falta muy grave | art. 73.1.a |
| SMS-T13-0106 | C30 Separación | Alcance completo de la exclusión de seis años tras la separación | art. 73.1.a |
| SMS-T13-0107 | C31 Inhabilitación | Inhabilitación absoluta firme | art. 25 |
| SMS-T13-0108 | C31 Inhabilitación | Inhabilitación especial para empleo/cargo que afecta al nombramiento | art. 25 |
| SMS-T13-0109 | C31 Inhabilitación | Límite literal: exactamente seis años no excede de seis | art. 25 |
| SMS-T13-0110 | C06 Jubilación | Capacidad funcional + autorización organizativa para prolongación | art. 26.2 |
| SMS-T13-0111 | C06 Jubilación | Fin de la prórroga por cotización: solo hasta completar lo necesario | art. 26.3 |
| SMS-T13-0112 | C32 Incapacidad | Mini caso: incapacidad permanente parcial frente a grados extintivos | art. 27 |
| SMS-T13-0113 | C32 Incapacidad | Alcance total para profesión habitual vs absoluta para todo trabajo | art. 27 |
| SMS-T13-0114 | C32 Incapacidad | Declaración conforme al RGSS + grados concretos + efecto extintivo | art. 27 |
| SMS-T13-0115 | C07 Recuperación | Revisión de incapacidad después de dos años | art. 28.2-3 |
| SMS-T13-0116 | C08 Provisión | Literalidad: planificación eficiente y programación periódica | art. 29.1.b |
| SMS-T13-0117 | C08 Provisión | Competencia para determinar puestos de libre designación | art. 29.3 |
| SMS-T13-0118 | C09 Convocatorias | Adecuación de pruebas a funciones y lengua oficial cuando proceda | art. 30.2 |
| SMS-T13-0119 | C12 Órganos/nombramientos | Requisitos profesionales y de titulación de miembros del órgano | art. 31.8 |
| SMS-T13-0120 | C12 Órganos/nombramientos | Publicación y ámbito expreso del nombramiento | art. 32.2-3 |
| SMS-T13-0121 | C15 Promoción temporal | Mini caso: negociación obligatoria del procedimiento | art. 35.1 |
| SMS-T13-0122 | C17 Coordinación | Ámbito: convocatoria que afecta a más de un servicio | art. 38 |
| SMS-T13-0123 | C17 Coordinación | Contraste literal entre colaboración y principios próximos | art. 38 |
| SMS-T13-0124 | C17 Coordinación | Objeto de la competencia: periodicidad y coordinación | art. 38 |
| SMS-T13-0125 | C33 Comisiones | Requisitos acumulativos de comisión sobre plaza | art. 39.1 |
| SMS-T13-0126 | C33 Comisiones | Contraste integrado de retribución y reserva en las dos modalidades | art. 39.1-3 |
| SMS-T13-0127 | C18 Carrera | Implantación autonómica previa negociación | art. 40.1 |
| SMS-T13-0128 | C18 Carrera | Adaptación a condiciones del servicio/centro y negociación | art. 40.4 |
| SMS-T13-0129 | C20 Básicas | Sueldo vinculado al título exigido para la categoría | art. 42.1.a |
| SMS-T13-0130 | C21 Complementarias | Naturaleza fija/variable y finalidad general | art. 43.1 |
| SMS-T13-0131 | C22 Temporal/prácticas | Contraste próximo entre los dos regímenes retributivos | arts. 44-45 |
| SMS-T13-0132 | C22 Temporal/prácticas | Competencia del servicio + suelo mínimo de prácticas | art. 45 |
| SMS-T13-0133 | C25 Prescripción faltas | Dies a quo: comisión de la falta | art. 72.6 |
| SMS-T13-0134 | C25 Prescripción faltas | Acto interruptivo: notificación del acuerdo de iniciación | art. 72.6 |
| SMS-T13-0135 | C27 Prescripción sanciones | Plazos 4 años / 2 años / 6 meses | art. 73.4 |
| SMS-T13-0136 | C27 Prescripción sanciones | Interrupción por inicio de ejecución con conocimiento | art. 73.4 |
| SMS-T13-0137 | C27 Prescripción sanciones | Límite literal: paralización superior a seis meses | art. 73.4 |
| SMS-T13-0138 | C34 Cancelación | Mini caso: cancelación de oficio tras el plazo desde cumplimiento | art. 73.5 |
| SMS-T13-0139 | C34 Cancelación | Plazos desde cumplimiento: 6m / 2a / 4a | art. 73.5 |
| SMS-T13-0140 | C34 Cancelación | Qué se anota: sanciones disciplinarias firmes | art. 73.5 |
| SMS-T13-0141 | C28 Procedimiento | Principios: celeridad, inmediatez y economía procesal | art. 74.2 |
| SMS-T13-0142 | C28 Procedimiento | Alcance conjunto de alegaciones en cualquier fase + propuesta de prueba | art. 74.2.d-e |
| SMS-T13-0143 | C29 Suspensión provisional | Duración del supuesto judicial: hasta resolución | art. 75.3 |
| SMS-T13-0144 | C29 Suspensión provisional | Medida judicial >5 días: suspensión sin retribuciones | art. 75.4 |

## Auditoría adversarial de distractores

Se revisaron las 45 con el criterio: **¿puede un opositor acertar por descarte sin dominar el concepto?** Se conservaron las que ya exigían una distinción material y se reescribieron las siguientes por distractores débiles, exceso de evidencia o para elevarlas a mini caso/contraste próximo:

- `0100`: cuatro efectos próximos sobre incorporación tardía; se elimina la salida absurda de convertir el nombramiento en temporal.
- `0103`: pasa a mini caso y obliga a identificar qué nacionalidad era jurídicamente relevante.
- `0106`: se corrige y amplía al alcance completo de la exclusión de seis años del artículo 73.1.a.
- `0112`: sustituye el descarte obvio de incapacidad temporal por un mini caso de incapacidad permanente parcial.
- `0114`: contrasta los grados concretos declarados conforme al RGSS frente a generalizaciones próximas.
- `0116`: todos los distractores giran sobre planificación/programación, no sobre instituciones ajenas.
- `0117`: los cuatro distractores son variantes competenciales plausibles sobre libre designación.
- `0121`: pasa a mini caso de aprobación unilateral sin negociación.
- `0123`: enfrenta colaboración con coordinación, cooperación e igualdad efectiva, conceptos normativos próximos.
- `0124`: enfrenta competencias próximas de la Comisión/servicios en movilidad, negociación y órganos de selección.
- `0125`: todos los distractores modifican un requisito de la comisión sobre plaza.
- `0126`: las cuatro opciones combinan retribución y reserva en las dos modalidades.
- `0131`: las cuatro opciones comparan directamente temporal y aspirante en prácticas.
- `0132`: las cuatro opciones combinan órgano competente y suelo retributivo.
- `0138`: pasa a mini caso y diferencia oficio/instancia, dies a quo y plazo.
- `0142`: concentra los distractores en alcance temporal de alegaciones y prueba.

La revisión especial solicitada por Gobernanza (`0103`, `0112`, `0116`, `0117`, `0121`, `0123`, `0138`) queda incluida en esta lista.

## Corrección específica de 0106

El BOE consolidado vigente del artículo 73.1.a dispone que la separación comporta pérdida de la condición y, durante los seis años siguientes a su ejecución, impide:

1. concurrir a pruebas para obtener la condición de personal estatutario fijo;
2. prestar servicios como personal estatutario temporal;
3. prestar servicios en ninguna Administración pública ni en los organismos públicos, entidades de derecho público dependientes o vinculadas, entidades públicas sujetas a derecho privado y fundaciones sanitarias que enumera el precepto.

`0106` pregunta ahora por ese **alcance completo**, no por una versión recortada de la prohibición.

## Contrato V2 y materialización futura

El banco real sigue el contrato CSV V2 de 25 columnas definido en `csv-parser.ts`; la pantalla de importación convierte esas filas al payload de `import_questions_batch(jsonb)`. El RPC crea preguntas normales de `public.questions` y resuelve `subject_id`, `topic_id` y `subtopic_id`; V4 no crea una tabla o vía de preguntas reducida.

Las 45 candidatas disponen ya de:

`codigo`, `materia`, `numero_tema`, `tema`, `apartado`, `subapartado`, `concepto`, `objetivo_aprendizaje`, `perspectiva`, `nivel_pedagogico`, `dificultad_conceptual`, `dificultad_examen`, `tipo_trampa`, `pregunta`, `opcion_a`, `opcion_b`, `opcion_c`, `opcion_d`, `respuesta_correcta`, `explicacion`, `documento_referencia`, `pagina_inicio`, `pagina_fin`, `referencia_fuente`, `frecuencia_historica`.

Para mantener continuidad con las 99 preguntas originales del Tema 13:

- `materia`: `Estatuto Marco del personal estatutario`;
- `numero_tema`: `13`;
- `tema`: mismo título completo ya usado en producción;
- `documento_referencia`: `Temario_new.pdf`;
- `frecuencia_historica`: `no_determinada`.

No queda ningún metadato V2 pendiente para poder formar el futuro payload. Esto **no constituye autorización de alta**.

## Validación automática

Las pruebas del PR exigen para el lote final:

- 45 códigos únicos, consecutivos `0100-0144`;
- 45 enunciados únicos;
- cuatro opciones distintas por pregunta;
- distribución A/B/C/D exacta `11/11/11/12`;
- ausencia de desequilibrio extremo según el guard reutilizable;
- dimensión, explicación y referencia no vacías;
- referencia expresa a Ley 55/2003;
- `Temario_new.pdf` y páginas dentro de 245-275;
- correspondencia exacta entre gaps y conceptos candidatos;
- `originales + candidatas = 4` para cada uno de los 22 conceptos con cobertura insuficiente;
- 25 metadatos V2 presentes y no vacíos en cada candidata;
- serialización de las 45 a CSV V2 y validación con el parser real: 45 filas válidas, 0 errores.

La validación no sustituye la aprobación editorial de Gobernanza ni da de alta las preguntas en producción.
