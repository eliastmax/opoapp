import {
  FRECUENCIA_HISTORICA_VALUES,
  NIVEL_PEDAGOGICO_VALUES,
  PERSPECTIVA_VALUES,
  TIPO_TRAMPA_VALUES,
  type Dificultad,
  type Respuesta,
} from "../csv-parser";
import { topic13ReviewedCoverageGapQuestions } from "./topic-13-coverage-gap-questions-reviewed";

type Perspectiva = (typeof PERSPECTIVA_VALUES)[number];
type NivelPedagogico = (typeof NIVEL_PEDAGOGICO_VALUES)[number];
type TipoTrampa = (typeof TIPO_TRAMPA_VALUES)[number];
type FrecuenciaHistorica = (typeof FRECUENCIA_HISTORICA_VALUES)[number];

export type Topic13V2QuestionCandidate = {
  codigo: string;
  materia: string;
  numero_tema: number;
  tema: string;
  apartado: string;
  subapartado: string;
  concepto: string;
  objetivo_aprendizaje: string;
  perspectiva: Perspectiva;
  nivel_pedagogico: NivelPedagogico;
  dificultad_conceptual: Dificultad;
  dificultad_examen: Dificultad;
  tipo_trampa: TipoTrampa;
  pregunta: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: Respuesta;
  explicacion: string;
  documento_referencia: "Temario_new.pdf";
  pagina_inicio: number;
  pagina_fin: number;
  referencia_fuente: string;
  frecuencia_historica: FrecuenciaHistorica;
};

type V2EditorialMetadata = Pick<
  Topic13V2QuestionCandidate,
  | "apartado"
  | "subapartado"
  | "concepto"
  | "objetivo_aprendizaje"
  | "perspectiva"
  | "nivel_pedagogico"
  | "dificultad_conceptual"
  | "dificultad_examen"
  | "tipo_trampa"
>;

const MATERIA = "Estatuto Marco del personal estatutario";
const TEMA =
  "Tema 13. La Ley 55/2003, de 16 de diciembre, del Estatuto Marco del personal estatutario de los servicios de salud: adquisición y pérdida de la condición de personal estatutario. Selección del personal estatutario. Promoción interna, movilidad y carrera profesional. Régimen retributivo. Derechos y deberes. Régimen disciplinario: faltas y sanciones.";

function meta(
  apartado: string,
  subapartado: string,
  concepto: string,
  objetivo_aprendizaje: string,
  perspectiva: Perspectiva,
  nivel_pedagogico: NivelPedagogico,
  dificultad_conceptual: Dificultad,
  dificultad_examen: Dificultad,
  tipo_trampa: TipoTrampa,
): V2EditorialMetadata {
  return {
    apartado,
    subapartado,
    concepto,
    objetivo_aprendizaje,
    perspectiva,
    nivel_pedagogico,
    dificultad_conceptual,
    dificultad_examen,
    tipo_trampa,
  };
}

const ADQ = "Adquisición y pérdida";
const SEL = "Selección y promoción interna";
const MOV = "Movilidad y carrera profesional";
const RET = "Régimen retributivo";
const DISC = "Régimen disciplinario";

const metadataByCode: Record<string, V2EditorialMetadata> = {
  "SMS-T13-0100": meta(ADQ, "Adquisición", "Falta de incorporación justificada", "Aplicar la excepción al decaimiento cuando la falta de incorporación no es imputable o existe causa justificada", "caso_practico", "tribunal", "medio", "dificil", "excepcion"),
  "SMS-T13-0101": meta(ADQ, "Nacionalidad", "Nacionalidad relevante para el nombramiento", "Identificar qué nacionalidad debe perderse para activar la causa del artículo 23", "reconocimiento_directo", "consolidacion", "medio", "medio", "concepto_proximo"),
  "SMS-T13-0102": meta(ADQ, "Nacionalidad", "Adquisición simultánea de otra nacionalidad", "Distinguir la simultaneidad exigida para evitar la pérdida por nacionalidad", "caso_practico", "tribunal", "medio", "dificil", "cambio_condicion"),
  "SMS-T13-0103": meta(ADQ, "Nacionalidad", "Pérdida de nacionalidad no relevante", "Determinar el efecto de perder una nacionalidad distinta de la tomada en consideración para el nombramiento", "caso_practico", "tribunal", "medio", "dificil", "concepto_proximo"),
  "SMS-T13-0104": meta(ADQ, "Separación e inhabilitación", "Efecto de la separación firme", "Relacionar la separación firme con la pérdida de la condición estatutaria", "efectos", "consolidacion", "medio", "medio", "efecto"),
  "SMS-T13-0105": meta(ADQ, "Separación e inhabilitación", "Gravedad habilitante de la separación", "Identificar la gravedad de falta que permite imponer separación del servicio", "clasificacion", "consolidacion", "medio", "dificil", "concepto_proximo"),
  "SMS-T13-0106": meta(ADQ, "Separación e inhabilitación", "Efectos temporales posteriores a la separación", "Reconocer el alcance completo de la exclusión de seis años posterior a la separación", "efectos", "tribunal", "dificil", "dificil", "combinada"),
  "SMS-T13-0107": meta(ADQ, "Separación e inhabilitación", "Inhabilitación absoluta", "Distinguir el efecto de una inhabilitación absoluta firme", "reconocimiento_directo", "consolidacion", "medio", "medio", "concepto_proximo"),
  "SMS-T13-0108": meta(ADQ, "Separación e inhabilitación", "Inhabilitación especial para empleo o cargo público", "Aplicar el requisito de afección al nombramiento en la inhabilitación especial", "caso_practico", "tribunal", "medio", "dificil", "requisito"),
  "SMS-T13-0109": meta(ADQ, "Separación e inhabilitación", "Límite de la inhabilitación especial profesional", "Distinguir seis años exactos de una pena que exceda de seis años", "plazo", "tribunal", "dificil", "dificil", "plazo"),
  "SMS-T13-0110": meta(ADQ, "Jubilación", "Prolongación voluntaria del servicio activo", "Aplicar conjuntamente capacidad funcional y autorización organizativa para prolongar el servicio", "combinacion_requisitos", "tribunal", "medio", "dificil", "combinada"),
  "SMS-T13-0111": meta(ADQ, "Jubilación", "Prórroga para causar pensión", "Aplicar el límite temporal de la prórroga por cotización insuficiente", "plazo", "tribunal", "dificil", "dificil", "plazo"),
  "SMS-T13-0112": meta(ADQ, "Incapacidad", "Incapacidad permanente parcial", "Diferenciar la incapacidad parcial de los grados que extinguen la condición", "caso_practico", "tribunal", "medio", "dificil", "concepto_proximo"),
  "SMS-T13-0113": meta(ADQ, "Incapacidad", "Incapacidad total y absoluta", "Distinguir el alcance de la incapacidad total para la profesión habitual y la absoluta para todo trabajo", "comparacion", "consolidacion", "medio", "medio", "concepto_proximo"),
  "SMS-T13-0114": meta(ADQ, "Incapacidad", "Declaración y efecto de la incapacidad permanente", "Relacionar los grados legalmente enumerados con la pérdida de la condición", "combinacion_requisitos", "tribunal", "medio", "dificil", "requisito"),
  "SMS-T13-0115": meta(ADQ, "Recuperación", "Recuperación tras revisión tardía de incapacidad", "Aplicar la regla general de recuperación cuando la revisión se produce después de dos años", "caso_practico", "tribunal", "dificil", "dificil", "excepcion"),
  "SMS-T13-0116": meta(SEL, "Criterios de provisión", "Planificación y programación de convocatorias", "Reconocer la formulación legal del principio de planificación eficiente y programación periódica", "reconocimiento_directo", "consolidacion", "medio", "dificil", "concepto_proximo"),
  "SMS-T13-0117": meta(SEL, "Criterios de provisión", "Libre designación", "Identificar qué órgano determina los puestos susceptibles de libre designación", "competencia", "consolidacion", "medio", "medio", "competencia"),
  "SMS-T13-0118": meta(SEL, "Convocatorias", "Adecuación de procedimientos y pruebas", "Aplicar la adecuación de contenidos y pruebas a las funciones y, en su caso, a la lengua oficial", "requisitos", "consolidacion", "medio", "medio", "requisito"),
  "SMS-T13-0119": meta(SEL, "Órganos de selección", "Requisitos de los miembros del órgano de selección", "Identificar los tipos de personal y nivel de titulación exigidos a sus miembros", "requisitos", "tribunal", "dificil", "dificil", "combinada"),
  "SMS-T13-0120": meta(SEL, "Nombramientos", "Publicación y ámbito del nombramiento fijo", "Relacionar la forma de publicación con la expresión del ámbito del nombramiento", "combinacion_requisitos", "consolidacion", "medio", "dificil", "omision"),
  "SMS-T13-0121": meta(SEL, "Promoción interna temporal", "Negociación del procedimiento", "Aplicar la exigencia de negociación de los procedimientos de promoción interna temporal", "caso_practico", "tribunal", "medio", "dificil", "omision"),
  "SMS-T13-0122": meta(MOV, "Coordinación", "Ámbito multiservicio del artículo 38", "Identificar cuándo se activa la regla especial de coordinación y colaboración", "aplicacion", "consolidacion", "medio", "medio", "requisito"),
  "SMS-T13-0123": meta(MOV, "Coordinación", "Principio de colaboración", "Distinguir el principio que debe primar en convocatorias que afectan a varios servicios", "diferenciacion", "tribunal", "medio", "dificil", "concepto_proximo"),
  "SMS-T13-0124": meta(MOV, "Coordinación", "Objeto de la competencia de la Comisión de Recursos Humanos", "Identificar periodicidad y coordinación como objeto de los criterios del artículo 38", "competencia", "tribunal", "medio", "dificil", "competencia"),
  "SMS-T13-0125": meta(MOV, "Comisiones de servicio", "Presupuestos de comisión sobre plaza", "Aplicar los requisitos acumulativos para cubrir una plaza vacante o temporalmente desatendida", "caso_practico", "tribunal", "dificil", "dificil", "combinada"),
  "SMS-T13-0126": meta(MOV, "Comisiones de servicio", "Modalidades, retribución y reserva", "Comparar la retribución de las dos modalidades de comisión y la reserva del puesto de origen", "comparacion", "tribunal", "dificil", "dificil", "combinada"),
  "SMS-T13-0127": meta(MOV, "Carrera profesional", "Competencia sobre mecanismos de carrera", "Identificar quién establece los mecanismos de carrera profesional y la negociación previa", "competencia", "consolidacion", "medio", "medio", "competencia"),
  "SMS-T13-0128": meta(MOV, "Carrera profesional", "Adaptación y negociación del desarrollo profesional", "Aplicar la adaptación organizativa y la negociación de su repercusión en carrera", "combinacion_requisitos", "tribunal", "medio", "dificil", "combinada"),
  "SMS-T13-0129": meta(RET, "Retribuciones básicas", "Sueldo según título exigido", "Relacionar el sueldo básico de la categoría con el título exigido para su desempeño", "relacion_normativa", "consolidacion", "medio", "medio", "concepto_proximo"),
  "SMS-T13-0130": meta(RET, "Retribuciones complementarias", "Naturaleza de las retribuciones complementarias", "Reconocer que pueden ser fijas o variables y los factores que retribuyen", "definicion", "consolidacion", "medio", "medio", "concepto_proximo"),
  "SMS-T13-0131": meta(RET, "Personal temporal", "Temporal frente a aspirante en prácticas", "Distinguir el régimen retributivo del personal temporal del mínimo de los aspirantes en prácticas", "comparacion", "tribunal", "dificil", "dificil", "concepto_proximo"),
  "SMS-T13-0132": meta(RET, "Aspirantes en prácticas", "Competencia y mínimo retributivo", "Relacionar la competencia de cada servicio de salud con el mínimo legal de retribuciones básicas sin trienios", "combinacion_requisitos", "tribunal", "dificil", "dificil", "combinada"),
  "SMS-T13-0133": meta(DISC, "Faltas", "Dies a quo de la prescripción de faltas", "Identificar el momento inicial del plazo de prescripción de una falta", "cronologia", "tribunal", "medio", "dificil", "orden_temporal"),
  "SMS-T13-0134": meta(DISC, "Faltas", "Interrupción de la prescripción de faltas", "Identificar el acto que interrumpe la prescripción de una falta", "cronologia", "tribunal", "dificil", "dificil", "orden_temporal"),
  "SMS-T13-0135": meta(DISC, "Sanciones", "Plazos de prescripción de sanciones", "Recordar los plazos de prescripción de sanciones según la gravedad de la falta", "plazo", "consolidacion", "medio", "dificil", "plazo"),
  "SMS-T13-0136": meta(DISC, "Sanciones", "Interrupción de la prescripción de sanciones", "Identificar el inicio de la ejecución con conocimiento del interesado como acto interruptivo", "cronologia", "tribunal", "dificil", "dificil", "orden_temporal"),
  "SMS-T13-0137": meta(DISC, "Sanciones", "Reanudación tras paralización de la ejecución", "Aplicar el límite de paralización superior a seis meses para que vuelva a correr el plazo", "caso_practico", "tribunal", "dificil", "dificil", "plazo"),
  "SMS-T13-0138": meta(DISC, "Sanciones", "Cancelación de oficio de anotaciones", "Aplicar la cancelación de oficio una vez transcurrido el plazo desde el cumplimiento", "caso_practico", "tribunal", "medio", "dificil", "plazo"),
  "SMS-T13-0139": meta(DISC, "Sanciones", "Plazos de cancelación de anotaciones", "Distinguir los plazos de cancelación para sanciones leves, graves y muy graves", "plazo", "tribunal", "dificil", "dificil", "plazo"),
  "SMS-T13-0140": meta(DISC, "Sanciones", "Anotación de sanciones firmes", "Identificar qué sanciones deben anotarse en el expediente personal", "requisitos", "consolidacion", "medio", "dificil", "requisito"),
  "SMS-T13-0141": meta(DISC, "Procedimiento", "Principios del procedimiento disciplinario", "Reconocer celeridad, inmediatez y economía procesal como principios procedimentales", "reconocimiento_directo", "consolidacion", "medio", "medio", "concepto_proximo"),
  "SMS-T13-0142": meta(DISC, "Procedimiento", "Alegaciones y prueba", "Distinguir el alcance de las alegaciones y de la proposición de prueba durante el procedimiento", "aplicacion", "tribunal", "medio", "dificil", "omision"),
  "SMS-T13-0143": meta(DISC, "Medidas provisionales", "Duración de la suspensión provisional judicial", "Aplicar el límite temporal de la suspensión provisional acordada tras procesamiento o apertura de juicio oral", "plazo", "tribunal", "dificil", "dificil", "plazo"),
  "SMS-T13-0144": meta(DISC, "Medidas provisionales", "Medida judicial impeditiva y retribuciones", "Aplicar el efecto retributivo cuando una medida judicial impide trabajar más de cinco días consecutivos", "caso_practico", "tribunal", "dificil", "dificil", "efecto"),
};

export const topic13V2QuestionCandidates: Topic13V2QuestionCandidate[] =
  topic13ReviewedCoverageGapQuestions.map((candidate) => {
    const metadata = metadataByCode[candidate.questionCode];
    if (!metadata) throw new Error(`Missing V2 metadata for ${candidate.questionCode}`);

    return {
      codigo: candidate.questionCode,
      materia: MATERIA,
      numero_tema: 13,
      tema: TEMA,
      ...metadata,
      pregunta: candidate.question,
      opcion_a: candidate.options[0],
      opcion_b: candidate.options[1],
      opcion_c: candidate.options[2],
      opcion_d: candidate.options[3],
      respuesta_correcta: candidate.correctOption,
      explicacion: candidate.explanation,
      documento_referencia: candidate.documentReference,
      pagina_inicio: candidate.pageStart,
      pagina_fin: candidate.pageEnd,
      referencia_fuente: candidate.sourceReference,
      frecuencia_historica: "no_determinada",
    };
  });
