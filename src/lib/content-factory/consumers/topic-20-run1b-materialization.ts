import type { V4FlashcardPackage, V4SourceRef, V4StudyUnitPackage } from "../../v4-content-package";
import type { FactoryStructuralDraft } from "../fast-pipeline-types";
import type { FactoryEvidenceDimension, FactoryGeneratedQuestionCandidate, FactoryStudyContent, V2QuestionRow } from "../types";

const SOURCE = "Temario_new.pdf";
const MATERIA = "Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público";
const TEMA = "Tema 20. La Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público (I). Ámbito de aplicación. Los órganos de las Administraciones Públicas. Responsabilidad patrimonial de las Administraciones Públicas: principios; responsabilidad de las autoridades y el personal al servicio de las Administraciones Públicas.";

type UnitEditorial = {
  summary: string;
  examKeys: string[];
  confusions: string[];
  traps: string[];
  estimatedMinutes: number;
};

const UNIT_EDITORIAL: Record<string, UnitEditorial> = {
  "SMS-T20-U01": {
    summary: "Los artículos 1 a 4 delimitan el objeto y ámbito subjetivo de la Ley 40/2015, los principios generales de actuación y relación entre Administraciones y las exigencias de proporcionalidad, motivación, no discriminación y control en la intervención administrativa.",
    examKeys: [
      "El artículo 1 combina régimen jurídico, responsabilidad, potestad sancionadora y organización y funcionamiento de la Administración General del Estado y su sector público institucional.",
      "El artículo 2 distingue el sector público en sentido amplio, el sector público institucional y las entidades que tienen consideración de Administraciones Públicas.",
      "El artículo 4 exige medida menos restrictiva, motivación, adecuación al fin, ausencia de discriminación y evaluación periódica de efectos y resultados.",
    ],
    confusions: ["No confundir pertenencia al sector público institucional con tener en todo caso consideración de Administración Pública."],
    traps: ["Las entidades privadas vinculadas o dependientes quedan sujetas a las previsiones que específicamente se refieran a ellas y, en todo caso, cuando ejerzan potestades administrativas."],
    estimatedMinutes: 16,
  },
  "SMS-T20-U02": {
    summary: "Los artículos 5 a 7 regulan qué unidades son órganos administrativos, los requisitos y límites de su creación, el uso de instrucciones y órdenes de servicio y las garantías de independencia de la función consultiva.",
    examKeys: [
      "Es órgano administrativo la unidad con funciones que produzcan efectos jurídicos frente a terceros o cuya actuación sea preceptiva.",
      "La creación exige integración y dependencia, funciones y competencias y créditos; además se evita la duplicación de órganos equivalentes.",
      "El incumplimiento de instrucciones u órdenes no invalida por sí solo el acto, sin perjuicio de responsabilidad disciplinaria.",
    ],
    confusions: ["No identificar instrucción u orden de servicio con una alteración de la competencia del órgano dependiente."],
    traps: ["Los servicios de asistencia jurídica que ejercen función consultiva no pueden recibir instrucciones de quienes elaboraron la disposición o acto consultado."],
    estimatedMinutes: 12,
  },
  "SMS-T20-U03": {
    summary: "Los artículos 8 a 14 ordenan la competencia y sus técnicas de ejercicio: desconcentración, delegación, avocación, encomienda, delegación de firma y suplencia, además de las reglas para resolver controversias competenciales.",
    examKeys: [
      "La competencia es irrenunciable; delegación, encomienda, delegación de firma y suplencia no alteran su titularidad.",
      "La desconcentración puede afectar a titularidad y ejercicio en órganos jerárquicamente dependientes conforme a la norma atributiva.",
      "Avocación, encomienda, delegación de firma y suplencia tienen presupuestos, efectos y formalidades distintos que deben separarse.",
    ],
    confusions: ["No confundir delegación de competencias con delegación de firma: esta última no altera la competencia y no requiere publicación para su validez."],
    traps: ["Emitido un dictamen o informe preceptivo sobre el procedimiento, ya no puede delegarse la competencia para resolverlo."],
    estimatedMinutes: 22,
  },
  "SMS-T20-U04": {
    summary: "Los artículos 15 a 22 regulan el funcionamiento de los órganos colegiados, su Secretaría, convocatorias, sesiones y actas, y las especialidades de los órganos colegiados de la Administración General del Estado, incluida su creación y composición.",
    examKeys: [
      "La constitución general exige Presidente y Secretario —o suplentes— y al menos la mitad de los miembros, con reglas especiales para órganos del artículo 15.2.",
      "Los acuerdos se adoptan por mayoría; un asunto fuera del orden del día exige asistencia de todos y declaración de urgencia por mayoría.",
      "En la AGE, la forma de creación depende de las competencias atribuidas, el carácter ministerial o interministerial y, en ciertos casos, el rango de la Presidencia.",
    ],
    confusions: ["Distinguir las reglas generales de los artículos 15 a 18 de las especialidades estatales de los artículos 19 a 22."],
    traps: ["La grabación permite omitir del acta los puntos principales de las deliberaciones solo si se acompaña con certificación de autenticidad e integridad y los documentos electrónicos utilizados."],
    estimatedMinutes: 25,
  },
  "SMS-T20-U05": {
    summary: "Los artículos 23 y 24 regulan abstención y recusación: causas objetivas, deber de apartarse, actuación del superior, forma y plazos de la recusación y ausencia de recurso autónomo contra su resolución.",
    examKeys: [
      "La autoridad o personal con causa de abstención debe comunicarla a su superior inmediato.",
      "La intervención pese a existir causa de abstención no determina necesariamente la invalidez del acto.",
      "Si el recusado niega la causa, el superior resuelve en tres días; contra la decisión no cabe recurso autónomo.",
    ],
    confusions: ["No confundir parentesco de consanguinidad hasta cuarto grado con afinidad hasta segundo grado."],
    traps: ["Los servicios profesionales prestados a una persona interesada son causa cuando se produjeron en los dos últimos años."],
    estimatedMinutes: 12,
  },
  "SMS-T20-U06": {
    summary: "Los artículos 32 a 35 fijan los principios de responsabilidad patrimonial, los requisitos del daño, los supuestos de responsabilidad legislativa, la concurrencia entre Administraciones, las reglas de indemnización y el régimen aplicable cuando la Administración actúa en relaciones de Derecho privado.",
    examKeys: [
      "El funcionamiento normal o anormal puede generar responsabilidad si existe lesión indemnizable y no concurre fuerza mayor ni deber jurídico de soportarla.",
      "El daño debe ser efectivo, evaluable económicamente e individualizado.",
      "Cuando la Administración actúa en relaciones de Derecho privado, incluso mediante entidad privada o concurriendo con sujetos privados, la responsabilidad se exige conforme a los artículos 32 y siguientes.",
    ],
    confusions: ["La anulación de un acto o disposición no presupone por sí misma derecho a indemnización."],
    traps: ["En fórmulas conjuntas de actuación las Administraciones responden solidariamente frente al particular, aunque el instrumento pueda distribuir internamente la responsabilidad."],
    estimatedMinutes: 22,
  },
  "SMS-T20-U07": {
    summary: "Los artículos 36 y 37 separan la reclamación del particular frente a la Administración, la acción interna de regreso frente a autoridades o personal y la coordinación entre responsabilidad penal, civil derivada del delito y responsabilidad patrimonial.",
    examKeys: [
      "El particular exige directamente a la Administración las indemnizaciones por daños causados por autoridades y personal a su servicio.",
      "La acción de regreso exige dolo o culpa o negligencia graves, previa instrucción del procedimiento correspondiente.",
      "La responsabilidad penal no suspende por regla general el procedimiento patrimonial, salvo cuando la determinación penal de los hechos sea necesaria para fijar la responsabilidad patrimonial.",
    ],
    confusions: ["No confundir la reclamación externa del lesionado contra la Administración con la posterior exigencia interna a la autoridad o empleado."],
    traps: ["La resolución declaratoria de responsabilidad del artículo 36 pone fin a la vía administrativa."],
    estimatedMinutes: 14,
  },
};

type CardSeed = readonly [type: V4FlashcardPackage["type"], prompt: string, answer: string];

const CARD_SEEDS: Record<string, readonly [CardSeed, CardSeed]> = {
  "SMS-T20-C01": [
    ["direct", "¿Qué materias integra el objeto del artículo 1?", "Bases del régimen jurídico de las Administraciones Públicas, principios del sistema de responsabilidad y de la potestad sancionadora, y organización y funcionamiento de la Administración General del Estado y su sector público institucional."],
    ["direct", "¿Qué ámbito organizativo menciona expresamente el artículo 1?", "La organización y funcionamiento de la Administración General del Estado y de su sector público institucional."],
  ],
  "SMS-T20-C02": [
    ["direct", "¿Qué cuatro bloques comprende el sector público del artículo 2.1?", "Administración General del Estado, Administraciones de las Comunidades Autónomas, Entidades que integran la Administración Local y sector público institucional."],
    ["contrast", "¿Todas las entidades del sector público institucional son Administraciones Públicas?", "No. El artículo 2.3 atribuye esa consideración a AGE, CCAA, Entidades Locales y organismos públicos y entidades de derecho público del artículo 2.2.a)."],
  ],
  "SMS-T20-C03": [
    ["direct", "¿Qué principios encabezan el artículo 3.1 antes de la lista de letras?", "Eficacia, jerarquía, descentralización, desconcentración y coordinación, con sometimiento pleno a la Constitución, a la Ley y al Derecho."],
    ["contrast", "¿Cómo diferencia el artículo 3.1 economía y eficiencia?", "Economía se vincula a suficiencia y adecuación estricta de los medios a los fines; eficiencia, a la asignación y utilización de los recursos públicos."],
  ],
  "SMS-T20-C04": [
    ["direct", "¿Qué exige el artículo 4.1 al limitar derechos o exigir requisitos para una actividad?", "Proporcionalidad, elección de la medida menos restrictiva, motivación de la necesidad, justificación de la adecuación, ausencia de discriminación y evaluación periódica."],
    ["direct", "¿Qué facultades de control menciona el artículo 4.2?", "Comprobar, verificar, investigar e inspeccionar los hechos, actos, elementos, actividades, estimaciones y demás circunstancias necesarias, dentro de las competencias y límites de protección de datos."],
  ],
  "SMS-T20-C05": [
    ["direct", "¿Cuándo una unidad administrativa tiene consideración de órgano administrativo?", "Cuando se le atribuyen funciones con efectos jurídicos frente a terceros o su actuación tiene carácter preceptivo."],
    ["direct", "¿Qué tres requisitos mínimos exige el artículo 5.3 para crear un órgano?", "Integración y dependencia jerárquica, delimitación de funciones y competencias y dotación de créditos para su puesta en marcha y funcionamiento."],
  ],
  "SMS-T20-C06": [
    ["direct", "¿A quién pueden dirigir instrucciones y órdenes de servicio los órganos administrativos?", "A sus órganos jerárquicamente dependientes."],
    ["contrast", "¿Incumplir una instrucción u orden invalida por sí solo el acto dictado?", "No; no afecta por sí solo a la validez, sin perjuicio de la responsabilidad disciplinaria que proceda."],
  ],
  "SMS-T20-C07": [
    ["direct", "¿Qué dos formas de articular la Administración consultiva contempla el artículo 7?", "Órganos específicos con autonomía orgánica y funcional respecto de la Administración activa, o servicios de esta última que prestan asistencia jurídica."],
    ["direct", "¿Qué garantías deben mantener los servicios de asistencia jurídica cuando ejercen función consultiva?", "No estar sujetos a dependencia jerárquica orgánica o funcional ni recibir instrucciones, directrices o indicaciones de los órganos autores del acto o disposición consultados, actuando colegiadamente."],
  ],
  "SMS-T20-C08": [
    ["direct", "¿Cuál es la regla general sobre la competencia del artículo 8.1?", "Es irrenunciable y la ejercen los órganos que la tienen atribuida como propia, salvo delegación o avocación en los términos legales."],
    ["contrast", "¿Qué puede desconcentrarse conforme al artículo 8.2?", "La titularidad y el ejercicio de las competencias, en otros órganos jerárquicamente dependientes, según las normas de atribución."],
  ],
  "SMS-T20-C09": [
    ["direct", "¿Qué materias no pueden delegarse según el artículo 9.2?", "Relaciones institucionales allí enumeradas, disposiciones generales, resolución de recursos por el órgano que dictó el acto recurrido y materias declaradas indelegables por ley."],
    ["exception", "¿Cuándo impide un dictamen o informe preceptivo delegar la competencia para resolver?", "Cuando el dictamen o informe preceptivo sobre ese procedimiento ya se ha emitido."],
  ],
  "SMS-T20-C10": [
    ["direct", "¿Qué circunstancias pueden justificar una avocación?", "Circunstancias de índole técnica, económica, social, jurídica o territorial que la hagan conveniente."],
    ["exception", "Si la competencia se delegó en un órgano no dependiente jerárquicamente, ¿quién puede avocar el asunto?", "Únicamente el órgano delegante."],
  ],
  "SMS-T20-C11": [
    ["direct", "¿Qué actividades pueden ser objeto de encomienda de gestión y por qué razones?", "Actividades materiales o técnicas comprendidas en las competencias del órgano o entidad encomendado, por eficacia o falta de medios técnicos idóneos."],
    ["contrast", "¿La encomienda cede la titularidad de la competencia o los elementos sustantivos de su ejercicio?", "No; el órgano o entidad encomendante sigue siendo responsable de dictar los actos o resoluciones jurídicas de soporte."],
  ],
  "SMS-T20-C12": [
    ["direct", "¿Quién puede recibir una delegación de firma?", "Los titulares de órganos o unidades administrativas dependientes del titular del órgano delegante, dentro de los límites del artículo 9."],
    ["contrast", "¿La delegación de firma requiere publicación o altera la competencia?", "No requiere publicación para su validez y no altera la competencia del órgano delegante; los actos deben hacer constar la delegación y autoridad de procedencia."],
  ],
  "SMS-T20-C13": [
    ["direct", "¿Qué causas permiten la suplencia temporal?", "Vacante, ausencia, enfermedad y declaración de abstención o recusación."],
    ["direct", "Si no hay suplente designado, ¿quién determina quién ejerce la competencia?", "El órgano administrativo inmediato superior de quien dependa el órgano cuyo titular debe ser suplido."],
  ],
  "SMS-T20-C14": [
    ["direct", "¿Qué hace el órgano que se considera incompetente para resolver un asunto?", "Remite directamente las actuaciones al órgano que considera competente y notifica esa circunstancia a los interesados."],
    ["direct", "¿Qué requisitos exige el artículo 14.3 para un conflicto de atribuciones?", "Órganos de una misma Administración, no relacionados jerárquicamente, y asunto cuyo procedimiento administrativo no haya finalizado."],
  ],
  "SMS-T20-C15": [
    ["direct", "¿Qué órganos del artículo 15.2 pueden completar sus propias normas de funcionamiento?", "Los que incorporen organizaciones representativas de intereses sociales y los compuestos por representantes de distintas Administraciones, con o sin participación social."],
    ["exception", "¿Participan esos órganos del artículo 15.2 en la estructura jerárquica de la Administración?", "Como regla, no; salvo que lo establezcan sus normas de creación o resulte de sus funciones o de la propia naturaleza del órgano."],
  ],
  "SMS-T20-C16": [
    ["direct", "¿Quién puede ser Secretario de un órgano colegiado?", "Un miembro del propio órgano o una persona al servicio de la Administración Pública correspondiente."],
    ["direct", "¿Qué tres garantías atribuye el artículo 16.2 al Secretario?", "Velar por la legalidad formal y material, certificar las actuaciones y garantizar el respeto de los procedimientos y reglas de constitución y adopción de acuerdos."],
  ],
  "SMS-T20-C17": [
    ["direct", "¿Qué quórum general exige el artículo 17.2 para constituir válidamente un órgano colegiado?", "Presidente y Secretario, o sus suplentes, y al menos la mitad de sus miembros, presencialmente o a distancia."],
    ["exception", "¿Cuándo puede tratarse un asunto no incluido en el orden del día?", "Cuando asistan todos los miembros y la urgencia sea declarada por el voto favorable de la mayoría."],
  ],
  "SMS-T20-C18": [
    ["direct", "¿Qué debe contener necesariamente el acta de una sesión?", "Asistentes, orden del día, circunstancias de lugar y tiempo, puntos principales de las deliberaciones y contenido de los acuerdos adoptados."],
    ["exception", "¿Cuándo puede omitirse del acta el detalle de los puntos principales de las deliberaciones?", "Cuando se acompañe la grabación con certificación del Secretario sobre autenticidad e integridad y los documentos electrónicos utilizados en la sesión."],
  ],
  "SMS-T20-C19": [
    ["contrast", "¿Cuándo tiene voto el Secretario de un órgano colegiado estatal?", "Cuando la Secretaría la ostenta un miembro del propio órgano; si no es miembro, asiste con voz pero sin voto."],
    ["number_or_deadline", "¿Qué plazo tiene un miembro discrepante para formular voto particular por escrito?", "Dos días, incorporándose al texto aprobado."],
  ],
  "SMS-T20-C20": [
    ["direct", "¿Qué elementos definen un órgano colegiado estatal en el artículo 20.1?", "Creación formal, tres o más personas, funciones administrativas de decisión, propuesta, asesoramiento, seguimiento o control e integración en AGE u organismo público."],
    ["direct", "¿Qué extremos debe determinar la norma o convenio de creación?", "Fines u objetivos, integración o dependencia, composición y designación, funciones y, en su caso, créditos necesarios."],
  ],
  "SMS-T20-C21": [
    ["direct", "¿Qué forma sigue la modificación o supresión de órganos colegiados y grupos de trabajo?", "La misma forma dispuesta para su creación."],
    ["exception", "¿Qué ocurre si la norma de creación fijó un plazo para la extinción?", "La extinción se produce automáticamente en la fecha señalada."],
  ],
  "SMS-T20-C22": [
    ["contrast", "¿Cómo se clasifican por composición los órganos colegiados estatales?", "Interministeriales si sus miembros proceden de distintos Ministerios; ministeriales si proceden de órganos de un solo Ministerio."],
    ["direct", "¿Puede participar una persona por su experiencia o conocimientos especiales?", "Sí, cuando así se determine, atendiendo a las especiales condiciones de experiencia o conocimientos y a la naturaleza de las funciones del órgano."],
  ],
  "SMS-T20-C23": [
    ["direct", "¿Qué debe hacer quien incurre en una causa legal de abstención?", "Abstenerse de intervenir y comunicarlo a su superior inmediato, que resolverá lo procedente."],
    ["contrast", "¿La intervención pese a una causa de abstención invalida necesariamente el acto?", "No; el artículo 23.4 dice que no implica necesariamente y en todo caso la invalidez, sin perjuicio de la responsabilidad que proceda."],
  ],
  "SMS-T20-C24": [
    ["direct", "¿Cómo y cuándo puede promoverse la recusación?", "Por los interesados, en cualquier momento de la tramitación, mediante escrito que exprese la causa o causas."],
    ["number_or_deadline", "Si el recusado niega la causa, ¿en qué plazo resuelve el superior?", "En tres días, previos los informes y comprobaciones que considere oportunos."],
  ],
  "SMS-T20-C25": [
    ["direct", "¿Qué condiciones generales permiten el derecho a indemnización del artículo 32.1?", "Lesión consecuencia del funcionamiento normal o anormal de los servicios públicos, salvo fuerza mayor o daños que exista deber jurídico de soportar."],
    ["direct", "¿Qué tres características debe reunir en todo caso el daño alegado?", "Ser efectivo, evaluable económicamente e individualizado respecto de una persona o grupo de personas."],
  ],
  "SMS-T20-C26": [
    ["direct", "En fórmulas conjuntas de actuación, ¿cómo responden las Administraciones frente al particular?", "De forma solidaria, aunque el instrumento regulador pueda distribuir internamente la responsabilidad entre ellas."],
    ["number_or_deadline", "¿Qué plazo tienen las restantes Administraciones para exponer lo que consideren procedente tras la consulta del artículo 33.4?", "Quince días."],
  ],
  "SMS-T20-C27": [
    ["direct", "¿Qué criterios generales usa el artículo 34.2 para valorar la indemnización?", "Legislación fiscal, expropiación forzosa y demás normas aplicables, ponderando en su caso las valoraciones predominantes en el mercado."],
    ["direct", "En muerte o lesiones corporales, ¿qué referencia puede utilizarse?", "La valoración incluida en los baremos de la normativa vigente de Seguros obligatorios y de la Seguridad Social."],
  ],
  "SMS-T20-C28": [
    ["direct", "¿Qué régimen se aplica cuando la Administración actúa en relaciones de Derecho privado?", "La responsabilidad se exige conforme a los artículos 32 y siguientes, tanto si actúa directamente como a través de una entidad de derecho privado."],
    ["exception", "¿Cambia el régimen porque concurra un sujeto privado o la reclamación se dirija directamente contra la entidad instrumental o aseguradora?", "No. El artículo 35 mantiene la aplicación de los artículos 32 y siguientes también en esos supuestos."],
  ],
  "SMS-T20-C29": [
    ["direct", "¿A quién exige el particular la indemnización por daños causados por autoridades o personal?", "Directamente a la Administración Pública correspondiente."],
    ["direct", "¿Cuándo exige de oficio la Administración responsabilidad a su autoridad o personal después de indemnizar?", "Cuando hubieran incurrido en dolo o culpa o negligencia graves, previa instrucción del procedimiento correspondiente."],
  ],
  "SMS-T20-C30": [
    ["direct", "¿Cómo se exige la responsabilidad penal y la civil derivada del delito del personal público?", "De acuerdo con lo previsto en la legislación correspondiente."],
    ["exception", "¿Cuándo puede suspenderse el procedimiento de reconocimiento de responsabilidad patrimonial por la exigencia de responsabilidad penal?", "Cuando la determinación de los hechos en el orden jurisdiccional penal sea necesaria para fijar la responsabilidad patrimonial."],
  ],
};

function refsForConcept(structuralDraft: FactoryStructuralDraft, conceptCode: string): V4SourceRef[] {
  return structuralDraft.concepts.find((concept) => concept.code === conceptCode)?.sourceRefs ?? [];
}

export function buildTopic20Run1BStudyContent(structuralDraft: FactoryStructuralDraft): FactoryStudyContent {
  const units: V4StudyUnitPackage[] = structuralDraft.units.map((unit) => {
    const editorial = UNIT_EDITORIAL[unit.code];
    if (!editorial) throw new Error(`Missing RUN1B study packet output for ${unit.code}.`);
    return {
      code: unit.code,
      title: unit.title,
      position: unit.position,
      estimatedMinutes: editorial.estimatedMinutes,
      studySummary: editorial.summary,
      examKeys: editorial.examKeys,
      confusions: editorial.confusions,
      traps: editorial.traps,
      mnemonics: [],
      sourceRefs: unit.sourceRefs,
      sourceSubtopicName: unit.sourceSubtopicName,
    };
  });

  const flashcards: V4FlashcardPackage[] = structuralDraft.concepts.flatMap((concept) => {
    const seeds = CARD_SEEDS[concept.code];
    if (!seeds) throw new Error(`Missing RUN1B flashcard packet output for ${concept.code}.`);
    return seeds.map(([type, prompt, answer], index) => ({
      code: `SMS-T20-FC-${concept.code.slice(-3)}-${String(index + 1).padStart(2, "0")}`,
      conceptCode: concept.code,
      type,
      prompt,
      answer,
      position: index + 1,
      sourceRefs: refsForConcept(structuralDraft, concept.code),
    }));
  });

  return { units, concepts: structuralDraft.concepts, flashcards };
}

function row(input: {
  code: string;
  apartado: string;
  subapartado: string;
  concepto: string;
  objetivo: string;
  perspectiva: string;
  nivel: "aprendizaje" | "consolidacion" | "tribunal";
  dificultadConceptual: "facil" | "medio" | "dificil";
  dificultadExamen: "facil" | "medio" | "dificil";
  trampa: string;
  pregunta: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correcta: "A" | "B" | "C" | "D";
  explicacion: string;
  pageStart: number;
  pageEnd?: number;
  referencia: string;
}): V2QuestionRow {
  return {
    codigo: input.code,
    materia: MATERIA,
    numero_tema: 20,
    tema: TEMA,
    apartado: input.apartado,
    subapartado: input.subapartado,
    concepto: input.concepto,
    objetivo_aprendizaje: input.objetivo,
    perspectiva: input.perspectiva,
    nivel_pedagogico: input.nivel,
    dificultad_conceptual: input.dificultadConceptual,
    dificultad_examen: input.dificultadExamen,
    tipo_trampa: input.trampa,
    pregunta: input.pregunta,
    opcion_a: input.a,
    opcion_b: input.b,
    opcion_c: input.c,
    opcion_d: input.d,
    respuesta_correcta: input.correcta,
    explicacion: input.explicacion,
    documento_referencia: SOURCE,
    pagina_inicio: input.pageStart,
    pagina_fin: input.pageEnd ?? input.pageStart,
    referencia_fuente: input.referencia,
    frecuencia_historica: "no_determinada",
  };
}

function candidate(conceptCode: string, dimension: FactoryEvidenceDimension, v2: V2QuestionRow): FactoryGeneratedQuestionCandidate {
  return { conceptCode, dimensions: [dimension], v2 };
}

export const topic20Run1BGeneratedQuestionCandidates: FactoryGeneratedQuestionCandidate[] = [
  candidate("SMS-T20-C01", "rule", row({
    code: "SMS-T20-0221",
    apartado: "Disposiciones generales",
    subapartado: "Artículo 1. Objeto",
    concepto: "Objeto de la Ley 40/2015",
    objetivo: "Aislar el componente organizativo del objeto legal sin confundirlo con el ámbito subjetivo del artículo 2.",
    perspectiva: "reconocimiento_directo",
    nivel: "consolidacion",
    dificultadConceptual: "medio",
    dificultadExamen: "medio",
    trampa: "concepto_proximo",
    pregunta: "Dentro del objeto definido por el artículo 1, ¿qué aspecto regula expresamente la Ley respecto de la Administración General del Estado?",
    a: "La composición detallada de todos los órganos colegiados de las Administraciones Públicas.",
    b: "La organización y funcionamiento de la Administración General del Estado y de su sector público institucional.",
    c: "La clasificación de todas las entidades privadas vinculadas a cualquier Administración Pública.",
    d: "La distribución territorial de competencias entre el Estado, las Comunidades Autónomas y las Entidades Locales.",
    correcta: "B",
    explicacion: "El artículo 1 incluye expresamente la organización y funcionamiento de la Administración General del Estado y de su sector público institucional dentro del objeto de la Ley.",
    pageStart: 44,
    referencia: "Temario_new.pdf, art. 1, p. 44.",
  })),
  candidate("SMS-T20-C01", "exception", row({
    code: "SMS-T20-0222",
    apartado: "Disposiciones generales",
    subapartado: "Artículo 1. Objeto",
    concepto: "Objeto de la Ley 40/2015",
    objetivo: "Distinguir la enumeración del objeto del artículo 1 de contenidos desarrollados en artículos posteriores.",
    perspectiva: "afirmacion_incorrecta",
    nivel: "tribunal",
    dificultadConceptual: "medio",
    dificultadExamen: "medio",
    trampa: "omision",
    pregunta: "¿Cuál de estas materias NO aparece enumerada en el artículo 1 como uno de los componentes del objeto de la Ley 40/2015?",
    a: "Las bases del régimen jurídico de las Administraciones Públicas.",
    b: "Los principios del sistema de responsabilidad de las Administraciones Públicas.",
    c: "Los principios de la potestad sancionadora.",
    d: "La composición del sector público institucional en organismos, entidades privadas vinculadas y universidades públicas.",
    correcta: "D",
    explicacion: "El artículo 1 enumera régimen jurídico, responsabilidad, potestad sancionadora y organización y funcionamiento de la AGE y su sector público institucional. La composición del sector público institucional se desarrolla en el artículo 2.2.",
    pageStart: 44,
    pageEnd: 45,
    referencia: "Temario_new.pdf, arts. 1-2, pp. 44-45.",
  })),
  candidate("SMS-T20-C01", "subject", row({
    code: "SMS-T20-0223",
    apartado: "Disposiciones generales",
    subapartado: "Artículo 1. Objeto",
    concepto: "Objeto de la Ley 40/2015",
    objetivo: "Identificar el sujeto organizativo expresamente mencionado en el último inciso del artículo 1.",
    perspectiva: "requisitos",
    nivel: "consolidacion",
    dificultadConceptual: "medio",
    dificultadExamen: "medio",
    trampa: "concepto_proximo",
    pregunta: "Cuando el artículo 1 menciona la organización y funcionamiento como parte del objeto de la Ley, ¿a qué ámbito los refiere expresamente?",
    a: "A la Administración General del Estado y a su sector público institucional.",
    b: "A todas las Administraciones Públicas y a todas las entidades privadas relacionadas con ellas.",
    c: "Exclusivamente a las Administraciones de las Comunidades Autónomas y a sus organismos públicos.",
    d: "Únicamente a las Entidades que integran la Administración Local y a las universidades públicas.",
    correcta: "A",
    explicacion: "El artículo 1 refiere expresamente esa organización y funcionamiento a la Administración General del Estado y a su sector público institucional.",
    pageStart: 44,
    referencia: "Temario_new.pdf, art. 1, p. 44.",
  })),
  candidate("SMS-T20-C28", "rule", row({
    code: "SMS-T20-0224",
    apartado: "Responsabilidad patrimonial de las Administraciones Públicas",
    subapartado: "Artículo 35. Responsabilidad de Derecho Privado",
    concepto: "Régimen unitario en relaciones privadas",
    objetivo: "Precisar la regla sustantiva que mantiene los artículos 32 y siguientes cuando la Administración actúa bajo relaciones de Derecho privado.",
    perspectiva: "relacion_normativa",
    nivel: "consolidacion",
    dificultadConceptual: "medio",
    dificultadExamen: "medio",
    trampa: "cambio_condicion",
    pregunta: "Una Administración actúa en una relación de Derecho privado. Según el artículo 35, ¿qué regla determina el régimen de su responsabilidad?",
    a: "Se aplica un régimen distinto según actúe directamente o mediante una entidad de derecho privado.",
    b: "La responsabilidad queda sometida exclusivamente a las reglas internas de la entidad mediante la que actúe.",
    c: "La responsabilidad se exige conforme a los artículos 32 y siguientes, también cuando actúe a través de una entidad de derecho privado.",
    d: "La aplicación de los artículos 32 y siguientes queda excluida siempre que la relación tenga naturaleza privada.",
    correcta: "C",
    explicacion: "El artículo 35 mantiene expresamente el régimen de los artículos 32 y siguientes cuando las Administraciones actúan directamente o a través de una entidad de derecho privado en relaciones de esa naturaleza.",
    pageStart: 74,
    referencia: "Temario_new.pdf, art. 35, p. 74.",
  })),
  candidate("SMS-T20-C28", "exception", row({
    code: "SMS-T20-0225",
    apartado: "Responsabilidad patrimonial de las Administraciones Públicas",
    subapartado: "Artículo 35. Responsabilidad de Derecho Privado",
    concepto: "Régimen unitario en relaciones privadas",
    objetivo: "Reconocer que la reclamación directa frente a la entidad que cubra la responsabilidad no desplaza el régimen de los artículos 32 y siguientes.",
    perspectiva: "excepcion",
    nivel: "tribunal",
    dificultadConceptual: "medio",
    dificultadExamen: "dificil",
    trampa: "excepcion",
    pregunta: "¿En cuál de estas situaciones afirma el artículo 35 que sigue aplicándose el régimen de responsabilidad de los artículos 32 y siguientes?",
    a: "Solo cuando el particular reclame previamente contra la autoridad o empleado que produjo materialmente el daño.",
    b: "Incluso cuando la responsabilidad se exija directamente a la entidad que cubra la responsabilidad de la Administración.",
    c: "Únicamente cuando no concurra ningún sujeto de derecho privado en la producción del daño.",
    d: "Solo si la Administración actuó directamente, quedando fuera los daños producidos mediante una entidad de derecho privado.",
    correcta: "B",
    explicacion: "El artículo 35 mantiene el régimen de los artículos 32 y siguientes incluso cuando concurra con sujetos privados o la responsabilidad se exija directamente a la entidad privada instrumental o a la entidad que cubra su responsabilidad.",
    pageStart: 74,
    referencia: "Temario_new.pdf, art. 35, p. 74.",
  })),
  candidate("SMS-T20-C30", "rule", row({
    code: "SMS-T20-0226",
    apartado: "Responsabilidad de las autoridades y personal al servicio de las Administraciones Públicas",
    subapartado: "Artículo 37. Responsabilidad penal",
    concepto: "Coordinación entre proceso penal y responsabilidad patrimonial",
    objetivo: "Aislar la regla del artículo 37.1 sobre la exigencia de responsabilidad penal y civil derivada del delito.",
    perspectiva: "reconocimiento_directo",
    nivel: "consolidacion",
    dificultadConceptual: "medio",
    dificultadExamen: "medio",
    trampa: "concepto_proximo",
    pregunta: "Conforme al artículo 37.1, ¿cómo se exige la responsabilidad penal del personal público y la responsabilidad civil derivada del delito?",
    a: "Mediante el procedimiento interno de regreso previsto para los supuestos de dolo o negligencia grave.",
    b: "Dentro del procedimiento de responsabilidad patrimonial, que absorbe necesariamente ambas responsabilidades.",
    c: "Directamente a la Administración Pública correspondiente, sin aplicación de otra legislación específica.",
    d: "De acuerdo con lo previsto en la legislación correspondiente para esas responsabilidades.",
    correcta: "D",
    explicacion: "El artículo 37.1 dispone que la responsabilidad penal del personal al servicio de las Administraciones Públicas y la responsabilidad civil derivada del delito se exigirán conforme a la legislación correspondiente.",
    pageStart: 76,
    referencia: "Temario_new.pdf, art. 37.1, p. 76.",
  })),
];

export const topic20Run1BRelevantExistingStems: Record<string, string> = {
  "SMS-T20-0001": "¿Qué combinación recoge íntegramente el objeto de la Ley 40/2015 según su artículo 1?",
  "SMS-T20-0098": "Una Administración actúa en una relación de Derecho privado y, en otro caso, lo hace mediante una entidad privada concurriendo con otro sujeto privado. ¿Qué régimen de responsabilidad corresponde en ambos supuestos?",
  "SMS-T20-0218": "Una Administración actúa mediante una entidad de derecho privado y el daño concurre con la actuación de otro sujeto privado. La reclamación se dirige directamente contra la entidad instrumental. ¿Qué régimen sustantivo corresponde?",
  "SMS-T20-0100": "Se sigue un proceso penal contra un empleado público y la fijación de los hechos penales es necesaria para resolver la responsabilidad patrimonial. ¿Qué régimen establece el artículo 37?",
  "SMS-T20-0165": "¿Suspende la exigencia de responsabilidad penal los procedimientos de reconocimiento de responsabilidad patrimonial?",
  "SMS-T20-0220": "Se inicia un proceso penal contra un empleado y los hechos que allí se determinen son imprescindibles para fijar la responsabilidad patrimonial. ¿Qué procede?",
};
