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
  return [
    {
      label: "Temario_new.pdf",
      reference: `Temario_new.pdf, ${article}, ${pages}`,
      pageStart,
      pageEnd,
    },
  ];
}

const unitContent: Record<
  string,
  Pick<
    V4StudyUnitPackage,
    "estimatedMinutes" | "studySummary" | "examKeys" | "confusions" | "traps" | "mnemonics"
  >
> = {
  "SMS-T18-U01": {
    estimatedMinutes: 8,
    studySummary:
      "El bloque comienza con los derechos generales de las personas que tienen capacidad de obrar ante las Administraciones Públicas y los diferencia de los derechos específicos de quienes ya son interesados en un procedimiento. A continuación regula la relación electrónica: como regla, la persona física puede elegir el medio salvo que esté obligada, mientras que determinadas categorías de sujetos deben relacionarse electrónicamente; además, puede imponerse reglamentariamente esa obligación a ciertos colectivos de personas físicas cuando concurran las condiciones recogidas en el temario.",
    examKeys: [
      "Artículo 13: derechos generales de las personas con capacidad de obrar ante las Administraciones.",
      "Los derechos del artículo 13 se entienden sin perjuicio de los derechos del artículo 53 de los interesados.",
      "La persona física puede elegir y modificar el medio de relación salvo obligación electrónica.",
      "El artículo 14.2 enumera sujetos obligados a relacionarse electrónicamente.",
    ],
    confusions: [
      "No identificar los derechos generales del artículo 13 con los derechos exclusivos del interesado del artículo 53.",
      "No convertir la libertad de elección de las personas físicas en una regla absoluta: existen sujetos y colectivos obligados.",
    ],
    traps: [
      "Sustituir 'capacidad de obrar' por 'condición de interesado'.",
      "Afirmar que el medio elegido por una persona física no puede modificarse.",
    ],
    mnemonics: [],
  },
  "SMS-T18-U02": {
    estimatedMinutes: 10,
    studySummary:
      "La lengua de los procedimientos de la Administración General del Estado es el castellano, con las reglas del temario para el uso de lenguas cooficiales y para los supuestos de varios interesados. El artículo 16 regula el Registro Electrónico General, los asientos, recibos, lugares de presentación, digitalización y devolución de originales, pagos vinculados a la presentación, oficinas de asistencia y documentos sometidos a una forma especial de presentación.",
    examKeys: [
      "AGE: castellano, con posibilidad de lengua cooficial cuando proceda según el artículo 15.",
      "El registro deja constancia del asiento y emite recibo de los documentos presentados.",
      "Los documentos pueden presentarse por los cauces enumerados en el artículo 16.4.",
      "Los documentos con régimen especial de presentación no se tienen por presentados en el registro ordinario.",
    ],
    confusions: [
      "No confundir lengua elegida por un interesado con la solución cuando varios interesados discrepan.",
      "No confundir digitalización con obligación de conservar siempre el original en poder de la Administración.",
    ],
    traps: [
      "Limitar la interoperabilidad a una sola clase territorial de Administración.",
      "Tratar cualquier presentación electrónica como válida aunque exista un régimen especial de presentación.",
    ],
    mnemonics: [],
  },
  "SMS-T18-U03": {
    estimatedMinutes: 8,
    studySummary:
      "El artículo 17 exige un archivo electrónico único para los documentos electrónicos de procedimientos finalizados y fija garantías de autenticidad, integridad, conservación, consulta y seguridad. Los artículos 18 a 20 completan las normas generales de actuación: colaboración de las personas y sus límites, comparecencia únicamente obligatoria cuando la prevea una norma con rango de ley, contenido de la citación y responsabilidad directa de quienes tienen a su cargo la tramitación.",
    examKeys: [
      "Archivo electrónico único de documentos electrónicos de procedimientos finalizados.",
      "La colaboración tiene límites expresos vinculados a información protegida.",
      "La comparecencia solo es obligatoria cuando la prevé una norma con rango de ley.",
      "Titulares de unidades y personal encargado son responsables directos de la tramitación.",
    ],
    confusions: [
      "No confundir archivo electrónico con conservación indiscriminada sin reglas de seguridad o eliminación autorizada.",
      "No confundir citación administrativa con potestad general para imponer comparecencias sin cobertura legal.",
    ],
    traps: [
      "Omitir los efectos de no atender la comparecencia entre los datos de la citación.",
      "Atribuir la responsabilidad de la tramitación solo al órgano resolutorio y no al personal encargado.",
    ],
    mnemonics: [],
  },
  "SMS-T18-U04": {
    estimatedMinutes: 8,
    studySummary:
      "La Administración debe dictar resolución expresa y notificarla en todos los procedimientos, cualquiera que sea su forma de iniciación, con las excepciones expresamente recogidas en el temario. El artículo 21 fija también cómo se determina el plazo máximo, el límite general de seis meses salvo excepción, el plazo supletorio de tres meses y el momento inicial del cómputo según el procedimiento sea de oficio o a solicitud del interesado.",
    examKeys: [
      "Obligación general de resolver y notificar, cualquiera que sea la forma de iniciación.",
      "Plazo máximo fijado por la norma reguladora; regla general de no exceder seis meses.",
      "Si no existe plazo específico: tres meses.",
      "Dies a quo distinto para procedimientos de oficio y a solicitud.",
    ],
    confusions: [
      "No confundir el plazo supletorio de tres meses con el límite general de seis meses.",
      "No usar el mismo dies a quo para procedimientos de oficio y a solicitud.",
    ],
    traps: [
      "Presentar como absoluta la obligación de resolver ignorando las excepciones del propio artículo 21.",
      "Contar el plazo de una solicitud desde su presentación en cualquier registro distinto del previsto en el temario.",
    ],
    mnemonics: [],
  },
  "SMS-T18-U05": {
    estimatedMinutes: 8,
    studySummary:
      "El artículo 22 regula los supuestos en que el transcurso del plazo máximo para resolver puede o debe suspenderse. La clave de examen es distinguir cada causa, su momento inicial y final y, cuando el precepto lo establece, los límites temporales. La suspensión no equivale a una ampliación del plazo: detiene el cómputo por la causa legal y se reanuda cuando cesa conforme a la regla aplicable.",
    examKeys: [
      "Distinguir los supuestos potestativos y obligatorios de suspensión del artículo 22.",
      "Cada causa tiene su propia regla temporal de inicio y reanudación.",
      "Suspensión y ampliación son técnicas distintas.",
    ],
    confusions: [
      "No trasladar a la suspensión los límites de la ampliación de los artículos 23 o 32.",
      "No tratar todas las causas de suspensión como si tuvieran idéntica duración.",
    ],
    traps: [
      "Confundir interrupción o suspensión con reinicio íntegro del plazo.",
      "Aplicar una suspensión sin el supuesto expresamente contemplado por el artículo 22.",
    ],
    mnemonics: [],
  },
  "SMS-T18-U06": {
    estimatedMinutes: 5,
    studySummary:
      "Cuando el número de solicitudes o de personas afectadas pueda impedir cumplir el plazo máximo, el órgano competente para resolver puede habilitar medios personales y materiales. Si aun así no es posible cumplirlo, el artículo 23 permite una ampliación excepcional del plazo máximo, motivada y dentro del límite previsto por el propio precepto. Esta ampliación es distinta de la ampliación de plazos de trámites del artículo 32.",
    examKeys: [
      "La ampliación del artículo 23 es excepcional y se refiere al plazo máximo para resolver y notificar.",
      "Debe agotarse previamente la posibilidad de habilitar medios personales y materiales en los términos del temario.",
      "No puede superar el plazo establecido para la tramitación del procedimiento.",
    ],
    confusions: ["No confundir artículo 23 con la ampliación ordinaria de plazos del artículo 32."],
    traps: ["Aplicar el límite de la mitad propio del artículo 32 a la ampliación excepcional del artículo 23."],
    mnemonics: [],
  },
  "SMS-T18-U09": {
    estimatedMinutes: 10,
    studySummary:
      "Los artículos 26 a 28 regulan documentos y copias administrativas. Los documentos públicos administrativos son los válidamente emitidos por órganos de las Administraciones y, como regla, se emiten por escrito y por medios electrónicos; el artículo 26 enumera requisitos de validez del documento electrónico y casos en que no se requiere firma. El artículo 27 regula la competencia y eficacia de las copias auténticas. El artículo 28 establece las reglas sobre documentos que aportan los interesados y el derecho a no aportar aquellos que ya obren en poder de la Administración o hayan sido elaborados por otra Administración en los términos del temario.",
    examKeys: [
      "Documento público administrativo: válidamente emitido por un órgano de una Administración Pública.",
      "El documento electrónico válido exige identificación, referencia temporal, metadatos y firmas cuando correspondan.",
      "Las copias auténticas tienen la misma validez y eficacia que los originales; las de documentos privados producen efectos administrativos.",
      "El interesado no debe aportar de nuevo determinados documentos ya disponibles para las Administraciones.",
    ],
    confusions: [
      "No confundir copia auténtica de documento privado con atribución de efectos distintos de los administrativos.",
      "No exigir firma electrónica a todo documento electrónico sin atender a las excepciones del artículo 26.3.",
    ],
    traps: [
      "Confundir el órgano que expide la copia con el soporte físico o electrónico en que se encuentra.",
      "Convertir el derecho a no aportar documentos en una prohibición absoluta de requerirlos en cualquier circunstancia.",
    ],
    mnemonics: [],
  },
  "SMS-T18-U10": {
    estimatedMinutes: 10,
    studySummary:
      "Los términos y plazos obligan tanto a las autoridades y personal al servicio de las Administraciones como a los interesados. El artículo 30 distingue cómputo por horas, días, meses y años, regula días inhábiles y calendarios; los plazos por días se cuentan desde el día siguiente y los de meses o años siguen la regla de fecha a fecha descrita en el temario. El artículo 31 adapta estas reglas al registro electrónico mediante fecha y hora oficial, presentación en inhábiles y calendario propio del registro.",
    examKeys: [
      "Horas: hábiles y cómputo de hora en hora y minuto en minuto; si supera 24 horas se expresa en días.",
      "Días: hábiles salvo previsión distinta; se excluyen sábados, domingos y festivos.",
      "Meses/años: comienzo al día siguiente y vencimiento en el día equivalente; si no existe, último día del mes.",
      "El registro electrónico aplica el calendario de inhábiles determinado por su sede conforme al artículo 31.",
    ],
    confusions: [
      "No confundir días hábiles con días naturales.",
      "No aplicar al registro electrónico sin matices la regla territorial del artículo 30.6.",
    ],
    traps: [
      "Contar los días desde el mismo día de la notificación.",
      "Mantener como vencimiento un día inhábil en vez del primer hábil siguiente.",
    ],
    mnemonics: [],
  },
  "SMS-T18-U11": {
    estimatedMinutes: 7,
    studySummary:
      "El artículo 32 permite ampliar plazos de trámites, salvo precepto en contrario, de oficio o a petición del interesado, hasta la mitad del plazo cuando las circunstancias lo aconsejen y no se perjudiquen derechos de terceros. La petición y la decisión deben producirse antes del vencimiento y un plazo vencido no puede ampliarse. El artículo 33 regula la tramitación de urgencia: por interés público, reduce a la mitad los plazos ordinarios salvo los de presentación de solicitudes y recursos.",
    examKeys: [
      "Ampliación ordinaria: hasta la mitad y antes del vencimiento.",
      "Un plazo ya vencido no es ampliable.",
      "Urgencia: reducción a la mitad, salvo solicitudes y recursos.",
      "La urgencia puede acordarse de oficio o a petición del interesado cuando razones de interés público lo aconsejen.",
    ],
    confusions: [
      "No confundir ampliación de trámites del artículo 32 con ampliación del plazo máximo del artículo 23.",
      "No reducir por urgencia los plazos de presentación de solicitudes y recursos.",
    ],
    traps: ["Aplicar la ampliación después de vencido el plazo.", "Aplicar la mitad de aumento del artículo 32 como regla del artículo 23."],
    mnemonics: [],
  },
  "SMS-T18-U12": {
    estimatedMinutes: 8,
    studySummary:
      "Los actos administrativos se producen por el órgano competente y deben ajustarse a los requisitos y al procedimiento establecido. Su contenido debe respetar el ordenamiento, ser determinado y adecuado a sus fines. El artículo 35 enumera los actos que deben motivarse con sucinta referencia de hechos y fundamentos de derecho. El artículo 36 establece la forma escrita a través de medios electrónicos como regla, con las previsiones específicas para actos de otra naturaleza o para actos verbales.",
    examKeys: [
      "Producción: órgano competente + requisitos + procedimiento.",
      "Contenido: conforme al ordenamiento, determinado y adecuado a los fines.",
      "La motivación se exige en los supuestos enumerados por el artículo 35.",
      "La regla de forma es escrita por medios electrónicos salvo que la naturaleza exija otra forma.",
    ],
    confusions: ["No confundir producción válida con mera competencia del órgano: también importan requisitos y procedimiento."],
    traps: ["Dar por motivado un acto solo por identificar el órgano que lo dicta.", "Confundir forma verbal con ausencia total de constancia cuando esta sea necesaria."],
    mnemonics: [],
  },
  "SMS-T18-U13": {
    estimatedMinutes: 8,
    studySummary:
      "El artículo 37 consagra la inderogabilidad singular: una resolución particular no puede vulnerar una disposición general, ni siquiera si procede de un órgano de igual o superior jerarquía; el propio artículo determina los supuestos de nulidad vinculados a esa vulneración. El artículo 38 establece la única regla de ejecutividad del temario. El artículo 39 regula la presunción de validez y eficacia de los actos, los supuestos de eficacia demorada y retroactiva y las relaciones con actos u órganos de otras Administraciones.",
    examKeys: [
      "Una resolución singular no puede vulnerar una disposición general por razón de jerarquía del órgano.",
      "Artículo 38: los actos sujetos al Derecho Administrativo son ejecutivos con arreglo a la Ley.",
      "Artículo 39: presunción de validez y eficacia desde la fecha salvo previsión distinta.",
      "La eficacia puede demorarse cuando lo exija el contenido o dependa de notificación, publicación o aprobación superior.",
    ],
    confusions: [
      "No confundir ejecutividad del artículo 38 con eficacia demorada del artículo 39.",
      "No atribuir a la jerarquía del órgano capacidad para excepcionar una disposición general mediante resolución singular.",
    ],
    traps: [
      "Usar el artículo 38 para resolver un caso cuya cuestión decisiva es cuándo despliega eficacia el acto.",
      "Confundir retroactividad permitida en los supuestos del artículo 39 con regla general de eficacia retroactiva.",
    ],
    mnemonics: [],
  },
  "SMS-T18-U14": {
    estimatedMinutes: 8,
    studySummary:
      "El artículo 40 establece la obligación de notificar las resoluciones y actos que afecten a derechos e intereses, el plazo para cursar la notificación y su contenido mínimo, así como el efecto de notificaciones que contienen el texto íntegro pero omiten otros requisitos. El artículo 41 fija las condiciones generales de práctica, elección o imposición del medio, avisos y supuestos en que puede cambiarse el canal o entenderse cumplida la obligación de puesta a disposición.",
    examKeys: [
      "La notificación debe contener el texto íntegro y los elementos sobre recursos exigidos por el artículo 40.",
      "El plazo general para cursar la notificación es de diez días desde que el acto fue dictado.",
      "El medio de notificación depende de elección, obligación y reglas del artículo 41.",
      "El aviso de puesta a disposición no sustituye a la notificación.",
    ],
    confusions: ["No confundir aviso con notificación.", "No confundir defecto de información sobre recursos con ausencia del texto íntegro del acto."],
    traps: ["Tratar el aviso como requisito constitutivo de validez de toda notificación.", "Omitir la información sobre recursos al definir el contenido normal de la notificación."],
    mnemonics: [],
  },
  "SMS-T18-U15": {
    estimatedMinutes: 9,
    studySummary:
      "Los artículos 42 y 43 distinguen la práctica en papel y por medios electrónicos. La notificación en papel se pone también a disposición electrónica, regula recepción en domicilio y segundo intento. La electrónica se practica mediante comparecencia en sede, dirección electrónica habilitada única o ambos sistemas y contiene la regla de rechazo tras diez días naturales sin acceso cuando sea obligatoria o haya sido elegida. El artículo 44 regula la notificación infructuosa mediante anuncio en el BOE, el 45 la publicación y el 46 la protección de derechos o intereses legítimos cuando la publicidad íntegra pudiera lesionarlos.",
    examKeys: [
      "Papel: puesta a disposición electrónica adicional para acceso voluntario.",
      "Segundo intento en domicilio: reglas temporales específicas del artículo 42.",
      "Electrónica: acceso por el interesado o representante debidamente identificado; rechazo tras diez días naturales en los supuestos del artículo 43.",
      "Notificación infructuosa: anuncio obligatorio en BOE; otros medios pueden ser complementarios.",
      "Artículo 46: publicación limitada cuando el órgano competente aprecia lesión de derechos o intereses legítimos.",
    ],
    confusions: [
      "No confundir publicación con notificación electrónica.",
      "No sustituir el anuncio obligatorio en BOE por un medio complementario del artículo 44.",
    ],
    traps: [
      "Contar el rechazo electrónico en días hábiles en vez de naturales.",
      "Confundir el acceso voluntario a una copia electrónica de una notificación en papel con la obligación de notificar electrónicamente.",
    ],
    mnemonics: [],
  },
  "SMS-T18-U16": {
    estimatedMinutes: 10,
    studySummary:
      "Los artículos 47 y 48 separan nulidad de pleno derecho y anulabilidad. El artículo 49 limita la extensión de la invalidez a actos sucesivos independientes y partes separables. El artículo 50 permite la conversión de un acto nulo o anulable cuando contiene los elementos constitutivos de otro distinto; el artículo 51 obliga a conservar actos y trámites cuyo contenido se habría mantenido igual sin la infracción; y el artículo 52 regula la convalidación de actos anulables y sus reglas especiales.",
    examKeys: [
      "Nulidad y anulabilidad son categorías distintas con causas diferentes.",
      "La invalidez no se propaga automáticamente a actos sucesivos independientes ni a partes separables.",
      "Conversión: el acto viciado contiene los elementos constitutivos de otro acto distinto y produce sus efectos.",
      "Conservación: se mantienen actuaciones cuyo contenido habría sido el mismo sin la infracción.",
      "Convalidación: recae sobre actos anulables en los términos del artículo 52.",
    ],
    confusions: [
      "No confundir conversión, conservación y convalidación.",
      "No convertir todo defecto formal o temporal en nulidad de pleno derecho.",
    ],
    traps: [
      "Extender automáticamente la invalidez a todo el procedimiento.",
      "Usar conversión cuando el acto no contiene los elementos constitutivos de otro distinto.",
    ],
    mnemonics: [],
  },
};

const unitSourceByCode: Record<string, V4SourceRef[]> = {
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
  if (pilot) {
    return {
      ...pilot,
      sourceRefs: unitSourceByCode[proposal.code],
    };
  }
  const content = unitContent[proposal.code];
  if (!content) throw new Error(`Missing final study content for ${proposal.code}`);
  return {
    code: proposal.code,
    title: proposal.title,
    position: proposal.position,
    ...content,
    sourceRefs: unitSourceByCode[proposal.code],
    sourceSubtopicName: proposal.title,
  };
});

const pilotConceptByCode = new Map(topic18SilencePilotPackage.concepts.map((concept) => [concept.code, concept]));
const positionWithinUnit = new Map<string, number>();
export const topic18Gate2Concepts = topic18Gate1Concepts.map((proposal) => {
  const pilot = pilotConceptByCode.get(proposal.code);
  if (pilot) return { ...pilot };
  const position = (positionWithinUnit.get(proposal.unitCode) ?? 0) + 1;
  positionWithinUnit.set(proposal.unitCode, position);
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

export const topic18Gate2QuestionMappings = [...topic18ApprovedAssignments, ...generatedMappings].map(
  ({ questionCode, primaryConceptCode, secondaryConceptCodes }) => ({
    questionCode,
    primaryConceptCode,
    ...(secondaryConceptCodes?.length ? { secondaryConceptCodes } : {}),
  }),
);

const cardSpecs: Array<{
  conceptCode: string;
  type: V4FlashcardPackage["type"];
  prompt: string;
  answer: string;
  article: string;
  pageStart: number;
  pageEnd?: number;
}> = [
  { conceptCode: "SMS-T18-C01", type: "direct", prompt: "¿A quién atribuye el artículo 13 los derechos generales frente a las Administraciones?", answer: "A quienes, de conformidad con el artículo 3, tengan capacidad de obrar ante las Administraciones Públicas.", article: "art. 13", pageStart: 113, pageEnd: 114 },
  { conceptCode: "SMS-T18-C02", type: "contrast", prompt: "¿Cuál es la regla para una persona física no obligada a relacionarse electrónicamente?", answer: "Puede elegir en todo momento entre medios electrónicos o no y modificar el medio elegido.", article: "art. 14.1", pageStart: 114, pageEnd: 115 },
  { conceptCode: "SMS-T18-C03", type: "contrast", prompt: "Si varios interesados discrepan sobre la lengua en un procedimiento de la AGE, ¿en qué lengua se tramita?", answer: "En castellano, sin perjuicio de que los documentos o testimonios solicitados se expidan en la lengua elegida por cada interesado.", article: "art. 15.1", pageStart: 115, pageEnd: 116 },
  { conceptCode: "SMS-T18-C04", type: "direct", prompt: "¿Qué función básica cumple el Registro Electrónico General?", answer: "Deja asiento de los documentos presentados o recibidos y garantiza la constancia de los datos exigidos por el artículo 16.", article: "art. 16.1-3", pageStart: 116, pageEnd: 117 },
  { conceptCode: "SMS-T18-C05", type: "exception", prompt: "¿Qué ocurre con documentos cuyo régimen especial exige otra forma de presentación?", answer: "No se tienen por presentados en el registro ordinario.", article: "art. 16.8", pageStart: 118 },
  { conceptCode: "SMS-T18-C06", type: "direct", prompt: "¿Qué debe mantener cada Administración para los documentos electrónicos de procedimientos finalizados?", answer: "Un archivo electrónico único, en los términos de la normativa aplicable.", article: "art. 17.1", pageStart: 119 },
  { conceptCode: "SMS-T18-C07", type: "exception", prompt: "¿La colaboración de las personas con la Administración carece de límites?", answer: "No. El artículo 18 recoge límites vinculados, entre otros, al honor, intimidad y determinados datos confidenciales de terceros.", article: "art. 18.1", pageStart: 119, pageEnd: 120 },
  { conceptCode: "SMS-T18-C08", type: "direct", prompt: "¿Cuándo puede ser obligatoria la comparecencia ante oficinas públicas?", answer: "Solo cuando esté prevista en una norma con rango de ley.", article: "art. 19.1", pageStart: 120 },
  { conceptCode: "SMS-T18-C09", type: "direct", prompt: "¿Quién responde directamente de la tramitación de los asuntos que tenga a su cargo?", answer: "Los titulares de las unidades administrativas y el personal al servicio de las Administraciones que tengan a su cargo la resolución o despacho.", article: "art. 20.1", pageStart: 120 },
  { conceptCode: "SMS-T18-C10", type: "exception", prompt: "¿La obligación de resolver expresamente carece de excepciones?", answer: "No. El artículo 21 exceptúa los supuestos de terminación por pacto o convenio y los procedimientos relativos a derechos sometidos únicamente a declaración responsable o comunicación.", article: "art. 21.1", pageStart: 121 },
  { conceptCode: "SMS-T18-C11", type: "number_or_deadline", prompt: "Si la norma reguladora no fija plazo máximo, ¿cuál es el plazo y desde cuándo se cuenta en una solicitud?", answer: "Tres meses; en procedimientos iniciados a solicitud, desde la entrada de la solicitud en el registro electrónico de la Administración u organismo competente para tramitarla.", article: "art. 21.3", pageStart: 121, pageEnd: 122 },
  { conceptCode: "SMS-T18-C12", type: "direct", prompt: "¿Qué técnica regula el artículo 22 respecto del plazo máximo para resolver?", answer: "La suspensión del transcurso del plazo máximo en los supuestos previstos por el propio artículo.", article: "art. 22", pageStart: 122, pageEnd: 124 },
  { conceptCode: "SMS-T18-C13", type: "contrast", prompt: "¿Qué diferencia básica separa el artículo 23 del artículo 32?", answer: "El artículo 23 amplía excepcionalmente el plazo máximo para resolver y notificar; el artículo 32 amplía plazos de trámites.", article: "arts. 23 y 32", pageStart: 124, pageEnd: 136 },
  { conceptCode: "SMS-T18-C17", type: "direct", prompt: "¿Qué son documentos públicos administrativos?", answer: "Los válidamente emitidos por los órganos de las Administraciones Públicas.", article: "art. 26.1", pageStart: 127 },
  { conceptCode: "SMS-T18-C18", type: "contrast", prompt: "¿Qué eficacia tienen las copias auténticas y qué límite tienen las de documentos privados?", answer: "Las copias auténticas tienen la misma validez y eficacia que los originales; las copias auténticas de documentos privados surten únicamente efectos administrativos.", article: "art. 27.1-2", pageStart: 128, pageEnd: 130 },
  { conceptCode: "SMS-T18-C19", type: "direct", prompt: "¿Qué principio protege al interesado frente a la aportación repetida de documentos?", answer: "El derecho a no aportar determinados documentos que ya obren en poder de la Administración o hayan sido elaborados por otra Administración en los términos del artículo 28.", article: "art. 28", pageStart: 130, pageEnd: 131 },
  { conceptCode: "SMS-T18-C20", type: "number_or_deadline", prompt: "¿Cómo se computa un plazo expresado por horas?", answer: "Por horas hábiles, de hora en hora y de minuto en minuto desde la notificación o publicación; si su duración supera veinticuatro horas se expresa en días.", article: "art. 30.1", pageStart: 132, pageEnd: 133 },
  { conceptCode: "SMS-T18-C21", type: "exception", prompt: "Si el último día de un plazo es inhábil, ¿qué sucede?", answer: "Se prorroga al primer día hábil siguiente.", article: "art. 30.5", pageStart: 133, pageEnd: 134 },
  { conceptCode: "SMS-T18-C22", type: "direct", prompt: "¿Qué calendario de inhábiles se aplica al cómputo en registros electrónicos?", answer: "El determinado por la sede electrónica del registro conforme al artículo 31.3, que es el único aplicable a esos efectos.", article: "art. 31.3", pageStart: 134, pageEnd: 135 },
  { conceptCode: "SMS-T18-C23", type: "number_or_deadline", prompt: "¿Cuál es el límite general de la ampliación de un plazo de trámite del artículo 32.1?", answer: "No puede exceder de la mitad del plazo, debe acordarse antes de su vencimiento y no perjudicar derechos de terceros.", article: "art. 32.1-3", pageStart: 135, pageEnd: 136 },
  { conceptCode: "SMS-T18-C24", type: "exception", prompt: "¿Qué plazos no se reducen a la mitad por la tramitación de urgencia?", answer: "Los relativos a la presentación de solicitudes y recursos.", article: "art. 33.1", pageStart: 136 },
  { conceptCode: "SMS-T18-C25", type: "direct", prompt: "¿Qué exige el artículo 34.1 para producir un acto administrativo?", answer: "Que lo produzca el órgano competente, ajustándose a los requisitos y al procedimiento establecido.", article: "art. 34.1", pageStart: 136 },
  { conceptCode: "SMS-T18-C26", type: "direct", prompt: "¿Cómo debe expresarse la motivación cuando el artículo 35 la exige?", answer: "Con sucinta referencia de hechos y fundamentos de derecho.", article: "art. 35", pageStart: 137, pageEnd: 138 },
  { conceptCode: "SMS-T18-C27", type: "direct", prompt: "¿Cuál es la regla general de forma de los actos administrativos?", answer: "Se producen por escrito a través de medios electrónicos, salvo que su naturaleza exija otra forma más adecuada de expresión y constancia.", article: "art. 36", pageStart: 138 },
  { conceptCode: "SMS-T18-C28", type: "contrast", prompt: "¿Puede una resolución singular vulnerar una disposición general porque la dicte un órgano de igual o superior jerarquía?", answer: "No. El artículo 37 prohíbe esa derogación singular.", article: "art. 37.1", pageStart: 138, pageEnd: 139 },
  { conceptCode: "SMS-T18-C29", type: "direct", prompt: "¿Qué única regla contiene el artículo 38 del temario?", answer: "Que los actos de las Administraciones Públicas sujetos al Derecho Administrativo serán ejecutivos con arreglo a lo dispuesto en la Ley.", article: "art. 38", pageStart: 139 },
  { conceptCode: "SMS-T18-C30", type: "contrast", prompt: "¿Cuándo puede quedar demorada la eficacia de un acto?", answer: "Cuando así lo exija su contenido o esté supeditada a su notificación, publicación o aprobación superior.", article: "art. 39.2", pageStart: 139, pageEnd: 140 },
  { conceptCode: "SMS-T18-C31", type: "mini_case", prompt: "Si una Administración debe dictar un acto que tiene necesariamente por base otro de otra Administración que considera ilegal, ¿qué mecanismo prevé el artículo 39.5?", answer: "Puede requerir previamente a la otra Administración para que anule o revise el acto y, si se rechaza, acudir al recurso contencioso-administrativo; el procedimiento queda suspendido.", article: "art. 39.5", pageStart: 140 },
  { conceptCode: "SMS-T18-C32", type: "number_or_deadline", prompt: "¿En qué plazo debe cursarse una notificación desde que el acto ha sido dictado?", answer: "Dentro del plazo de diez días.", article: "art. 40.2", pageStart: 140 },
  { conceptCode: "SMS-T18-C33", type: "contrast", prompt: "¿El aviso al dispositivo o correo sustituye a la notificación?", answer: "No. Es un aviso de puesta a disposición y su falta no impide que la notificación sea considerada plenamente válida.", article: "art. 41", pageStart: 141, pageEnd: 143 },
  { conceptCode: "SMS-T18-C34", type: "direct", prompt: "¿Qué obligación adicional acompaña a una notificación practicada en papel?", answer: "Ponerla a disposición del interesado en la sede electrónica para que pueda acceder voluntariamente a su contenido.", article: "art. 42.1", pageStart: 143 },
  { conceptCode: "SMS-T18-C35", type: "number_or_deadline", prompt: "¿Cuándo se entiende rechazada una notificación electrónica obligatoria o expresamente elegida?", answer: "Cuando transcurren diez días naturales desde su puesta a disposición sin que se acceda a su contenido.", article: "art. 43.2", pageStart: 144 },
  { conceptCode: "SMS-T18-C36", type: "exception", prompt: "¿Pueden los medios complementarios del artículo 44 sustituir el anuncio obligatorio en el BOE?", answer: "No. Las formas complementarias no excluyen la obligación de publicar el anuncio correspondiente en el BOE.", article: "art. 44", pageStart: 145 },
  { conceptCode: "SMS-T18-C37", type: "direct", prompt: "¿Qué regula el artículo 45 dentro de este bloque?", answer: "Los supuestos y efectos de la publicación de actos administrativos en los términos reproducidos por el temario.", article: "art. 45", pageStart: 145 },
  { conceptCode: "SMS-T18-C38", type: "mini_case", prompt: "Si el órgano competente aprecia que una publicación íntegra lesiona derechos o intereses legítimos, ¿qué hace?", answer: "Publica una indicación somera del contenido y del lugar y plazo donde los interesados pueden comparecer para conocer el contenido íntegro y dejar constancia.", article: "art. 46", pageStart: 146 },
  { conceptCode: "SMS-T18-C39", type: "direct", prompt: "¿Qué categoría de invalidez recoge el artículo 47?", answer: "La nulidad de pleno derecho de los actos y, en sus apartados correspondientes, de determinadas disposiciones administrativas.", article: "art. 47", pageStart: 146, pageEnd: 147 },
  { conceptCode: "SMS-T18-C40", type: "contrast", prompt: "¿Cuál es la regla general del artículo 48.1?", answer: "Son anulables los actos que incurran en cualquier infracción del ordenamiento jurídico, incluida la desviación de poder.", article: "art. 48.1", pageStart: 147, pageEnd: 148 },
  { conceptCode: "SMS-T18-C41", type: "exception", prompt: "¿La invalidez de un acto se transmite automáticamente a los actos sucesivos?", answer: "No. No implica la de los actos sucesivos que sean independientes del primero; tampoco se extiende automáticamente a partes independientes del acto.", article: "art. 49", pageStart: 148 },
  { conceptCode: "SMS-T18-C42", type: "direct", prompt: "¿Cuándo puede operar la conversión de un acto viciado?", answer: "Cuando el acto nulo o anulable contiene los elementos constitutivos de otro acto distinto, cuyos efectos producirá.", article: "art. 50", pageStart: 148 },
  { conceptCode: "SMS-T18-C43", type: "direct", prompt: "¿Qué debe conservar el órgano que declara la nulidad o anula actuaciones?", answer: "Los actos y trámites cuyo contenido se hubiera mantenido igual de no haberse cometido la infracción.", article: "art. 51", pageStart: 148 },
  { conceptCode: "SMS-T18-C44", type: "direct", prompt: "¿Sobre qué clase de actos opera la convalidación del artículo 52?", answer: "Sobre actos anulables, subsanando los vicios de que adolezcan en los términos previstos por el artículo.", article: "art. 52", pageStart: 148, pageEnd: 149 },
];

const pilotCardConcepts = new Set(topic18SilencePilotPackage.flashcards.map((card) => card.conceptCode));
const newCards: V4FlashcardPackage[] = cardSpecs.map((spec, index) => ({
  code: `SMS-T18-F${String(index + 12).padStart(2, "0")}`,
  conceptCode: spec.conceptCode,
  type: spec.type,
  prompt: spec.prompt,
  answer: spec.answer,
  position: 1,
  sourceRefs: source(spec.article, spec.pageStart, spec.pageEnd ?? spec.pageStart),
}));

if (newCards.some((card) => pilotCardConcepts.has(card.conceptCode))) {
  throw new Error("Gate 2 must not replace productive silence pilot flashcards.");
}

const pilotSourceByConcept: Record<string, V4SourceRef[]> = {
  "SMS-T18-C14": source("art. 24", 125, 126),
  "SMS-T18-C15": source("art. 24", 125, 126),
  "SMS-T18-C16": source("art. 25", 126, 127),
};

const preservedPilotCards: V4FlashcardPackage[] = topic18SilencePilotPackage.flashcards.map((card) => ({
  ...card,
  sourceRefs: pilotSourceByConcept[card.conceptCode],
}));

export const topic18Gate2Flashcards: V4FlashcardPackage[] = [
  ...preservedPilotCards,
  ...newCards,
];

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
