import type { FactoryGeneratedQuestionCandidate } from "../types";
import { topic18GapQuestionCandidates as topic18Gate2QuestionCandidates } from "./topic-18-gap-questions";

const HARDENED_CODES = new Set([
  "SMS-T18-0241", "SMS-T18-0242", "SMS-T18-0243", "SMS-T18-0249", "SMS-T18-0253",
  "SMS-T18-0255", "SMS-T18-0256", "SMS-T18-0261", "SMS-T18-0263",
]);

type V2Patch = Record<string, string | number>;

const overrides: Record<string, V2Patch> = {
  "SMS-T18-0241": {
    pregunta: "El artículo 13 parte de una categoría general para atribuir los derechos de las personas en sus relaciones con las Administraciones Públicas. ¿Cuál es esa categoría?",
    opcion_a: "Las personas físicas que, conforme al artículo 14.1, pueden elegir si se comunican o no por medios electrónicos mientras no estén obligadas a ello.",
    opcion_b: "Quienes, de conformidad con el artículo 3, tengan capacidad de obrar ante las Administraciones Públicas.",
    opcion_c: "Las personas jurídicas y las entidades sin personalidad jurídica obligadas a relacionarse electrónicamente conforme al artículo 14.2.",
    opcion_d: "Los colectivos de personas físicas a los que reglamentariamente se imponga la relación electrónica por las circunstancias del artículo 14.3.",
    explicacion: "La categoría general del artículo 13 son quienes, conforme al artículo 3, tienen capacidad de obrar ante las Administraciones Públicas. Las demás opciones describen categorías próximas del artículo 14, pero no delimitan la titularidad general del artículo 13.",
    pagina_fin: 115,
    referencia_fuente: "Temario_new.pdf, arts. 13-14, pp. 113-115.",
  },
  "SMS-T18-0242": {
    pregunta: "Dentro de los artículos 34 a 36 del temario, ¿qué regla corresponde específicamente a la producción del acto administrativo del artículo 34.1?",
    opcion_a: "Debe producirlo el órgano competente, ajustándose a los requisitos y al procedimiento establecido.",
    opcion_b: "Su contenido debe ajustarse al ordenamiento jurídico y ser determinado y adecuado a sus fines.",
    opcion_c: "Cuando proceda motivarlo, debe incluir una sucinta referencia de hechos y fundamentos de derecho.",
    opcion_d: "Como regla de forma, debe producirse por escrito a través de medios electrónicos salvo que su naturaleza exija otra más adecuada.",
    explicacion: "La opción A reproduce la regla específica de producción del artículo 34.1. B corresponde al contenido del artículo 34.2; C a la motivación del artículo 35; y D a la forma del artículo 36.",
    pagina_fin: 138,
    referencia_fuente: "Temario_new.pdf, arts. 34-36, pp. 136-138.",
  },
  "SMS-T18-0243": {
    pregunta: "Un órgano competente dicta por escrito y por medios electrónicos un acto cuyo contenido respeta el ordenamiento, es determinado y adecuado a sus fines, pero omite un requisito exigido para su producción. ¿Qué valoración distingue correctamente las reglas de los artículos 34 a 36?",
    opcion_a: "La adecuación del contenido al artículo 34.2 y la forma del artículo 36.1 bastan para considerar cumplida también la regla de producción del artículo 34.1.",
    opcion_b: "La omisión afecta exclusivamente a la motivación del artículo 35, porque la competencia del órgano absorbe los restantes requisitos de producción.",
    opcion_c: "El artículo 34.1 queda satisfecho por la competencia del órgano y el requisito omitido solo sería relevante si el contenido dejara de ser determinado.",
    opcion_d: "Puede cumplir las reglas de contenido y forma descritas, pero no el artículo 34.1, que exige además ajustarse a los requisitos y al procedimiento establecido.",
    explicacion: "Competencia, contenido adecuado y forma electrónica no sustituyen la exigencia autónoma del artículo 34.1 de ajustarse a los requisitos y al procedimiento establecido. Por eso D separa correctamente producción, contenido y forma.",
    pagina_fin: 138,
    referencia_fuente: "Temario_new.pdf, arts. 34-36, pp. 136-138.",
  },
  "SMS-T18-0249": {
    pregunta: "Una notificación se practica en papel. ¿Qué obligación adicional deriva específicamente del artículo 42.1, frente a otras reglas próximas sobre la práctica de las notificaciones?",
    opcion_a: "Ponerla también a disposición del interesado en la sede electrónica para que pueda acceder voluntariamente a su contenido.",
    opcion_b: "Si nadie se hace cargo en el domicilio, repetir el intento una sola vez, en hora distinta y dentro de los tres días siguientes.",
    opcion_c: "Si el interesado accede a su contenido en sede electrónica, ofrecerle que las notificaciones posteriores puedan realizarse electrónicamente.",
    opcion_d: "Si el interesado resulta notificado por distintos cauces, tomar como fecha de notificación la que se hubiera producido en primer lugar.",
    explicacion: "A es la obligación general añadida por el artículo 42.1 a toda notificación en papel. B y C son reglas distintas de los apartados 2 y 3 del mismo artículo; D es la regla del artículo 41.7 para notificaciones por distintos cauces.",
    pagina_inicio: 141,
    referencia_fuente: "Temario_new.pdf, arts. 41.7 y 42, pp. 141-143.",
  },
  "SMS-T18-0253": {
    pregunta: "En el bloque de publicación y protección de los artículos 45 y 46, ¿qué presupuesto activa específicamente la publicación limitada del artículo 46?",
    opcion_a: "Que razones de interés público apreciadas por el órgano competente aconsejen publicar el acto conforme al artículo 45.1.",
    opcion_b: "Que la Administración estime insuficiente la notificación a un solo interesado para garantizar la notificación a todos los destinatarios.",
    opcion_c: "Que se trate de un procedimiento selectivo o de concurrencia competitiva cuya convocatoria haya fijado el medio para las publicaciones sucesivas.",
    opcion_d: "Que el órgano competente aprecie que la notificación por anuncios o la publicación del acto lesiona derechos o intereses legítimos.",
    explicacion: "El artículo 46 se activa cuando el órgano competente aprecia lesión de derechos o intereses legítimos por la publicidad. A, B y C recogen presupuestos próximos de publicación del artículo 45, pero no el presupuesto protector del artículo 46.",
    pagina_inicio: 145,
    referencia_fuente: "Temario_new.pdf, arts. 45-46, pp. 145-146.",
  },
  "SMS-T18-0255": {
    pregunta: "Un acto incurre en una infracción del ordenamiento jurídico y el supuesto no aporta datos que lo sitúen en una causa de nulidad de pleno derecho ni específicamente en un defecto de forma o en una actuación fuera de plazo. ¿Qué regla del artículo 48 resulta decisiva?",
    opcion_a: "La del artículo 48.2, que condiciona la anulabilidad de los defectos de forma a la falta de requisitos indispensables o a la indefensión.",
    opcion_b: "La del artículo 48.3, que vincula la anulabilidad de actuaciones fuera de tiempo a la naturaleza del término o plazo incumplido.",
    opcion_c: "La del artículo 48.1, según la cual son anulables los actos que incurran en cualquier infracción del ordenamiento, incluida la desviación de poder.",
    opcion_d: "La del artículo 48.1 únicamente cuando exista desviación de poder, quedando las demás infracciones sometidas a los apartados 2 y 3.",
    explicacion: "Sin un dato que active las reglas especiales de forma o tiempo, opera la regla general del artículo 48.1: cualquier infracción del ordenamiento jurídico, incluida la desviación de poder, determina anulabilidad.",
    pagina_fin: 148,
    referencia_fuente: "Temario_new.pdf, art. 48, pp. 147-148.",
  },
  "SMS-T18-0256": {
    pregunta: "Se anula un acto dentro de un procedimiento y existe después un acto sucesivo que es independiente del primero. ¿Qué lectura del artículo 49 aplica correctamente el criterio de independencia?",
    opcion_a: "La nulidad o anulabilidad del primer acto no implica por sí sola la del acto sucesivo que sea independiente de aquel.",
    opcion_b: "La independencia protege únicamente partes de un mismo acto conforme al apartado 2; los actos sucesivos quedan afectados por la invalidez del primero.",
    opcion_c: "El acto sucesivo solo queda fuera de la invalidez cuando la parte viciada del primer acto no sea determinante para que este hubiera sido dictado.",
    opcion_d: "La independencia del acto sucesivo evita la propagación cuando existe nulidad, pero no cuando el primer acto haya sido declarado anulable.",
    explicacion: "El artículo 49.1 se refiere expresamente a actos sucesivos independientes y tanto a nulidad como a anulabilidad. El apartado 2 regula otra cuestión: la invalidez parcial dentro de un mismo acto.",
    referencia_fuente: "Temario_new.pdf, art. 49, p. 148.",
  },
  "SMS-T18-0261": {
    pregunta: "Dentro de las técnicas de los artículos 51 y 52, ¿a quién atribuye específicamente el artículo 51 la decisión de conservar actos y trámites cuyo contenido habría permanecido igual sin la infracción?",
    opcion_a: "Al órgano competente que sea superior jerárquico del que dictó el acto cuando el vicio consista en incompetencia no determinante de nulidad.",
    opcion_b: "A la Administración que decida convalidar un acto anulable subsanando los vicios de que adolezca conforme al artículo 52.",
    opcion_c: "Al órgano que declare la nulidad o anule las actuaciones en las que se integran esos actos y trámites.",
    opcion_d: "Al órgano que dictó originariamente el acto o practicó el trámite, siempre que su contenido se hubiera mantenido igual sin la infracción.",
    explicacion: "El artículo 51 atribuye la conservación al órgano que declare la nulidad o anule las actuaciones. A y B describen reglas de convalidación del artículo 52; D cambia el sujeto al que el artículo 51 atribuye la decisión.",
    pagina_fin: 149,
    referencia_fuente: "Temario_new.pdf, arts. 51-52, pp. 148-149.",
  },
  "SMS-T18-0263": {
    pregunta: "Tras declararse la invalidez, un acto o trámite tiene un contenido que se habría mantenido exactamente igual de no haberse cometido la infracción. ¿Qué consecuencia corresponde específicamente al artículo 51, y no a las técnicas vecinas?",
    opcion_a: "La invalidez no se extenderá a un acto sucesivo independiente del primero, por aplicación del límite previsto en el artículo 49.1.",
    opcion_b: "El órgano que declare la nulidad o anule las actuaciones dispondrá siempre la conservación de ese acto o trámite.",
    opcion_c: "El acto viciado producirá los efectos de otro distinto cuando contenga los elementos constitutivos de este, conforme al artículo 50.",
    opcion_d: "La Administración podrá convalidar el acto si es anulable, subsanando los vicios de que adolezca conforme al artículo 52.",
    explicacion: "La hipótesis dada reproduce la condición material del artículo 51 y su consecuencia imperativa: conservación. A es límite a la extensión de la invalidez; C es conversión; y D es convalidación.",
    pagina_fin: 149,
    referencia_fuente: "Temario_new.pdf, arts. 49-52, pp. 148-149.",
  },
};

function hardenCandidate(candidate: FactoryGeneratedQuestionCandidate): FactoryGeneratedQuestionCandidate {
  const code = String(candidate.v2.codigo ?? "");
  const patch = overrides[code];
  return patch ? { ...candidate, v2: { ...candidate.v2, ...patch } } : candidate;
}

/** Gate 2.1 editorial hardening. The Gate 2 candidate file remains an auditable pre-hardening snapshot. */
export const topic18Gate21QuestionCandidates = topic18Gate2QuestionCandidates.map(hardenCandidate);
export const topic18Gate21HardenedQuestionCodes = [...HARDENED_CODES].sort();

if (topic18Gate21QuestionCandidates.length !== topic18Gate2QuestionCandidates.length) {
  throw new Error("Gate 2.1 hardening must not add or remove Topic 18 candidates.");
}
if (topic18Gate21HardenedQuestionCodes.some((code) => !topic18Gate21QuestionCandidates.some((candidate) => candidate.v2.codigo === code))) {
  throw new Error("Gate 2.1 hardening references an unknown Topic 18 candidate code.");
}
