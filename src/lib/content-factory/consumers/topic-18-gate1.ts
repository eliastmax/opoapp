import { buildGate1Report } from "../reports";
import type {
  ContentFactoryJob,
  FactoryProposalConfidence,
  FactoryQuestionAssignment,
  ProposedConcept,
  ProposedStudyUnit,
} from "../types";
import type { V4SourceRef } from "../../v4-content-package";

const TOPIC_TITLE =
  "La Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas (I). La actividad de las Administraciones Públicas: normas generales de actuación; términos y plazos. Los actos administrativos.";

function refs(article: string, pageStart: number, pageEnd = pageStart): V4SourceRef[] {
  return [
    { label: "BOE — Ley 39/2015 consolidada", reference: `BOE-A-2015-10565, ${article}` },
    {
      label: "Temario principal",
      reference: pageStart === pageEnd ? `Temario_new.pdf, p. ${pageStart}` : `Temario_new.pdf, pp. ${pageStart}-${pageEnd}`,
      pageStart,
      pageEnd,
    },
  ];
}

function unit(
  code: string,
  title: string,
  position: number,
  article: string,
  pageStart: number,
  pageEnd = pageStart,
  observations: string[] = [],
): ProposedStudyUnit {
  return { code, title, position, sourceRefs: refs(article, pageStart, pageEnd), observations };
}

function concept(
  code: string,
  unitCode: string,
  title: string,
  description: string,
  position: number,
  article: string,
  pageStart: number,
  pageEnd = pageStart,
  confidence: FactoryProposalConfidence = "high",
  overlapCandidates: string[] = [],
  observations: string[] = [],
): ProposedConcept {
  return {
    code,
    unitCode,
    title,
    description,
    position,
    sourceRefs: refs(article, pageStart, pageEnd),
    confidence,
    overlapCandidates,
    observations,
  };
}

const questionCodes = Array.from({ length: 240 }, (_, index) => `SMS-T18-${String(index + 1).padStart(4, "0")}`);

export const topic18Gate1Job: ContentFactoryJob = {
  version: "1.0",
  oppositionCode: "auxiliar-administrativo-sms",
  topicNumber: 18,
  topicTitle: TOPIC_TITLE,
  mode: "existing_bank",
  codePrefix: "SMS-T18",
  coverageThreshold: 4,
  sourceRevision: "BOE-A-2015-10565 consolidado (última actualización publicada 2024-11-06); contraste con Temario_new.pdf y banco V2 productivo realizado para CONTENT-FACTORY.2",
  source: refs("arts. 13-52", 113, 149),
  existingQuestions: questionCodes.map((code) => ({ code, active: true })),
};

export const topic18Gate1Units: ProposedStudyUnit[] = [
  unit("SMS-T18-U01", "Derechos y relación electrónica", 1, "arts. 13-14", 113, 115),
  unit("SMS-T18-U02", "Lengua y registros electrónicos", 2, "arts. 15-16", 115, 118),
  unit("SMS-T18-U03", "Archivo, colaboración, comparecencia y tramitación", 3, "arts. 17-20", 119, 120),
  unit("SMS-T18-U04", "Obligación de resolver y plazo máximo", 4, "art. 21", 121, 122),
  unit("SMS-T18-U05", "Suspensión del plazo máximo", 5, "art. 22", 122, 124),
  unit("SMS-T18-U06", "Ampliación excepcional del plazo máximo", 6, "art. 23", 124),
  unit(
    "SMS-T18-U07",
    "Silencio administrativo a solicitud del interesado",
    7,
    "art. 24",
    125,
    126,
    ["Ancla productiva existente: conservar código y frontera salvo decisión expresa de Gobernanza."],
  ),
  unit(
    "SMS-T18-U08",
    "Falta de resolución en procedimientos iniciados de oficio",
    8,
    "art. 25",
    126,
    127,
    ["Ancla productiva existente: conservar código y frontera salvo decisión expresa de Gobernanza."],
  ),
  unit("SMS-T18-U09", "Documentos, copias y aportación documental", 9, "arts. 26-28", 127, 131),
  unit("SMS-T18-U10", "Términos, cómputo y registros", 10, "arts. 29-31", 132, 135),
  unit("SMS-T18-U11", "Ampliación de trámites y urgencia", 11, "arts. 32-33", 135, 136),
  unit("SMS-T18-U12", "Producción, motivación y forma de los actos", 12, "arts. 34-36", 136, 138),
  unit("SMS-T18-U13", "Inderogabilidad, ejecutividad y eficacia", 13, "arts. 37-39", 138, 140),
  unit("SMS-T18-U14", "Notificación: contenido y condiciones generales", 14, "arts. 40-41", 140, 143),
  unit("SMS-T18-U15", "Práctica de notificaciones y publicación", 15, "arts. 42-46", 143, 146),
  unit("SMS-T18-U16", "Nulidad, anulabilidad y técnicas de conservación", 16, "arts. 47-52", 146, 149),
];

export const topic18Gate1Concepts: ProposedConcept[] = [
  concept("SMS-T18-C01", "SMS-T18-U01", "Derechos de las personas ante las Administraciones", "Catálogo y alcance de los derechos generales del artículo 13.", 1, "art. 13", 113, 114),
  concept("SMS-T18-C02", "SMS-T18-U01", "Derecho y obligación de relación electrónica", "Elección del canal, sujetos obligados y posible imposición reglamentaria de medios electrónicos.", 2, "art. 14", 114, 115),
  concept("SMS-T18-C03", "SMS-T18-U02", "Lengua de los procedimientos", "Lengua de tramitación, derechos lingüísticos y reglas cuando concurren varias personas interesadas.", 3, "art. 15", 115, 116),
  concept("SMS-T18-C04", "SMS-T18-U02", "Registro electrónico: estructura, asientos y recibos", "Creación del registro, interoperabilidad, contenido de asientos y recibos de presentación.", 4, "art. 16.1-3", 116, 117, "medium"),
  concept("SMS-T18-C05", "SMS-T18-U02", "Presentación, digitalización, pagos y oficinas de registro", "Lugares y medios de presentación, digitalización, pagos y asistencia en materia de registros.", 5, "art. 16.4-8", 117, 118, "medium"),
  concept("SMS-T18-C06", "SMS-T18-U03", "Archivo electrónico único", "Archivo de documentos electrónicos, conservación, seguridad, formatos y eliminación autorizada.", 6, "art. 17", 119),
  concept("SMS-T18-C07", "SMS-T18-U03", "Colaboración de las personas", "Deberes de colaboración, inspección y límites derivados de derechos y legislación aplicable.", 7, "art. 18", 119, 120),
  concept("SMS-T18-C08", "SMS-T18-U03", "Comparecencia ante oficinas públicas", "Exigencia legal, citación y certificación de comparecencia.", 8, "art. 19", 120),
  concept("SMS-T18-C09", "SMS-T18-U03", "Responsabilidad de la tramitación", "Responsabilidad directa de titulares y personal encargado, impulso y remoción de obstáculos.", 9, "art. 20", 120),
  concept("SMS-T18-C10", "SMS-T18-U04", "Obligación de resolver, excepciones y responsabilidad", "Deber de resolución expresa, excepciones y consecuencias de su incumplimiento.", 10, "art. 21.1 y 21.6", 121, 122, "medium"),
  concept("SMS-T18-C11", "SMS-T18-U04", "Plazo máximo, inicio, información y medios", "Determinación del plazo máximo, cómputo inicial, información al interesado y medios personales/materiales.", 11, "art. 21.2-5", 121, 122, "medium", ["SMS-T18-C13"]),
  concept("SMS-T18-C12", "SMS-T18-U05", "Suspensión del plazo máximo", "Supuestos potestativos y obligatorios de suspensión y duración de sus efectos.", 12, "art. 22", 122, 124),
  concept("SMS-T18-C13", "SMS-T18-U06", "Ampliación excepcional del plazo máximo", "Presupuestos, límite, competencia y diferencia respecto de otras ampliaciones de trámites.", 13, "art. 23", 124, 124, "medium", ["SMS-T18-C11", "SMS-T18-C23"], ["Las preguntas 0137 y 0226 cruzan esta regla con los artículos 32 y 21.5; revisar primary definitivo."]),
  concept(
    "SMS-T18-C14",
    "SMS-T18-U07",
    "Regla y excepciones del silencio a solicitud",
    "Regla estimatoria, supuestos desestimatorios y excepciones del artículo 24.1.",
    14,
    "art. 24.1",
    125,
    126,
    "high",
    [],
    ["Concepto productivo existente; se conserva exactamente como ancla."],
  ),
  concept(
    "SMS-T18-C15",
    "SMS-T18-U07",
    "Efectos, resolución posterior y acreditación",
    "Efectos del silencio, sentido de la resolución posterior y acreditación/certificado.",
    15,
    "art. 24.2-4",
    125,
    126,
    "high",
    [],
    ["Concepto productivo existente; se conserva exactamente como ancla."],
  ),
  concept(
    "SMS-T18-C16",
    "SMS-T18-U08",
    "Falta de resolución en procedimientos de oficio",
    "Efectos de la falta de resolución según el tipo de procedimiento iniciado de oficio.",
    16,
    "art. 25",
    126,
    127,
    "high",
    [],
    ["Concepto productivo existente; se conserva exactamente como ancla."],
  ),
  concept("SMS-T18-C17", "SMS-T18-U09", "Emisión de documentos administrativos", "Requisitos de validez, emisión electrónica e identificación de documentos administrativos.", 17, "art. 26", 127),
  concept("SMS-T18-C18", "SMS-T18-U09", "Copias auténticas", "Competencia, validez, solicitud, digitalización y efectos de las copias auténticas.", 18, "art. 27", 128, 130),
  concept("SMS-T18-C19", "SMS-T18-U09", "Documentos aportados por los interesados", "Derecho a no aportar, consulta, aportación excepcional y responsabilidad sobre la veracidad documental.", 19, "art. 28", 130, 131),
  concept("SMS-T18-C20", "SMS-T18-U10", "Obligatoriedad y cómputo por horas y días", "Obligatoriedad de términos y plazos y reglas de cómputo por horas y días.", 20, "arts. 29 y 30.1-3", 132, 133, "medium"),
  concept("SMS-T18-C21", "SMS-T18-U10", "Cómputo por meses/años y días inhábiles", "Reglas de fecha a fecha, vencimiento, inhábiles y calendarios.", 21, "art. 30.4-8", 133, 134, "medium", ["SMS-T18-C22"]),
  concept("SMS-T18-C22", "SMS-T18-U10", "Cómputo de plazos en registros electrónicos", "Fecha y hora oficial, presentación en inhábiles y orden de entrada en registro electrónico.", 22, "art. 31", 134, 135, "medium", ["SMS-T18-C21"], ["La pregunta 0236 integra calendario territorial y registro; revisar primary definitivo."]),
  concept("SMS-T18-C23", "SMS-T18-U11", "Ampliación de plazos de trámites", "Regla general, límite, notificación y régimen de ampliación del artículo 32.", 23, "art. 32", 135, 136, "medium", ["SMS-T18-C13", "SMS-T18-C24"]),
  concept("SMS-T18-C24", "SMS-T18-U11", "Tramitación de urgencia", "Reducción de plazos, excepciones y relación con otras reglas de plazo.", 24, "art. 33", 136, 136, "medium", ["SMS-T18-C23"], ["Las preguntas 0154 y 0237 contienen contraste con motivación/ampliación; revisar primary definitivo."]),
  concept("SMS-T18-C25", "SMS-T18-U12", "Producción y contenido de los actos", "Competencia, requisitos y adecuación del contenido al ordenamiento y al fin del acto.", 25, "art. 34", 136, 136, "medium", ["SMS-T18-C26"]),
  concept("SMS-T18-C26", "SMS-T18-U12", "Motivación de los actos", "Supuestos que exigen motivación y suficiencia de hechos y fundamentos de derecho.", 26, "art. 35", 137, 138, "medium", ["SMS-T18-C25"], ["La pregunta 0238 integra potestad discrecional y límites del contenido; revisar frontera C25/C26."]),
  concept("SMS-T18-C27", "SMS-T18-U12", "Forma de los actos", "Regla escrita, actos verbales y constancia cuando procede una serie de actos.", 27, "art. 36", 138),
  concept("SMS-T18-C28", "SMS-T18-U13", "Inderogabilidad singular", "Prohibición de excepcionar singularmente una disposición general y consecuencias de la vulneración.", 28, "art. 37", 138, 139),
  concept("SMS-T18-C29", "SMS-T18-U13", "Ejecutividad de los actos", "Regla de ejecutividad y distinción frente a firmeza o eficacia demorada.", 29, "art. 38", 139, 139, "medium", ["SMS-T18-C30"], ["La pregunta 0239 contrasta ejecutividad y eficacia demorada; revisar primary definitivo."]),
  concept("SMS-T18-C30", "SMS-T18-U13", "Eficacia, demora y retroactividad", "Presunción de validez, eficacia desde la fecha, eficacia demorada y retroactividad favorable.", 30, "art. 39.1-3", 139, 140, "medium", ["SMS-T18-C29"]),
  concept("SMS-T18-C31", "SMS-T18-U13", "Efectos en otras Administraciones y actuaciones de ejecución", "Observancia por otras Administraciones y requerimiento de cooperación para ejecutar actos.", 31, "art. 39.4-5", 140, 140, "medium"),
  concept("SMS-T18-C32", "SMS-T18-U14", "Notificación: obligación, contenido y defectos", "Plazo, contenido mínimo y tratamiento de notificaciones con contenido incompleto.", 32, "art. 40", 140),
  concept("SMS-T18-C33", "SMS-T18-U14", "Condiciones generales de las notificaciones", "Medio elegido u obligatorio, garantías, avisos, comparecencia espontánea y pluralidad de cauces.", 33, "art. 41", 141, 143, "medium"),
  concept("SMS-T18-C34", "SMS-T18-U15", "Notificaciones en papel", "Entrega, segundo intento, domicilio y acceso electrónico complementario.", 34, "art. 42", 143),
  concept("SMS-T18-C35", "SMS-T18-U15", "Notificaciones electrónicas", "Comparecencia electrónica, puesta a disposición, acceso y rechazo por transcurso del plazo.", 35, "art. 43", 144),
  concept("SMS-T18-C36", "SMS-T18-U15", "Notificación infructuosa", "Publicación en BOE cuando los interesados son desconocidos o la notificación resulta imposible.", 36, "art. 44", 145),
  concept("SMS-T18-C37", "SMS-T18-U15", "Publicación de actos", "Supuestos, contenido y efectos de la publicación sustitutiva o complementaria.", 37, "art. 45", 145),
  concept("SMS-T18-C38", "SMS-T18-U15", "Protección en notificaciones y publicaciones", "Indicación somera y publicación separada cuando la publicidad puede lesionar derechos o intereses legítimos.", 38, "art. 46", 146),
  concept("SMS-T18-C39", "SMS-T18-U16", "Nulidad de pleno derecho", "Causas de nulidad de actos y disposiciones administrativas y sus fronteras.", 39, "art. 47", 146, 147),
  concept("SMS-T18-C40", "SMS-T18-U16", "Anulabilidad", "Infracción del ordenamiento, desviación de poder y reglas sobre defectos de forma y plazo.", 40, "art. 48", 147, 148),
  concept("SMS-T18-C41", "SMS-T18-U16", "Límites a la extensión de la invalidez", "Invalidez parcial, independencia de actos sucesivos y partes separables.", 41, "art. 49", 148),
  concept("SMS-T18-C42", "SMS-T18-U16", "Conversión de actos viciados", "Efectos de un acto nulo o anulable que reúne los elementos constitutivos de otro acto distinto.", 42, "art. 50", 148),
  concept("SMS-T18-C43", "SMS-T18-U16", "Conservación de actos y trámites", "Conservación de actuaciones cuyo contenido habría permanecido igual sin la infracción.", 43, "art. 51", 148),
  concept("SMS-T18-C44", "SMS-T18-U16", "Convalidación", "Convalidación de actos anulables, efectos y reglas especiales por incompetencia o falta de autorización.", 44, "art. 52", 148, 149),
];

const questionGroups: Record<string, string[]> = {
  "SMS-T18-C01": ["0001", "0061", "0201"],
  "SMS-T18-C02": ["0002", "0003", "0004", "0005", "0062", "0063", "0064", "0121", "0122", "0202"],
  "SMS-T18-C03": ["0006", "0007", "0065", "0066", "0123", "0203"],
  "SMS-T18-C04": ["0008", "0009", "0010", "0011", "0067", "0068", "0124", "0125", "0221"],
  "SMS-T18-C05": ["0012", "0013", "0069", "0126", "0127", "0181", "0182", "0205"],
  "SMS-T18-C06": ["0014", "0070", "0128", "0183", "0206", "0222"],
  "SMS-T18-C07": ["0015", "0071", "0072", "0129", "0207", "0223"],
  "SMS-T18-C08": ["0016", "0184", "0208", "0224"],
  "SMS-T18-C09": ["0017", "0073", "0185", "0209", "0225"],
  "SMS-T18-C10": ["0018", "0019", "0074", "0130", "0131"],
  "SMS-T18-C11": ["0020", "0021", "0075", "0076", "0186", "0210", "0227"],
  "SMS-T18-C12": ["0022", "0077", "0078", "0079", "0080", "0132", "0133", "0134", "0135", "0136", "0187", "0211", "0228"],
  "SMS-T18-C13": ["0023", "0081", "0137", "0226", "0229"],
  "SMS-T18-C14": ["0024", "0082", "0083", "0138", "0139", "0140", "0188", "0230"],
  "SMS-T18-C15": ["0025", "0026", "0084", "0141", "0212", "0231"],
  "SMS-T18-C16": ["0027", "0085", "0142", "0189", "0232"],
  "SMS-T18-C17": ["0028", "0086", "0143", "0190", "0213", "0233"],
  "SMS-T18-C18": ["0029", "0087", "0144", "0145", "0179", "0191", "0214", "0234"],
  "SMS-T18-C19": ["0030", "0088", "0146", "0180", "0192", "0193", "0215", "0235"],
  "SMS-T18-C20": ["0031", "0032", "0033", "0034", "0089", "0090", "0147", "0148"],
  "SMS-T18-C21": ["0035", "0036", "0091", "0092", "0149", "0150", "0195", "0216"],
  "SMS-T18-C22": ["0037", "0038", "0093", "0094", "0095", "0151", "0196", "0217", "0236"],
  "SMS-T18-C23": ["0039", "0096", "0097", "0152", "0153", "0197", "0218"],
  "SMS-T18-C24": ["0040", "0098", "0154", "0237"],
  "SMS-T18-C25": ["0041", "0198"],
  "SMS-T18-C26": ["0042", "0099", "0100", "0101", "0155", "0156", "0219", "0238"],
  "SMS-T18-C27": ["0043", "0102", "0103", "0157"],
  "SMS-T18-C28": ["0044", "0104", "0158"],
  "SMS-T18-C29": ["0199", "0239"],
  "SMS-T18-C30": ["0045", "0046", "0105", "0159", "0160"],
  "SMS-T18-C31": ["0106", "0107", "0161"],
  "SMS-T18-C32": ["0047", "0108", "0109", "0162", "0200", "0220"],
  "SMS-T18-C33": ["0048", "0049", "0050", "0110", "0111", "0112", "0113", "0163", "0194", "0204", "0240"],
  "SMS-T18-C34": ["0051", "0114", "0164"],
  "SMS-T18-C35": ["0052", "0115", "0165"],
  "SMS-T18-C36": ["0053", "0166"],
  "SMS-T18-C37": ["0054", "0116", "0167", "0168"],
  "SMS-T18-C38": ["0117", "0169"],
  "SMS-T18-C39": ["0055", "0118", "0119", "0170", "0171", "0172", "0173"],
  "SMS-T18-C40": ["0056", "0120", "0174"],
  "SMS-T18-C41": ["0057", "0175"],
  "SMS-T18-C42": ["0058"],
  "SMS-T18-C43": ["0059"],
  "SMS-T18-C44": ["0060", "0176", "0177", "0178"],
};

function fullCode(suffix: string) {
  return `SMS-T18-${suffix}`;
}

export const topic18Gate1Assignments: FactoryQuestionAssignment[] = Object.entries(questionGroups).flatMap(
  ([primaryConceptCode, suffixes]) =>
    suffixes.map((suffix) => ({
      questionCode: fullCode(suffix),
      primaryConceptCode,
      confidence: topic18Gate1Concepts.find((entry) => entry.code === primaryConceptCode)?.confidence ?? "medium",
      rationale: "Asignación preliminar por fuente legal, metadatos V2 y frontera conceptual propuesta; pendiente de Gate 1.",
    })),
);

export const topic18ExistingPilotAnchor = {
  units: ["SMS-T18-U07", "SMS-T18-U08"],
  concepts: ["SMS-T18-C14", "SMS-T18-C15", "SMS-T18-C16"],
  primaryMappings: {
    "SMS-T18-C14": questionGroups["SMS-T18-C14"],
    "SMS-T18-C15": questionGroups["SMS-T18-C15"],
    "SMS-T18-C16": questionGroups["SMS-T18-C16"],
  },
  flashcardCount: 11,
} as const;

export const topic18Gate1Report = buildGate1Report({
  job: topic18Gate1Job,
  units: topic18Gate1Units,
  concepts: topic18Gate1Concepts,
  assignments: topic18Gate1Assignments,
});
