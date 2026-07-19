# Sprint V2 — Motor de selección inteligente

## Objetivo

Mejorar la composición de los tests mezclados para que no dependan de un simple barajado aleatorio. El motor debe priorizar preguntas pedagógicamente útiles, variar tests consecutivos y explicar su selección sin modificar los filtros elegidos por el usuario.

## Alcance implementado

- Muestreo ponderado sin reemplazo: una pregunta no puede repetirse dentro del mismo test.
- Prioridad por fallo activo, duda activa, novedad, rendimiento bajo, retención temporal y pocas apariciones.
- Penalización de preguntas aparecidas en los tres tests recientes.
- Penalización adicional de preguntas incluidas en el test inmediatamente anterior.
- Límite orientativo del 30 % de coincidencia con el test anterior cuando existen alternativas suficientes.
- Redistribución automática cuando los filtros no ofrecen alternativas suficientes.
- Creación transaccional del test, sus respuestas y su trazabilidad.
- Registro por pregunta del grupo, motivo, peso, coincidencia reciente, excepción y versión del algoritmo.
- Explicación sencilla de la composición en la pantalla de resultados.
- Conservación de las modalidades manuales Nunca realizadas, Falladas y Dudas.

## Calibración inicial `smart-v1.0`

Los pesos son relativos y están versionados:

- base: 1;
- fallo activo: +7;
- duda activa: +6;
- pregunta nueva: +5;
- rendimiento inferior al 70 % con al menos dos respuestas: +4;
- más de 14 días sin aparecer: +3;
- una o dos apariciones: +2;
- aparición en alguno de los tres tests recientes: multiplicador 0,60;
- aparición en el test anterior: multiplicador 0,25.

Estos valores no se consideran definitivos. Se calibrarán con uso real sin reinterpretar el historial, gracias a `algorithm_version`.

## Decisiones de producto

- La modalidad Mezcladas utiliza el motor inteligente manteniendo tema, subapartados, dificultad y cantidad elegidos por el usuario.
- No se añade todavía una sesión recomendada 40/30/20/10: corresponde a un sprint posterior.
- No se calculan todavía dominio, robustez ni desbloqueos de nivel.
- El límite del 30 % puede superarse únicamente cuando no existen suficientes alternativas; la excepción queda registrada.
- Los pesos detallados permanecen internos. La interfaz muestra motivos comprensibles, no fórmulas.
- No cambia el esquema CSV ni el Generador de Preguntas V2.

## Datos añadidos

### `test_question_selection`

Guarda una fila por cada pregunta de un test inteligente:

- grupo y motivo normalizados;
- peso base y final;
- orden de selección;
- coincidencia con el test anterior;
- excepción justificada al límite de coincidencia;
- versión del algoritmo.

### `create_smart_test`

Función transaccional que valida los filtros, selecciona sin reemplazo, crea el test, inserta sus preguntas y registra la trazabilidad.

## Criterios de aceptación

1. No existen duplicados dentro del test.
2. Dos tests consecutivos varían cuando hay alternativas.
3. En diez preguntas, la coincidencia con el test anterior no supera tres salvo falta de alternativas.
4. Cada pregunta seleccionada tiene grupo, motivo, peso y versión registrados.
5. Un error revierte toda la creación y no deja tests incompletos.
6. El usuario puede seguir creando tests de nuevas, falladas o dudas.
7. La pantalla de resultados explica la composición sin mostrar métricas innecesarias.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. No regeneres ni rediseñes el código. Verifica que la versión sincronizada desde GitHub convierte la modalidad Mezcladas en selección inteligente, conserva Nunca realizadas, Falladas y Dudas, y muestra en Resultados la tarjeta «Cómo se eligieron». Si el commit ya está sincronizado, limita la actuación a informar de la versión y del resultado de la verificación. No uses el agente para implementar cambios adicionales.

## Prompt optimizado para el Generador de Preguntas

Mantén exactamente el esquema CSV V2 vigente de 25 columnas y los catálogos aprobados. No añadas pesos de selección, grupos de selección, contadores de uso ni motivos de aparición: son datos dinámicos calculados por la aplicación para cada usuario. Continúa generando `concepto`, `perspectiva`, `nivel_pedagogico`, dificultades y frecuencia histórica con las reglas vigentes; este sprint no requiere regenerar preguntas.
