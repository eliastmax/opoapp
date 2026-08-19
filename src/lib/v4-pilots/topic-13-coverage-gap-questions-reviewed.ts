import {
  topic13CoverageGapQuestions,
  type Topic13GapQuestionCandidate,
} from "./topic-13-coverage-gap-questions";

type CandidatePatch = Partial<Omit<Topic13GapQuestionCandidate, "questionCode" | "conceptCode">>;

function revise(questionCode: string, patch: CandidatePatch): Topic13GapQuestionCandidate {
  const base = topic13CoverageGapQuestions.find((entry) => entry.questionCode === questionCode);
  if (!base) throw new Error(`Unknown Topic 13 candidate ${questionCode}`);
  return { ...base, ...patch };
}

const editorialRevisions = new Map<string, Topic13GapQuestionCandidate>([
  [
    "SMS-T13-0114",
    revise("SMS-T13-0114", {
      dimension: "declaration_and_effect",
      question:
        "A efectos del artículo 27, ¿qué relación existe entre la declaración de incapacidad permanente y la pérdida de la condición estatutaria?",
      options: [
        "Basta cualquier limitación funcional apreciada internamente por el centro para extinguir la condición.",
        "La pérdida deriva de la declaración, en los términos del Régimen General de la Seguridad Social, de uno de los grados de incapacidad que enumera el artículo 27.",
        "La incapacidad solo produce efectos si además se impone una sanción disciplinaria de separación.",
        "La declaración de incapacidad nunca extingue la condición y solo permite un cambio voluntario de puesto.",
      ],
      correctOption: "B",
      explanation:
        "El artículo 27 conecta el efecto extintivo con la declaración, en los términos del Régimen General de la Seguridad Social, de incapacidad permanente total para la profesión habitual, absoluta para todo trabajo o gran invalidez.",
      trapType: "requisito_efecto",
    }),
  ],
  [
    "SMS-T13-0126",
    revise("SMS-T13-0126", {
      dimension: "contrast_modalities",
      question:
        "Se comparan dos comisiones de servicio: una cubre temporalmente una plaza vacante cuyas retribuciones son inferiores a las de origen; la otra encomienda funciones especiales no adscritas a una plaza. ¿Qué regla conjunta es correcta?",
      options: [
        "En la vacante se reducen necesariamente las retribuciones y en funciones especiales se cobran las del puesto más próximo.",
        "En la vacante se conservan las retribuciones de origen por ser superiores; en funciones especiales se perciben las de origen, y la comisión mantiene la reserva del puesto de procedencia.",
        "En ambos casos se perciben siempre las retribuciones del destino efectivo y se pierde la reserva de origen al superar tres meses.",
        "Solo la comisión para vacante es temporal; las funciones especiales producen un nuevo nombramiento definitivo.",
      ],
      correctOption: "B",
      explanation:
        "El artículo 39 diferencia las dos modalidades: en vacante se cobra el puesto efectivo salvo que sea inferior al origen; en funciones especiales se mantienen las retribuciones de origen. El apartado 3 reconoce reserva del puesto de origen.",
      trapType: "contraste_modalidades",
    }),
  ],
  [
    "SMS-T13-0131",
    revise("SMS-T13-0131", {
      dimension: "contrast_temporary_vs_practice",
      question:
        "¿Qué contraste retributivo distingue correctamente al personal estatutario temporal de los aspirantes en prácticas?",
      options: [
        "El temporal percibe solo básicas sin trienios; el aspirante percibe siempre todas las complementarias del puesto definitivo.",
        "El temporal percibe las básicas y complementarias de su nombramiento salvo trienios; el aspirante tiene como mínimo las básicas sin trienios del grupo al que aspira ingresar.",
        "Ambos perciben exactamente las mismas retribuciones completas, incluidos trienios, desde el inicio.",
        "El temporal solo percibe complementarias variables y el aspirante únicamente sueldo, sin pagas extraordinarias.",
      ],
      correctOption: "B",
      explanation:
        "El artículo 44 regula el régimen del temporal; el 45 fija un suelo distinto para aspirantes en prácticas. El contraste evita convertir dos reglas especiales próximas en una misma fórmula.",
      sourceReference: "Ley 55/2003, arts. 44-45",
      trapType: "contraste_regimenes",
    }),
  ],
  [
    "SMS-T13-0132",
    revise("SMS-T13-0132", {
      dimension: "competence_and_floor",
      question:
        "¿Cómo distribuye el artículo 45 la competencia y el límite mínimo para fijar las retribuciones de los aspirantes en prácticas?",
      options: [
        "Las fija el Estado con una cuantía uniforme y deben incluir al menos sueldo, trienios y todas las complementarias.",
        "Se fijan en el ámbito de cada servicio de salud, respetando como mínimo las retribuciones básicas, excluidos trienios, del grupo al que se aspira ingresar.",
        "Las fija cada tribunal de selección y el mínimo es el salario de la categoría de procedencia del aspirante.",
        "Las fija la Comisión de Recursos Humanos del SNS y el mínimo coincide con las retribuciones completas del futuro puesto.",
      ],
      correctOption: "B",
      explanation:
        "La pregunta añade la dimensión competencial: cada servicio de salud fija la retribución, pero debe respetar el suelo legal de básicas sin trienios del grupo de ingreso.",
      trapType: "competencia_y_minimo",
    }),
  ],
]);

export const topic13ReviewedCoverageGapQuestions = topic13CoverageGapQuestions.map(
  (entry) => editorialRevisions.get(entry.questionCode) ?? entry,
);
