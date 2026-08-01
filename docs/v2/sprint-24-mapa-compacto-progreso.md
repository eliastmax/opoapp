# Sprint 24 — Mapa compacto de progreso

## Objetivo

Permitir que los 24 temas se comprendan y comparen rápidamente sin recorrer una sucesión de
informes extensos. La vista general muestra únicamente las señales necesarias para orientarse y
traslada el diagnóstico completo al detalle de cada tema.

## Cambios visuales

- La lista vertical se sustituye por una cuadrícula compacta, ordenada numéricamente.
- Cada tema muestra número, nombre en dos líneas, fase actual, avance de la primera vuelta y una
  señal ámbar cuando existen fallos, dudas o repasos previstos para hoy.
- Las fases se distinguen mediante color y texto:
  - gris: sin empezar;
  - bronce: Aprendizaje;
  - plata: Consolidación;
  - oro: Tribunal;
  - verde: ruta completada.
- El color nunca es la única señal del estado.
- Un resumen superior muestra la distribución de los temas por fase.
- Los filtros se limitan a Todos, En curso, Atención y Completados.
- Al pulsar un tema, su información completa se abre en un panel inferior en móvil y lateral en
  escritorio, sin perder la posición dentro del mapa.
- Avances verificados e Historial permanecen disponibles después del mapa, pero dejan de retrasar
  el acceso a los temas.

## Decisiones de producto

- La barra pequeña de cada tema representa la primera vuelta, no el dominio dentro de la fase. Los
  datos actuales no permiten calcular de forma equivalente el avance interno de Tribunal y no se
  inventa una métrica nueva para cubrir ese hueco.
- «Ruta completada» conserva su significado pedagógico vigente: Tribunal está disponible; no
  significa que el tema esté dominado para siempre.
- No se añade buscador ni ordenación alternativa. Con 24 temas y orden numérico fijo, los cuatro
  filtros cubren la necesidad sin aumentar la carga de decisión.

## Alcance técnico

El sprint reutiliza exactamente las cuatro consultas de Progreso y deriva la presentación en el
cliente. No modifica RPC, cálculos, desbloqueos, retención, historial, Supabase, bancos ni el CSV V2
de 25 columnas.

## Validación requerida

- Temas sin empezar, en Aprendizaje, Consolidación, Tribunal y con ruta completada.
- Señal de atención por fallo, duda y repaso previsto para hoy.
- Los cuatro filtros y su estado vacío.
- Apertura, desplazamiento y cierre del detalle en móvil y escritorio.
- Orden numérico y conservación de todos los datos detallados anteriores.
- TypeScript, pruebas, build de producción y lint de los archivos modificados.

## Lovable

Sincroniza el código existente de GitHub y publica el commit aprobado. No regeneres la pantalla ni
uses créditos para editarla. Verifica en móvil que la cuadrícula muestra tres temas por fila, que el
detalle se abre desde abajo y que la barra inferior no lo tapa. En escritorio, verifica que el
detalle aparece como panel lateral. No cambies Supabase, el Generador ni los bancos.

No requiere cambios en el Generador; se mantiene el contrato V2 de 25 columnas.
