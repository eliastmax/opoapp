# Plan: OpoTest SMS – V1 funcional

App móvil web (React + TS + Tailwind + TanStack Start) para estudiar oposiciones mediante tests, con Lovable Cloud (Supabase) como backend real.

## 1. Backend (Lovable Cloud)

Activar Lovable Cloud y crear migración con:

- Tipos enum: `dificultad_enum` (facil/medio/dificil), `respuesta_enum` (A/B/C/D).
- Tablas: `profiles`, `subjects`, `topics`, `subtopics`, `questions`, `tests`, `test_answers` con UUID/timestamptz/FK conforme al esquema del brief.
- Constraints: `unique(user_id, codigo)` en questions, `unique(test_id, question_id)`, `unique(test_id, orden)`, unique jerarquía por usuario (subject nombre; topic subject+numero; subtopic topic+nombre).
- Índices en `user_id`, FKs y filtros (dificultad, activa, subject_id, topic_id).
- Trigger `handle_new_user` → crea `profiles` al registrarse.
- RLS habilitada en todas las tablas. Políticas CRUD `authenticated` con `(select auth.uid()) = user_id` (profiles con `id = auth.uid()`), UPDATE con USING+WITH CHECK, validación de propiedad de FKs vía funciones o EXISTS.
- GRANTs mínimos a `authenticated` + `service_role`. Sin acceso `anon`.

## 2. Auth

- Auth email+password (deshabilitar email confirm para V1 fluida).
- Ruta pública `/auth` (login + registro con `nombre`).
- Layout `_authenticated` gestionado por integración (redirige a `/auth`).
- Listener `onAuthStateChange` en `__root.tsx` para invalidar router/query.

## 3. Estructura de rutas

```
/auth                        → login/registro
/_authenticated/
  index                      → Inicio (stats + Comenzar)
  crear                      → Crear test personalizado
  test/$id                   → Ejecutar test (una pregunta/pantalla)
  resultados/$id             → Resultados + revisión de falladas
  historial                  → Lista de tests
  importar                   → CSV upload + preview + confirmar
  preguntas                  → Administrar preguntas
  ajustes                    → Perfil + logout
```

Bottom nav fija: Inicio, Crear, Resultados (historial), Importar, Ajustes.

## 4. Funcionalidad clave

**Inicio**: server fns que agregan totales (preguntas activas, tests completados, último resultado, % acierto global, preguntas distintas falladas).

**Crear test**: selectores materia→tema→subapartados (multi) + dificultades (multi) + cantidad (5/10/20/30/50) + modalidad (mezcladas / nunca realizadas / falladas). Resumen previo. Al iniciar: crea `tests` (completado=false) y precrea todas las filas `test_answers` con `orden` aleatorio único.

**Test runner**: navegación anterior/siguiente, progreso, persistencia por respuesta (update test_answers) + backup en `localStorage` con key `test:{id}`. Al recargar detecta test incompleto y ofrece continuar. Warning en beforeunload. Finalizar es idempotente: calcula aciertos/fallos/blancos, marca `completado=true`, `fecha_finalizacion=now()`.

**Resultados**: totales + desglose por dificultad/tema/subapartado (query agregada). Revisión de falladas con todos los campos. Botón "Repetir falladas" → crea nuevo test con esas questions.

**Historial**: lista de tests completados. Al abrir uno → mismo componente de resultados con todas las preguntas/respuestas.

**Importar CSV**:
- Papa Parse (`delimiter: ";"`, `header: true`, `skipEmptyLines`, BOM handling).
- Detecta 13 vs 16 columnas por headers.
- Validación: headers exactos, dificultad válida, respuesta A/B/C/D, no vacíos obligatorios.
- Detección duplicados: por `codigo`, por enunciado exacto en mismo tema/subapartado, y similitud (Jaccard/Levenshtein normalizado > 0.9) en mismo tema/subapartado.
- Preview con contadores: válidas, errores (fila+motivo), duplicados (con opción decidir por similares).
- Al confirmar: crea/reutiliza subject/topic/subtopic; genera código `SMS-T{numero_tema:02}-{correlativo:03}` en modo básico, comprueba unicidad; inserta questions. Nunca sobrescribe códigos existentes.
- Resumen post-importación.

**Administrar preguntas**: búsqueda por texto, filtros combinables, detalle, edit (excepto código/user_id), toggle `activa`.

## 5. Diseño

- Tailwind v4 con tokens en `styles.css`: primario azul profundo (`oklch(0.35 0.15 260)`), fondos blanco/grises, radios generosos, tipografía Inter (link en `__root.tsx`).
- Componentes shadcn: button, card, input, select, checkbox, dialog, toast, tabs, progress, badge.
- Mobile-first: max-w-md centrado, bottom nav fija con safe-area, botones táctiles ≥ 44px.
- Estados loading (skeletons), empty (ilustración texto), error (retry).

## 6. Validaciones y calidad

- Zod en formularios y CSV rows.
- TypeScript estricto, sin `any`.
- Tests unitarios mínimos (vitest) para: parser CSV (13/16 cols, BOM, comillas, ;), generador de código, cálculo de aciertos.

## 7. Fuera de alcance (explícito)

Sin IA, calendario, SRS, gamificación, rankings, estadísticas complejas.

## Detalles técnicos

- Todas las lecturas/escrituras vía `createServerFn` + `requireSupabaseAuth`, excepto formularios simples que pueden usar el cliente browser autenticado (para mutations rápidas de test_answers).
- Server fns en `src/lib/*.functions.ts`.
- Query keys: `['dashboard']`, `['subjects']`, `['test', id]`, `['tests']`, `['questions', filters]`.
- CSV parsing en cliente (Papa Parse), inserción por lotes vía server fn.
- Similitud: función simple (trigram/Jaccard sobre tokens normalizados).

## Entregables por fase

1. Migración + tipos generados.
2. Layout + auth + navegación.
3. Importar CSV (para poder tener datos).
4. Crear + ejecutar test.
5. Resultados + historial + repetir falladas.
6. Administrar preguntas + Inicio con stats.
7. Pulido, tests unitarios, verificación 10 pasos.

¿Procedo con la implementación?
