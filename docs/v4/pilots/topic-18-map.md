# V4 piloto — Mapa conceptual del Tema 18

## Estado

Borrador de mapeo validado estructuralmente contra el banco real de producción. No está importado todavía como contenido V4.

## Escala real

Snapshot de producción auditado el 19/08/2026:

- 240 preguntas activas en el Tema 18;
- alcance: Ley 39/2015, artículos 13 a 52;
- el informe original del Tema 18 utilizó `Temario_new.pdf` como fuente principal para los artículos y referencias del banco;
- el banco actual ha crecido respecto del lote inicial auditado y el mapeo se realiza sobre las 240 preguntas existentes hoy.

## Resultado del preanálisis

Las 240 etiquetas textuales de `questions.concepto` no representan 240 conocimientos canónicos distintos. Una primera agrupación jurídica razonable permite condensarlas en **34 conceptos canónicos medibles** sin convertirlos en macrotemas vagos.

Con el umbral V4 de 4 preguntas primarias distintas:

- 32 conceptos ya superan el mínimo directamente;
- el bloque de suspensión obligatoria puede alcanzar 4 reasignando como primaria una pregunta comparativa que realmente comprueba ese régimen;
- solo `Derechos de las personas (art. 13)` queda con 3 preguntas y necesita 1 pregunta adicional validada;
- no se rebaja el umbral para ocultar ese hueco.

## Unidades de estudio propuestas

La numeración es de trabajo hasta cerrar el piloto completo. Los códigos definitivos no se reutilizarán para otro contenido una vez importados.

1. Derechos y relación electrónica — C01–C02
2. Lengua del procedimiento — C03
3. Registros — C04–C05
4. Archivo, colaboración y comparecencia — C06–C08
5. Responsabilidad de tramitación y obligación de resolver — C09–C10
6. Suspensión y ampliación del plazo máximo — C11–C13
7. Silencio en procedimientos iniciados a solicitud — C14–C15
8. Falta de resolución en procedimientos iniciados de oficio — C16
9. Documentos, copias y aportación — C17–C19
10. Cómputo general de plazos — C20–C22
11. Registro electrónico, ampliación y urgencia — C23–C24
12. Producción, forma y motivación del acto — C25–C26
13. Eficacia y retroactividad — C27–C28
14. Notificaciones y publicación — C29–C32
15. Nulidad, anulabilidad y saneamiento — C33–C34

La división 7/8 es deliberada: solicitud del interesado y procedimiento iniciado de oficio tienen efectos jurídicos distintos y conviene estudiarlos por separado antes de contrastarlos.

## Conceptos y cobertura propuesta

| Código | Concepto | Preguntas aprox. | Cobertura |
|---|---|---:|---|
| C01 | Derechos de las personas | 3 | gap: +1 |
| C02 | Relación electrónica | 10 | ready |
| C03 | Lengua del procedimiento | 6 | ready |
| C04 | Registro: estructura, asientos y recibos | 9 | ready |
| C05 | Registro: presentación, digitalización e interoperabilidad | 8 | ready |
| C06 | Archivo electrónico | 6 | ready |
| C07 | Colaboración | 6 | ready |
| C08 | Comparecencia | 4 | ready |
| C09 | Responsabilidad de tramitación | 5 | ready |
| C10 | Obligación, plazo y medios para resolver | 13 | ready |
| C11 | Suspensión potestativa y regímenes comparados | 9+ | ready |
| C12 | Suspensión obligatoria | 4 tras resolver la pregunta comparativa | ready propuesto |
| C13 | Ampliación excepcional del plazo máximo | 4 | ready |
| C14 | Silencio a solicitud: regla y excepciones | 8 | ready |
| C15 | Silencio: efectos, resolución posterior y acreditación | 6 | ready |
| C16 | Procedimientos de oficio sin resolución | 5 | ready |
| C17 | Documentos administrativos electrónicos | 6 | ready |
| C18 | Copias auténticas | 8 | ready |
| C19 | Aportación y consulta de documentos | 8 | ready |
| C20 | Plazos: reglas generales y horas | 4 | ready |
| C21 | Plazos por días | 4 | ready |
| C22 | Meses, años, inhábiles y calendarios | 9 | ready |
| C23 | Registro electrónico y cómputo | 8 | ready |
| C24 | Ampliación de trámites y urgencia | 11 | ready |
| C25 | Producción, contenido y forma del acto | 7 | ready |
| C26 | Motivación | 7 | ready |
| C27 | Inderogabilidad y ejecutividad | 5 | ready |
| C28 | Eficacia y retroactividad | 8 | ready |
| C29 | Contenido y validez de la notificación | 6 | ready |
| C30 | Medios y elección de notificación | 11 | ready |
| C31 | Notificación en papel y electrónica | 6 | ready |
| C32 | Notificación infructuosa y publicación | 8 | ready |
| C33 | Nulidad y anulabilidad | 10 | ready |
| C34 | Conservación, conversión y convalidación | 8 | ready |

Los recuentos son una propuesta de mapeo, no datos persistidos todavía. La asociación pregunta por pregunta debe pasar por el validador V4 antes de importarse.

## Primer vertical slice

Se eligen C14, C15 y C16 por cuatro razones:

1. todos tienen cobertura suficiente (8, 6 y 5 preguntas primarias respectivamente);
2. permiten probar reglas, excepciones, efectos, plazos y contrastes;
3. el usuario puede confundir fácilmente solicitud vs. oficio, por lo que el valor de una guía contextual es alto;
4. permiten probar el ciclo completo sin depender de crear preguntas nuevas.

### Unidad 7 — Silencio en procedimientos iniciados a solicitud

Conceptos:

- `SMS-T18-C14`: regla general y excepciones del silencio a solicitud;
- `SMS-T18-C15`: efectos del silencio, resolución posterior y acreditación.

Preguntas candidatas primarias C14:

- SMS-T18-0024
- SMS-T18-0082
- SMS-T18-0083
- SMS-T18-0138
- SMS-T18-0139
- SMS-T18-0140
- SMS-T18-0188
- SMS-T18-0230

Preguntas candidatas primarias C15:

- SMS-T18-0025
- SMS-T18-0026
- SMS-T18-0084
- SMS-T18-0141
- SMS-T18-0212
- SMS-T18-0231

### Unidad 8 — Falta de resolución en procedimientos iniciados de oficio

Concepto:

- `SMS-T18-C16`: efectos de la falta de resolución en procedimientos iniciados de oficio.

Preguntas candidatas primarias C16:

- SMS-T18-0027
- SMS-T18-0085
- SMS-T18-0142
- SMS-T18-0189
- SMS-T18-0232

## Fuente y contraste

Para el vertical slice se utilizará:

- fuente interna: `Temario_new.pdf`, páginas 125–127 según las referencias ya almacenadas en las preguntas;
- contraste normativo: Ley 39/2015 consolidada del BOE, artículos 24 y 25.

No se importará el paquete si el contenido del resumen o las cards contradice la fuente normativa vigente o las referencias validadas del banco.

## Criterio de éxito del slice

Debe poder demostrarse, sin UI todavía:

`pregunta fallada → C14/C15/C16 → unidad correcta → resumen/cards → pregunta distinta → estado conceptual → revisión diferida`

Si este slice pasa el contrato, el siguiente paso será completar y validar el resto del mapa del Tema 18 antes de escalar a los temas 13 y 19.