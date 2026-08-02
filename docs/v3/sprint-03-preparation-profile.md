# V3.1 — Perfil de preparación persistente

## Alcance

V3.1 conecta el flujo visual preparado en V3-VIS.0 con datos privados y reanudables. Permite elegir
una oposición publicada cuando la cuenta todavía no tiene una activa, registrar la fecha o el mes
del examen, los días habituales, el tamaño cómodo de sesión y una valoración inicial de cada tema.

## Datos y seguridad

- `preparation_profiles` mantiene un perfil por usuario y oposición, incluido el paso y tema desde
  el que debe reanudarse.
- `topic_self_assessments` guarda 0, 25, 50, 75, 100 o un `null` explícito para «No sé».
- Ambas tablas tienen RLS por usuario, permisos mínimos y claves que obligan a pertenecer a la
  oposición y al tema correctos.
- `save_preparation_profile` es `SECURITY INVOKER` y guarda perfil y valoraciones en una sola
  transacción.
- Una cuenta nueva solo puede inscribirse en una oposición publicada.

Las valoraciones no escriben en `question_statistics`, `test_answers`, tests, desbloqueos, cobertura
ni retención. V3.2 decidirá cómo utilizarlas de forma temporal y explicable cuando aún falte
evidencia real.

## Reanudación y finalización

Los cambios se guardan de forma breve y ordenada mientras se completa el flujo. El perfil conserva
el paso actual y, durante la valoración, el tema actual. La finalización exige fecha o estado
desconocido, al menos un día, 5, 10 o 20 preguntas por sesión y una respuesta para todos los temas,
incluido «No sé».

Un perfil completado puede editarse posteriormente desde Ajustes sin volver a considerarse
incompleto durante la edición.

## Interfaz conectada

- `/preparacion` monta el flujo real.
- Ajustes ofrece acceso a «Perfil de preparación».
- Las cuentas sin oposición activa ven primero el catálogo de oposiciones publicadas.
- Los estados de carga, error, reintento, guardado y reanudación utilizan datos reales.

## Fuera de alcance

V3.1 no cambia la sesión recomendada, los pesos del motor, el progreso, los niveles ni la retención.
Esos cambios pertenecen a V3.2 y deben calibrarse sin presentar la autopercepción como dominio.
