# Sprint V2 — Controles de salida y reinicio

## Objetivo

Dar al usuario control para abandonar un test sin terminarlo y reiniciar sus datos de prueba sin afectar al banco de preguntas.

## Alcance implementado

- Botón «Salir» pequeño y visible en la cabecera del test.
- Confirmación antes de abandonar para evitar pulsaciones accidentales.
- Salir devuelve a Inicio sin corregir el test ni modificar los fallos activos.
- Opción «Reiniciar estadísticas» en Ajustes, separada visualmente como acción destructiva.
- Doble confirmación antes del reinicio.
- El reinicio elimina tests, respuestas, trazabilidad de selección, estadísticas, fallos y dudas del usuario autenticado.
- Se conservan la cuenta, materias, temas, subapartados y todas las preguntas importadas.

## Seguridad y datos

- El reinicio se ejecuta en una única transacción mediante `reset_learning_progress()`.
- La función usa `security invoker`, exige sesión autenticada y filtra por `auth.uid()`.
- La política de borrado de estadísticas solo permite eliminar filas propias.
- No se utilizan claves administrativas en el cliente.

## Criterios de aceptación

1. «Salir» está visible durante el test sin competir con la navegación principal.
2. Cancelar el diálogo permite continuar exactamente donde estaba el usuario.
3. Confirmar la salida vuelve a Inicio y no corrige el test.
4. Reiniciar estadísticas requiere confirmación explícita.
5. Tras el reinicio, Inicio, Progreso, Historial, fallos y dudas aparecen sin actividad previa.
6. Las preguntas importadas siguen disponibles para crear nuevos tests.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. Sincroniza y publica el código existente en GitHub sin regenerarlo. Verifica en móvil: (1) durante un test aparece un botón secundario `Salir`; (2) cancelarlo permite continuar; (3) confirmarlo vuelve a Inicio sin corregir; (4) Ajustes incluye `Reiniciar estadísticas`; (5) la confirmación indica claramente qué se borra y qué se conserva; (6) tras reiniciar desaparecen tests, progreso, fallos y dudas; y (7) las preguntas importadas permanecen disponibles. No modifiques el CSV ni los bancos.

## Prompt optimizado para el Generador de Preguntas

No se requiere ningún cambio en el Generador de Preguntas. Mantén exactamente el contrato CSV V2 vigente.
