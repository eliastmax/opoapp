import {
  topic13CoverageGapQuestions,
  type Topic13GapQuestionCandidate,
} from "./topic-13-coverage-gap-questions";

type CandidatePatch = Partial<Omit<Topic13GapQuestionCandidate, "questionCode" | "conceptCode">>;
type AnswerKey = Topic13GapQuestionCandidate["correctOption"];

function revise(questionCode: string, patch: CandidatePatch): Topic13GapQuestionCandidate {
  const base = topic13CoverageGapQuestions.find((entry) => entry.questionCode === questionCode);
  if (!base) throw new Error(`Unknown Topic 13 candidate ${questionCode}`);
  return { ...base, ...patch };
}

// T13-CONTENT.2.1 adversarial pass: these questions were rewritten because one or
// more distractors were too easy to discard without knowing the legal distinction.
const editorialRevisions = new Map<string, Topic13GapQuestionCandidate>([
  [
    "SMS-T13-0100",
    revise("SMS-T13-0100", {
      question:
        "Un aspirante ya nombrado no se incorpora dentro del plazo porque una causa acreditada, ajena a su voluntad y considerada justificada se lo impide. ¿Qué efecto produce por sí sola esa falta de incorporación conforme al artículo 20.3?",
      options: [
        "Produce el decaimiento del derecho derivado del proceso, porque basta con incumplir el plazo de incorporación.",
        "No produce el decaimiento del artículo 20.3, porque éste exige falta imputable al interesado y ausencia de causa justificada.",
        "Impide el decaimiento solo si la convocatoria había previsto expresamente una prórroga del plazo de incorporación.",
        "Suspende el derecho a adquirir la condición fija hasta que el órgano convocante dicte un nuevo nombramiento.",
      ],
      correctOption: "B",
      trapType: "excepcion_condiciones",
    }),
  ],
  [
    "SMS-T13-0103",
    revise("SMS-T13-0103", {
      dimension: "mini_case_non_relevant_nationality",
      question:
        "Una persona fue nombrada teniendo en cuenta una nacionalidad que conserva y, además, poseía otra nacionalidad que no fue relevante para el acceso. Si pierde únicamente esta segunda nacionalidad, ¿qué consecuencia deriva del artículo 23?",
      options: [
        "Pierde la condición, porque el artículo 23 alcanza a cualquier nacionalidad que poseyera al ser nombrada.",
        "No pierde la condición por ese hecho, porque conserva la nacionalidad tomada en consideración para el nombramiento.",
        "Pierde la condición salvo que adquiera simultáneamente una tercera nacionalidad que también permita el acceso.",
        "Pierde primero la condición y debe recuperarla por el artículo 28 aunque nunca haya perdido la nacionalidad habilitante.",
      ],
      correctOption: "B",
      trapType: "sujeto_relevante",
    }),
  ],
  [
    "SMS-T13-0106",
    revise("SMS-T13-0106", {
      dimension: "full_six_year_exclusion_scope",
      question:
        "Tras ejecutarse una sanción de separación del servicio, ¿cuál es el alcance de la exclusión que establece el artículo 73.1.a durante los seis años siguientes?",
      options: [
        "Impide concurrir a pruebas para obtener la condición fija, pero permite prestar servicios temporales y trabajar en otras Administraciones públicas.",
        "Impide concurrir a pruebas para obtener la condición fija y prestar servicios estatutarios temporales, pero no alcanza al resto del sector público enumerado por la ley.",
        "Impide concurrir a pruebas para obtener la condición fija, prestar servicios como estatutario temporal y prestar servicios en las Administraciones, organismos, entidades públicas y fundaciones sanitarias que enumera el precepto.",
        "Impone ese mismo alcance general durante cuatro años, coincidiendo con el máximo previsto para el traslado forzoso con cambio de localidad.",
      ],
      correctOption: "C",
      explanation:
        "El artículo 73.1.a establece durante seis años una exclusión triple: no concurrir a selección para fijo, no prestar servicios como estatutario temporal y no prestar servicios en ninguna Administración pública ni en los organismos, entidades públicas o fundaciones sanitarias enumerados en el propio precepto.",
      trapType: "alcance_efecto",
    }),
  ],
  [
    "SMS-T13-0112",
    revise("SMS-T13-0112", {
      dimension: "mini_case_partial_vs_extinguishing_degrees",
      question:
        "A una persona estatutaria se le declara una incapacidad permanente parcial para su profesión habitual, sin declaración de incapacidad permanente total, absoluta ni gran invalidez. ¿Produce esa declaración la pérdida prevista en el artículo 27?",
      options: [
        "Sí, porque cualquier grado de incapacidad permanente declarado conforme a la Seguridad Social extingue la condición.",
        "Sí, pero únicamente si la incapacidad parcial se mantiene durante más de dos años sin revisión.",
        "No por el artículo 27: el precepto enumera la total para la profesión habitual, la absoluta para todo trabajo y la gran invalidez.",
        "No, salvo que el servicio de salud opte discrecionalmente por equipararla a una incapacidad permanente total.",
      ],
      correctOption: "C",
      explanation:
        "El artículo 27 vincula la pérdida a tres grados concretos declarados conforme al Régimen General de la Seguridad Social: incapacidad permanente total para la profesión habitual, absoluta para todo trabajo y gran invalidez. La incapacidad permanente parcial no figura en esa enumeración.",
      trapType: "concepto_proximo",
    }),
  ],
  [
    "SMS-T13-0114",
    revise("SMS-T13-0114", {
      dimension: "declaration_and_effect",
      question:
        "A efectos del artículo 27, ¿qué relación existe entre la declaración de incapacidad permanente y la pérdida de la condición estatutaria?",
      options: [
        "Toda incapacidad permanente declarada conforme al Régimen General produce la pérdida, cualquiera que sea su grado.",
        "Solo la incapacidad absoluta y la gran invalidez producen pérdida; la total obliga únicamente a adaptar el puesto.",
        "La pérdida deriva de la declaración, conforme al Régimen General, de incapacidad permanente total para la profesión habitual, absoluta para todo trabajo o gran invalidez.",
        "La incapacidad total produce pérdida solo cuando hayan transcurrido dos años sin que se revise la declaración.",
      ],
      correctOption: "C",
      explanation:
        "El artículo 27 conecta el efecto extintivo con la declaración, en los términos del Régimen General de la Seguridad Social, de incapacidad permanente total para la profesión habitual, absoluta para todo trabajo o gran invalidez.",
      trapType: "requisito_efecto",
    }),
  ],
  [
    "SMS-T13-0116",
    revise("SMS-T13-0116", {
      question:
        "¿Qué formulación reproduce el principio del artículo 29.1.b sobre planificación y convocatorias?",
      options: [
        "Planificación eficiente de las necesidades de recursos y programación periódica de las convocatorias.",
        "Planificación anual de las plantillas y convocatoria obligatoria de todas las vacantes al cierre de cada ejercicio.",
        "Planificación estatal de las necesidades y programación bienal uniforme para todos los servicios de salud.",
        "Planificación según las vacantes existentes, sin exigencia de programación periódica de las convocatorias.",
      ],
      correctOption: "A",
      trapType: "literalidad_catalogo",
    }),
  ],
  [
    "SMS-T13-0117",
    revise("SMS-T13-0117", {
      question:
        "En relación con la libre designación, ¿qué distribución competencial establece el artículo 29.3?",
      options: [
        "La ley básica identifica directamente todos los puestos de libre designación y cada servicio se limita a convocarlos.",
        "Cada servicio de salud determina qué puestos pueden ser provistos mediante libre designación.",
        "La Comisión de Recursos Humanos del SNS determina las categorías y cada servicio decide después las personas candidatas.",
        "Cada servicio puede utilizar libre designación solo para puestos temporales previamente excluidos de movilidad.",
      ],
      correctOption: "B",
      trapType: "competencia",
    }),
  ],
  [
    "SMS-T13-0121",
    revise("SMS-T13-0121", {
      dimension: "mini_case_negotiation_requirement",
      question:
        "Un servicio de salud pretende aprobar por instrucción interna un procedimiento de promoción interna temporal para personal fijo, sin llevarlo a las mesas correspondientes. ¿Qué exige el artículo 35.1?",
      options: [
        "Permite aprobarlo unilateralmente si se justifican necesidades del servicio, porque la negociación solo afecta a las retribuciones.",
        "Exige que esos procedimientos sean objeto de negociación en las mesas correspondientes.",
        "Exige negociación únicamente cuando la promoción temporal sea a una categoría de nivel de titulación superior.",
        "Reserva la aprobación del procedimiento a la Comisión de Recursos Humanos del SNS cuando afecte a más de una categoría.",
      ],
      correctOption: "B",
      trapType: "omision_negociacion",
    }),
  ],
  [
    "SMS-T13-0123",
    revise("SMS-T13-0123", {
      question:
        "Cuando una convocatoria de provisión, selección o movilidad afecta a más de un servicio de salud, ¿qué principio dice expresamente el artículo 38 que debe primar?",
      options: [
        "El principio de coordinación entre las Administraciones sanitarias afectadas.",
        "El principio de cooperación entre las Administraciones sanitarias afectadas.",
        "El principio de igualdad efectiva en la movilidad del personal.",
        "El principio de colaboración entre todos los servicios de salud afectados.",
      ],
      correctOption: "D",
      trapType: "concepto_proximo",
    }),
  ],
  [
    "SMS-T13-0124",
    revise("SMS-T13-0124", {
      question:
        "En el supuesto del artículo 38, ¿sobre qué objeto debe establecer criterios y principios la Comisión de Recursos Humanos del SNS?",
      options: [
        "Sobre la periodicidad y coordinación de las convocatorias que afectan a más de un servicio de salud.",
        "Sobre la homologación de categorías funcionales necesaria para articular la movilidad voluntaria entre servicios.",
        "Sobre las condiciones de selección, promoción y movilidad que se negocian con las organizaciones sindicales en cada mesa.",
        "Sobre la composición y funcionamiento de los órganos de selección de cada servicio de salud.",
      ],
      correctOption: "A",
      trapType: "competencia_objeto",
    }),
  ],
  [
    "SMS-T13-0125",
    revise("SMS-T13-0125", {
      question:
        "Una plaza está temporalmente desatendida y el servicio quiere cubrirla mediante comisión de servicios. ¿Qué combinación se ajusta al artículo 39.1?",
      options: [
        "Necesidades del servicio, cobertura temporal y personal estatutario de cualquier categoría que reúna la titulación del puesto.",
        "Necesidades del servicio, plaza vacante o temporalmente desatendida, cobertura temporal y personal estatutario de la correspondiente categoría y especialidad.",
        "Plaza vacante o desatendida, cobertura temporal y personal de la misma categoría, aunque no concurra una necesidad del servicio.",
        "Necesidades del servicio y personal de la categoría correspondiente, siempre que la comisión tenga carácter definitivo hasta la provisión reglamentaria.",
      ],
      correctOption: "B",
      trapType: "combinacion_requisitos",
    }),
  ],
  [
    "SMS-T13-0126",
    revise("SMS-T13-0126", {
      dimension: "contrast_modalities",
      question:
        "Se comparan dos comisiones de servicio: una cubre una plaza vacante cuyas retribuciones son inferiores a las de origen; la otra encomienda funciones especiales no adscritas a plaza. ¿Qué combinación aplica correctamente los apartados 1 a 3 del artículo 39?",
      options: [
        "Vacante: retribuciones del puesto efectivo aunque sean inferiores; funciones especiales: retribuciones de origen; reserva del puesto de origen en ambas.",
        "Vacante: retribuciones de origen por ser superiores; funciones especiales: retribuciones de origen; reserva del puesto de origen en ambas.",
        "Vacante: retribuciones de origen por ser superiores; funciones especiales: retribuciones equivalentes a una plaza de destino; reserva del puesto de origen en ambas.",
        "Vacante y funciones especiales: se aplican las reglas retributivas anteriores, pero la reserva del puesto de origen solo existe en la comisión sobre plaza vacante.",
      ],
      correctOption: "B",
      explanation:
        "En una comisión sobre plaza se percibe la retribución del puesto efectivo salvo que sea inferior a la de origen, en cuyo caso se mantiene la de origen. En funciones especiales no adscritas a plaza se perciben las retribuciones de origen. El apartado 3 reconoce la reserva del puesto de origen en la comisión de servicios.",
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
        "El temporal percibe las básicas sin trienios pero no complementarias; el aspirante percibe el mismo mínimo de básicas sin trienios.",
        "El temporal percibe básicas y complementarias y consolida trienios al cumplir tres años; el aspirante tiene como mínimo las básicas sin trienios.",
        "El temporal percibe básicas y complementarias salvo trienios; el aspirante debe percibir además todas las complementarias del futuro puesto.",
        "El temporal percibe las básicas y complementarias de su nombramiento salvo trienios; el aspirante tiene como mínimo las básicas, excluidos trienios, del grupo al que aspira ingresar.",
      ],
      correctOption: "D",
      explanation:
        "El artículo 44 regula el régimen del temporal; el 45 fija un suelo distinto para aspirantes en prácticas. El temporal percibe las básicas y complementarias de su nombramiento salvo trienios, mientras el aspirante tiene como mínimo las básicas sin trienios del grupo de ingreso.",
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
        "Cada servicio de salud las fija, respetando como mínimo las retribuciones básicas, excluidos trienios, del grupo al que se aspira ingresar.",
        "Cada servicio de salud las fija, pero el mínimo incluye las retribuciones básicas con los trienios que el aspirante pudiera tener reconocidos.",
        "La Comisión de Recursos Humanos del SNS las fija para todos los servicios, con el mismo mínimo de básicas sin trienios.",
        "Cada servicio de salud las fija, pero el mínimo legal se limita al sueldo y no alcanza al resto de retribuciones básicas.",
      ],
      correctOption: "A",
      explanation:
        "El artículo 45 permite fijar la retribución en el ámbito de cada servicio de salud, pero exige como mínimo las retribuciones básicas, excluidos trienios, del grupo al que se aspira ingresar.",
      trapType: "competencia_y_minimo",
    }),
  ],
  [
    "SMS-T13-0138",
    revise("SMS-T13-0138", {
      dimension: "mini_case_ex_officio_cancellation",
      question:
        "Se ha cumplido una sanción por falta grave y han transcurrido dos años desde su cumplimiento, pero el interesado no ha solicitado que se elimine la anotación. ¿Qué dispone el artículo 73.5?",
      options: [
        "La anotación permanece hasta que el interesado inste expresamente su cancelación.",
        "La anotación se cancela solo cuando transcurren cuatro años desde la firmeza de la resolución sancionadora.",
        "La anotación debe cancelarse de oficio al cumplirse el período legal computado desde el cumplimiento de la sanción.",
        "La anotación puede cancelarse discrecionalmente si durante esos dos años no se ha impuesto otra sanción.",
      ],
      correctOption: "C",
      explanation:
        "El artículo 73.5 ordena la cancelación de oficio. Para las sanciones impuestas por faltas graves el período es de dos años y se computa desde el cumplimiento de la sanción.",
      trapType: "plazo_y_oficio",
    }),
  ],
  [
    "SMS-T13-0142",
    revise("SMS-T13-0142", {
      question:
        "Durante la tramitación de un procedimiento disciplinario, ¿qué combinación de facultades reconoce expresamente el artículo 74.2 al interesado?",
      options: [
        "Formular alegaciones solo antes de la propuesta de resolución y proponer únicamente las pruebas admitidas de oficio por el instructor.",
        "Formular alegaciones en cualquier fase, pero la prueba queda limitada a documentos ya incorporados al expediente.",
        "Formular alegaciones en cualquier fase y proponer cuantas pruebas sean adecuadas para la determinación de los hechos.",
        "Proponer cualquier prueba sin relación con los hechos y suspender la tramitación mientras se decide sobre su admisión.",
      ],
      correctOption: "C",
      trapType: "garantias",
    }),
  ],
]);

const BALANCED_KEY_ORDER: readonly AnswerKey[] = ["A", "B", "C", "D"];

function rebalanceCorrectOption(
  entry: Topic13GapQuestionCandidate,
  index: number,
): Topic13GapQuestionCandidate {
  // 44 questions cycle A/B/C/D (11 each); the final question is D -> 11/11/11/12.
  const target: AnswerKey = index === 44 ? "D" : BALANCED_KEY_ORDER[index % 4];
  if (entry.correctOption === target) return entry;

  const labels: readonly AnswerKey[] = ["A", "B", "C", "D"];
  const sourceIndex = labels.indexOf(entry.correctOption);
  const targetIndex = labels.indexOf(target);
  const options = [...entry.options] as [string, string, string, string];
  [options[sourceIndex], options[targetIndex]] = [options[targetIndex], options[sourceIndex]];

  return { ...entry, options, correctOption: target };
}

export const topic13ReviewedCoverageGapQuestions = topic13CoverageGapQuestions
  .map((entry) => editorialRevisions.get(entry.questionCode) ?? entry)
  .map(rebalanceCorrectOption);
