import type {
  V4FlashcardPackage,
  V4SourceRef,
  V4StudyContentPackage,
  V4StudyUnitPackage,
} from "../../v4-content-package";
import { topic18SilencePilotPackage } from "../../v4-pilots/topic-18-silence";
import { topic18ApprovedAssignments } from "./topic-18-approved-gate1";
import { topic18GapQuestionCandidates } from "./topic-18-gap-questions";
import { topic18Gate1Concepts, topic18Gate1Units } from "./topic-18-gate1";

function source(article: string, pageStart: number, pageEnd = pageStart): V4SourceRef[] {
  const pages = pageStart === pageEnd ? `p. ${pageStart}` : `pp. ${pageStart}-${pageEnd}`;
  return [{
    label: "Temario_new.pdf",
    reference: `Temario_new.pdf, ${article}, ${pages}`,
    pageStart,
    pageEnd,
  }];
}

type UnitCopy = Pick<
  V4StudyUnitPackage,
  "estimatedMinutes" | "studySummary" | "examKeys" | "confusions" | "traps" | "mnemonics"
>;

const copy: Record<string, UnitCopy> = {
  "SMS-T18-U01": {
    estimatedMinutes: 8,
    studySummary: "Los artículos 13 y 14 separan los derechos generales de las personas ante las Administraciones de las reglas sobre relación electrónica. Las personas físicas pueden elegir medio salvo obligación, mientras que el artículo 14 enumera sujetos obligados y permite imponer reglamentariamente la relación electrónica a determinados colectivos cuando concurren las condiciones del temario.",
    examKeys: ["Artículo 13: derechos de quienes tienen capacidad de obrar ante las Administraciones.", "Artículo 14: elección de medio para personas físicas no obligadas y catálogo de sujetos obligados."],
    confusions: ["No confundir derechos generales del artículo 13 con los derechos específicos del interesado del artículo 53."],
    traps: ["Sustituir capacidad de obrar por condición de interesado; tratar la elección de medio como absoluta."],
    mnemonics: [],
  },
  "SMS-T18-U02": {
    estimatedMinutes: 10,
    studySummary: "El artículo 15 regula la lengua de los procedimientos, incluida la lengua cooficial y la regla para varios interesados. El artículo 16 desarrolla el Registro Electrónico General, asientos y recibos, presentación de documentos, digitalización, pagos y oficinas de asistencia, además de la regla para documentos sometidos a una forma especial de presentación.",
    examKeys: ["AGE: castellano con las reglas de lengua cooficial del artículo 15.", "El registro deja asiento y recibo y admite los cauces de presentación del artículo 16."],
    confusions: ["No confundir la lengua elegida por una persona con la solución cuando varios interesados discrepan."],
    traps: ["Dar por presentado en el registro ordinario un documento sujeto a un régimen especial de presentación."],
    mnemonics: [],
  },
  "SMS-T18-U03": {
    estimatedMinutes: 8,
    studySummary: "El artículo 17 exige archivo electrónico único para documentos electrónicos de procedimientos finalizados y fija garantías de conservación y seguridad. Los artículos 18 a 20 regulan colaboración y sus límites, comparecencia solo cuando la imponga una norma con rango de ley y responsabilidad directa de titulares de unidades y personal encargado de la tramitación.",
    examKeys: ["Archivo electrónico único con garantías de autenticidad, integridad, conservación y seguridad.", "Comparecencia obligatoria solo con cobertura en norma con rango de ley.", "Responsabilidad directa de quienes tienen a su cargo resolución o despacho."],
    confusions: ["No confundir colaboración con deber ilimitado de revelar información protegida."],
    traps: ["Imponer comparecencia sin cobertura legal; atribuir la responsabilidad de tramitación solo al órgano resolutorio."],
    mnemonics: [],
  },
  "SMS-T18-U04": {
    estimatedMinutes: 8,
    studySummary: "El artículo 21 establece la obligación general de dictar resolución expresa y notificarla, con las excepciones del propio precepto. Regula también el plazo máximo, el límite general de seis meses salvo excepción, el plazo supletorio de tres meses y el inicio del cómputo según el procedimiento sea de oficio o a solicitud.",
    examKeys: ["Obligación general de resolver y notificar.", "Sin plazo específico: tres meses.", "Dies a quo distinto en procedimientos de oficio y a solicitud."],
    confusions: ["No confundir el plazo supletorio de tres meses con el límite general de seis meses."],
    traps: ["Usar el mismo dies a quo para procedimientos de oficio y a solicitud."],
    mnemonics: [],
  },
  "SMS-T18-U05": {
    estimatedMinutes: 8,
    studySummary: "El artículo 22 contiene los supuestos en los que el transcurso del plazo máximo para resolver puede o debe suspenderse. La suspensión detiene el cómputo por una causa legal y no debe confundirse con las ampliaciones de los artículos 23 y 32.",
    examKeys: ["Distinguir supuestos potestativos y obligatorios de suspensión.", "Cada causa tiene su propia regla temporal."],
    confusions: ["Suspensión y ampliación son técnicas diferentes."],
    traps: ["Aplicar a la suspensión los límites propios de la ampliación."],
    mnemonics: [],
  },
  "SMS-T18-U06": {
    estimatedMinutes: 5,
    studySummary: "El artículo 23 regula la ampliación excepcional del plazo máximo para resolver y notificar cuando, incluso tras habilitar medios personales y materiales en los términos del artículo 21.5, no pueda cumplirse el plazo. Es una figura distinta de la ampliación de plazos de trámites del artículo 32.",
    examKeys: ["Artículo 23: ampliación excepcional del plazo máximo para resolver y notificar.", "No puede superar el plazo establecido para la tramitación del procedimiento."],
    confusions: ["No confundir artículo 23 con artículo 32."],
    traps: ["Aplicar al artículo 23 el límite de la mitad del artículo 32."],
    mnemonics: [],
  },
  "SMS-T18-U09": {
    estimatedMinutes: 10,
    studySummary: "Los artículos 26 a 28 regulan documentos, copias auténticas y documentos aportados por los interesados. El artículo 26 define documentos públicos administrativos y requisitos del documento electrónico; el 27 regula competencia, identidad, validez y eficacia de copias auténticas; el 28 establece el régimen de aportación y el derecho a no aportar determinados documentos ya disponibles para las Administraciones.",
    examKeys: ["Documento público administrativo: válidamente emitido por un órgano de una Administración.", "Copias auténticas: misma validez y eficacia que los originales; las de documentos privados producen efectos administrativos.", "Derecho a no aportar determinados documentos ya disponibles."],
    confusions: ["No exigir firma electrónica a los documentos exceptuados por el artículo 26.3."],
    traps: ["Atribuir a la copia auténtica de un documento privado efectos distintos de los administrativos."],
    mnemonics: [],
  },
  "SMS-T18-U10": {
    estimatedMinutes: 10,
    studySummary: "Los artículos 29 a 31 regulan obligatoriedad y cómputo de términos y plazos. El artículo 30 distingue horas, días, meses y años, días inhábiles y calendarios. El artículo 31 adapta el cómputo a los registros electrónicos mediante fecha y hora oficial, presentación en inhábiles y el calendario específico del registro.",
    examKeys: ["Horas: hábiles; si el plazo supera veinticuatro horas se expresa en días.", "Días: hábiles salvo previsión distinta; comienzo al día siguiente.", "Meses/años: regla de fecha a fecha y último día del mes si no existe equivalente.", "Registro electrónico: calendario propio del artículo 31."],
    confusions: ["No confundir días hábiles y naturales; no trasladar sin matices el artículo 30.6 al registro electrónico."],
    traps: ["Contar desde el mismo día de la notificación; mantener un vencimiento en día inhábil."],
    mnemonics: [],
  },
  "SMS-T18-U11": {
    estimatedMinutes: 7,
    studySummary: "El artículo 32 permite ampliar plazos de trámites hasta la mitad cuando las circunstancias lo aconsejen y no se perjudiquen derechos de tercero; la petición y decisión deben producirse antes del vencimiento. El artículo 33 regula la urgencia: por interés público, reduce a la mitad los plazos ordinarios salvo los de presentación de solicitudes y recursos.",
    examKeys: ["Ampliación ordinaria: hasta la mitad y antes del vencimiento.", "Un plazo vencido no puede ampliarse.", "Urgencia: mitad de plazos salvo solicitudes y recursos."],
    confusions: ["No confundir artículo 32 con la ampliación excepcional del artículo 23."],
    traps: ["Ampliar un plazo ya vencido; reducir por urgencia el plazo de solicitudes o recursos."],
    mnemonics: [],
  },
  "SMS-T18-U12": {
    estimatedMinutes: 8,
    studySummary: "Los artículos 34 a 36 regulan producción, contenido, motivación y forma de los actos. El acto debe producirlo el órgano competente con arreglo a requisitos y procedimiento; su contenido debe respetar el ordenamiento, ser determinado y adecuado a sus fines. La motivación se exige en los supuestos del artículo 35 y la forma escrita electrónica es la regla del artículo 36, con sus excepciones.",
    examKeys: ["Competencia + requisitos + procedimiento.", "Contenido conforme al ordenamiento, determinado y adecuado a sus fines.", "Motivación: sucinta referencia de hechos y fundamentos de derecho cuando proceda."],
    confusions: ["La competencia del órgano no sustituye los requisitos y el procedimiento."],
    traps: ["Dar por motivado un acto solo por identificar el órgano; confundir forma verbal con ausencia de constancia cuando proceda."],
    mnemonics: [],
  },
  "SMS-T18-U13": {
    estimatedMinutes: 8,
    studySummary: "El artículo 37 prohíbe que una resolución singular vulnere una disposición general y fija consecuencias de nulidad. El artículo 38 contiene la regla única de ejecutividad. El artículo 39 regula presunción de validez, eficacia desde la fecha, eficacia demorada, retroactividad y efectos respecto de otras Administraciones. Ejecutividad y eficacia no son equivalentes.",
    examKeys: ["No hay derogación singular de disposiciones generales por razón de jerarquía.", "Artículo 38: los actos sujetos al Derecho Administrativo son ejecutivos con arreglo a la Ley.", "Artículo 39.2: eficacia demorada por contenido, notificación, publicación o aprobación superior."],
    confusions: ["No confundir ejecutividad del artículo 38 con eficacia demorada del artículo 39."],
    traps: ["Usar el artículo 38 como regla decisiva cuando el caso pregunta cuándo despliega eficacia el acto."],
    mnemonics: [],
  },
  "SMS-T18-U14": {
    estimatedMinutes: 8,
    studySummary: "El artículo 40 regula obligación de notificar, plazo para cursar la notificación y contenido, incluido el régimen de notificaciones defectuosas. El artículo 41 establece las condiciones generales de práctica, medio elegido u obligatorio y aviso de puesta a disposición, que no sustituye a la notificación.",
    examKeys: ["La notificación debe contener el texto íntegro y la información sobre recursos exigida por el artículo 40.", "Debe cursarse dentro de diez días desde que el acto fue dictado.", "El aviso no sustituye la notificación."],
    confusions: ["No confundir aviso y notificación."],
    traps: ["Tratar el aviso como requisito constitutivo de toda notificación."],
    mnemonics: [],
  },
  "SMS-T18-U15": {
    estimatedMinutes: 9,
    studySummary: "Los artículos 42 y 43 distinguen notificaciones en papel y electrónicas. La notificación en papel se pone además a disposición electrónica y el artículo 42 regula recepción e intentos en domicilio. La electrónica se practica mediante los sistemas del artículo 43 y puede entenderse rechazada tras diez días naturales sin acceso. El artículo 44 regula la notificación infructuosa, el 45 la publicación y el 46 la protección cuando la publicidad íntegra pueda lesionar derechos o intereses legítimos.",
    examKeys: ["Papel: disponibilidad electrónica adicional para acceso voluntario.", "Electrónica: rechazo tras diez días naturales en los supuestos del artículo 43.", "Artículo 44: anuncio obligatorio en BOE; otros medios son complementarios.", "Artículo 46: publicación limitada si el órgano competente aprecia lesión."],
    confusions: ["No confundir publicación, notificación electrónica y disponibilidad electrónica de una notificación en papel."],
    traps: ["Contar el rechazo electrónico en días hábiles; sustituir el anuncio obligatorio del artículo 44 por un medio complementario."],
    mnemonics: [],
  },
  "SMS-T18-U16": {
    estimatedMinutes: 10,
    studySummary: "Los artículos 47 y 48 distinguen nulidad de pleno derecho y anulabilidad. El artículo 49 limita la extensión de invalidez a actos sucesivos independientes y partes separables. El artículo 50 regula conversión, el 51 conservación de actos y trámites y el 52 convalidación de actos anulables.",
    examKeys: ["Nulidad y anulabilidad tienen causas distintas.", "La invalidez no se propaga automáticamente a actos sucesivos independientes ni a partes separables.", "Conversión: el acto viciado contiene elementos constitutivos de otro acto distinto.", "Conservación: contenido que habría permanecido igual sin la infracción.", "Convalidación: actos anulables."],
    confusions: ["No confundir conversión, conservación y convalidación."],
    traps: ["Extender automáticamente la invalidez a todo el procedimiento; tratar cualquier defecto formal o temporal como nulidad."],
    mnemonics: [],
  },
};

const unitSources: Record<string, V4SourceRef[]> = {
  "SMS-T18-U01": source("arts. 13-14", 113, 115),
  "SMS-T18-U02": source("arts. 15-16", 115, 118),
  "SMS-T18-U03": source("arts. 17-20", 119, 120),
  "SMS-T18-U04": source("art. 21", 121, 122),
  "SMS-T18-U05": source("art. 22", 122, 124),
  "SMS-T18-U06": source("art. 23", 124),
  "SMS-T18-U07": source("art. 24", 125, 126),
  "SMS-T18-U08": source("art. 25", 126, 127),
  "SMS-T18-U09": source("arts. 26-28", 127, 131),
  "SMS-T18-U10": source("arts. 29-31", 132, 135),
  "SMS-T18-U11": source("arts. 32-33", 135, 136),
  "SMS-T18-U12": source("arts. 34-36", 136, 138),
  "SMS-T18-U13": source("arts. 37-39", 138, 140),
  "SMS-T18-U14": source("arts. 40-41", 140, 143),
  "SMS-T18-U15": source("arts. 42-46", 143, 146),
  "SMS-T18-U16": source("arts. 47-52", 146, 149),
};

const pilotUnitByCode = new Map(topic18SilencePilotPackage.units.map((unit) => [unit.code, unit]));
export const topic18Gate2Units: V4StudyUnitPackage[] = topic18Gate1Units.map((proposal) => {
  const pilot = pilotUnitByCode.get(proposal.code);
  if (pilot) return { ...pilot, sourceRefs: unitSources[proposal.code] };
  const content = copy[proposal.code];
  if (!content) throw new Error(`Missing V4 content for ${proposal.code}`);
  return {
    code: proposal.code,
    title: proposal.title,
    position: proposal.position,
    ...content,
    sourceRefs: unitSources[proposal.code],
    sourceSubtopicName: proposal.title,
  };
});

const pilotConceptByCode = new Map(topic18SilencePilotPackage.concepts.map((concept) => [concept.code, concept]));
const localPositions = new Map<string, number>();
export const topic18Gate2Concepts = topic18Gate1Concepts.map((proposal) => {
  const pilot = pilotConceptByCode.get(proposal.code);
  if (pilot) return { ...pilot };
  const position = (localPositions.get(proposal.unitCode) ?? 0) + 1;
  localPositions.set(proposal.unitCode, position);
  return {
    code: proposal.code,
    unitCode: proposal.unitCode,
    title: proposal.title,
    description: proposal.description,
    position,
  };
});

const generatedMappings = topic18GapQuestionCandidates.map((candidate) => ({
  questionCode: String(candidate.v2.codigo),
  primaryConceptCode: candidate.conceptCode,
}));

export const topic18Gate2QuestionMappings = [
  ...topic18ApprovedAssignments.map(({ questionCode, primaryConceptCode }) => ({ questionCode, primaryConceptCode })),
  ...generatedMappings,
];

type CardSpec = {
  conceptCode: string;
  type: V4FlashcardPackage["type"];
  prompt: string;
  answer: string;
  article: string;
  pageStart: number;
  pageEnd?: number;
};

const cardSpecs: CardSpec[] = [
  { conceptCode: "SMS-T18-C01", type: "direct", prompt: "¿A quién atribuye el artículo 13 los derechos generales frente a las Administraciones?", answer: "A quienes, conforme al artículo 3, tengan capacidad de obrar ante las Administraciones Públicas.", article: "art. 13", pageStart: 113, pageEnd: 114 },
  { conceptCode: "SMS-T18-C02", type: "contrast", prompt: "¿Qué puede hacer una persona física no obligada respecto del medio de relación?", answer: "Elegir entre medio electrónico o no y modificar su elección.", article: "art. 14.1", pageStart: 114, pageEnd: 115 },
  { conceptCode: "SMS-T18-C03", type: "contrast", prompt: "Si varios interesados discrepan sobre la lengua en un procedimiento de la AGE, ¿qué lengua rige la tramitación?", answer: "El castellano, sin perjuicio de expedir documentos o testimonios en la lengua elegida por cada interesado cuando proceda.", article: "art. 15", pageStart: 115, pageEnd: 116 },
  { conceptCode: "SMS-T18-C04", type: "direct", prompt: "¿Qué deja constancia el Registro Electrónico General?", answer: "Los asientos de documentos presentados o recibidos con los datos exigidos por el artículo 16.", article: "art. 16.1-3", pageStart: 116, pageEnd: 117 },
  { conceptCode: "SMS-T18-C05", type: "exception", prompt: "¿Qué ocurre con un documento sometido a una forma especial de presentación?", answer: "No se tiene por presentado en el registro ordinario si se presenta incumpliendo ese régimen especial.", article: "art. 16.8", pageStart: 118 },
  { conceptCode: "SMS-T18-C06", type: "direct", prompt: "¿Qué archivo exige el artículo 17 para procedimientos finalizados?", answer: "Un archivo electrónico único de los documentos electrónicos correspondientes.", article: "art. 17", pageStart: 119 },
  { conceptCode: "SMS-T18-C07", type: "exception", prompt: "¿El deber de colaboración del artículo 18 es ilimitado?", answer: "No; el propio artículo recoge límites vinculados a derechos y a determinada información protegida.", article: "art. 18", pageStart: 119, pageEnd: 120 },
  { conceptCode: "SMS-T18-C08", type: "direct", prompt: "¿Cuándo puede ser obligatoria la comparecencia ante oficinas públicas?", answer: "Cuando esté prevista en una norma con rango de ley.", article: "art. 19.1", pageStart: 120 },
  { conceptCode: "SMS-T18-C09", type: "direct", prompt: "¿Quién responde directamente de la tramitación de los asuntos a su cargo?", answer: "Titulares de unidades administrativas y personal encargado de la resolución o despacho.", article: "art. 20", pageStart: 120 },
  { conceptCode: "SMS-T18-C10", type: "exception", prompt: "¿La obligación de resolver del artículo 21 carece de excepciones?", answer: "No; el artículo 21.1 recoge las excepciones reproducidas en el temario.", article: "art. 21.1", pageStart: 121 },
  { conceptCode: "SMS-T18-C11", type: "number_or_deadline", prompt: "Si no hay plazo específico, ¿cuál es el plazo máximo y desde cuándo cuenta en una solicitud?", answer: "Tres meses; desde la entrada de la solicitud en el registro electrónico de la Administración u organismo competente para tramitarla.", article: "art. 21.3", pageStart: 121, pageEnd: 122 },
  { conceptCode: "SMS-T18-C12", type: "direct", prompt: "¿Qué técnica regula el artículo 22 respecto del plazo máximo?", answer: "La suspensión de su transcurso en los supuestos previstos por el artículo.", article: "art. 22", pageStart: 122, pageEnd: 124 },
  { conceptCode: "SMS-T18-C13", type: "contrast", prompt: "¿Qué diferencia básica separa los artículos 23 y 32?", answer: "El 23 amplía excepcionalmente el plazo máximo para resolver y notificar; el 32 amplía plazos de trámites.", article: "arts. 23 y 32", pageStart: 124, pageEnd: 136 },
  { conceptCode: "SMS-T18-C17", type: "direct", prompt: "¿Qué son documentos públicos administrativos?", answer: "Los válidamente emitidos por los órganos de las Administraciones Públicas.", article: "art. 26.1", pageStart: 127 },
  { conceptCode: "SMS-T18-C18", type: "contrast", prompt: "¿Qué validez tienen las copias auténticas y qué límite tienen las de documentos privados?", answer: "Tienen la misma validez y eficacia que los originales; las copias auténticas de documentos privados surten únicamente efectos administrativos.", article: "art. 27.1-2", pageStart: 128, pageEnd: 130 },
  { conceptCode: "SMS-T18-C19", type: "direct", prompt: "¿Qué derecho evita aportar repetidamente determinados documentos?", answer: "El derecho del artículo 28 a no aportar los documentos que se encuentren en los supuestos previstos por el propio precepto.", article: "art. 28", pageStart: 130, pageEnd: 131 },
  { conceptCode: "SMS-T18-C20", type: "number_or_deadline", prompt: "¿Cómo se computa un plazo expresado por horas?", answer: "Por horas hábiles, de hora en hora y minuto en minuto; si supera veinticuatro horas se expresa en días.", article: "art. 30.1", pageStart: 132, pageEnd: 133 },
  { conceptCode: "SMS-T18-C21", type: "exception", prompt: "Si el último día de un plazo es inhábil, ¿qué sucede?", answer: "Se prorroga al primer día hábil siguiente.", article: "art. 30.5", pageStart: 133, pageEnd: 134 },
  { conceptCode: "SMS-T18-C22", type: "direct", prompt: "¿Qué calendario de inhábiles se aplica en registros electrónicos?", answer: "El determinado por la sede electrónica del registro conforme al artículo 31.3.", article: "art. 31.3", pageStart: 134, pageEnd: 135 },
  { conceptCode: "SMS-T18-C23", type: "number_or_deadline", prompt: "¿Cuál es el límite general de la ampliación del artículo 32.1?", answer: "No exceder de la mitad del plazo y acordarse antes de su vencimiento, sin perjudicar derechos de tercero.", article: "art. 32.1-3", pageStart: 135, pageEnd: 136 },
  { conceptCode: "SMS-T18-C24", type: "exception", prompt: "¿Qué plazos quedan fuera de la reducción por urgencia?", answer: "Los relativos a presentación de solicitudes y recursos.", article: "art. 33.1", pageStart: 136 },
  { conceptCode: "SMS-T18-C25", type: "direct", prompt: "¿Qué exige el artículo 34.1 para producir un acto?", answer: "Órgano competente y ajuste a requisitos y procedimiento establecido.", article: "art. 34.1", pageStart: 136 },
  { conceptCode: "SMS-T18-C26", type: "direct", prompt: "¿Cómo se expresa la motivación cuando el artículo 35 la exige?", answer: "Con sucinta referencia de hechos y fundamentos de derecho.", article: "art. 35", pageStart: 137, pageEnd: 138 },
  { conceptCode: "SMS-T18-C27", type: "direct", prompt: "¿Cuál es la regla general de forma de los actos?", answer: "Por escrito a través de medios electrónicos, salvo que su naturaleza exija otra forma más adecuada.", article: "art. 36", pageStart: 138 },
  { conceptCode: "SMS-T18-C28", type: "contrast", prompt: "¿Puede una resolución singular vulnerar una disposición general por proceder de un órgano superior?", answer: "No; el artículo 37 prohíbe la derogación singular en esos términos.", article: "art. 37", pageStart: 138, pageEnd: 139 },
  { conceptCode: "SMS-T18-C29", type: "direct", prompt: "¿Qué regla contiene el artículo 38 del temario?", answer: "Los actos de las Administraciones sujetos al Derecho Administrativo son ejecutivos con arreglo a la Ley.", article: "art. 38", pageStart: 139 },
  { conceptCode: "SMS-T18-C30", type: "contrast", prompt: "¿Cuándo puede demorarse la eficacia de un acto?", answer: "Cuando así lo exija su contenido o esté supeditada a notificación, publicación o aprobación superior.", article: "art. 39.2", pageStart: 139, pageEnd: 140 },
  { conceptCode: "SMS-T18-C31", type: "mini_case", prompt: "¿Qué prevé el artículo 39.5 cuando un acto debe basarse necesariamente en otro de otra Administración que se considera ilegal?", answer: "Requerimiento previo para anular o revisar y, si se rechaza, recurso contencioso-administrativo; el procedimiento queda suspendido.", article: "art. 39.5", pageStart: 140 },
  { conceptCode: "SMS-T18-C32", type: "number_or_deadline", prompt: "¿En qué plazo debe cursarse una notificación desde que se dicta el acto?", answer: "Dentro de diez días.", article: "art. 40.2", pageStart: 140 },
  { conceptCode: "SMS-T18-C33", type: "contrast", prompt: "¿El aviso al dispositivo o correo sustituye a la notificación?", answer: "No; es un aviso de puesta a disposición y su falta no impide la validez de la notificación.", article: "art. 41", pageStart: 141, pageEnd: 143 },
  { conceptCode: "SMS-T18-C34", type: "direct", prompt: "¿Qué acompaña a una notificación practicada en papel?", answer: "Su puesta a disposición en sede electrónica para acceso voluntario.", article: "art. 42.1", pageStart: 143 },
  { conceptCode: "SMS-T18-C35", type: "number_or_deadline", prompt: "¿Cuándo se entiende rechazada una notificación electrónica obligatoria o elegida?", answer: "Tras diez días naturales desde su puesta a disposición sin acceso al contenido.", article: "art. 43.2", pageStart: 144 },
  { conceptCode: "SMS-T18-C36", type: "exception", prompt: "¿Un medio complementario del artículo 44 sustituye el anuncio obligatorio en BOE?", answer: "No; no excluye la obligación de publicar el anuncio correspondiente en BOE.", article: "art. 44", pageStart: 145 },
  { conceptCode: "SMS-T18-C37", type: "direct", prompt: "¿Qué materia regula el artículo 45 en este bloque?", answer: "Los supuestos y régimen de publicación de actos administrativos reproducidos en el temario.", article: "art. 45", pageStart: 145 },
  { conceptCode: "SMS-T18-C38", type: "mini_case", prompt: "Si el órgano competente aprecia que la publicación íntegra lesiona derechos o intereses legítimos, ¿qué publica?", answer: "Una indicación somera del contenido y del lugar y plazo para comparecer, conocer el contenido íntegro y dejar constancia.", article: "art. 46", pageStart: 146 },
  { conceptCode: "SMS-T18-C39", type: "direct", prompt: "¿Qué categoría de invalidez regula el artículo 47?", answer: "La nulidad de pleno derecho.", article: "art. 47", pageStart: 146, pageEnd: 147 },
  { conceptCode: "SMS-T18-C40", type: "contrast", prompt: "¿Cuál es la regla general del artículo 48.1?", answer: "Son anulables los actos que incurran en cualquier infracción del ordenamiento jurídico, incluida la desviación de poder.", article: "art. 48.1", pageStart: 147, pageEnd: 148 },
  { conceptCode: "SMS-T18-C41", type: "exception", prompt: "¿La invalidez se transmite automáticamente a actos sucesivos independientes?", answer: "No; tampoco se extiende automáticamente a partes independientes del acto.", article: "art. 49", pageStart: 148 },
  { conceptCode: "SMS-T18-C42", type: "direct", prompt: "¿Cuándo opera la conversión del artículo 50?", answer: "Cuando el acto nulo o anulable contiene elementos constitutivos de otro acto distinto, cuyos efectos producirá.", article: "art. 50", pageStart: 148 },
  { conceptCode: "SMS-T18-C43", type: "direct", prompt: "¿Qué conserva el órgano que declara nulidad o anula actuaciones?", answer: "Los actos y trámites cuyo contenido se habría mantenido igual sin la infracción.", article: "art. 51", pageStart: 148 },
  { conceptCode: "SMS-T18-C44", type: "direct", prompt: "¿Sobre qué actos opera la convalidación del artículo 52?", answer: "Sobre actos anulables, subsanando sus vicios en los términos del artículo.", article: "art. 52", pageStart: 148, pageEnd: 149 },
];

const pilotConcepts = new Set(topic18SilencePilotPackage.flashcards.map((card) => card.conceptCode));
const newCards: V4FlashcardPackage[] = cardSpecs.map((spec, index) => ({
  code: `SMS-T18-F${String(index + 12).padStart(2, "0")}`,
  conceptCode: spec.conceptCode,
  type: spec.type,
  prompt: spec.prompt,
  answer: spec.answer,
  position: 1,
  sourceRefs: source(spec.article, spec.pageStart, spec.pageEnd ?? spec.pageStart),
}));
if (newCards.some((card) => pilotConcepts.has(card.conceptCode))) {
  throw new Error("Gate 2 cannot replace productive silence pilot cards.");
}

const pilotSources: Record<string, V4SourceRef[]> = {
  "SMS-T18-C14": source("art. 24", 125, 126),
  "SMS-T18-C15": source("art. 24", 125, 126),
  "SMS-T18-C16": source("art. 25", 126, 127),
};
const preservedPilotCards: V4FlashcardPackage[] = topic18SilencePilotPackage.flashcards.map((card) => ({
  ...card,
  sourceRefs: pilotSources[card.conceptCode],
}));

export const topic18Gate2Flashcards: V4FlashcardPackage[] = [...preservedPilotCards, ...newCards];

export const topic18Gate2V4Package = {
  version: "4.0",
  oppositionCode: "auxiliar-administrativo-sms",
  topicNumber: 18,
  sourceRevision: "Temario_new.pdf · Tema 18 · pp. 113-149 · Gate 2 draft · canonical source only",
  units: topic18Gate2Units,
  concepts: topic18Gate2Concepts,
  questionMappings: topic18Gate2QuestionMappings,
  flashcards: topic18Gate2Flashcards,
} satisfies V4StudyContentPackage;
