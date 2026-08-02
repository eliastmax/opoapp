# Sprint 26 — Incidencias de preguntas y guardia de calidad

## Objetivo

Detectar excepciones reales durante el estudio y proteger futuras importaciones sin modificar ni
desactivar preguntas automáticamente.

## Incidencias de preguntas

Desde una pregunta en curso se puede registrar una incidencia privada con uno de estos motivos:

- posible error jurídico;
- enunciado ambiguo;
- referencia incorrecta;
- duplicada o demasiado parecida;
- redacción o formato.

La incidencia queda asociada a la pregunta y a la cuenta que la posee. La misma incidencia pendiente
no puede duplicarse. Reportarla no altera el resultado, las estadísticas, los niveles ni la pregunta;
queda en una cola de revisión para corregirla de forma deliberada.

## Guardia de calidad

La protección se aplica en dos capas:

1. El importador mantiene su previsualización de conflictos y similitudes.
2. La base de datos rechaza que se inserte o se convierta en igual un enunciado literal ya existente en
   el mismo catálogo, incluso si se intentara eludir la pantalla de importación.

Además, `get_question_bank_quality_report()` ofrece una auditoría privada y reproducible de:

- enunciados duplicados heredados;
- opciones iguales;
- campos pedagógicos o referencias ausentes;
- temas con menos de diez preguntas en alguna fase.

Los resultados señalan qué revisar; nunca corrigen ni borran contenido por su cuenta.

## Seguridad

- Tabla nueva con RLS activado.
- Una incidencia solo puede referirse a una pregunta de la misma cuenta.
- El cliente autenticado puede leer y crear sus propias incidencias, pero no modificar su estado.
- La auditoría y el trigger utilizan `SECURITY INVOKER`.

## Validación

- Incidencia válida y repetición de la misma incidencia pendiente.
- Aislamiento entre cuentas mediante RLS y clave foránea compuesta.
- Rechazo transaccional de un enunciado literal duplicado.
- Informe de calidad sin escritura sobre preguntas.
- Regresión de pruebas, TypeScript, lint y build.
