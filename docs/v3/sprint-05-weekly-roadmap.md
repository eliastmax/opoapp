# V3.3 — Hoja de ruta semanal derivada

## Qué aporta

`get_weekly_roadmap()` convierte el perfil completado en sesiones realistas para los días de
práctica que aún quedan de la semana. Muestra objetivo, realizado, pendiente y el reparto por tema.
No guarda una lista rígida: al terminar un test o cambiar el perfil, la siguiente consulta se adapta.

## Replanificación sin presión

Una sesión perdida no se traslada como deuda a mañana. La ruta solo propone como máximo una sesión
por día disponible restante. Si ya no quedan días configurados esta semana, no crea una acumulación
imposible; la próxima semana se recalcula desde cero.

## Prioridad y límites

Los temas proceden de las mismas señales explicables de V3.2: fallos, dudas, repasos, valoración
inicial aún vigente y evidencia observada. La fecha de examen únicamente describe el contexto: una
fecha mensual no se convierte en cuenta atrás exacta y ninguna fecha desbloquea Consolidación o
Tribunal.

La ruta no altera preguntas, respuestas, cobertura, dominio, retención ni niveles. La interfaz
visual deberá consumir este contrato antes de mostrarla como función pública.
