import type {
  V4SourceRef,
  V4StudyContentPackage,
} from "../v4-content-package";

function sourceRefs(
  articleReference: string,
  pageStart: number,
  pageEnd: number = pageStart,
): V4SourceRef[] {
  return [
    {
      label: "BOE — Ley 55/2003 consolidada",
      reference: `BOE-A-2003-23101, ${articleReference}`,
    },
    {
      label: "Temario principal",
      reference:
        pageStart === pageEnd
          ? `Temario_new.pdf, p. ${pageStart}`
          : `Temario_new.pdf, pp. ${pageStart}-${pageEnd}`,
      pageStart,
      pageEnd,
    },
  ];
}

const u01Sources = sourceRefs("arts. 17-18", 241, 243);
const u02Sources = sourceRefs("art. 19", 243, 245);
const u03Sources = sourceRefs("art. 20", 245, 246);
const u04Sources = sourceRefs("arts. 21-25", 246, 247);
const u05Sources = sourceRefs("arts. 26-28", 247, 249);
const u06Sources = sourceRefs("arts. 29-30.4", 249, 252);
const u07Sources = sourceRefs("art. 30.5-6", 250, 252);
const u08Sources = sourceRefs("arts. 31-32", 252, 254);
const u09Sources = sourceRefs("art. 33", 254, 255);
const u10Sources = sourceRefs("arts. 34-35", 255, 257);
const u11Sources = sourceRefs("arts. 36-39", 257, 260);
const u12Sources = sourceRefs("art. 40", 260, 261);
const u13Sources = sourceRefs("arts. 41-42", 261, 263);
const u14Sources = sourceRefs("arts. 43-45", 263, 264);
const u15Sources = sourceRefs("arts. 70-71", 265, 267);
const u16Sources = sourceRefs("art. 72", 267, 271);
const u17Sources = sourceRefs("arts. 71.8 y 73", 266, 272);
const u18Sources = sourceRefs("arts. 74-75", 272, 275);

function mapPrimary(
  start: number,
  end: number,
  primaryConceptCode: string,
): V4StudyContentPackage["questionMappings"] {
  return Array.from({ length: end - start + 1 }, (_, offset) => ({
    questionCode: `SMS-T13-${String(start + offset).padStart(4, "0")}`,
    primaryConceptCode,
  }));
}

type FlashcardType = V4StudyContentPackage["flashcards"][number]["type"];

function card(
  number: number,
  conceptCode: string,
  type: FlashcardType,
  prompt: string,
  answer: string,
  position: number,
  sources: V4SourceRef[],
): V4StudyContentPackage["flashcards"][number] {
  return {
    code: `SMS-T13-F${String(number).padStart(2, "0")}`,
    conceptCode,
    type,
    prompt,
    answer,
    position,
    sourceRefs: sources,
  };
}

export const topic13EstatutoMarcoPackage = {
  version: "4.0",
  oppositionCode: "auxiliar-administrativo-sms",
  topicNumber: 13,
  sourceRevision:
    "BOE-A-2003-23101 consolidado: última actualización publicada 2023-03-01; contraste con Temario_new.pdf y banco activo realizado 2026-08-19",
  units: [
    {
      code: "SMS-T13-U01",
      title: "Derechos del personal",
      position: 1,
      estimatedMinutes: 6,
      studySummary:
        "El Estatuto Marco distingue derechos individuales y colectivos. Entre los individuales están la estabilidad en el empleo del personal fijo, retribuciones, formación, protección en seguridad y salud, movilidad y promoción, dignidad, descanso, asistencia de la Administración, Seguridad Social, información sobre funciones, no discriminación, jubilación y acción social. El régimen del artículo 17 se aplica también al personal temporal en la medida en que la naturaleza de cada derecho lo permita. Entre los colectivos figuran libre sindicación, actividad sindical, huelga, negociación colectiva, representación y participación, reunión y prevención; la huelga debe compatibilizarse con el mantenimiento de los servicios esenciales de atención sanitaria.",
      examKeys: [
        "La estabilidad en el empleo es un derecho individual ligado a la condición fija; el artículo 17.2 extiende el régimen de derechos al temporal solo cuando la naturaleza del derecho lo permita.",
        "La huelga es derecho colectivo, pero debe garantizarse el mantenimiento de los servicios esenciales para la atención sanitaria.",
        "Negociación colectiva, representación y participación forman parte del catálogo de derechos colectivos.",
        "La redacción vigente del artículo 17.1.k incluye orientación e identidad sexual, expresión de género y características sexuales.",
      ],
      confusions: [
        "No convertir la extensión de derechos al personal temporal en una equiparación absoluta con los derechos inherentes a la condición fija.",
        "No confundir los derechos colectivos del artículo 18 con deberes de colaboración o funcionamiento del artículo 19.",
      ],
      traps: [
        "Afirmar que el derecho de huelga elimina la obligación de mantener servicios esenciales.",
        "Presentar la estabilidad en el empleo como derecho indistinto de todo nombramiento temporal.",
      ],
      mnemonics: [],
      sourceRefs: u01Sources,
    },
    {
      code: "SMS-T13-U02",
      title: "Deberes del personal",
      position: 2,
      estimatedMinutes: 7,
      studySummary:
        "El artículo 19 reúne deberes jurídicos, profesionales y organizativos. El personal debe respetar el ordenamiento, desempeñar sus funciones con lealtad y eficacia, mantener actualizados conocimientos y aptitudes, cumplir diligentemente instrucciones relacionadas con su nombramiento y colaborar en equipo. También debe respetar horarios y medidas especiales, informar a los usuarios dentro de sus competencias, proteger su dignidad e intimidad, guardar confidencialidad, usar medios e instalaciones con eficiencia, cumplimentar documentación, observar seguridad y salud, cumplir incompatibilidades e identificarse cuando proceda. La clave de examen suele estar en el verbo, el sujeto y el límite concreto de cada deber.",
      examKeys: [
        "Actualización profesional y formación continuada están conectadas, pero el deber de mantener conocimientos recae en el personal.",
        "Las instrucciones deben relacionarse con las funciones propias del nombramiento; además existe deber de colaboración leal y activa en equipo.",
        "La reserva y confidencialidad alcanza información y documentación del centro y de los usuarios conocida por razón de las funciones.",
        "Los medios deben usarse en beneficio del paciente con eficiencia y evitando el uso ilegítimo propio o de terceros.",
      ],
      confusions: [
        "No confundir informar al usuario dentro del ámbito competencial con divulgar información sometida a reserva.",
        "No confundir protección en seguridad y salud como derecho con el deber de cumplir las normas y utilizar adecuadamente los medios de protección.",
      ],
      traps: [
        "Cambiar un deber de diligencia por una facultad discrecional.",
        "Omitir que el deber de identificación se ejerce cuando así sea requerido por los usuarios o resulte necesario por las funciones.",
      ],
      mnemonics: [],
      sourceRefs: u02Sources,
    },
    {
      code: "SMS-T13-U03",
      title: "Adquisición de la condición fija",
      position: 3,
      estimatedMinutes: 5,
      studySummary:
        "La condición de personal estatutario fijo se adquiere mediante tres requisitos sucesivos: superar las pruebas de selección, obtener el nombramiento del órgano competente e incorporarse a la plaza correspondiente dentro del plazo y tras cumplir los requisitos formales. Haber superado el proceso no basta si después no se acreditan las condiciones exigidas: no podrá producirse el nombramiento y quedarán sin efecto las actuaciones. Si, por causa imputable al interesado y sin justificación, no se incorpora en plazo, decae su derecho a obtener la condición fija derivada de ese proceso concreto.",
      examKeys: [
        "Secuencia: selección superada → nombramiento → incorporación en plazo.",
        "No acreditar requisitos tras superar el proceso impide el nombramiento y deja sin efecto las actuaciones.",
        "La falta injustificada de incorporación produce decaimiento respecto de ese concreto proceso selectivo.",
      ],
      confusions: [
        "No equiparar superación de las pruebas con adquisición automática de la condición fija.",
        "No confundir falta de acreditación previa al nombramiento con falta de incorporación posterior.",
      ],
      traps: [
        "Eliminar el carácter sucesivo de los tres requisitos.",
        "Afirmar que cualquier falta de incorporación produce el mismo efecto aunque exista causa justificada no imputable al interesado.",
      ],
      mnemonics: ["S-N-I: Superar, Nombramiento, Incorporarse."],
      sourceRefs: u03Sources,
    },
    {
      code: "SMS-T13-U04",
      title: "Pérdida: causas, renuncia, nacionalidad e inhabilitación",
      position: 4,
      estimatedMinutes: 8,
      studySummary:
        "La condición fija se extingue por renuncia, pérdida de la nacionalidad tenida en cuenta para el nombramiento, separación disciplinaria firme, determinadas penas de inhabilitación, jubilación e incapacidad permanente. La renuncia es voluntaria, debe solicitarse con al menos 15 días de antelación y se acepta en ese plazo salvo expediente disciplinario o determinadas actuaciones penales por delito cometido en el ejercicio de funciones; renunciar no impide volver a acceder por selección. La pérdida de nacionalidad no extingue la condición si simultáneamente se adquiere otra que permita el acceso. La separación debe ser firme. La inhabilitación absoluta firme extingue la condición; la especial para empleo o cargo público lo hace si afecta al nombramiento, y la especial para la profesión cuando excede de seis años.",
      examKeys: [
        "Renuncia: solicitud con 15 días de antelación; no inhabilita para un futuro acceso.",
        "Separación del servicio: solo produce pérdida cuando la sanción es firme.",
        "Pérdida de nacionalidad tiene excepción por adquisición simultánea de otra nacionalidad habilitante.",
        "Inhabilitación especial para la profesión: pérdida si excede de seis años.",
      ],
      confusions: [
        "No confundir renuncia con sanción: es voluntaria y no cierra futuros procesos selectivos.",
        "No trasladar el umbral de seis años de la inhabilitación profesional a la inhabilitación absoluta o a toda inhabilitación especial.",
      ],
      traps: [
        "Suprimir la firmeza exigida para separación o inhabilitación.",
        "Afirmar que la pérdida de cualquier nacionalidad produce siempre y sin excepción la extinción.",
      ],
      mnemonics: [],
      sourceRefs: u04Sources,
    },
    {
      code: "SMS-T13-U05",
      title: "Jubilación, incapacidad y recuperación",
      position: 5,
      estimatedMinutes: 8,
      studySummary:
        "La jubilación puede ser forzosa o voluntaria. La forzosa se declara a los 65 años, aunque el interesado puede pedir prolongar el servicio activo hasta un máximo de 70 si mantiene capacidad funcional y el servicio de salud lo autoriza conforme a necesidades organizativas. Si al cumplir la edad forzosa faltan seis años o menos de cotización para causar pensión, procede a instancia del interesado una prórroga limitada al tiempo necesario, siempre con capacidad funcional. La incapacidad permanente total para la profesión habitual, absoluta o gran invalidez produce pérdida de la condición. La recuperación puede proceder por desaparición de la causa de pérdida de nacionalidad o por revisión de la incapacidad; si esta revisión se produce dentro de los dos años siguientes, existe derecho a incorporarse a plaza de la misma categoría y área de salud. Fuera de ese supuesto, la recuperación lleva aparejada excedencia voluntaria y posterior reingreso por los procedimientos previstos.",
      examKeys: [
        "Jubilación forzosa: 65 años; prolongación voluntaria hasta un máximo de 70, condicionada a capacidad y autorización.",
        "Prórroga por cotización: solo cuando resten seis años o menos para causar pensión y hasta completar el tiempo necesario.",
        "Incapacidad que extingue: total para profesión habitual, absoluta para todo trabajo o gran invalidez.",
        "Revisión de incapacidad dentro de dos años: derecho a plaza de la misma categoría y área de salud.",
      ],
      confusions: [
        "No confundir prolongación hasta 70 con prórroga por cotización insuficiente: tienen presupuestos distintos.",
        "No convertir toda recuperación en incorporación directa; el artículo 28.3 prevé excedencia voluntaria salvo la excepción de revisión dentro de dos años.",
      ],
      traps: [
        "Presentar los 70 años como una prolongación automática.",
        "Omitir la capacidad funcional necesaria en prolongación y prórroga.",
      ],
      mnemonics: ["65 base, 70 techo; si faltan ≤6 de cotización, prórroga hasta completar."],
      sourceRefs: u05Sources,
    },
    {
      code: "SMS-T13-U06",
      title: "Provisión y convocatorias",
      position: 6,
      estimatedMinutes: 7,
      studySummary:
        "La provisión se apoya en igualdad, mérito, capacidad y publicidad, junto con planificación, movilidad, coordinación y participación negociada. Las plazas pueden proveerse mediante selección, promoción interna, movilidad y reingreso, además de los supuestos que cada servicio regule. La selección de personal fijo es periódica, mediante convocatoria pública y procedimientos que garanticen igualdad, mérito, capacidad y competencia. Las bases vinculan a Administración, órganos de selección y participantes. La convocatoria debe identificar las plazas y fijar, al menos, requisitos, plazo de solicitudes, pruebas, baremos, programas y sistema de calificación.",
      examKeys: [
        "Principios nucleares de provisión: igualdad, mérito, capacidad y publicidad.",
        "Sistemas de provisión: selección, promoción interna, movilidad y reingreso al servicio activo.",
        "La selección fija es periódica y por convocatoria pública.",
        "Las bases publicadas vinculan a Administración, tribunal y participantes.",
      ],
      confusions: [
        "No confundir los principios generales del artículo 29 con los requisitos personales del artículo 30.5.",
        "No reducir el contenido mínimo de la convocatoria al número de plazas y al plazo: incluye pruebas, baremos, programas y calificación.",
      ],
      traps: [
        "Sustituir publicidad por discrecionalidad en la provisión ordinaria.",
        "Afirmar que las bases vinculan solo a los aspirantes.",
      ],
      mnemonics: [],
      sourceRefs: u06Sources,
    },
    {
      code: "SMS-T13-U07",
      title: "Requisitos de participación y discapacidad",
      position: 7,
      estimatedMinutes: 6,
      studySummary:
        "Para participar en la selección de personal estatutario fijo deben cumplirse los requisitos del artículo 30.5: nacionalidad o derecho de libre circulación en los términos legales, titulación exigida o posibilidad de obtenerla dentro del plazo de solicitudes, capacidad funcional, 18 años cumplidos sin exceder la edad de jubilación forzosa y ausencia de separación disciplinaria en los seis años anteriores o inhabilitación firme en los términos aplicables. Para otros nacionales se añade la comprobación equivalente respecto de su Estado. Las convocatorias reservan un cupo no inferior al 5 %, o al porcentaje general vigente para la función pública, a personas con discapacidad de grado igual o superior al 33 %, con el objetivo legal indicado de alcanzar progresivamente el 2 % de los efectivos y con adaptación de pruebas cuando proceda.",
      examKeys: [
        "Titulación: puede poseerse o estar en condiciones de obtenerse dentro del plazo de presentación de solicitudes.",
        "Edad: 18 años cumplidos y no exceder de la jubilación forzosa.",
        "Separación disciplinaria: referencia temporal de seis años anteriores a la convocatoria.",
        "Discapacidad: reserva no inferior al 5 % o porcentaje general vigente; grado igual o superior al 33 %.",
      ],
      confusions: [
        "No confundir el 5 % de plazas reservadas con el 33 % de grado de discapacidad ni con el objetivo del 2 % de efectivos.",
        "No exigir que el título ya esté expedido si legalmente puede obtenerse dentro del plazo de solicitudes.",
      ],
      traps: [
        "Cambiar seis años por otro período en la prohibición derivada de separación disciplinaria.",
        "Convertir el 5 % en un máximo cuando el texto establece un mínimo o el porcentaje general superior que resulte vigente.",
      ],
      mnemonics: ["Discapacidad: 5 de plazas, 33 de grado, 2 de efectivos."],
      sourceRefs: u07Sources,
    },
    {
      code: "SMS-T13-U08",
      title: "Sistemas, órganos y nombramientos de personal fijo",
      position: 8,
      estimatedMinutes: 8,
      studySummary:
        "El sistema general de selección del personal fijo es el concurso-oposición. Puede utilizarse oposición cuando resulte más adecuada por las características del colectivo o de las funciones, y concurso cuando las peculiaridades de las tareas o la cualificación requerida lo aconsejen. La convocatoria puede ordenar y combinar las fases dentro de los límites legales. Los aspirantes pueden realizar período formativo o de prácticas cuando proceda. Los órganos de selección son colegiados y deben actuar con objetividad, imparcialidad, agilidad y eficacia; sus miembros han de reunir la condición y nivel de titulación exigidos por el artículo 31.8. Los nombramientos fijos se expiden a quienes obtienen mayor puntuación en el conjunto de pruebas y evaluaciones.",
      examKeys: [
        "Regla general: concurso-oposición; oposición y concurso son alternativas justificadas por circunstancias concretas.",
        "Oposición evalúa mediante pruebas; concurso valora méritos conforme a baremo.",
        "Los órganos de selección son colegiados y actúan con objetividad e imparcialidad.",
        "Nombramiento fijo: aspirantes con mayor puntuación total en pruebas y evaluaciones.",
      ],
      confusions: [
        "No confundir concurso con concurso-oposición ni tratar los tres sistemas como equivalentes sin regla general.",
        "No confundir órgano de selección con órgano competente para expedir el nombramiento.",
      ],
      traps: [
        "Afirmar que el concurso es el sistema general.",
        "Introducir discrecionalidad subjetiva en la actuación del órgano de selección.",
      ],
      mnemonics: [],
      sourceRefs: u08Sources,
    },
    {
      code: "SMS-T13-U09",
      title: "Selección de personal temporal",
      position: 9,
      estimatedMinutes: 6,
      studySummary:
        "La selección temporal debe permitir máxima agilidad y se basa en igualdad, mérito, capacidad, competencia, publicidad y celeridad para cubrir de inmediato el puesto. El nombramiento temporal nunca reconoce por sí mismo la condición de estatutario fijo y el temporal debe reunir los requisitos del artículo 30.5. Puede existir período de prueba: hasta tres meses de trabajo efectivo para el personal de los artículos 6.2.a y 7.2.a y hasta dos meses para el resto, sin superar nunca la mitad de la duración del nombramiento cuando esté determinada. Está exento quien ya superó prueba en un nombramiento temporal de funciones de las mismas características en el Sistema Nacional de Salud durante los dos años anteriores.",
      examKeys: [
        "Temporal: máxima agilidad, pero siempre dentro de los principios legales y con finalidad de cobertura inmediata.",
        "El nombramiento temporal no convierte al seleccionado en estatutario fijo.",
        "Prueba: máximo 3 meses en los grupos señalados y 2 para el resto; nunca más de la mitad del nombramiento si su duración está precisada.",
        "Exención: prueba ya superada para funciones de las mismas características en el SNS durante los dos años anteriores.",
      ],
      confusions: [
        "No confundir agilidad con ausencia de publicidad, mérito o capacidad.",
        "No aplicar tres meses a todo el personal temporal.",
      ],
      traps: [
        "Olvidar el límite adicional de la mitad de la duración del nombramiento.",
        "Extender la exención de prueba a cualquier función distinta o a un antecedente fuera de los dos años.",
      ],
      mnemonics: ["Prueba temporal: 3 / 2 / mitad; exención si misma función en los 2 años previos."],
      sourceRefs: u09Sources,
    },
    {
      code: "SMS-T13-U10",
      title: "Promoción interna",
      position: 10,
      estimatedMinutes: 8,
      studySummary:
        "La promoción interna permite al personal estatutario fijo acceder dentro de su servicio de salud a otra categoría cuyo título sea de igual o superior nivel académico. Se rige por igualdad, mérito y capacidad y puede articularse por oposición, concurso o concurso-oposición. Como regla, exige titulación requerida, servicio activo y al menos dos años como fijo en la categoría de procedencia. El artículo 34.5 contiene una excepción de titulación para determinadas categorías de gestión y servicios: exige cinco años en la categoría de origen y la titulación del grupo inmediatamente inferior, salvo que las nuevas funciones requieran titulación, acreditación o habilitación profesional específica. Quien accede por promoción interna tiene preferencia en la elección de plaza frente al acceso libre. La promoción interna temporal, en cambio, permite voluntariamente funciones temporales del mismo o superior nivel, mantiene al interesado activo en su categoría de origen, paga las funciones efectivamente desempeñadas salvo trienios del nombramiento original y no consolida derechos, aunque puede computar como mérito.",
      examKeys: [
        "Promoción interna ordinaria: categoría con título de igual o superior nivel académico.",
        "Regla de acceso: titulación + servicio activo + al menos dos años como fijo en la categoría de procedencia.",
        "Excepción del artículo 34.5: cinco años en origen y titulación del grupo inmediatamente inferior, con los límites legales.",
        "Promoción temporal: no consolida nombramiento ni derechos retributivos; puede valorarse como mérito.",
      ],
      confusions: [
        "No confundir los dos años de la promoción ordinaria con los cinco años exigidos en la excepción de titulación.",
        "No confundir promoción interna temporal con un nuevo nombramiento fijo o con consolidación retributiva.",
      ],
      traps: [
        "Omitir que la promoción temporal es voluntaria y responde a necesidades del servicio.",
        "Pagar los trienios conforme a la función temporal en vez de conforme al nombramiento original.",
      ],
      mnemonics: ["Promoción: 2 años con título; excepción, 5 años + título inmediatamente inferior."],
      sourceRefs: u10Sources,
    },
    {
      code: "SMS-T13-U11",
      title: "Movilidad y comisiones de servicio",
      position: 11,
      estimatedMinutes: 9,
      studySummary:
        "La movilidad por razón del servicio permite destinar al personal fuera del ámbito previsto en su nombramiento mediante resolución motivada y con las garantías y planificación aplicables. La movilidad voluntaria es periódica, preferentemente cada dos años, se resuelve por concurso y admite personal fijo equivalente de otros servicios de salud en igualdad de condiciones. Si cambia el servicio de salud, el cese debe producirse en los tres días siguientes a la notificación o publicación y la toma de posesión dispone de un mes. El destino obtenido es irrenunciable salvo obtención de plaza en otro procedimiento de movilidad voluntaria convocado por otra Administración; la no incorporación puede conducir a excedencia voluntaria por interés particular. La Comisión de Recursos Humanos coordina convocatorias que afectan a más de un servicio. En comisión de servicios, una vacante o puesto temporalmente desatendido puede cubrirse por personal de la categoría y especialidad correspondiente: se cobran las retribuciones del puesto efectivo salvo que sean inferiores a las de origen. Para funciones especiales no adscritas a plaza concreta se mantienen las retribuciones de origen. En ambos casos existe reserva de la plaza o puesto de origen.",
      examKeys: [
        "Movilidad por razón del servicio: resolución motivada; movilidad voluntaria: concurso periódico, preferentemente cada dos años.",
        "Cambio de servicio: cese en tres días y toma de posesión en un mes.",
        "Destino voluntario irrenunciable, salvo la excepción legal por otra movilidad de otra Administración.",
        "Comisión a vacante: retribución del puesto efectivo salvo perjuicio; comisión para funciones especiales: retribución de origen; siempre reserva del origen.",
      ],
      confusions: [
        "No confundir movilidad voluntaria con movilidad por razón del servicio.",
        "No aplicar la misma regla retributiva a los dos supuestos de comisión de servicios.",
      ],
      traps: [
        "Invertir los plazos: tres días corresponden al cese y un mes a la toma de posesión.",
        "Afirmar que la comisión de servicios hace perder la reserva de la plaza de origen.",
      ],
      mnemonics: ["Movilidad entre servicios: 3 días para cese, 1 mes para tomar posesión."],
      sourceRefs: u11Sources,
    },
    {
      code: "SMS-T13-U12",
      title: "Carrera profesional",
      position: 12,
      estimatedMinutes: 4,
      studySummary:
        "La carrera profesional reconoce el derecho a progresar individualizadamente como reconocimiento del desarrollo profesional en conocimientos, experiencia y cumplimiento de objetivos de la organización. Las comunidades autónomas establecen sus mecanismos previa negociación y dentro del marco aplicable. La Comisión de Recursos Humanos del Sistema Nacional de Salud fija principios y criterios generales de homologación para garantizar reconocimiento mutuo de grados, efectos profesionales y libre circulación entre servicios de salud.",
      examKeys: [
        "Carrera profesional: progreso individualizado ligado a conocimientos, experiencia y objetivos.",
        "La Comisión de Recursos Humanos establece los criterios generales de homologación entre servicios de salud.",
        "La finalidad de la homologación incluye reconocimiento mutuo y libre circulación.",
      ],
      confusions: [
        "No reducir carrera profesional a antigüedad: la definición legal incluye conocimientos, experiencia y objetivos.",
        "No atribuir a cada servicio aisladamente la función estatal de fijar los criterios generales de homologación.",
      ],
      traps: ["Convertir el reconocimiento profesional en ascenso automático de categoría."],
      mnemonics: [],
      sourceRefs: u12Sources,
    },
    {
      code: "SMS-T13-U13",
      title: "Régimen retributivo: estructura y retribuciones básicas",
      position: 13,
      estimatedMinutes: 8,
      studySummary:
        "El sistema retributivo se estructura en retribuciones básicas y complementarias. Responde a cualificación técnica y profesional y mantiene un modelo común en las básicas. La evaluación del desempeño, con igualdad, objetividad y transparencia, influye en la parte complementaria vinculada a productividad y rendimiento. El personal estatutario no puede participar en los ingresos atribuidos al servicio de salud por los servicios prestados. Las deducciones proporcionales por jornada no realizada no tienen carácter sancionador. Son básicas el sueldo, los trienios y dos pagas extraordinarias al año. Cada trienio se determina según la categoría del interesado el día en que se perfecciona. Las extras se devengan preferentemente en junio y diciembre y tienen el contenido mínimo legal del artículo 42.",
      examKeys: [
        "Estructura: básicas + complementarias.",
        "Evaluación periódica: relevante para complementarias vinculadas a productividad y rendimiento.",
        "Básicas: sueldo, trienios y dos pagas extraordinarias.",
        "Trienio: cuantía correspondiente a la categoría del día en que se perfeccionó.",
      ],
      confusions: [
        "No confundir deducción proporcional por tiempo no trabajado con sanción disciplinaria.",
        "No clasificar productividad como retribución básica.",
      ],
      traps: [
        "Afirmar que el personal participa en ingresos cobrados por el servicio de salud.",
        "Cambiar junio y diciembre de devengo preferente de las pagas extraordinarias.",
      ],
      mnemonics: ["Básicas: sueldo, trienios, 2 extras."],
      sourceRefs: u13Sources,
    },
    {
      code: "SMS-T13-U14",
      title: "Retribuciones complementarias y situaciones especiales",
      position: 14,
      estimatedMinutes: 7,
      studySummary:
        "Las retribuciones complementarias pueden ser fijas o variables y retribuyen función, categoría, dedicación, actividad, productividad, objetivos y resultados. El artículo 43 enumera complemento de destino, específico, productividad, atención continuada y carrera. El específico retribuye condiciones particulares del puesto; la productividad, especial rendimiento, interés, iniciativa, programas y contribución a objetivos tras evaluar resultados; la atención continuada, la asistencia permanente y continuada; y carrera, el grado alcanzado cuando el sistema esté implantado. El personal temporal percibe las retribuciones básicas y complementarias de su nombramiento salvo trienios. Los aspirantes en prácticas perciben, como mínimo, las básicas excluidos trienios del grupo al que aspiran ingresar.",
      examKeys: [
        "Complementos: destino, específico, productividad, atención continuada y carrera.",
        "Específico: condiciones particulares del puesto; productividad: rendimiento/iniciativa/objetivos con evaluación de resultados.",
        "Temporal: todas las básicas y complementarias del nombramiento, excepto trienios.",
        "Aspirante en prácticas: mínimo de básicas, excluidos trienios, del grupo de ingreso.",
      ],
      confusions: [
        "No confundir complemento específico con productividad: uno mira condiciones del puesto; el otro, rendimiento y resultados.",
        "No confundir la regla del temporal con la del aspirante en prácticas.",
      ],
      traps: [
        "Asignar más de un complemento específico por una misma circunstancia.",
        "Incluir trienios en la regla mínima del aspirante en prácticas.",
      ],
      mnemonics: [],
      sourceRefs: u14Sources,
    },
    {
      code: "SMS-T13-U15",
      title: "Responsabilidad y potestad disciplinaria",
      position: 15,
      estimatedMinutes: 6,
      studySummary:
        "El personal estatutario responde disciplinariamente por las faltas que cometa. El régimen disciplinario se rige por tipicidad, eficacia y proporcionalidad; el procedimiento, por inmediatez, economía procesal y respeto de derechos y garantías. La potestad corresponde al servicio de salud donde el interesado presta servicios en el momento de cometer la falta, aunque el nombramiento inicial proceda de otro, y la sanción tiene eficacia en todos los servicios. Si aparecen indicios fundados de criminalidad durante el expediente, se suspende su tramitación y se pone en conocimiento del Ministerio Fiscal. Solo pueden sancionarse conductas que eran infracción al producirse y no cabe aplicación analógica de las normas sancionadoras; además debe existir proporcionalidad entre infracción y sanción.",
      examKeys: [
        "Régimen: tipicidad, eficacia, proporcionalidad; procedimiento: inmediatez, economía procesal y garantías.",
        "Competente: servicio de salud en el que se prestaban servicios al cometer la falta.",
        "Indicios fundados de criminalidad: suspensión del expediente y comunicación al Ministerio Fiscal.",
        "No cabe analogía para definir infracciones y sanciones.",
      ],
      confusions: [
        "No atribuir la potestad al servicio que expidió originalmente el nombramiento si la persona prestaba servicio en otro al cometer la falta.",
        "No confundir responsabilidad disciplinaria con exclusión de posibles responsabilidades patrimoniales, civiles o penales.",
      ],
      traps: [
        "Mezclar los principios del régimen con los específicos del procedimiento.",
        "Aplicar analógicamente una falta por semejanza con una conducta tipificada.",
      ],
      mnemonics: [],
      sourceRefs: u15Sources,
    },
    {
      code: "SMS-T13-U16",
      title: "Faltas y prescripción",
      position: 16,
      estimatedMinutes: 9,
      studySummary:
        "Las faltas son muy graves, graves o leves. Muchas preguntas de examen se resuelven por el elemento que eleva o rebaja la gravedad. En asistencia, es muy grave faltar más de cinco días continuados o acumular siete faltas en dos meses; es grave faltar más de tres días continuados o acumular cinco en dos meses cuando no sea muy grave; lo restante puede ser leve. La desobediencia notoria y manifiesta configura la muy grave frente a la falta de obediencia debida grave. En incompatibilidades, mantener una situación incompatible es muy grave, mientras incumplir plazos o procedimiento sin mantenerla es grave. En prevención, negativa expresa o incumplimientos de quien tiene responsabilidad pueden ser muy graves, la negligencia en las condiciones del artículo 72.3.m es grave y el descuido residual puede ser leve. En acoso sexual se distingue agresión o chantaje, muy grave, del entorno intimidatorio, hostil o humillante, grave. Las faltas prescriben a los cuatro años las muy graves, dos años las graves y seis meses las leves; el plazo comienza al cometerse, se interrumpe al notificarse el inicio del procedimiento y vuelve a correr si queda paralizado más de tres meses por causa no imputable al interesado.",
      examKeys: [
        "Tres clases: muy graves, graves y leves.",
        "Asistencia: >5 días seguidos o 7/2 meses puede ser muy grave; >3 días seguidos o 5/2 meses, grave cuando no sea muy grave.",
        "Incompatibilidad: mantener la situación es muy grave; incumplir procedimiento sin mantenerla es grave.",
        "Prescripción de faltas: 4 años / 2 años / 6 meses; reinicio tras paralización superior a 3 meses no imputable al interesado.",
      ],
      confusions: [
        "No usar una palabra común como 'desobediencia' sin comprobar si el tipo exige notoriedad y manifestación.",
        "No confundir el plazo de paralización de la prescripción de faltas, tres meses, con el de ejecución de sanciones, seis meses.",
      ],
      traps: [
        "Confundir umbrales de asistencia grave y muy grave.",
        "Equiparar toda infracción de seguridad y salud a la misma gravedad sin atender conducta y responsabilidad.",
      ],
      mnemonics: ["Prescripción de faltas: 4-2-6 → 4 años, 2 años, 6 meses."],
      sourceRefs: u16Sources,
    },
    {
      code: "SMS-T13-U17",
      title: "Sanciones",
      position: 17,
      estimatedMinutes: 8,
      studySummary:
        "La separación del servicio solo se impone por falta muy grave: supone pérdida de la condición y seis años de exclusión en los términos del artículo 73. El traslado forzoso con cambio de localidad se reserva a faltas muy graves y puede impedir volver a la localidad hasta cuatro años; el traslado sin cambio de localidad corresponde a faltas graves y puede impedir volver al centro hasta dos años. La suspensión de funciones por falta muy grave dura entre dos y seis años; por falta grave, hasta dos años; si no supera seis meses no se pierde el destino. El apercibimiento es siempre escrito y solo para faltas leves. Las sanciones prescriben también en 4 años / 2 años / 6 meses según la falta, pero el cómputo comienza desde la firmeza de la resolución o desde el quebrantamiento de una sanción ya iniciada y puede reiniciarse tras más de seis meses de paralización de la ejecución. Las anotaciones se cancelan de oficio desde el cumplimiento de la sanción a los seis meses, dos años o cuatro años según sea leve, grave o muy grave; una anotación cancelada no cuenta para reincidencia.",
      examKeys: [
        "Separación: solo muy grave y seis años de exclusión posteriores a la ejecución.",
        "Suspensión: muy grave entre 2 y 6 años; grave hasta 2 años; hasta 6 meses conserva destino.",
        "Traslado con cambio de localidad: muy grave y hasta 4 años; sin cambio: grave y hasta 2 años.",
        "Prescripción de sanciones: 4/2/6, pero con dies a quo e interrupción diferentes de las faltas.",
      ],
      confusions: [
        "No confundir prescripción de la falta con prescripción de la sanción aunque compartan 4/2/6.",
        "No invertir los límites de traslado con y sin cambio de localidad.",
      ],
      traps: [
        "Afirmar que un apercibimiento puede ser verbal.",
        "Usar tres meses de paralización para la ejecución de sanciones: aquí el umbral es superior a seis meses.",
      ],
      mnemonics: ["Sanciones: también 4-2-6; cancelación se recuerda al revés por gravedad: leve 6m, grave 2a, muy grave 4a."],
      sourceRefs: u17Sources,
    },
    {
      code: "SMS-T13-U18",
      title: "Procedimiento y medidas provisionales",
      position: 18,
      estimatedMinutes: 7,
      studySummary:
        "Las faltas graves y muy graves exigen el procedimiento disciplinario establecido por la Administración correspondiente. Para las leves no es preceptiva la instrucción completa, pero el trámite de audiencia al inculpado debe realizarse siempre. El procedimiento ha de garantizar presunción de inocencia, notificación de instructor y secretario y posibilidad de recusarlos, conocimiento de hechos, infracción y sanciones posibles, alegaciones, prueba, asistencia sindical y letrado. Como medida cautelar puede acordarse mediante resolución motivada la suspensión provisional durante expediente por falta grave o muy grave o durante procedimiento judicial. Si deriva de expediente disciplinario no puede exceder de seis meses salvo paralización imputable al interesado y durante ella se perciben retribuciones básicas. Si la resolución final impone separación o suspensión, los efectos se retrotraen al inicio; si no, hay reincorporación y derecho a retribuciones dejadas de percibir. En determinados supuestos judiciales la suspensión puede extenderse hasta la resolución; prisión provisional u otra medida judicial que imposibilite trabajar más de cinco días consecutivos determina suspensión provisional sin retribuciones.",
      examKeys: [
        "Leves: no requieren necesariamente instrucción completa, pero la audiencia es obligatoria.",
        "Derechos: presunción de inocencia, notificaciones, recusación, alegaciones, prueba, asistencia sindical y letrado.",
        "Suspensión por expediente disciplinario: resolución motivada, máximo seis meses salvo paralización imputable y retribuciones básicas.",
        "Resultado sin separación ni suspensión: reincorporación y abono de retribuciones dejadas de percibir, incluidas las variables que hubieran correspondido.",
      ],
      confusions: [
        "No confundir la suspensión provisional cautelar con la sanción firme de suspensión de funciones.",
        "No interpretar la simplificación para faltas leves como eliminación del trámite de audiencia.",
      ],
      traps: [
        "Aplicar siempre seis meses como máximo a cualquier suspensión judicial: el límite de seis meses se refiere al expediente disciplinario en el apartado 2.",
        "Mantener retribuciones cuando una medida judicial impide ejercer funciones durante más de cinco días consecutivos en el supuesto del artículo 75.4.",
      ],
      mnemonics: [],
      sourceRefs: u18Sources,
    },
  ],
  concepts: [
    { code: "SMS-T13-C01", unitCode: "SMS-T13-U01", title: "Derechos individuales y colectivos", description: "Catálogo y naturaleza de los derechos del personal estatutario, extensión al temporal y límites propios de los derechos colectivos.", position: 1 },
    { code: "SMS-T13-C02", unitCode: "SMS-T13-U02", title: "Deberes estatutarios", description: "Obligaciones profesionales, organizativas, de información, confidencialidad, eficiencia, seguridad e identificación del artículo 19.", position: 1 },
    { code: "SMS-T13-C03", unitCode: "SMS-T13-U03", title: "Requisitos sucesivos y efectos de la falta de acreditación o incorporación", description: "Secuencia para adquirir la condición fija y consecuencias de no acreditar requisitos o no incorporarse justificadamente en plazo.", position: 1 },
    { code: "SMS-T13-C04", unitCode: "SMS-T13-U04", title: "Causas de pérdida y renuncia", description: "Causas generales de extinción y requisitos, límites y efectos de la renuncia voluntaria.", position: 1 },
    { code: "SMS-T13-C05", unitCode: "SMS-T13-U04", title: "Nacionalidad, separación e inhabilitación", description: "Pérdida de la condición por nacionalidad, separación firme o penas de inhabilitación y sus requisitos diferenciadores.", position: 2 },
    { code: "SMS-T13-C06", unitCode: "SMS-T13-U05", title: "Jubilación e incapacidad permanente", description: "Jubilación forzosa, prolongaciones y prórrogas, e incapacidad permanente que extingue la condición estatutaria.", position: 1 },
    { code: "SMS-T13-C07", unitCode: "SMS-T13-U05", title: "Recuperación de la condición fija", description: "Supuestos de recuperación tras nacionalidad o incapacidad, plazo de dos años y efectos sobre plaza y situación administrativa.", position: 2 },
    { code: "SMS-T13-C08", unitCode: "SMS-T13-U06", title: "Principios y sistemas de provisión", description: "Principios básicos y mecanismos legales para proveer plazas del personal estatutario.", position: 1 },
    { code: "SMS-T13-C09", unitCode: "SMS-T13-U06", title: "Convocatorias: periodicidad, bases y contenido", description: "Publicidad y periodicidad de la selección fija, fuerza vinculante de las bases y contenido mínimo de la convocatoria.", position: 2 },
    { code: "SMS-T13-C10", unitCode: "SMS-T13-U07", title: "Requisitos de participación y reserva por discapacidad", description: "Condiciones personales para participar en selección fija y reglas cuantitativas de la reserva para personas con discapacidad.", position: 1 },
    { code: "SMS-T13-C11", unitCode: "SMS-T13-U08", title: "Sistemas de selección y aspirantes en prácticas", description: "Concurso-oposición como regla, oposición y concurso como alternativas y régimen de prácticas previsto en el proceso selectivo.", position: 1 },
    { code: "SMS-T13-C12", unitCode: "SMS-T13-U08", title: "Órganos de selección y nombramientos", description: "Naturaleza, actuación y composición de órganos de selección y criterio para expedir nombramientos fijos.", position: 2 },
    { code: "SMS-T13-C13", unitCode: "SMS-T13-U09", title: "Selección, nombramiento y período de prueba temporal", description: "Principios de selección temporal, falta de adquisición de fijeza y límites y exenciones del período de prueba.", position: 1 },
    { code: "SMS-T13-C14", unitCode: "SMS-T13-U10", title: "Promoción interna: acceso, requisitos y preferencia", description: "Niveles de titulación, requisitos temporales, excepción de titulación y preferencia de elección en promoción interna.", position: 1 },
    { code: "SMS-T13-C15", unitCode: "SMS-T13-U10", title: "Promoción interna temporal", description: "Naturaleza voluntaria, situación de origen, retribución, falta de consolidación y posible mérito de la promoción temporal.", position: 2 },
    { code: "SMS-T13-C16", unitCode: "SMS-T13-U11", title: "Movilidad por razón del servicio y movilidad voluntaria", description: "Diferencia entre movilidad organizativa y voluntaria, concurso, periodicidad, plazos, irrenunciabilidad y efectos de no incorporarse.", position: 1 },
    { code: "SMS-T13-C17", unitCode: "SMS-T13-U11", title: "Coordinación de convocatorias y comisiones de servicio", description: "Coordinación entre servicios y reglas funcionales, retributivas y de reserva de las comisiones de servicio.", position: 2 },
    { code: "SMS-T13-C18", unitCode: "SMS-T13-U12", title: "Carrera profesional y homologación", description: "Definición del progreso profesional y función de homologación para reconocimiento mutuo y libre circulación.", position: 1 },
    { code: "SMS-T13-C19", unitCode: "SMS-T13-U13", title: "Estructura, criterios y reglas generales de retribución", description: "Estructura básica/complementaria, evaluación del desempeño, prohibición de participación en ingresos y deducción no sancionadora.", position: 1 },
    { code: "SMS-T13-C20", unitCode: "SMS-T13-U13", title: "Retribuciones básicas y pagas extraordinarias", description: "Sueldo, trienios, categoría de perfeccionamiento y reglas esenciales de las pagas extraordinarias.", position: 2 },
    { code: "SMS-T13-C21", unitCode: "SMS-T13-U14", title: "Complementos retributivos", description: "Destino, específico, productividad, atención continuada y carrera, con la finalidad propia de cada complemento.", position: 1 },
    { code: "SMS-T13-C22", unitCode: "SMS-T13-U14", title: "Retribuciones de temporales y aspirantes en prácticas", description: "Reglas especiales sobre retribuciones y exclusión de trienios para personal temporal y aspirantes en prácticas.", position: 2 },
    { code: "SMS-T13-C23", unitCode: "SMS-T13-U15", title: "Responsabilidad, competencia y principios disciplinarios", description: "Responsabilidad disciplinaria, servicio competente, criminalidad, tipicidad, irretroactividad material y proporcionalidad.", position: 1 },
    { code: "SMS-T13-C24", unitCode: "SMS-T13-U16", title: "Clases y fronteras entre faltas", description: "Clasificación y elementos que distinguen faltas muy graves, graves y leves en supuestos próximos de examen.", position: 1 },
    { code: "SMS-T13-C25", unitCode: "SMS-T13-U16", title: "Prescripción de faltas", description: "Plazos por gravedad, inicio, interrupción y reinicio del cómputo de la prescripción de faltas disciplinarias.", position: 2 },
    { code: "SMS-T13-C26", unitCode: "SMS-T13-U17", title: "Clases de sanciones y efectos", description: "Sanciones posibles, gravedad habilitante, límites temporales, pérdida o conservación de destino y exclusiones asociadas.", position: 1 },
    { code: "SMS-T13-C27", unitCode: "SMS-T13-U17", title: "Prescripción y cancelación de sanciones", description: "Plazos, dies a quo e interrupción de la prescripción de sanciones y cancelación de anotaciones y reincidencia.", position: 2 },
    { code: "SMS-T13-C28", unitCode: "SMS-T13-U18", title: "Procedimiento y garantías", description: "Necesidad de procedimiento según gravedad y derechos y garantías del inculpado durante la tramitación.", position: 1 },
    { code: "SMS-T13-C29", unitCode: "SMS-T13-U18", title: "Suspensión provisional y efectos", description: "Presupuestos, duración, retribuciones y efectos finales de la suspensión provisional disciplinaria o judicial.", position: 2 },
  ],
  questionMappings: [
    ...mapPrimary(1, 4, "SMS-T13-C01"),
    ...mapPrimary(5, 10, "SMS-T13-C02"),
    ...mapPrimary(11, 13, "SMS-T13-C03"),
    ...mapPrimary(14, 17, "SMS-T13-C04"),
    ...mapPrimary(18, 20, "SMS-T13-C05"),
    ...mapPrimary(21, 23, "SMS-T13-C06"),
    ...mapPrimary(24, 26, "SMS-T13-C07"),
    ...mapPrimary(27, 28, "SMS-T13-C08"),
    ...mapPrimary(29, 31, "SMS-T13-C09"),
    ...mapPrimary(32, 35, "SMS-T13-C10"),
    ...mapPrimary(36, 39, "SMS-T13-C11"),
    ...mapPrimary(40, 41, "SMS-T13-C12"),
    ...mapPrimary(42, 45, "SMS-T13-C13"),
    ...mapPrimary(46, 49, "SMS-T13-C14"),
    ...mapPrimary(50, 52, "SMS-T13-C15"),
    ...mapPrimary(53, 58, "SMS-T13-C16"),
    ...mapPrimary(59, 61, "SMS-T13-C17"),
    ...mapPrimary(62, 63, "SMS-T13-C18"),
    ...mapPrimary(64, 67, "SMS-T13-C19"),
    ...mapPrimary(68, 70, "SMS-T13-C20"),
    ...mapPrimary(71, 73, "SMS-T13-C21"),
    ...mapPrimary(74, 75, "SMS-T13-C22"),
    ...mapPrimary(76, 80, "SMS-T13-C23"),
    ...mapPrimary(81, 86, "SMS-T13-C24"),
    ...mapPrimary(87, 88, "SMS-T13-C25"),
    ...mapPrimary(89, 93, "SMS-T13-C26"),
    ...mapPrimary(94, 95, "SMS-T13-C27"),
    ...mapPrimary(96, 97, "SMS-T13-C28"),
    ...mapPrimary(98, 99, "SMS-T13-C29"),
  ],
  flashcards: [
    card(1, "SMS-T13-C01", "direct", "¿Cómo se aplica el régimen de derechos del artículo 17 al personal temporal?", "Se aplica en la medida en que la naturaleza de cada derecho lo permita; no convierte en temporales los derechos inherentes a la condición fija.", 1, u01Sources),
    card(2, "SMS-T13-C01", "contrast", "¿Qué límite acompaña al derecho colectivo de huelga del personal estatutario?", "Debe garantizarse en todo caso el mantenimiento de los servicios esenciales para la atención sanitaria a la población.", 2, u01Sources),
    card(3, "SMS-T13-C02", "direct", "¿Qué exige el deber de actualización profesional del artículo 19?", "Mantener actualizados los conocimientos y aptitudes necesarios para ejercer correctamente la profesión o las funciones del nombramiento.", 1, u02Sources),
    card(4, "SMS-T13-C02", "contrast", "¿Cómo se compatibilizan información al usuario y confidencialidad?", "Se informa dentro de las competencias y reglas aplicables, pero debe mantenerse reserva y confidencialidad sobre la información y documentación conocida por razón de las funciones.", 2, u02Sources),
    card(5, "SMS-T13-C03", "direct", "¿Cuáles son los tres requisitos sucesivos para adquirir la condición de estatutario fijo?", "Superar las pruebas de selección, recibir nombramiento del órgano competente e incorporarse en plazo a la plaza tras cumplir los requisitos formales.", 1, u03Sources),
    card(6, "SMS-T13-C03", "contrast", "Tras superar la selección, ¿qué diferencia hay entre no acreditar requisitos y no incorporarse en plazo?", "No acreditar requisitos impide el nombramiento y deja sin efecto actuaciones; no incorporarse por causa imputable y sin justificación provoca el decaimiento del derecho derivado de ese proceso.", 2, u03Sources),
    card(7, "SMS-T13-C04", "number_or_deadline", "¿Con qué antelación mínima se solicita la renuncia y cuándo puede no aceptarse?", "Con al menos 15 días. Puede no aceptarse si existe expediente disciplinario o auto de procesamiento/apertura de juicio oral por presunto delito cometido en el ejercicio de funciones.", 1, u04Sources),
    card(8, "SMS-T13-C04", "direct", "¿Renunciar a la condición estatutaria impide obtenerla de nuevo?", "No. La renuncia no inhabilita para volver a obtener la condición mediante los procedimientos de selección establecidos.", 2, u04Sources),
    card(9, "SMS-T13-C05", "contrast", "¿Cuándo la pérdida de la nacionalidad no provoca la pérdida de la condición estatutaria?", "Cuando simultáneamente se adquiere la nacionalidad de otro Estado que otorgue derecho a acceder a esa condición.", 1, u04Sources),
    card(10, "SMS-T13-C05", "contrast", "¿Qué requisitos diferencian separación e inhabilitación profesional como causas de pérdida?", "La separación disciplinaria debe ser firme; la inhabilitación especial para la profesión produce pérdida cuando excede de seis años, mientras la absoluta firme y la especial para empleo/cargo si afecta al nombramiento tienen su propio efecto legal.", 2, u04Sources),
    card(11, "SMS-T13-C06", "number_or_deadline", "Resume los números clave de la jubilación forzosa y sus dos vías de permanencia en activo.", "Jubilación forzosa a los 65; prolongación voluntaria autorizada hasta un máximo de 70; prórroga a instancia del interesado si a los 65 faltan seis años o menos de cotización para causar pensión.", 1, u05Sources),
    card(12, "SMS-T13-C06", "direct", "¿Qué grados de incapacidad permanente producen pérdida de la condición estatutaria?", "La total para la profesión habitual, la absoluta para todo trabajo y la gran invalidez, conforme al Régimen General de la Seguridad Social.", 2, u05Sources),
    card(13, "SMS-T13-C07", "contrast", "¿En qué dos grandes supuestos puede recuperarse la condición fija?", "Cuando desaparece la causa de pérdida de nacionalidad y cuando se revisa la incapacidad que provocó la pérdida, en los términos del artículo 28.", 1, u05Sources),
    card(14, "SMS-T13-C07", "number_or_deadline", "¿Qué ventaja específica existe si la incapacidad se revisa dentro de los dos años siguientes?", "Derecho a incorporarse a una plaza de la misma categoría y área de salud en que prestaba servicios; fuera de esa excepción, la recuperación implica simultánea excedencia voluntaria y posterior reingreso.", 2, u05Sources),
    card(15, "SMS-T13-C08", "direct", "¿Cuáles son los cuatro principios clásicos que encabezan la provisión de plazas?", "Igualdad, mérito, capacidad y publicidad.", 1, u06Sources),
    card(16, "SMS-T13-C08", "direct", "¿Qué vías enumera la Ley 55/2003 para la provisión de plazas?", "Selección de personal, promoción interna, movilidad y reingreso al servicio activo, además de los supuestos y procedimientos que cada servicio establezca conforme a la ley.", 2, u06Sources),
    card(17, "SMS-T13-C09", "direct", "¿A quién vinculan una convocatoria y sus bases una vez publicadas?", "A la Administración, a los órganos o tribunales que juzgan las pruebas y a quienes participan en ellas.", 1, u06Sources),
    card(18, "SMS-T13-C09", "direct", "¿Qué rasgos básicos tiene la selección de personal fijo y qué debe contener como mínimo la convocatoria?", "Es periódica y pública; debe identificar plazas y especificar requisitos, plazo de solicitudes, pruebas, baremos, programas y sistema de calificación.", 2, u06Sources),
    card(19, "SMS-T13-C10", "direct", "¿Qué requisitos temporales de edad, titulación y separación disciplinaria son especialmente examinables en el artículo 30.5?", "18 años cumplidos y no exceder la jubilación forzosa; titulación poseída o alcanzable dentro del plazo de solicitudes; no haber sido separado disciplinariamente en los seis años anteriores, además de no estar inhabilitado firmemente en los términos legales.", 1, u07Sources),
    card(20, "SMS-T13-C10", "number_or_deadline", "¿Qué tres cifras conviene distinguir en la reserva para personas con discapacidad?", "Cupo no inferior al 5 % de plazas o porcentaje general vigente; grado de discapacidad igual o superior al 33 %; objetivo legal de alcanzar progresivamente el 2 % de los efectivos.", 2, u07Sources),
    card(21, "SMS-T13-C11", "contrast", "¿Qué sistema es general para seleccionar personal fijo y cuándo aparecen oposición o concurso como alternativas?", "La regla general es concurso-oposición. Puede usarse oposición si resulta más adecuada por colectivo o funciones, y concurso cuando tareas específicas o cualificación lo aconsejen.", 1, u08Sources),
    card(22, "SMS-T13-C11", "contrast", "¿Qué diferencia esencial hay entre oposición y concurso?", "La oposición evalúa mediante una o más pruebas; el concurso valora méritos y currículo conforme a baremo para evaluar competencia, aptitud e idoneidad y ordenar aspirantes.", 2, u08Sources),
    card(23, "SMS-T13-C12", "direct", "¿Cómo deben ser y actuar los órganos de selección?", "Son colegiados y deben actuar con objetividad, imparcialidad, agilidad y eficacia, con la composición y requisitos previstos legalmente.", 1, u08Sources),
    card(24, "SMS-T13-C12", "direct", "¿A favor de quién se expiden los nombramientos como personal estatutario fijo?", "De los aspirantes que obtengan mayor puntuación en el conjunto de las pruebas y evaluaciones.", 2, u08Sources),
    card(25, "SMS-T13-C13", "direct", "¿Qué principios y finalidad caracterizan la selección de personal estatutario temporal?", "Máxima agilidad con igualdad, mérito, capacidad, competencia, publicidad y celeridad, para la cobertura inmediata del puesto; el nombramiento no reconoce la condición de fijo.", 1, u09Sources),
    card(26, "SMS-T13-C13", "number_or_deadline", "¿Cuáles son los límites del período de prueba temporal y la exención principal?", "Hasta 3 meses para el personal de los artículos 6.2.a y 7.2.a y 2 meses para el resto, nunca más de la mitad del nombramiento si está precisado; exento quien superó prueba en mismas funciones del SNS en los 2 años anteriores.", 2, u09Sources),
    card(27, "SMS-T13-C14", "direct", "¿A qué categorías puede acceder un fijo por promoción interna respecto del nivel académico del título?", "A otra categoría cuyo título exigido para el ingreso sea de igual o superior nivel académico que el de la categoría de procedencia.", 1, u10Sources),
    card(28, "SMS-T13-C14", "number_or_deadline", "¿Qué requisitos temporales distinguen la regla general y la excepción de titulación en promoción interna?", "Regla general: al menos 2 años como fijo en la categoría de procedencia, además de titulación y servicio activo. Excepción del artículo 34.5: 5 años en origen y titulación del grupo inmediatamente inferior, con sus límites.", 2, u10Sources),
    card(29, "SMS-T13-C15", "direct", "¿Qué situación y retribución mantiene quien ejerce promoción interna temporal?", "Permanece en servicio activo en su categoría de origen y cobra las funciones efectivamente desempeñadas, salvo los trienios, que corresponden al nombramiento original.", 1, u10Sources),
    card(30, "SMS-T13-C15", "direct", "¿La promoción interna temporal consolida derechos o nuevo nombramiento?", "No consolida derechos retributivos ni derecho a un nuevo nombramiento; puede, sin embargo, ser considerada mérito en los sistemas de promoción interna.", 2, u10Sources),
    card(31, "SMS-T13-C16", "contrast", "¿Qué diferencia de origen hay entre movilidad por razón del servicio y movilidad voluntaria?", "La primera responde a necesidades organizativas y exige resolución motivada; la segunda se solicita/obtiene en procedimientos periódicos de concurso abiertos en igualdad a personal fijo equivalente.", 1, u11Sources),
    card(32, "SMS-T13-C16", "number_or_deadline", "En movilidad voluntaria con cambio de servicio, ¿qué plazos y regla de renuncia debes recordar?", "Cese dentro de los 3 días siguientes a la notificación/publicación y 1 mes para toma de posesión; el destino es irrenunciable salvo obtención de plaza en otra movilidad voluntaria convocada por otra Administración.", 2, u11Sources),
    card(33, "SMS-T13-C17", "direct", "¿Quién fija criterios y principios cuando una convocatoria afecta a más de un servicio de salud?", "La Comisión de Recursos Humanos del Sistema Nacional de Salud, bajo el principio de colaboración entre servicios.", 1, u11Sources),
    card(34, "SMS-T13-C17", "contrast", "¿Cómo cambia la retribución en comisión de servicios según sea una vacante o funciones especiales?", "En vacante/puesto desatendido se cobran las del puesto efectivo salvo que sean inferiores a las de origen; para funciones especiales no adscritas a plaza se mantienen las retribuciones de origen. En ambos casos se reserva la plaza de origen.", 2, u11Sources),
    card(35, "SMS-T13-C18", "direct", "¿Qué reconoce jurídicamente la carrera profesional?", "El derecho a progresar individualizadamente como reconocimiento al desarrollo profesional en conocimientos, experiencia y cumplimiento de objetivos de la organización.", 1, u12Sources),
    card(36, "SMS-T13-C18", "direct", "¿Qué función tiene la Comisión de Recursos Humanos respecto de la carrera profesional?", "Establecer principios y criterios generales de homologación para garantizar reconocimiento mutuo de grados, efectos profesionales y libre circulación en el SNS.", 2, u12Sources),
    card(37, "SMS-T13-C19", "direct", "¿Cómo se estructura el sistema retributivo y qué papel tiene la evaluación del desempeño?", "Se estructura en básicas y complementarias; la evaluación periódica, con igualdad, objetividad y transparencia, debe influir en complementarias ligadas a productividad, rendimiento y actividad.", 1, u13Sources),
    card(38, "SMS-T13-C19", "contrast", "¿Qué dos reglas generales evitan confundir retribución con ingreso o sanción?", "El personal no participa en los ingresos atribuidos al servicio de salud por sus servicios y la deducción proporcional por jornada no realizada no tiene carácter sancionador.", 2, u13Sources),
    card(39, "SMS-T13-C20", "direct", "¿Cuáles son las retribuciones básicas?", "Sueldo, trienios y pagas extraordinarias.", 1, u13Sources),
    card(40, "SMS-T13-C20", "number_or_deadline", "¿Cómo se determina cada trienio y cuántas pagas extraordinarias existen?", "El trienio toma la cuantía de la categoría a la que pertenece el interesado el día en que se perfecciona; hay dos pagas extraordinarias al año, preferentemente en junio y diciembre.", 2, u13Sources),
    card(41, "SMS-T13-C21", "direct", "Enumera los cinco complementos del artículo 43.", "Destino, específico, productividad, atención continuada y carrera.", 1, u14Sources),
    card(42, "SMS-T13-C21", "contrast", "¿Qué diferencia esencial separa complemento específico y productividad?", "El específico retribuye condiciones particulares del puesto; productividad retribuye especial rendimiento, interés, iniciativa, programas y contribución a objetivos previa evaluación de resultados.", 2, u14Sources),
    card(43, "SMS-T13-C22", "contrast", "¿Qué cobra el personal temporal frente al aspirante en prácticas?", "El temporal cobra todas las básicas y complementarias de su nombramiento salvo trienios; el aspirante en prácticas tiene como mínimo las básicas, excluidos trienios, del grupo al que aspira ingresar.", 1, u14Sources),
    card(44, "SMS-T13-C22", "exception", "¿Cuál es la exclusión común en las reglas retributivas especiales de temporales y aspirantes en prácticas?", "Los trienios: el artículo 44 los excluye para temporal y el artículo 45 los excluye del mínimo de los aspirantes en prácticas.", 2, u14Sources),
    card(45, "SMS-T13-C23", "contrast", "¿Qué principios corresponden al régimen disciplinario y cuáles al procedimiento?", "Régimen: tipicidad, eficacia y proporcionalidad. Procedimiento: inmediatez, economía procesal y pleno respeto de derechos y garantías.", 1, u15Sources),
    card(46, "SMS-T13-C23", "mini_case", "Una persona nombrada inicialmente en un servicio comete una falta mientras presta servicios en otro y aparecen indicios fundados de delito. ¿Quién ejerce la potestad y qué ocurre con el expediente?", "Es competente el servicio donde prestaba servicios al cometer la falta; el expediente se suspende y se comunica al Ministerio Fiscal.", 2, u15Sources),
    card(47, "SMS-T13-C24", "contrast", "¿Qué umbrales de inasistencia separan las faltas muy graves y graves?", "Muy grave: más de 5 días continuados o 7 faltas en 2 meses. Grave: más de 3 días continuados o 5 faltas en 2 meses, cuando no constituya muy grave; por debajo puede ser leve según el tipo.", 1, u16Sources),
    card(48, "SMS-T13-C24", "contrast", "Da tres contrastes típicos que cambian la gravedad de una falta.", "Desobediencia notoria y manifiesta vs falta de obediencia; mantenimiento de incompatibilidad vs incumplimiento procedimental; acoso con agresión/chantaje vs entorno intimidatorio, hostil o humillante.", 2, u16Sources),
    card(49, "SMS-T13-C25", "number_or_deadline", "¿Cuándo prescriben las faltas muy graves, graves y leves?", "A los 4 años, 2 años y 6 meses, respectivamente.", 1, u16Sources),
    card(50, "SMS-T13-C25", "number_or_deadline", "¿Cuándo empieza, se interrumpe y vuelve a correr la prescripción de una falta?", "Empieza al cometerse; se interrumpe con la notificación del acuerdo de iniciación del procedimiento; vuelve a correr si el procedimiento se paraliza más de 3 meses por causa no imputable al interesado.", 2, u16Sources),
    card(51, "SMS-T13-C26", "contrast", "Relaciona separación, apercibimiento y traslado forzoso con la gravedad que los permite.", "Separación: solo muy graves. Apercibimiento escrito: solo leves. Traslado con cambio de localidad: muy graves; traslado sin cambio de localidad: graves.", 1, u17Sources),
    card(52, "SMS-T13-C26", "number_or_deadline", "¿Cuáles son los límites de suspensión de funciones y cuándo se conserva el destino?", "Por muy grave, entre 2 y 6 años; por grave, hasta 2 años. Si la suspensión no supera 6 meses, no se pierde el destino.", 2, u17Sources),
    card(53, "SMS-T13-C27", "number_or_deadline", "¿Qué plazos de prescripción tienen las sanciones y desde cuándo se cuentan?", "4 años, 2 años y 6 meses según deriven de faltas muy graves, graves o leves; desde la firmeza de la resolución o desde el quebrantamiento si la ejecución ya había empezado.", 1, u17Sources),
    card(54, "SMS-T13-C27", "contrast", "¿Qué diferencia hay entre paralización de ejecución y cancelación de la anotación sancionadora?", "La prescripción vuelve a correr si la ejecución se paraliza más de 6 meses por causa no imputable; la anotación se cancela de oficio desde el cumplimiento a los 6 meses, 2 años o 4 años según leve, grave o muy grave, y ya no cuenta para reincidencia.", 2, u17Sources),
    card(55, "SMS-T13-C28", "contrast", "¿Qué diferencia procedimental existe entre faltas graves/muy graves y leves?", "Graves y muy graves requieren el procedimiento establecido; para leves no es preceptiva la instrucción completa, pero la audiencia al inculpado debe evacuarse siempre.", 1, u18Sources),
    card(56, "SMS-T13-C28", "direct", "¿Qué garantías específicas enumera el artículo 74.2 para el inculpado?", "Presunción de inocencia; notificación de instructor/secretario y recusación; conocimiento de hechos, infracción, sanciones y resolución; alegaciones; prueba; asistencia sindical y de letrado.", 2, u18Sources),
    card(57, "SMS-T13-C29", "number_or_deadline", "En expediente disciplinario, ¿cuál es el límite y la retribución durante la suspensión provisional?", "Máximo 6 meses salvo paralización imputable al interesado; durante ella se perciben retribuciones básicas, salvo la regla de incomparecencia prevista en el artículo 75.", 1, u18Sources),
    card(58, "SMS-T13-C29", "mini_case", "Si la suspensión provisional disciplinaria termina sin separación ni suspensión de funciones, ¿qué sucede?", "El interesado se reincorpora al servicio activo y tiene derecho a las retribuciones dejadas de percibir, básicas y complementarias, incluidas las variables que hubieran podido corresponder.", 2, u18Sources),
  ],
} satisfies V4StudyContentPackage;
