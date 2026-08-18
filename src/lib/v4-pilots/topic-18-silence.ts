import type { V4StudyContentPackage } from "../v4-content-package";

const article24Sources = [
  {
    label: "BOE — Ley 39/2015 consolidada",
    reference: "BOE-A-2015-10565, art. 24",
  },
  {
    label: "Temario principal",
    reference: "Temario_new.pdf, pp. 125-126",
    pageStart: 125,
    pageEnd: 126,
  },
];

const article25Sources = [
  {
    label: "BOE — Ley 39/2015 consolidada",
    reference: "BOE-A-2015-10565, art. 25",
  },
  {
    label: "Temario principal",
    reference: "Temario_new.pdf, pp. 126-127",
    pageStart: 126,
    pageEnd: 127,
  },
];

export const topic18SilencePilotPackage = {
  version: "4.0",
  oppositionCode: "auxiliar-administrativo-sms",
  topicNumber: 18,
  sourceRevision: "BOE consolidado: última actualización indicada 2024-11-06; contraste realizado 2026-08-19",
  units: [
    {
      code: "SMS-T18-U07",
      title: "Silencio administrativo a solicitud del interesado",
      position: 7,
      estimatedMinutes: 9,
      studySummary:
        "En los procedimientos iniciados a solicitud del interesado, la regla general es que el vencimiento del plazo máximo sin resolución expresa notificada permite entender estimada la solicitud, sin que desaparezca la obligación de la Administración de resolver. Existen excepciones de silencio desestimatorio previstas por norma con rango de ley o por Derecho de la Unión Europea o internacional aplicable, además de materias expresamente enumeradas por el artículo 24.1. La estimación por silencio tiene la consideración de acto que finaliza el procedimiento; la desestimación presunta sirve para abrir la vía de recurso. Si el silencio fue estimatorio, la resolución expresa posterior solo puede confirmarlo; si fue desestimatorio, la Administración puede resolver después sin quedar vinculada por ese sentido. El acto presunto produce efectos desde el vencimiento del plazo y puede acreditarse por cualquier medio de prueba admitido en Derecho, incluido el certificado de silencio.",
      examKeys: [
        "Regla general: silencio estimatorio en procedimientos iniciados a solicitud, salvo excepción.",
        "Son supuestos expresamente desestimatorios, entre otros, derecho de petición, transferencia de facultades sobre dominio o servicio público, actividades que puedan dañar el medio ambiente y responsabilidad patrimonial.",
        "También es desestimatorio en impugnación de actos/disposiciones y revisión de oficio iniciada a solicitud, con la regla especial del doble silencio en alzada y sus excepciones.",
        "Silencio estimatorio: acto administrativo finalizador. Silencio desestimatorio: habilita la vía de recurso.",
        "Resolución posterior: confirmatoria si hubo estimación; sin vinculación al sentido del silencio si hubo desestimación.",
        "El certificado se expide de oficio por el órgano competente para resolver en 15 días desde la expiración del plazo máximo; el interesado puede pedirlo en cualquier momento.",
      ],
      confusions: [
        "No confundir silencio desestimatorio con una resolución expresa desestimatoria sobre el fondo.",
        "No confundir el certificado de silencio con un requisito constitutivo del acto presunto.",
        "No aplicar automáticamente la regla favorable del doble silencio cuando la solicitud originaria pertenece a las materias exceptuadas por el propio artículo 24.1.",
      ],
      traps: [
        "Invertir la regla general y las excepciones del silencio a solicitud.",
        "Afirmar que la resolución posterior queda vinculada también tras un silencio desestimatorio.",
        "Situar los efectos del silencio en la fecha de expedición del certificado en vez de en el vencimiento del plazo máximo.",
        "Olvidar las razones imperiosas de interés general exigidas para que una ley imponga silencio negativo en acceso o ejercicio de actividades.",
      ],
      mnemonics: [],
      sourceRefs: article24Sources,
      sourceSubtopicName: "Silencio administrativo",
    },
    {
      code: "SMS-T18-U08",
      title: "Falta de resolución en procedimientos iniciados de oficio",
      position: 8,
      estimatedMinutes: 5,
      studySummary:
        "En los procedimientos iniciados de oficio, el vencimiento del plazo máximo sin resolución expresa dictada y notificada no elimina la obligación de resolver. Si del procedimiento pudiera derivarse el reconocimiento o constitución de derechos u otras situaciones favorables, los interesados que hayan comparecido pueden entender desestimadas sus pretensiones. Si la Administración ejerce potestad sancionadora o, en general, una potestad de intervención capaz de producir efectos desfavorables o de gravamen, se produce la caducidad y la resolución que la declare debe ordenar el archivo de las actuaciones. Cuando la paralización del procedimiento sea imputable al interesado, se interrumpe el cómputo del plazo para resolver y notificar.",
      examKeys: [
        "Procedimiento de oficio potencialmente favorable: los comparecidos pueden entender desestimadas sus pretensiones.",
        "Procedimiento sancionador o de intervención desfavorable: caducidad.",
        "La resolución que declara la caducidad ordena el archivo de las actuaciones.",
        "Paralización imputable al interesado: interrupción del cómputo para resolver y notificar.",
        "La falta de resolución en plazo no extingue la obligación legal de resolver.",
      ],
      confusions: [
        "No trasladar al procedimiento de oficio la regla general estimatoria del artículo 24.",
        "No tratar del mismo modo un procedimiento de oficio favorable y uno sancionador o desfavorable.",
        "No confundir caducidad con estimación ni con desestimación por silencio.",
      ],
      traps: [
        "Responder 'caducidad' también para procedimientos de oficio potencialmente favorables.",
        "Olvidar que solo los interesados comparecidos pueden entender desestimadas sus pretensiones en el supuesto favorable.",
        "Confundir la interrupción del cómputo por paralización imputable al interesado con una ampliación discrecional del plazo.",
      ],
      mnemonics: [],
      sourceRefs: article25Sources,
      sourceSubtopicName: "Falta de resolución expresa",
    },
  ],
  concepts: [
    {
      code: "SMS-T18-C14",
      unitCode: "SMS-T18-U07",
      title: "Regla y excepciones del silencio a solicitud",
      description:
        "Sentido general del silencio en procedimientos iniciados a solicitud, excepciones materiales y regla especial del doble silencio en alzada.",
      position: 1,
    },
    {
      code: "SMS-T18-C15",
      unitCode: "SMS-T18-U07",
      title: "Efectos, resolución posterior y acreditación del silencio",
      description:
        "Consecuencias jurídicas del silencio positivo y negativo, vinculación de la resolución posterior, eficacia y acreditación del acto presunto.",
      position: 2,
    },
    {
      code: "SMS-T18-C16",
      unitCode: "SMS-T18-U08",
      title: "Falta de resolución en procedimientos de oficio",
      description:
        "Efectos del vencimiento del plazo en procedimientos iniciados de oficio favorables, sancionadores o desfavorables y efecto de la paralización imputable al interesado.",
      position: 1,
    },
  ],
  questionMappings: [
    ...[
      "SMS-T18-0024",
      "SMS-T18-0082",
      "SMS-T18-0083",
      "SMS-T18-0138",
      "SMS-T18-0139",
      "SMS-T18-0140",
      "SMS-T18-0188",
      "SMS-T18-0230",
    ].map((questionCode) => ({
      questionCode,
      primaryConceptCode: "SMS-T18-C14",
    })),
    ...[
      "SMS-T18-0025",
      "SMS-T18-0026",
      "SMS-T18-0084",
      "SMS-T18-0141",
      "SMS-T18-0212",
      "SMS-T18-0231",
    ].map((questionCode) => ({
      questionCode,
      primaryConceptCode: "SMS-T18-C15",
    })),
    ...[
      "SMS-T18-0027",
      "SMS-T18-0085",
      "SMS-T18-0142",
      "SMS-T18-0189",
      "SMS-T18-0232",
    ].map((questionCode) => ({
      questionCode,
      primaryConceptCode: "SMS-T18-C16",
    })),
  ],
  flashcards: [
    {
      code: "SMS-T18-F01",
      conceptCode: "SMS-T18-C14",
      type: "direct",
      prompt: "¿Cuál es la regla general del silencio en un procedimiento iniciado a solicitud del interesado?",
      answer: "Es estimatorio, salvo que concurra una excepción legal o normativa aplicable.",
      position: 1,
      sourceRefs: article24Sources,
    },
    {
      code: "SMS-T18-F02",
      conceptCode: "SMS-T18-C14",
      type: "exception",
      prompt: "Cita los cuatro grandes bloques materiales que el artículo 24.1 enumera expresamente con silencio desestimatorio.",
      answer: "Derecho de petición; transferencia de facultades sobre dominio o servicio público; actividades que puedan dañar el medio ambiente; y responsabilidad patrimonial.",
      position: 2,
      sourceRefs: article24Sources,
    },
    {
      code: "SMS-T18-F03",
      conceptCode: "SMS-T18-C14",
      type: "contrast",
      prompt: "¿Cuándo puede operar la estimación por doble silencio en un recurso de alzada?",
      answer: "Cuando la alzada se interpone contra la desestimación por silencio de una solicitud y tampoco se resuelve en plazo, salvo que la solicitud se refiera a las materias exceptuadas por el artículo 24.1.",
      position: 3,
      sourceRefs: article24Sources,
    },
    {
      code: "SMS-T18-F04",
      conceptCode: "SMS-T18-C14",
      type: "exception",
      prompt: "Si una ley establece silencio desestimatorio para el acceso o ejercicio de una actividad, ¿qué debe justificar?",
      answer: "La concurrencia de razones imperiosas de interés general.",
      position: 4,
      sourceRefs: article24Sources,
    },
    {
      code: "SMS-T18-F05",
      conceptCode: "SMS-T18-C15",
      type: "contrast",
      prompt: "¿Qué diferencia esencial hay entre los efectos del silencio estimatorio y del desestimatorio?",
      answer: "La estimación tiene consideración de acto administrativo finalizador; la desestimación solo permite interponer el recurso administrativo o contencioso que proceda.",
      position: 1,
      sourceRefs: article24Sources,
    },
    {
      code: "SMS-T18-F06",
      conceptCode: "SMS-T18-C15",
      type: "contrast",
      prompt: "¿Cómo queda condicionada la resolución expresa posterior según el sentido del silencio?",
      answer: "Tras silencio estimatorio solo puede ser confirmatoria; tras silencio desestimatorio puede resolverse sin vinculación al sentido del silencio.",
      position: 2,
      sourceRefs: article24Sources,
    },
    {
      code: "SMS-T18-F07",
      conceptCode: "SMS-T18-C15",
      type: "number_or_deadline",
      prompt: "¿En qué plazo se expide de oficio el certificado acreditativo del silencio?",
      answer: "En 15 días desde que expire el plazo máximo para resolver; si lo pide el interesado, el cómputo se inicia desde el día siguiente a la entrada de su petición en el registro electrónico competente.",
      position: 3,
      sourceRefs: article24Sources,
    },
    {
      code: "SMS-T18-F08",
      conceptCode: "SMS-T18-C15",
      type: "direct",
      prompt: "¿Cuándo produce efectos el acto por silencio y es imprescindible el certificado para acreditarlo?",
      answer: "Produce efectos desde el vencimiento del plazo máximo y puede acreditarse por cualquier medio de prueba admitido en Derecho; el certificado no es imprescindible.",
      position: 4,
      sourceRefs: article24Sources,
    },
    {
      code: "SMS-T18-F09",
      conceptCode: "SMS-T18-C16",
      type: "contrast",
      prompt: "¿Qué ocurre al vencer el plazo en un procedimiento iniciado de oficio del que podrían derivarse derechos o situaciones favorables?",
      answer: "Los interesados que hayan comparecido pueden entender desestimadas sus pretensiones.",
      position: 1,
      sourceRefs: article25Sources,
    },
    {
      code: "SMS-T18-F10",
      conceptCode: "SMS-T18-C16",
      type: "direct",
      prompt: "¿Qué efecto produce el vencimiento del plazo en un procedimiento de oficio sancionador o de intervención desfavorable?",
      answer: "Se produce la caducidad y la resolución que la declare debe ordenar el archivo de las actuaciones.",
      position: 2,
      sourceRefs: article25Sources,
    },
    {
      code: "SMS-T18-F11",
      conceptCode: "SMS-T18-C16",
      type: "mini_case",
      prompt: "Si un procedimiento iniciado de oficio se paraliza por causa imputable al interesado, ¿qué ocurre con el plazo para resolver y notificar?",
      answer: "Se interrumpe su cómputo.",
      position: 3,
      sourceRefs: article25Sources,
    },
  ],
} satisfies V4StudyContentPackage;
