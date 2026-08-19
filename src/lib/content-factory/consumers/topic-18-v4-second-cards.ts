import type { V4FlashcardPackage, V4SourceRef } from "../../v4-content-package";

function source(article: string, pageStart: number, pageEnd = pageStart): V4SourceRef[] {
  const pages = pageStart === pageEnd ? `p. ${pageStart}` : `pp. ${pageStart}-${pageEnd}`;
  return [{
    label: "Temario_new.pdf",
    reference: `Temario_new.pdf, ${article}, ${pages}`,
    pageStart,
    pageEnd,
  }];
}

type CardSeed = {
  conceptCode: string;
  type: V4FlashcardPackage["type"];
  prompt: string;
  answer: string;
  article: string;
  pageStart: number;
  pageEnd?: number;
};

/**
 * Second diagnostic-study card for every non-anchor Topic 18 concept.
 * All facts are intentionally bounded to Temario_new.pdf; the productive
 * C14/C15/C16 cards remain untouched and already exceed the two-card floor.
 */
const seeds: CardSeed[] = [
  { conceptCode: "SMS-T18-C01", type: "contrast", prompt: "¿Los derechos del artículo 13 sustituyen a los derechos del interesado del artículo 53?", answer: "No. El propio artículo 13 los reconoce sin perjuicio de los derechos previstos en el artículo 53 para quienes tengan la condición de interesados.", article: "art. 13", pageStart: 113, pageEnd: 114 },
  { conceptCode: "SMS-T18-C02", type: "exception", prompt: "¿Puede imponerse por reglamento la relación electrónica a determinadas personas físicas?", answer: "Sí, para determinados procedimientos y colectivos cuando, por su capacidad económica, técnica, dedicación profesional u otros motivos acreditados, tengan acceso y disponibilidad de los medios electrónicos necesarios.", article: "art. 14.3", pageStart: 114, pageEnd: 115 },
  { conceptCode: "SMS-T18-C03", type: "direct", prompt: "En procedimientos tramitados por Administraciones de una Comunidad Autónoma o Entidad Local, ¿qué determina el uso de la lengua?", answer: "Lo previsto en la legislación autonómica correspondiente, según reproduce el artículo 15 del temario.", article: "art. 15.2", pageStart: 115, pageEnd: 116 },
  { conceptCode: "SMS-T18-C04", type: "direct", prompt: "¿Qué debe permitir el Registro Electrónico General respecto de los documentos presentados?", answer: "Dejar constancia de su asiento y expedir automáticamente un recibo que acredite fecha y hora de presentación y número de entrada, junto con copia de los documentos cuando proceda.", article: "art. 16.1-3", pageStart: 116, pageEnd: 117 },
  { conceptCode: "SMS-T18-C05", type: "direct", prompt: "¿Qué hacen las oficinas de asistencia con los documentos presentados presencialmente para incorporarlos al expediente electrónico?", answer: "Los digitalizan en los términos del artículo 16 y, salvo excepción, devuelven los originales al interesado.", article: "art. 16.5", pageStart: 117, pageEnd: 118 },
  { conceptCode: "SMS-T18-C06", type: "requirement", prompt: "¿Qué cualidades debe asegurar el medio o soporte del archivo electrónico?", answer: "La autenticidad, integridad y conservación del documento, así como su consulta con independencia del tiempo transcurrido, además de las medidas de seguridad previstas en el temario.", article: "art. 17.2-3", pageStart: 119 },
  { conceptCode: "SMS-T18-C07", type: "effect", prompt: "Cuando la Administración conoce determinados datos de terceros por inspección, ¿puede utilizarlos para una finalidad ajena a la prevista por la ley?", answer: "No; la colaboración y obtención de información queda sujeta a los límites y garantías que reproduce el artículo 18.", article: "art. 18", pageStart: 119, pageEnd: 120 },
  { conceptCode: "SMS-T18-C08", type: "requirement", prompt: "¿Qué debe expresar una citación de comparecencia?", answer: "Lugar, fecha, hora, medios disponibles, objeto de la comparecencia y efectos de no atenderla, en los términos del artículo 19.", article: "art. 19.2", pageStart: 120 },
  { conceptCode: "SMS-T18-C09", type: "effect", prompt: "¿Qué debe hacer el personal responsable de la tramitación ante obstáculos que impidan o retrasen el ejercicio de derechos?", answer: "Adoptar las medidas oportunas para remover los obstáculos y evitar o eliminar anormalidades en la tramitación, según el artículo 20.", article: "art. 20", pageStart: 120 },
  { conceptCode: "SMS-T18-C10", type: "exception", prompt: "¿Qué dos grandes excepciones menciona el artículo 21.1 a la obligación de resolución expresa?", answer: "Los supuestos de terminación por pacto o convenio y los procedimientos relativos al ejercicio de derechos sometidos únicamente a declaración responsable o comunicación a la Administración.", article: "art. 21.1", pageStart: 121 },
  { conceptCode: "SMS-T18-C11", type: "contrast", prompt: "¿Desde cuándo se cuenta el plazo máximo en un procedimiento iniciado de oficio y en uno iniciado a solicitud?", answer: "De oficio, desde la fecha del acuerdo de iniciación; a solicitud, desde la entrada de la solicitud en el registro electrónico de la Administración u organismo competente para tramitarla.", article: "art. 21.3", pageStart: 121, pageEnd: 122 },
  { conceptCode: "SMS-T18-C12", type: "contrast", prompt: "¿Suspender el plazo máximo equivale a ampliarlo?", answer: "No. El artículo 22 regula la suspensión por causas concretas; los artículos 23 y 32 regulan figuras distintas de ampliación.", article: "art. 22", pageStart: 122, pageEnd: 124 },
  { conceptCode: "SMS-T18-C13", type: "requirement", prompt: "¿Qué debe haberse intentado antes de acudir a la ampliación excepcional del artículo 23 cuando existe un volumen elevado de solicitudes o afectados?", answer: "Habilitar los medios personales y materiales necesarios en los términos del artículo 21.5; solo si no bastan puede acordarse motivadamente la ampliación excepcional.", article: "arts. 21.5 y 23", pageStart: 122, pageEnd: 124 },
  { conceptCode: "SMS-T18-C17", type: "exception", prompt: "¿Qué documentos electrónicos administrativos no requieren firma electrónica según el artículo 26.3?", answer: "Los publicados con carácter meramente informativo y los que no formen parte de un expediente administrativo; en todo caso debe identificarse su origen.", article: "art. 26.3", pageStart: 127 },
  { conceptCode: "SMS-T18-C18", type: "competence", prompt: "¿Quién determina los órganos competentes para expedir copias auténticas?", answer: "Cada Administración Pública determina los órganos que tienen atribuida esa competencia, según el artículo 27.1.", article: "art. 27.1", pageStart: 128, pageEnd: 130 },
  { conceptCode: "SMS-T18-C19", type: "exception", prompt: "Si excepcionalmente la Administración no puede recabar un documento que ya debería obrar en su poder, ¿qué permite el artículo 28?", answer: "Puede solicitar nuevamente al interesado su aportación, en los términos y supuestos recogidos por el propio artículo.", article: "art. 28", pageStart: 130, pageEnd: 131 },
  { conceptCode: "SMS-T18-C20", type: "dies_a_quo", prompt: "¿Desde qué momento se cuenta un plazo expresado por días?", answer: "A partir del día siguiente a la notificación o publicación del acto, o desde el siguiente a aquel en que se produzca la estimación o desestimación por silencio administrativo.", article: "art. 30.3", pageStart: 132, pageEnd: 133 },
  { conceptCode: "SMS-T18-C21", type: "literal", prompt: "Si un plazo fijado en meses o años vence en un mes sin día equivalente al de inicio, ¿cuándo expira?", answer: "El último día del mes.", article: "art. 30.4", pageStart: 133, pageEnd: 134 },
  { conceptCode: "SMS-T18-C22", type: "effect", prompt: "A efectos de cumplimiento de plazos por los interesados, ¿cómo trata el registro electrónico la presentación realizada en un día inhábil?", answer: "Se entiende realizada en la primera hora del primer día hábil siguiente, salvo que una norma permita expresamente la recepción en día inhábil.", article: "art. 31.2", pageStart: 134, pageEnd: 135 },
  { conceptCode: "SMS-T18-C23", type: "exception", prompt: "¿Puede ampliarse un plazo que ya ha vencido?", answer: "No. Tanto la petición como la decisión sobre ampliación deben producirse antes del vencimiento y en ningún caso puede ampliarse un plazo ya vencido.", article: "art. 32.3", pageStart: 135, pageEnd: 136 },
  { conceptCode: "SMS-T18-C24", type: "effect", prompt: "¿Qué efecto general produce la tramitación de urgencia sobre los plazos?", answer: "Los reduce a la mitad respecto del procedimiento ordinario, salvo los relativos a presentación de solicitudes y recursos.", article: "art. 33.1", pageStart: 136 },
  { conceptCode: "SMS-T18-C25", type: "requirement", prompt: "Además de la competencia del órgano, ¿qué exige el artículo 34.1 para la producción del acto?", answer: "Que se ajuste a los requisitos y al procedimiento establecido.", article: "art. 34.1", pageStart: 136 },
  { conceptCode: "SMS-T18-C26", type: "literal", prompt: "¿Qué forma mínima de justificación exige el artículo 35 cuando un acto debe motivarse?", answer: "Una sucinta referencia de hechos y fundamentos de derecho.", article: "art. 35", pageStart: 137, pageEnd: 138 },
  { conceptCode: "SMS-T18-C27", type: "exception", prompt: "Si un órgano ejerce competencia verbalmente y debe quedar constancia escrita, ¿quién efectúa y firma esa constancia?", answer: "El titular del órgano inferior o funcionario que recibe oralmente la comunicación, expresando la autoridad de la que procede, conforme al artículo 36.", article: "art. 36", pageStart: 138 },
  { conceptCode: "SMS-T18-C28", type: "effect", prompt: "¿Qué resoluciones declara nulas el artículo 37.2?", answer: "Las que vulneren una disposición reglamentaria y las que incurran en alguna de las causas de nulidad de pleno derecho del artículo 47.", article: "art. 37.2", pageStart: 139 },
  { conceptCode: "SMS-T18-C29", type: "contrast", prompt: "¿Qué no debe confundirse con la ejecutividad del artículo 38?", answer: "La eficacia del acto y sus posibles demoras del artículo 39; el artículo 38 solo contiene la regla de ejecutividad reproducida en el temario.", article: "arts. 38-39", pageStart: 139, pageEnd: 140 },
  { conceptCode: "SMS-T18-C30", type: "effect", prompt: "¿Cuál es la regla general de eficacia de los actos del artículo 39.1?", answer: "Se presumen válidos y producen efectos desde la fecha en que se dictan, salvo que en ellos se disponga otra cosa.", article: "art. 39.1", pageStart: 139, pageEnd: 140 },
  { conceptCode: "SMS-T18-C31", type: "effect", prompt: "¿Qué sucede con el procedimiento mientras se resuelve el conflicto del artículo 39.5?", answer: "Queda suspendido desde que se formula el requerimiento a la otra Administración para que anule o revise el acto que se considera ilegal.", article: "art. 39.5", pageStart: 140 },
  { conceptCode: "SMS-T18-C32", type: "requirement", prompt: "¿Qué información sobre impugnación debe contener una notificación ordinaria?", answer: "Debe indicar si el acto pone fin o no a la vía administrativa, los recursos que procedan, el órgano ante el que interponerlos y el plazo para hacerlo.", article: "art. 40.2", pageStart: 140 },
  { conceptCode: "SMS-T18-C33", type: "exception", prompt: "¿La falta del aviso al dispositivo o correo electrónico invalida la notificación?", answer: "No. El artículo 41 establece que la falta de ese aviso no impide que la notificación sea considerada plenamente válida.", article: "art. 41", pageStart: 141, pageEnd: 143 },
  { conceptCode: "SMS-T18-C34", type: "mini_case", prompt: "Si nadie recibe una notificación en el domicilio en el primer intento, ¿qué exige el artículo 42?", answer: "Un segundo intento por una sola vez y en una hora distinta dentro de los tres días siguientes, respetando las franjas temporales del propio artículo.", article: "art. 42.2", pageStart: 143 },
  { conceptCode: "SMS-T18-C35", type: "effect", prompt: "¿Cuándo se entiende practicada una notificación electrónica?", answer: "En el momento en que se produce el acceso a su contenido por el interesado o su representante debidamente identificado.", article: "art. 43.2", pageStart: 144 },
  { conceptCode: "SMS-T18-C36", type: "contrast", prompt: "¿Qué carácter tienen las publicaciones previas en boletines, tablones o consulados del artículo 44 respecto del anuncio en BOE?", answer: "Son facultativas y complementarias; no sustituyen el anuncio obligatorio en el BOE.", article: "art. 44", pageStart: 145 },
  { conceptCode: "SMS-T18-C37", type: "exception", prompt: "¿Cuándo puede la publicación sustituir a la notificación?", answer: "En los supuestos expresamente previstos por el artículo 45, incluida la publicación cuando el acto tenga por destinatario una pluralidad indeterminada de personas o cuando se trate de actos integrantes de determinados procedimientos selectivos o de concurrencia competitiva.", article: "art. 45", pageStart: 145 },
  { conceptCode: "SMS-T18-C38", type: "effect", prompt: "¿Qué debe permitir la indicación somera del artículo 46 a los interesados?", answer: "Comparecer en el lugar y plazo indicados para conocer el contenido íntegro del acto y dejar constancia de ese conocimiento.", article: "art. 46", pageStart: 146 },
  { conceptCode: "SMS-T18-C39", type: "contrast", prompt: "¿Toda infracción del ordenamiento produce nulidad de pleno derecho?", answer: "No. El artículo 47 enumera causas específicas de nulidad; el artículo 48 regula la anulabilidad por infracción del ordenamiento, incluida la desviación de poder.", article: "arts. 47-48", pageStart: 146, pageEnd: 148 },
  { conceptCode: "SMS-T18-C40", type: "exception", prompt: "¿Un defecto de forma produce siempre anulabilidad?", answer: "No. El artículo 48.2 la vincula a que el acto carezca de requisitos formales indispensables para alcanzar su fin o dé lugar a indefensión.", article: "art. 48.2", pageStart: 147, pageEnd: 148 },
  { conceptCode: "SMS-T18-C41", type: "effect", prompt: "¿Cuándo puede extenderse la invalidez de una parte del acto a las restantes partes independientes?", answer: "Cuando la parte viciada sea de tal importancia que sin ella el acto administrativo no se hubiera dictado.", article: "art. 49.2", pageStart: 148 },
  { conceptCode: "SMS-T18-C42", type: "effect", prompt: "¿Qué efectos produce la conversión del artículo 50?", answer: "El acto nulo o anulable produce los efectos del acto distinto cuyos elementos constitutivos contiene.", article: "art. 50", pageStart: 148 },
  { conceptCode: "SMS-T18-C43", type: "requirement", prompt: "¿Qué condición determina la conservación del artículo 51?", answer: "Que el contenido del acto o trámite se hubiera mantenido igual de no haberse cometido la infracción.", article: "art. 51", pageStart: 148 },
  { conceptCode: "SMS-T18-C44", type: "effect", prompt: "¿Desde cuándo produce efectos el acto de convalidación, con carácter general?", answer: "Desde su fecha, salvo lo dispuesto para la retroactividad de los actos administrativos en el artículo 39.3.", article: "art. 52.2", pageStart: 148, pageEnd: 149 },
];

export const topic18Gate2SecondCards: V4FlashcardPackage[] = seeds.map((seed, index) => ({
  code: `SMS-T18-F${String(index + 53).padStart(2, "0")}`,
  conceptCode: seed.conceptCode,
  type: seed.type,
  prompt: seed.prompt,
  answer: seed.answer,
  position: 2,
  sourceRefs: source(seed.article, seed.pageStart, seed.pageEnd ?? seed.pageStart),
}));
