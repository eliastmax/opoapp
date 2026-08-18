# OpoTest Study V4 — Compañero de oposición

## Visión

V4 convierte OpoTest Study de una app que mide, detecta y recomienda en el cerebro operativo de la preparación diaria.

Principio de producto:

> OpoTest no sustituye el temario principal. Organiza, prioriza, explica lo justo, repasa, examina y decide cuándo volver a comprobar cada conocimiento.

La utilidad diaria debe ser la razón para volver, no una racha, XP, rankings ni presión artificial.

## Experiencia principal: Hoy

La pantalla principal de V4 debe responder inmediatamente:

1. qué toca hoy;
2. por qué toca;
3. cuánto tiempo llevará;
4. qué ocurre después.

La acción principal será `Empezar sesión`.

La sesión diaria se construirá como una secuencia guiada, no como herramientas independientes:

1. **Repasar** — recuperación espaciada de conocimientos que toca comprobar.
2. **Corregir** — conceptos con fallos o dudas recientes importantes.
3. **Avanzar** — contenido nuevo según planificación y cobertura.
4. **Comprobar** — preguntas adaptadas a lo trabajado y a debilidades previas.

El usuario podrá indicar que hoy dispone de menos tiempo y OpoTest recalculará la sesión sin generar deuda por días perdidos.

## Unidad central: el concepto

En V4 la pregunta deja de ser la unidad central del modelo de aprendizaje. Las preguntas pasan a ser instrumentos para medir conceptos.

Jerarquía canónica:

`Oposición → Tema → Unidad de estudio → Concepto`

Cada pregunta, resumen, flashcard y señal de aprendizaje debe poder vincularse a uno o varios conceptos estables mediante identificadores internos.

Regla:

> No crear una pregunta, flashcard o bloque de estudio sin saber qué concepto enseña o comprueba.

## Estado conceptual visible

Estados de producto previstos:

- `No trabajado`
- `Visto`
- `En comprobación`
- `Consolidando`
- `Retenido`

Estos estados no son lineales e irreversibles. Un concepto puede retroceder si reaparecen errores.

Indicadores complementarios:

- `Necesita atención`: fallos o dudas recientes justifican intervención.
- `Toca repasar`: ha llegado el momento de comprobar retención.

Principios de evidencia:

- leer contenido = exposición, no dominio;
- acertar flashcards = recuperación de memoria, no prueba suficiente de dominio;
- responder preguntas distintas = evidencia de comprensión;
- volver a acertar tras separación temporal = evidencia fuerte de retención.

Los umbrales matemáticos exactos para cambiar de estado deben definirse antes de crear la migración de dominio conceptual.

## Unidades de estudio

Los resúmenes no serán capítulos largos. Cada tema se divide en unidades pequeñas, normalmente de 3–10 minutos.

Una unidad puede contener varios conceptos y debe incluir, cuando proceda:

- explicación de estudio;
- claves de examen;
- literalidades relevantes;
- cifras y plazos;
- excepciones;
- `No confundir con`;
- trampas frecuentes;
- mnemotecnia solo cuando aporte valor;
- flashcards;
- referencias exactas a la fuente;
- preguntas vinculadas.

`Estudiado` nunca equivale a `dominado`.

## Flashcards

Las flashcards son un medio de recuperación activa, no un producto independiente ni un sustituto de las preguntas.

OpoTest debe seleccionar qué cards mostrar según necesidad y no obligar al usuario a gestionar manualmente una colección tipo Anki.

La interfaz preferida será `Repaso rápido`, evitando exponer algoritmos innecesarios.

## Compañero y guía

V4 debe interpretar los datos con mensajes concretos y explicables, por ejemplo:

- detectar patrones de error;
- explicar por qué se recomienda un bloque;
- distinguir ampliación de corrección;
- anunciar qué se volverá a comprobar más adelante;
- adaptar el plan después de actividad nueva.

Siempre que exista una recomendación importante debe poder responderse `¿Por qué me recomiendas esto?` con evidencia real del usuario.

No se implementará un chatbot abierto en V4.0. La sensación de acompañamiento debe surgir primero del comportamiento inteligente y contextual de la app.

## Centro de estudio

El Centro de estudio es secundario respecto a `Hoy`.

Sirve para exploración manual por tema, unidad y concepto, con acceso a contenido, cards, estado y práctica asociada.

La experiencia principal sigue siendo:

`Abrir OpoTest → Empezar sesión → dejarse guiar`.

## Progreso

V4 debe responder `¿Estoy avanzando como debería?` de forma accionable, priorizando:

- ritmo;
- cobertura;
- consolidación;
- conceptos que requieren atención;
- próximo objetivo.

Evitar gráficos o métricas sin una acción clara asociada.

## Principios de producto V4

1. OpoTest decide siempre que tenga suficiente información.
2. Actividad no significa dominio.
3. Cada fallo debe terminar en una acción concreta.
4. Cada contenido estudiado debe terminar siendo comprobado.
5. Perder un día nunca crea deuda punitiva.
6. La app reduce decisiones, no añade decisiones.
7. Las recomendaciones deben ser explicables mediante evidencia real.
8. La utilidad diaria, no la gamificación, debe crear recurrencia.

## Fuera de V4.0

Quedan expresamente fuera por ahora:

- subida de PDFs o materiales propios;
- chatbot generativo abierto;
- generación de explicaciones en tiempo real;
- comunidad;
- rankings;
- streaks;
- XP;
- avatares;
- competición;
- calendario complejo editable;
- intento de sustituir una academia o un temario completo.

## Estrategia de validación

Antes de alimentar toda una oposición, validar V4 con 3 temas de alta calidad y con banco de preguntas suficiente.

La prueba debe demostrar el ciclo completo:

`test → concepto débil → repaso → cards → retest → comprobación diferida → cambio de estado`.

Solo después se escala el contenido al resto de temas.
