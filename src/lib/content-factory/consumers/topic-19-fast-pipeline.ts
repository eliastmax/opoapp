import { runContentFactoryTopic } from "../fast-pipeline";
import { artifactsAffectedBySubject, stableFactoryExceptionId } from "../exceptions";
import type { FactoryException } from "../fast-pipeline-types";
import type {
  FactoryEvidenceDimension,
  FactoryGeneratedQuestionCandidate,
  FactoryQuestionGenerationSlot,
  FactoryQuestionMetadata,
  ProposedConcept,
  ProposedStudyUnit,
  V2QuestionRow,
} from "../types";
import type { V4SourceRef, V4StudyUnitPackage } from "../../v4-content-package";

const SOURCE = "Temario_new.pdf";
const OPPOSITION = "auxiliar-administrativo-sms";
const TOPIC = 19;
const TOPIC_TITLE = "Procedimiento administrativo común y revisión de los actos en vía administrativa";

function ref(article: string, pageStart: number, pageEnd = pageStart): V4SourceRef {
  return {
    label: SOURCE,
    reference: `${SOURCE}, ${article}, ${pageStart === pageEnd ? `p. ${pageStart}` : `pp. ${pageStart}-${pageEnd}`}.`,
    pageStart,
    pageEnd,
  };
}

type UnitSpec = readonly [code: string, title: string, pageStart: number, pageEnd: number, scope: string];

export const topic19UnitSpecs: readonly UnitSpec[] = [
  ["SMS-T19-U01", "Identificación y firma de los interesados", 152, 155, "arts. 9-12"],
  ["SMS-T19-U02", "Derechos y garantías de los interesados", 159, 161, "art. 53"],
  ["SMS-T19-U03", "Iniciación: reglas generales y medidas provisionales", 162, 164, "arts. 54-57"],
  ["SMS-T19-U04", "Iniciación de oficio", 164, 169, "arts. 58-65"],
  ["SMS-T19-U05", "Solicitudes, subsanación y declaraciones responsables", 169, 173, "arts. 66-69"],
  ["SMS-T19-U06", "Ordenación del procedimiento", 174, 177, "arts. 70-74"],
  ["SMS-T19-U07", "Instrucción y prueba", 177, 180, "arts. 75-78"],
  ["SMS-T19-U08", "Informes, audiencia e información pública", 180, 184, "arts. 79-83"],
  ["SMS-T19-U09", "Finalización: reglas generales y terminación convencional", 184, 187, "arts. 84-86"],
  ["SMS-T19-U10", "Actuaciones complementarias y resolución", 187, 191, "arts. 87-90"],
  ["SMS-T19-U11", "Responsabilidad patrimonial, desistimiento, renuncia y caducidad", 190, 193, "arts. 91-95"],
  ["SMS-T19-U12", "Tramitación simplificada", 193, 195, "art. 96"],
  ["SMS-T19-U13", "Revisión de oficio y declaración de lesividad", 198, 201, "arts. 106-107"],
  ["SMS-T19-U14", "Suspensión, revocación, rectificación, límites y competencia revisora", 201, 203, "arts. 108-111"],
  ["SMS-T19-U15", "Principios de los recursos administrativos cubiertos por la fuente", 203, 204, "art. 112.1-2"],
] as const;

export const topic19Units: ProposedStudyUnit[] = topic19UnitSpecs.map(([code, title, pageStart, pageEnd, scope], index) => ({
  code,
  title,
  position: index + 1,
  sourceRefs: [ref(scope, pageStart, pageEnd)],
  observations: ["Canonical-only draft; no external legal source used."],
}));

type ConceptSpec = {
  code: string;
  unit: string;
  title: string;
  description: string;
  article: string;
  pages: readonly [number, number];
  questions: readonly number[];
};

const SPECS: readonly ConceptSpec[] = [
  { code:"SMS-T19-C01", unit:"SMS-T19-U01", title:"Sistemas de identificación", description:"Sistemas admitidos para que el interesado se identifique electrónicamente y condiciones de eficacia de esos sistemas.", article:"art. 9", pages:[152,153], questions:[1,51,52,53,121,122,124] },
  { code:"SMS-T19-C02", unit:"SMS-T19-U01", title:"Sistemas de firma", description:"Sistemas de firma electrónica admitidos, su función y su relación con la identificación del firmante.", article:"art. 10", pages:[153,154], questions:[2,54,55,56,123,128] },
  { code:"SMS-T19-C03", unit:"SMS-T19-U01", title:"Identificación, firma y asistencia electrónica", description:"Cuándo basta la identificación, actuaciones que requieren firma y asistencia para el uso de medios electrónicos.", article:"arts. 11-12", pages:[154,155], questions:[57,58,59,125,126,127] },
  { code:"SMS-T19-C04", unit:"SMS-T19-U02", title:"Derechos y garantías del interesado", description:"Derechos del interesado durante el procedimiento y garantías específicas presentes en el artículo 53.", article:"art. 53", pages:[159,161], questions:[3,60,61,62,129,130,131,132,133,134] },
  { code:"SMS-T19-C05", unit:"SMS-T19-U03", title:"Iniciación y actuaciones previas", description:"Reglas de iniciación y contenido funcional de la información y actuaciones previas antes del procedimiento.", article:"arts. 54-55", pages:[162,162], questions:[4,63,135,136,137] },
  { code:"SMS-T19-C06", unit:"SMS-T19-U03", title:"Medidas provisionales", description:"Presupuestos, límites, confirmación, modificación y extinción de las medidas provisionales.", article:"art. 56", pages:[162,164], questions:[5,64,138,139,140,141,142,143] },
  { code:"SMS-T19-C07", unit:"SMS-T19-U03", title:"Acumulación", description:"Quién puede acordar la acumulación, requisitos de conexión y órgano, y régimen de recurso del acuerdo.", article:"art. 57", pages:[164,164], questions:[65,144,145] },
  { code:"SMS-T19-C08", unit:"SMS-T19-U04", title:"Formas de iniciación de oficio", description:"Inicio de oficio por propia iniciativa, orden superior o petición razonada y reglas que diferencian esas vías.", article:"arts. 58-61", pages:[164,166], questions:[6,7,8,101,146,147,148] },
  { code:"SMS-T19-C09", unit:"SMS-T19-U04", title:"Denuncia", description:"Contenido, efectos y tratamiento de la denuncia como forma de conocimiento para la iniciación de oficio.", article:"art. 62", pages:[166,167], questions:[9,66,149,150,151,152] },
  { code:"SMS-T19-C10", unit:"SMS-T19-U04", title:"Especialidades de la iniciación sancionadora", description:"Reglas de iniciación de procedimientos sancionadores y contenido del acuerdo de iniciación.", article:"arts. 63-64", pages:[167,169], questions:[10,11,67,153,154,155] },
  { code:"SMS-T19-C11", unit:"SMS-T19-U04", title:"Inicio de responsabilidad patrimonial", description:"Iniciación de oficio y solicitud en responsabilidad patrimonial, incluidos plazo y contenido específico de la reclamación.", article:"arts. 65 y 67", pages:[169,171], questions:[102,104,105,161,162] },
  { code:"SMS-T19-C12", unit:"SMS-T19-U05", title:"Solicitud de iniciación", description:"Contenido de la solicitud, pluralidad de pretensiones, modelos y recibo acreditativo de presentación.", article:"art. 66", pages:[169,171], questions:[12,103,156,157,158,159,160] },
  { code:"SMS-T19-C13", unit:"SMS-T19-U05", title:"Subsanación y mejora", description:"Requerimiento de subsanación, efectos de no atenderlo y mejora voluntaria de la solicitud.", article:"art. 68", pages:[171,172], questions:[68,106,163,164] },
  { code:"SMS-T19-C14", unit:"SMS-T19-U05", title:"Declaración responsable y comunicación", description:"Concepto, efectos y diferencias entre declaración responsable y comunicación.", article:"art. 69", pages:[172,173], questions:[13,69,165,166,167] },
  { code:"SMS-T19-C15", unit:"SMS-T19-U06", title:"Expediente administrativo electrónico", description:"Contenido y organización del expediente electrónico, índice y elementos que no forman parte de él.", article:"art. 70", pages:[174,175], questions:[14,70,168,169,170,171,172] },
  { code:"SMS-T19-C16", unit:"SMS-T19-U06", title:"Impulso del procedimiento", description:"Impulso de oficio, orden de despacho y responsabilidad asociada a la tramitación.", article:"art. 71", pages:[175,175], questions:[71,173,174,175] },
  { code:"SMS-T19-C17", unit:"SMS-T19-U06", title:"Concentración, cumplimiento de trámites e incidentes", description:"Concentración de trámites, plazo para cumplimentarlos, decaimiento y efecto de cuestiones incidentales.", article:"arts. 72-74", pages:[175,177], questions:[15,72,73,107,176,177] },
  { code:"SMS-T19-C18", unit:"SMS-T19-U07", title:"Actos de instrucción y alegaciones", description:"Impulso de la instrucción, participación de los interesados y alegaciones durante el procedimiento.", article:"arts. 75-76", pages:[177,178], questions:[16,74,178,179,180,181,182] },
  { code:"SMS-T19-C19", unit:"SMS-T19-U07", title:"Prueba: medios, período y rechazo", description:"Medios de prueba, apertura y duración del período probatorio y rechazo motivado de pruebas improcedentes o innecesarias.", article:"art. 77.1-3", pages:[178,179], questions:[17,75,76,183] },
  { code:"SMS-T19-C20", unit:"SMS-T19-U07", title:"Prueba: reglas probatorias especiales", description:"Reglas sobre indicios de discriminación, hechos penales firmes y valor probatorio de documentos de autoridad.", article:"art. 77.3 bis-5", pages:[178,179], questions:[18,184,185,186,187,188] },
  { code:"SMS-T19-C21", unit:"SMS-T19-U07", title:"Prueba: informes, valoración y práctica", description:"Carácter del informe usado como prueba, incorporación de la valoración a la propuesta y práctica de la prueba.", article:"art. 77.6-7 y art. 78", pages:[179,180], questions:[19,77,189,190,191,192,193] },
  { code:"SMS-T19-C22", unit:"SMS-T19-U08", title:"Informes en el procedimiento", description:"Petición, emisión, plazo y efectos de la falta o emisión extemporánea de informes.", article:"arts. 79-80", pages:[180,181], questions:[20,21,78,194,195,196,197,198] },
  { code:"SMS-T19-C23", unit:"SMS-T19-U08", title:"Informes en responsabilidad patrimonial", description:"Informe del servicio causante, dictamen consultivo y reglas específicas para responsabilidad por funcionamiento de la Justicia.", article:"art. 81", pages:[181,182], questions:[22,23,199] },
  { code:"SMS-T19-C24", unit:"SMS-T19-U08", title:"Trámite de audiencia", description:"Momento, acceso al expediente, plazo y supuestos en los que puede prescindirse del trámite de audiencia.", article:"art. 82", pages:[182,183], questions:[24,79,80,200] },
  { code:"SMS-T19-C25", unit:"SMS-T19-U08", title:"Información pública", description:"Apertura, plazo y efectos de comparecer o no comparecer, incluida la posibilidad de otros cauces de participación.", article:"art. 83", pages:[183,184], questions:[25,81,201] },
  { code:"SMS-T19-C26", unit:"SMS-T19-U09", title:"Terminación y especialidades sancionadoras", description:"Formas de terminación del procedimiento y terminación sancionadora por reconocimiento o pago voluntario.", article:"arts. 84-85", pages:[184,186], questions:[26,27,82,83,108,204,205] },
  { code:"SMS-T19-C27", unit:"SMS-T19-U09", title:"Terminación convencional", description:"Requisitos y límites de acuerdos, pactos, convenios o contratos que pueden finalizar o insertarse en el procedimiento.", article:"art. 86", pages:[186,187], questions:[28,202,206,207,208,209] },
  { code:"SMS-T19-C28", unit:"SMS-T19-U10", title:"Actuaciones complementarias", description:"Cuándo pueden acordarse, qué no tiene esa consideración y efectos sobre audiencia y plazo para resolver.", article:"art. 87", pages:[187,187], questions:[29,84,210,211] },
  { code:"SMS-T19-C29", unit:"SMS-T19-U10", title:"Resolución del procedimiento", description:"Contenido y congruencia de la resolución, motivación, cuestiones conexas y propuesta cuando instruye y resuelve un órgano distinto.", article:"art. 88", pages:[187,188], questions:[30,31,85,212,213,214,215,216,217] },
  { code:"SMS-T19-C30", unit:"SMS-T19-U10", title:"Propuesta de resolución sancionadora", description:"Archivo sin propuesta y contenido que debe expresar la propuesta de resolución en procedimientos sancionadores.", article:"art. 89", pages:[188,189], questions:[32,109,218,219] },
  { code:"SMS-T19-C31", unit:"SMS-T19-U10", title:"Resolución sancionadora", description:"Contenido de la resolución sancionadora, límites respecto de los hechos, mayor gravedad y ejecutividad o suspensión cautelar.", article:"art. 90", pages:[189,191], questions:[33,86,220] },
  { code:"SMS-T19-C32", unit:"SMS-T19-U11", title:"Resolución y competencia en responsabilidad patrimonial", description:"Contenido de la resolución de responsabilidad patrimonial y órganos competentes para resolver.", article:"arts. 91-92", pages:[190,191], questions:[87,110,223,224] },
  { code:"SMS-T19-C33", unit:"SMS-T19-U11", title:"Desistimiento y renuncia", description:"Desistimiento de la Administración y de interesados, renuncia, forma, efectos y supuestos de continuación.", article:"arts. 93-94", pages:[191,192], questions:[111,112,225] },
  { code:"SMS-T19-C34", unit:"SMS-T19-U11", title:"Caducidad", description:"Presupuestos, advertencia, plazo, archivo y efectos de la caducidad del procedimiento.", article:"art. 95", pages:[192,193], questions:[34,88,203,221] },
  { code:"SMS-T19-C35", unit:"SMS-T19-U12", title:"Tramitación simplificada", description:"Supuestos, oposición, trámites esenciales y plazo de resolución de la tramitación simplificada.", article:"art. 96", pages:[193,195], questions:[50,89,90,113,222] },
  { code:"SMS-T19-C36", unit:"SMS-T19-U13", title:"Revisión de oficio", description:"Supuestos, iniciativa, inadmisión, dictamen y efectos de la revisión de oficio de actos y disposiciones nulos.", article:"art. 106", pages:[198,200], questions:[35,36,37,91,226,227,228] },
  { code:"SMS-T19-C37", unit:"SMS-T19-U13", title:"Declaración de lesividad", description:"Declaración de lesividad de actos anulables, plazo, audiencia, caducidad y competencia.", article:"art. 107", pages:[200,201], questions:[38,92,229,230,231] },
  { code:"SMS-T19-C38", unit:"SMS-T19-U14", title:"Suspensión, revocación y rectificación", description:"Suspensión en revisión de oficio, revocación de actos desfavorables y rectificación de errores.", article:"arts. 108-109", pages:[201,202], questions:[39,93,114,232,233,234] },
  { code:"SMS-T19-C39", unit:"SMS-T19-U14", title:"Límites y competencia para la revisión", description:"Límites al ejercicio de facultades revisoras y distribución de competencia para la revisión de oficio.", article:"arts. 110-111", pages:[202,203], questions:[40,94,235,236,237] },
  { code:"SMS-T19-C40", unit:"SMS-T19-U15", title:"Objeto de recurso y sustitución por otros procedimientos", description:"Actos recurribles y posibilidad de sustituir recursos por procedimientos de impugnación, reclamación, conciliación, mediación o arbitraje en los términos cubiertos por la fuente.", article:"art. 112.1-2", pages:[203,204], questions:[95,96,238,239,240] },
] as const;

export const topic19Concepts: ProposedConcept[] = SPECS.map((spec, index) => ({
  code: spec.code,
  unitCode: spec.unit,
  title: spec.title,
  description: spec.description,
  position: index + 1,
  confidence: "high",
  sourceRefs: [ref(spec.article, spec.pages[0], spec.pages[1])],
}));

function qcode(value: number) {
  return `SMS-T19-${String(value).padStart(4, "0")}`;
}

export const topic19CanonicalAssignments = SPECS.flatMap((spec) =>
  spec.questions.map((number) => ({
    questionCode: qcode(number),
    primaryConceptCode: spec.code,
    confidence: "high" as const,
    rationale: `Canonical-source clustering into ${spec.code} (${spec.article}).`,
  })),
);

export const topic19LegacySourceQuestionCodes = [
  41,42,43,44,45,46,47,48,49,97,98,99,100,115,116,117,118,119,120,
].map(qcode);

export const topic19AllActiveQuestionCodes = Array.from({ length: 240 }, (_, index) => qcode(index + 1));

const EXISTING_STEMS: Record<string, string> = {
  "SMS-T19-0065":"Dos procedimientos tienen íntima conexión, pero deben ser resueltos por órganos distintos. ¿Puede acordarse su acumulación conforme al artículo 57?",
  "SMS-T19-0144":"Dos procedimientos guardan íntima conexión. ¿Qué requisito adicional exige la Ley para acumularlos?",
  "SMS-T19-0145":"Un interesado discrepa del acuerdo que acumula su procedimiento a otro. ¿Qué recurso cabe contra ese acuerdo?",
  "SMS-T19-0022":"En un procedimiento de responsabilidad patrimonial, ¿qué plazo máximo tiene el servicio cuyo funcionamiento causó la presunta lesión para emitir su informe preceptivo?",
  "SMS-T19-0023":"En un procedimiento de responsabilidad patrimonial tramitado por la Administración General del Estado se reclaman exactamente 50.000 euros. Finalizada la audiencia, ¿qué procede?",
  "SMS-T19-0199":"En una reclamación por funcionamiento anormal de la Administración de Justicia, ¿qué regla se aplica al informe del Consejo General del Poder Judicial?",
  "SMS-T19-0025":"¿Cuál es el plazo mínimo para formular alegaciones en un período de información pública?",
  "SMS-T19-0081":"Una persona que no era interesada presenta observaciones durante la información pública. ¿Qué efecto produce su comparecencia?",
  "SMS-T19-0201":"¿Qué combinación refleja correctamente los efectos de la información pública?",
  "SMS-T19-0033":"Una resolución sancionadora ya es ejecutiva y el interesado comunica que recurrirá ante la jurisdicción contencioso-administrativa. ¿Qué puede acordarse?",
  "SMS-T19-0086":"Sin introducir hechos nuevos, el órgano resolutor aprecia que la infracción es jurídicamente más grave que en la propuesta. ¿Qué debe hacer?",
  "SMS-T19-0220":"El órgano resolutor mantiene los hechos de la instrucción, pero aprecia mayor gravedad jurídica de la infracción o sanción. ¿Qué procede?",
  "SMS-T19-0111":"Dos interesados presentaron conjuntamente una solicitud. Posteriormente, solo uno firma un escrito de desistimiento. ¿Qué efecto produce?",
  "SMS-T19-0112":"El solicitante desiste y un tercero ya personado insta la continuación dentro de los diez días siguientes a la notificación. Además, la cuestión presenta interés general. ¿Cómo puede actuar la Administración?",
  "SMS-T19-0225":"¿Cuándo puede desistir la Administración de un procedimiento iniciado de oficio?",
};

export const topic19CanonicalExistingQuestions: FactoryQuestionMetadata[] = topic19CanonicalAssignments.map((assignment) => {
  const spec = SPECS.find((item) => item.code === assignment.primaryConceptCode)!;
  return {
    code: assignment.questionCode,
    active: true,
    stem: EXISTING_STEMS[assignment.questionCode],
    documentReference: SOURCE,
    sourceReference: `${SOURCE}, ${spec.article}, pp. ${spec.pages[0]}-${spec.pages[1]}.`,
    pageStart: spec.pages[0],
    pageEnd: spec.pages[1],
  };
});

const unitByCode = new Map(topic19UnitSpecs.map((spec) => [spec[0], spec]));

const studyUnits: V4StudyUnitPackage[] = topic19Units.map((unit) => {
  const spec = unitByCode.get(unit.code)!;
  const conceptTitles = topic19Concepts.filter((concept) => concept.unitCode === unit.code).map((concept) => concept.title);
  return {
    code: unit.code,
    title: unit.title,
    position: unit.position,
    estimatedMinutes: Math.min(20, Math.max(6, conceptTitles.length * 4)),
    studySummary: `Repaso operativo de ${unit.title.toLocaleLowerCase("es")}: ${conceptTitles.join("; ")}.`,
    examKeys: conceptTitles,
    confusions: [`No trasladar requisitos, plazos o efectos de un concepto de esta unidad a otro sin comprobar la regla concreta en ${SOURCE}.`],
    traps: ["Distinguir regla general, excepción, competencia, plazo y efecto cuando el propio temario los separa."],
    mnemonics: [],
    sourceRefs: [ref(spec[4], spec[2], spec[3])],
  };
});

const flashcards = topic19Concepts.flatMap((concept, index) => {
  const sourceRefs = concept.sourceRefs ?? [];
  return [
    {
      code: `SMS-T19-F${String(index * 2 + 1).padStart(2, "0")}`,
      conceptCode: concept.code,
      type: "direct" as const,
      prompt: `¿Qué bloque debes dominar en «${concept.title}»?`,
      answer: concept.description,
      position: 1,
      sourceRefs,
    },
    {
      code: `SMS-T19-F${String(index * 2 + 2).padStart(2, "0")}`,
      conceptCode: concept.code,
      type: "contrast" as const,
      prompt: `¿Qué control evita acertar por mezclar reglas vecinas en «${concept.title}»?`,
      answer: `Separar requisitos, sujetos, plazos, competencia, efectos y excepciones conforme al soporte concreto de ${sourceRefs[0]?.reference ?? SOURCE}.`,
      position: 2,
      sourceRefs,
    },
  ];
});

export const topic19StudyContent = {
  units: studyUnits,
  concepts: topic19Concepts,
  flashcards,
};

function row(input: {
  code: string;
  conceptCode: string;
  apartado: string;
  subapartado: string;
  objective: string;
  perspective: string;
  trap: string;
  question: string;
  options: readonly [string,string,string,string];
  answer: "A"|"B"|"C"|"D";
  explanation: string;
  pageStart: number;
  pageEnd: number;
  sourceReference: string;
}): V2QuestionRow {
  return {
    codigo: input.code,
    materia: "Ley 39/2015 · Procedimiento administrativo común",
    numero_tema: 19,
    tema: TOPIC_TITLE,
    apartado: input.apartado,
    subapartado: input.subapartado,
    concepto: input.conceptCode,
    objetivo_aprendizaje: input.objective,
    perspectiva: input.perspective,
    nivel_pedagogico: "consolidacion",
    dificultad_conceptual: "medio",
    dificultad_examen: "medio",
    tipo_trampa: input.trap,
    pregunta: input.question,
    opcion_a: input.options[0],
    opcion_b: input.options[1],
    opcion_c: input.options[2],
    opcion_d: input.options[3],
    respuesta_correcta: input.answer,
    explicacion: input.explanation,
    documento_referencia: SOURCE,
    pagina_inicio: input.pageStart,
    pagina_fin: input.pageEnd,
    referencia_fuente: input.sourceReference,
    frecuencia_historica: "no_determinada",
  };
}

type GeneratedSpec = {
  dimension: FactoryEvidenceDimension;
  build: (code: string) => V2QuestionRow;
};

const generatedByConcept: Record<string, GeneratedSpec> = {
  "SMS-T19-C07": {
    dimension: "subject",
    build: (code) => row({
      code, conceptCode:"SMS-T19-C07", apartado:"Iniciación", subapartado:"Acumulación",
      objective:"Distinguir quién puede promover la acumulación y comprobar que la forma de iniciación del procedimiento no la limita.",
      perspective:"comparacion", trap:"requisito",
      question:"Conforme al artículo 57 del temario, ¿cómo puede promoverse la acumulación de procedimientos que cumplen los requisitos legales?",
      options:[
        "De oficio o a instancia de parte, cualquiera que haya sido la forma de iniciación de los procedimientos.",
        "Solo de oficio, porque la acumulación altera necesariamente el órgano que debe resolver los procedimientos.",
        "Solo a instancia de todos los interesados, siempre que los procedimientos se hubieran iniciado a solicitud suya.",
        "De oficio únicamente cuando los procedimientos tengan distinto órgano tramitador pero una materia sustancialmente idéntica."
      ], answer:"A",
      explanation:"El artículo 57 permite que el órgano disponga la acumulación de oficio o a instancia de parte y no la condiciona a una forma concreta de iniciación; además exige conexión e identidad del órgano que tramite y resuelva.",
      pageStart:164,pageEnd:164,sourceReference:"Temario_new.pdf, art. 57, p. 164."
    }),
  },
  "SMS-T19-C23": {
    dimension: "effect",
    build: (code) => row({
      code, conceptCode:"SMS-T19-C23", apartado:"Instrucción", subapartado:"Responsabilidad patrimonial",
      objective:"Identificar el contenido sobre el que debe pronunciarse el dictamen consultivo previsto en el artículo 81.2.",
      perspective:"requisitos", trap:"omision",
      question:"En la responsabilidad patrimonial sometida al dictamen consultivo del artículo 81.2, ¿sobre qué debe pronunciarse dicho dictamen?",
      options:[
        "Solo sobre la cuantía reclamada y la identidad del servicio que emitió el informe preceptivo de diez días.",
        "Sobre la relación de causalidad y, en su caso, la valoración del daño y la cuantía y modo de la indemnización.",
        "Únicamente sobre la competencia del órgano instructor y la suficiencia formal del trámite de audiencia.",
        "Sobre la tipificación de una infracción administrativa y la sanción que deba imponerse al responsable del servicio."
      ], answer:"B",
      explanation:"El temario exige que el dictamen se pronuncie sobre la existencia o no de relación de causalidad y, cuando proceda, sobre valoración del daño y cuantía y modo de indemnización.",
      pageStart:181,pageEnd:182,sourceReference:"Temario_new.pdf, art. 81.2, pp. 181-182."
    }),
  },
  "SMS-T19-C25": {
    dimension: "effect",
    build: (code) => row({
      code, conceptCode:"SMS-T19-C25", apartado:"Instrucción", subapartado:"Información pública",
      objective:"Reconocer que la información pública puede coexistir con otros cauces de participación establecidos conforme a las leyes.",
      perspective:"afirmacion_correcta", trap:"absolutismo",
      question:"Respecto de la participación en el procedimiento, ¿qué permite expresamente el artículo 83.4 del temario?",
      options:[
        "Que la información pública sustituya siempre al trámite de audiencia y otorgue automáticamente la condición de interesado.",
        "Que solo puedan participar personas físicas de forma individual, quedando excluidas organizaciones y asociaciones.",
        "Que las Administraciones establezcan conforme a las leyes otras formas, medios y cauces de participación, directamente o mediante organizaciones y asociaciones reconocidas.",
        "Que cualquier comparecencia obligue a aceptar las alegaciones presentadas y paralice la resolución hasta que exista respuesta individual."
      ], answer:"C",
      explanation:"El artículo 83.4 permite establecer otras formas, medios y cauces de participación de las personas, directamente o a través de organizaciones y asociaciones reconocidas por la ley.",
      pageStart:183,pageEnd:184,sourceReference:"Temario_new.pdf, art. 83.4, pp. 183-184."
    }),
  },
  "SMS-T19-C31": {
    dimension: "requirement",
    build: (code) => row({
      code, conceptCode:"SMS-T19-C31", apartado:"Finalización", subapartado:"Resolución sancionadora",
      objective:"Distinguir el contenido mínimo de la resolución sancionadora de los trámites propios de la propuesta de resolución.",
      perspective:"combinacion_requisitos", trap:"concepto_proximo",
      question:"Según el artículo 90.1 del temario, ¿qué debe contener la resolución de un procedimiento sancionador?",
      options:[
        "Solo la sanción final y el plazo para recurrir, porque la valoración de la prueba queda reservada a la propuesta del instructor.",
        "La propuesta del instructor reproducida literalmente, sin posibilidad de declarar que no existe infracción o responsabilidad.",
        "Únicamente los hechos que el interesado haya admitido y la sanción pecuniaria, aunque existan otras pruebas practicadas.",
        "La valoración de las pruebas, los hechos y, en su caso, responsables, infracciones y sanciones, o la declaración de inexistencia de infracción o responsabilidad."
      ], answer:"D",
      explanation:"El artículo 90.1 exige valorar las pruebas, fijar los hechos y, en su caso, responsables, infracciones y sanciones; también contempla declarar la inexistencia de infracción o responsabilidad.",
      pageStart:189,pageEnd:190,sourceReference:"Temario_new.pdf, art. 90.1, pp. 189-190."
    }),
  },
  "SMS-T19-C33": {
    dimension: "requirement",
    build: (code) => row({
      code, conceptCode:"SMS-T19-C33", apartado:"Finalización", subapartado:"Desistimiento y renuncia",
      objective:"Identificar la forma admisible del desistimiento o la renuncia de los interesados.",
      perspective:"requisitos", trap:"requisito",
      question:"¿Qué requisito formal establece el artículo 94.3 para el desistimiento o la renuncia de los interesados?",
      options:[
        "Puede utilizarse cualquier medio que permita dejar constancia, siempre que incorpore las firmas que correspondan conforme a la normativa aplicable.",
        "Debe formalizarse necesariamente mediante comparecencia presencial ante el órgano competente para resolver el procedimiento.",
        "Solo es válido mediante documento público notarial, aunque la solicitud inicial se hubiese presentado por medios electrónicos.",
        "Requiere la firma conjunta de todos los interesados del procedimiento, incluso cuando únicamente uno de ellos desista de su solicitud."
      ], answer:"A",
      explanation:"El artículo 94.3 admite cualquier medio que permita constancia del desistimiento o renuncia, con las firmas que correspondan conforme a la normativa aplicable.",
      pageStart:191,pageEnd:192,sourceReference:"Temario_new.pdf, art. 94.3, pp. 191-192."
    }),
  },
};

function generatedCandidate(slot: FactoryQuestionGenerationSlot): FactoryGeneratedQuestionCandidate {
  const spec = generatedByConcept[slot.conceptCode];
  if (!spec) throw new Error(`No canonical T19 generation spec for ${slot.conceptCode}.`);
  return { conceptCode: slot.conceptCode, dimensions: [spec.dimension], v2: spec.build(slot.questionCode) };
}

export const topic19FastPipelineRun1 = runContentFactoryTopic({
  job: {
    version: "1.0",
    oppositionCode: OPPOSITION,
    topicNumber: TOPIC,
    topicTitle: TOPIC_TITLE,
    mode: "existing_bank",
    codePrefix: "SMS-T19",
    sourceRevision: "Temario_new.pdf · Tema 19 canonical-only · pp. 152-204",
    source: [ref("Tema 19", 152, 204)],
    sourcePolicy: { canonicalOnly: true, document: SOURCE, externalVerificationAllowed: false },
    existingQuestions: topic19CanonicalExistingQuestions,
  },
  gates: {
    conceptMap: { status: "pending", notes: ["FAST PIPELINE RUN 1 provisional map."] },
    editorialQuality: { status: "pending", notes: ["FAST PIPELINE RUN 1 provisional editorial QA."] },
  },
  draft: {
    units: topic19Units,
    concepts: topic19Concepts,
    assignments: topic19CanonicalAssignments,
    content: topic19StudyContent,
  },
  operations: {
    generateQuestions: ({ slots }) => slots.map(generatedCandidate),
    hardenQuestions: ({ candidates }) => candidates,
  },
});

const sourceBoundarySubject = { kind: "topic", id: "SMS-T19-resource-source-boundary" } as const;
const sourceBoundaryArtifacts = [
  ...artifactsAffectedBySubject(sourceBoundarySubject),
  ...topic19LegacySourceQuestionCodes.flatMap((code) => [
    { kind: "question" as const, id: code },
    { kind: "mapping" as const, id: code },
  ]),
];

export const topic19SourceBoundaryException: FactoryException = {
  id: stableFactoryExceptionId("source_review_required", sourceBoundarySubject, "legacy-resource-bank"),
  type: "source_review_required",
  blocker: true,
  severity: "error",
  confidence: "low",
  subject: sourceBoundarySubject,
  explanation: `19 active Tema 19 questions (${topic19LegacySourceQuestionCodes.join(", ")}) cite temario_antiguo(1).pdf and cover resource rules beyond the substantive boundary supported by the canonical Temario_new.pdf. They were inspected but are quarantined from mappings and V4 materialization in RUN 1.`,
  recommendation: "Keep the 19 rows quarantined unless Governance can resolve them from a canonical Temario_new.pdf revision; do not complete, correct or remap them from external law or model knowledge.",
  alternatives: [
    "Keep all 19 legacy-source rows excluded from T19 V4 materialization.",
    "Provide canonical Temario_new.pdf support for the affected resource rules, then regenerate only this quarantined scope in RUN 2.",
  ],
  affectedArtifacts: sourceBoundaryArtifacts,
};

export const topic19FastPipelineExceptionQueue = [
  ...topic19FastPipelineRun1.exceptionQueue,
  topic19SourceBoundaryException,
];

export const topic19BenchmarkReadiness = {
  state: "blocked" as const,
  importReady: false,
  blockers: [
    ...topic19FastPipelineRun1.readiness.blockers,
    topic19SourceBoundaryException.id,
  ],
};

export const topic19FastPipelineGovernancePacket = {
  title: "Tema 19 — FAST PIPELINE RUN 1",
  summary: {
    activeExistingQuestions: 240,
    canonicalEligibleExistingQuestions: topic19CanonicalExistingQuestions.length,
    quarantinedSourceQuestions: topic19LegacySourceQuestionCodes.length,
    units: topic19Units.length,
    concepts: topic19Concepts.length,
    standardReady: topic19FastPipelineRun1.finalCoverage?.factoryConceptCoverage.filter((row) => row.status === "ready").length ?? 0,
    actionableCoverageGaps: topic19FastPipelineRun1.finalCoverage?.factoryConceptCoverage.filter((row) => row.actionableMissingPrimaryQuestions > 0).length ?? 0,
    sourceLimitedCandidates: topic19FastPipelineExceptionQueue.filter((item) => item.type === "source_limited_candidate").length,
    sourceReviewRequired: topic19FastPipelineExceptionQueue.filter((item) => item.type === "source_review_required").length,
    generatedQuestions: topic19FastPipelineRun1.draft.generatedQuestions.length,
    unmappedCanonicalEligible: topic19FastPipelineRun1.finalCoverage?.mappingQa.unmappedQuestionCodes.length ?? 0,
    multiplePrimary: topic19FastPipelineRun1.finalCoverage?.mappingQa.duplicatePrimaryQuestionCodes.length ?? 0,
    highConfidenceConceptsWithoutSpecificReview: topic19Concepts.filter((concept) => concept.confidence === "high").length,
    totalExceptions: topic19FastPipelineExceptionQueue.length,
    blockers: topic19FastPipelineExceptionQueue.filter((item) => item.blocker).length,
    reviewRecommended: topic19FastPipelineExceptionQueue.filter((item) => !item.blocker).length,
  },
  exceptions: topic19FastPipelineExceptionQueue,
  auditPack: {
    allActiveQuestionCodes: topic19AllActiveQuestionCodes,
    canonicalEligibleQuestionCodes: topic19CanonicalExistingQuestions.map((question) => question.code),
    quarantinedSourceQuestionCodes: topic19LegacySourceQuestionCodes,
    units: topic19Units,
    concepts: topic19Concepts,
    mappings: topic19CanonicalAssignments,
    studyContent: topic19StudyContent,
    generatedQuestions: topic19FastPipelineRun1.draft.generatedQuestions,
    initialCoverage: topic19FastPipelineRun1.initialCoverage,
    finalCoverage: topic19FastPipelineRun1.finalCoverage,
    questionQa: topic19FastPipelineRun1.questionQa,
    v4Package: topic19FastPipelineRun1.portable?.v4Package ?? null,
  },
};
