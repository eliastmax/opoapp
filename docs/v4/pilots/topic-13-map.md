# V4 — Mapa conceptual del Tema 13

Estado: mapa técnico validado contra el banco activo. No sustituye el banco V2 ni cambia UI.

Fecha de auditoría: 2026-08-19

## Fuentes de verdad usadas

- Supabase producción `kimswvynzehmilqydcgz`: preguntas activas reales de Auxiliar Administrativo SMS.
- `Temario_new.pdf`: estructura del tema y páginas/referencias empleadas por el banco.
- BOE consolidado de la Ley 55/2003 (`BOE-A-2003-23101`), última actualización publicada 2023-03-01.
- Contrato V4 vigente: una relación `primary` por pregunta; secundarias solo cuando aporten significado real.
- Umbral V4 vigente: cobertura suficiente con al menos 4 preguntas primarias activas distintas.

## Foto real del banco antes de mapear

- 99 preguntas activas y 99 totales: `SMS-T13-0001` a `SMS-T13-0099`.
- 98 valores textuales distintos en `questions.concepto`.
- 6 apartados.
- 35 subapartados.
- 99 objetivos de aprendizaje distintos.
- 92 referencias de fuente textuales distintas.
- 0 unidades V4, 0 conceptos V4, 0 asociaciones V4 y 0 flashcards V4 antes de este sprint.

La casi equivalencia `98 etiquetas concepto / 99 preguntas` confirma que el metadato V2 es útil como señal editorial, pero no puede convertirse directamente en el concepto canónico V4. El mapa siguiente agrupa preguntas que comprueban la misma idea jurídica razonable sin ensanchar conceptos para alcanzar artificialmente el umbral de cuatro.

## Mapa propuesto

```text
Tema 13 — Ley 55/2003. Estatuto Marco
├ U01 Derechos del personal
│  └ C01 Derechos individuales y colectivos
├ U02 Deberes del personal
│  └ C02 Deberes estatutarios
├ U03 Adquisición de la condición fija
│  └ C03 Requisitos sucesivos y efectos de la falta de acreditación/incorporación
├ U04 Pérdida: causas, renuncia, nacionalidad e inhabilitación
│  ├ C04 Causas de pérdida y renuncia
│  └ C05 Nacionalidad, separación e inhabilitación
├ U05 Jubilación, incapacidad y recuperación
│  ├ C06 Jubilación e incapacidad permanente
│  └ C07 Recuperación de la condición fija
├ U06 Provisión y convocatorias
│  ├ C08 Principios y sistemas de provisión
│  └ C09 Convocatorias: periodicidad, bases y contenido
├ U07 Requisitos de participación y discapacidad
│  └ C10 Requisitos de participación y reserva por discapacidad
├ U08 Sistemas, órganos y nombramientos de personal fijo
│  ├ C11 Sistemas de selección y aspirantes en prácticas
│  └ C12 Órganos de selección y nombramientos
├ U09 Selección de personal temporal
│  └ C13 Selección, nombramiento y período de prueba temporal
├ U10 Promoción interna
│  ├ C14 Promoción interna: acceso, requisitos y preferencia
│  └ C15 Promoción interna temporal
├ U11 Movilidad y comisiones de servicio
│  ├ C16 Movilidad por razón del servicio y movilidad voluntaria
│  └ C17 Coordinación de convocatorias y comisiones de servicio
├ U12 Carrera profesional
│  └ C18 Carrera profesional y homologación
├ U13 Régimen retributivo: estructura y básicas
│  ├ C19 Estructura, criterios y reglas generales de retribución
│  └ C20 Retribuciones básicas y pagas extraordinarias
├ U14 Retribuciones complementarias y situaciones especiales
│  ├ C21 Complementos retributivos
│  └ C22 Retribuciones de temporales y aspirantes en prácticas
├ U15 Responsabilidad y potestad disciplinaria
│  └ C23 Responsabilidad, competencia y principios disciplinarios
├ U16 Faltas y prescripción
│  ├ C24 Clases y fronteras entre faltas
│  └ C25 Prescripción de faltas
├ U17 Sanciones
│  ├ C26 Clases de sanciones y efectos
│  └ C27 Prescripción y cancelación de sanciones
└ U18 Procedimiento y medidas provisionales
   ├ C28 Procedimiento y garantías
   └ C29 Suspensión provisional y efectos
```

Las 18 unidades quedan entre 4 y 9 minutos estimados. El régimen disciplinario ocupa U15-U18, pero no se fuerza al resto del Tema 13 dentro de ese bloque: el banco real también cubre derechos/deberes, adquisición y pérdida, selección/promoción, movilidad/carrera y retribuciones.

## Auditoría concepto por concepto

| Código | Unidad | Concepto canónico | Preguntas primarias | N | Cobertura | Falta | Fuente principal | Solapamiento / observación |
|---|---|---|---|---:|---|---:|---|---|
| SMS-T13-C01 | U01 | Derechos individuales y colectivos | 0001-0004 | 4 | suficiente | 0 | arts. 17-18 | Agrupa catálogo de derechos; no mezcla deberes. |
| SMS-T13-C02 | U02 | Deberes estatutarios | 0005-0010 | 6 | suficiente | 0 | art. 19 | Un único catálogo con trampas de sujeto/conducta. |
| SMS-T13-C03 | U03 | Adquisición: requisitos sucesivos y efectos | 0011-0013 | 3 | insuficiente | 1 | art. 20 | No se fusiona con pérdida solo para llegar a cuatro. |
| SMS-T13-C04 | U04 | Causas de pérdida y renuncia | 0014-0017 | 4 | suficiente | 0 | arts. 21-22 | Renuncia es causa de pérdida con reglas propias; unión natural. |
| SMS-T13-C05 | U04 | Nacionalidad, separación e inhabilitación | 0018-0020 | 3 | insuficiente | 1 | arts. 23-25 | Tres causas próximas con efectos extintivos distintos. |
| SMS-T13-C06 | U05 | Jubilación e incapacidad permanente | 0021-0023 | 3 | insuficiente | 1 | arts. 26-27 | Ambas extinguen la condición; no incluye recuperación. |
| SMS-T13-C07 | U05 | Recuperación de la condición fija | 0024-0026 | 3 | insuficiente | 1 | art. 28 | Concepto autónomo por requisitos y efectos de reingreso. |
| SMS-T13-C08 | U06 | Principios y sistemas de provisión | 0027-0028 | 2 | insuficiente | 2 | art. 29 | No se mezcla con reglas formales de convocatoria. |
| SMS-T13-C09 | U06 | Convocatorias: periodicidad, bases y contenido | 0029-0031 | 3 | insuficiente | 1 | art. 30.1-4 | Cohesión formal de la convocatoria. |
| SMS-T13-C10 | U07 | Requisitos de participación y discapacidad | 0032-0035 | 4 | suficiente | 0 | art. 30.5-6 | Reserva de discapacidad se mantiene ligada al acceso. |
| SMS-T13-C11 | U08 | Sistemas de selección y aspirantes en prácticas | 0036-0039 | 4 | suficiente | 0 | art. 31.1-7 | Oposición/concurso/concurso-oposición y fase práctica. |
| SMS-T13-C12 | U08 | Órganos de selección y nombramientos | 0040-0041 | 2 | insuficiente | 2 | arts. 31.8 y 32 | Dos pasos institucionales consecutivos; cobertura escasa. |
| SMS-T13-C13 | U09 | Selección, nombramiento y prueba temporal | 0042-0045 | 4 | suficiente | 0 | art. 33 | Mantiene junta la lógica específica del temporal. |
| SMS-T13-C14 | U10 | Promoción interna: acceso, requisitos y preferencia | 0046-0049 | 4 | suficiente | 0 | art. 34 | Concepto estable y suficientemente contrastado. |
| SMS-T13-C15 | U10 | Promoción interna temporal | 0050-0052 | 3 | insuficiente | 1 | art. 35 | No se fusiona con promoción definitiva. |
| SMS-T13-C16 | U11 | Movilidad por razón del servicio y voluntaria | 0053-0058 | 6 | suficiente | 0 | arts. 36-37 | El contraste entre movilidad impuesta/voluntaria es examinable. |
| SMS-T13-C17 | U11 | Coordinación y comisiones de servicio | 0059-0061 | 3 | insuficiente | 1 | arts. 38-39 | Reglas auxiliares de movilidad/provisión; revisar al escalar. |
| SMS-T13-C18 | U12 | Carrera profesional y homologación | 0062-0063 | 2 | insuficiente | 2 | art. 40 | No se amplía a retribuciones para forzar cobertura. |
| SMS-T13-C19 | U13 | Estructura, criterios y reglas generales de retribución | 0064-0067 | 4 | suficiente | 0 | art. 41 | Base conceptual del sistema retributivo. |
| SMS-T13-C20 | U13 | Retribuciones básicas y pagas extraordinarias | 0068-0070 | 3 | insuficiente | 1 | art. 42 | Sueldo/trienios/pagas forman un catálogo propio. |
| SMS-T13-C21 | U14 | Complementos retributivos | 0071-0073 | 3 | insuficiente | 1 | art. 43 | Mantiene juntos destino, específico, productividad, continuada y carrera. |
| SMS-T13-C22 | U14 | Retribuciones de temporales y aspirantes en prácticas | 0074-0075 | 2 | insuficiente | 2 | arts. 44-45 | Dos reglas especiales muy próximas; no se mezclan con básicas. |
| SMS-T13-C23 | U15 | Responsabilidad, competencia y principios disciplinarios | 0076-0080 | 5 | suficiente | 0 | arts. 70-71 | Potestad disciplinaria y garantías previas a tipificación. |
| SMS-T13-C24 | U16 | Clases y fronteras entre faltas | 0081-0086 | 6 | suficiente | 0 | art. 72.1-4 | Las preguntas comparan umbrales muy grave/grave/leve. |
| SMS-T13-C25 | U16 | Prescripción de faltas | 0087-0088 | 2 | insuficiente | 2 | art. 72.6 | Se mantiene separada de prescripción de sanciones. |
| SMS-T13-C26 | U17 | Clases de sanciones y efectos | 0089-0093 | 5 | suficiente | 0 | art. 73.1-3 | Sanción, gravedad y efectos forman el núcleo. |
| SMS-T13-C27 | U17 | Prescripción y cancelación de sanciones | 0094-0095 | 2 | insuficiente | 2 | arts. 71.8 y 73.4-6 | Prescripción y cancelación comparten fase posterior a la sanción, pero no se mezclan con faltas. |
| SMS-T13-C28 | U18 | Procedimiento y garantías | 0096-0097 | 2 | insuficiente | 2 | art. 74 | Cobertura escasa; concepto jurídicamente claro. |
| SMS-T13-C29 | U18 | Suspensión provisional y efectos | 0098-0099 | 2 | insuficiente | 2 | art. 75 | Medida cautelar autónoma; no se ensancha con el procedimiento general. |

## Cobertura resultante

- Conceptos canónicos: **29**.
- Preguntas activas mapeadas: **99/99**.
- Preguntas sin asignación clara: **0**.
- Preguntas con más de un `primary`: **0**.
- Media: **3,41 preguntas/concepto**.
- Mediana: **3**.
- Cobertura suficiente (`>=4`): **12/29 = 41,4 %**.
- Cobertura insuficiente (`1-3`): **17/29 = 58,6 %**.
- Sin cobertura: **0/29**.
- Preguntas adicionales mínimas para llevar todos los conceptos a cuatro, sin cambiar la granularidad: **25**.

Huecos exactos:

- +1: C03, C05, C06, C07, C09, C15, C17, C20, C21.
- +2: C08, C12, C18, C22, C25, C27, C28, C29.

No se proponen todavía preguntas nuevas en este paquete: el hueco se conserva explícito para una fase de generación y validación dirigida.

## Decisiones de mapeo

1. Las 99 preguntas tienen un único concepto primario propuesto. No se usa relación secundaria por defecto: que una pregunta contraste dos subtipos dentro de la misma regla no significa que mida dos conceptos canónicos.
2. El dato textual `questions.concepto` se conserva intacto. V4 añade una capa canónica; no reescribe el banco V2.
3. C25 y C27 permanecen separados aunque una fusión aumentaría cobertura: prescripción de la falta y prescripción/cancelación de la sanción tienen dies a quo e interrupciones diferentes y conviene poder diagnosticar la confusión.
4. C28 y C29 permanecen separados: procedimiento disciplinario y suspensión provisional son próximos, pero el usuario puede dominar las garantías y fallar límites/efectos de la cautelar.

## Validación de fuentes

`Temario_new.pdf` incluye la redacción actualizada del artículo 17.1.k tras la modificación de 2023 y la estructura vigente del Estatuto Marco. El banco del Tema 13 referencia los artículos 17 a 75 y páginas 241-275 del temario. El contraste editorial se hace contra el BOE consolidado, no desde memoria del modelo.

No se ha detectado en el material revisado una discrepancia sustantiva que obligue a invalidar una de las 99 preguntas. Si aparece una discrepancia en una revisión posterior, debe registrarse y resolverse de forma explícita; nunca corregirse silenciosamente dentro del contenido V4.

## Qué puede automatizarse al escalar

Automatizable con alta confianza:

- extracción por tema de `codigo`, `apartado`, `subapartado`, `concepto`, `objetivo_aprendizaje`, páginas y referencia;
- propuesta inicial de clusters a partir de metadatos y similitud semántica;
- recuento de primarias, media/mediana y `coverage_gap`;
- generación de códigos estables secuenciales;
- comprobación de que cada pregunta incluida tiene exactamente un `primary`;
- validación TypeScript del paquete;
- comprobación de referencias y preguntas reales antes de importar;
- importación atómica con `import_v4_study_content`;
- verificación post-import de counts.

Debe seguir teniendo revisión humana/editorial:

- frontera final entre conceptos canónicos;
- decisión de cuándo una relación secundaria es real;
- contenido jurídico y literalidad relevante;
- `No lo confundas con` y trampas;
- mnemotecnias;
- cualquier pregunta nueva para cerrar cobertura;
- discrepancias entre temario y norma vigente.

## Hipótesis que este piloto ya permite medir

El Tema 13 confirma que el banco existente es reutilizable como materia prima V4: no hace falta rehacer sus 99 preguntas. Sin embargo, también muestra que un banco diseñado para amplitud de test no garantiza por sí solo cuatro evidencias distintas en cada concepto canónico. El escalado debe combinar **reutilización + clustering editorial + generación dirigida de huecos**, no regeneración masiva.
