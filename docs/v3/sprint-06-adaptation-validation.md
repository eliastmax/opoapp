# V3.4 — Adaptación, explicabilidad y validación

## Objetivo

Cerrar el núcleo adaptativo de V3 sin añadir una nueva función grande. El sprint refuerza la coherencia entre V3.2 y V3.3, los estados límite de la hoja semanal y la experiencia móvil de Progreso.

## Cambios

### Hoja de ruta semanal

- La fórmula de prioridad se mantiene sin cambios.
- `No sé valorarlo` se explica como `initial_unknown` y ya no se agrupa con una valoración inicial baja.
- Una oposición sin preguntas activas devuelve `no_questions_available` en lugar de una respuesta vacía ambigua.
- La interfaz representa ese estado de forma explícita.
- Si el usuario hace más sesiones que las configuradas, la barra continúa limitada al 100 % y el texto indica que el objetivo se ha superado sin presentar una fracción incoherente.
- La caché de la hoja semanal se invalida tras guardar el perfil y tras completar un test, de modo que la siguiente lectura use el estado más reciente.

### Progreso móvil

El detalle de un tema pasa a ser un contenedor flexible: la cabecera permanece accesible y el cuerpo usa un área desplazable propia con `min-h-0`, `flex-1`, `overflow-y-auto`, `overscroll-contain` y `touch-pan-y`. Esto corrige el caso en el que el panel podía abrirse pero no permitía alcanzar todo su contenido en móvil.

## Seguridad y datos

- `get_weekly_roadmap()` continúa como `SECURITY INVOKER`.
- Se revoca ejecución a `PUBLIC` y `anon` y se concede a `authenticated` y `service_role`.
- No se modifica RLS, historial, preguntas, respuestas, cobertura, dominio, retención ni desbloqueos.
- No se persiste una hoja semanal: continúa derivándose de los datos fuente.

## Compatibilidad

- Sin cambios en el CSV V2 de 25 columnas.
- Sin cambios en el Generador de Preguntas.
- Sin IA generativa en tiempo real.
- V3.4 es compatible con V2/V2.5 y con los contratos V3.0–V3.3.

## Validación automática

La prueba de presentación de la hoja semanal cubre:

- `week_complete`;
- `no_days_remaining`;
- `no_questions_available`;
- descarte de filas parciales;
- progreso 1/2 = 50 %;
- objetivo 0 = 0 %;
- progreso superior al objetivo limitado al 100 %.

## Validación manual recomendada

1. Cambiar días disponibles o tamaño de sesión y volver a Inicio.
2. Completar un test y comprobar que la hoja semanal se recalcula.
3. Verificar que `No sé valorarlo` no aparece explicado como una valoración baja.
4. Verificar el estado sin preguntas activas en una oposición de prueba.
5. Superar el objetivo semanal y comprobar el texto de objetivo superado.
6. En Android, abrir Progreso > tema y deslizar hasta el final del panel.

## Generador y Lovable

No requiere cambios en el Generador; se mantiene el contrato V2 de 25 columnas.

Lovable no debe regenerar el código de este sprint. Tras la fusión en `main`, solo debe sincronizar/publicar la rama conectada y servir para la validación visual cuando sea necesario.
