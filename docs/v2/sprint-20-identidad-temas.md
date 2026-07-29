# Sprint V2 — Identidad única y normalización de temas

## Problema observado

Los temas 19, 20 y 21 aparecían repartidos entre dos registros internos. El número y el título eran iguales, pero los CSV utilizaban variantes diferentes de `materia`.

La RPC de importación identificaba un tema mediante:

- usuario;
- materia;
- número de tema.

Por eso una nueva etiqueta de materia creaba otro tema y dividía preguntas, progreso y estadísticas.

## Solución implementada

La migración `20260729224023_normalize_topic_identity.sql`:

1. identifica como duplicados los temas del mismo usuario con igual número y título normalizado;
2. conserva un tema canónico;
3. redirige sus subapartados y preguntas al tema canónico;
4. mantiene intactos los identificadores de pregunta, códigos, respuestas, estadísticas e historial;
5. elimina únicamente los registros jerárquicos que quedan vacíos;
6. consolida las etiquetas históricas de las Leyes 39/2015 y 40/2015;
7. crea una restricción única por usuario, número y título normalizado;
8. modifica `import_questions_batch` para buscar primero el tema por esa identidad, sin depender de `materia`.

## Resultado esperado en los datos actuales

- Tema 19: un único tema con 240 preguntas.
- Tema 20: un único tema con 220 preguntas.
- Tema 21: un único tema con 180 preguntas.
- Los 24 temas de la oposición continúan presentes.
- Los tests e historiales existentes conservan sus preguntas y respuestas.

Estas cifras deben comprobarse después de aplicar la migración. La implementación local no modifica por sí sola la base de producción.

## Previsualización de producción

La consulta de solo lectura previa a la migración confirma:

- 3 grupos duplicados, correspondientes únicamente a los temas 19, 20 y 21;
- 3 registros de tema redundantes;
- 310 preguntas que cambiarán de jerarquía sin cambiar de ID;
- 75 subapartados asociados a los registros que se fusionarán.

## Seguridad

- La RPC continúa como `SECURITY INVOKER`.
- Requiere usuario autenticado mediante `auth.uid()`.
- La ejecución se mantiene revocada para `PUBLIC` y `anon`.
- No se desactiva RLS.
- La migración comprueba al terminar:
  - que no queden identidades de tema duplicadas;
  - que cada pregunta conserve la materia de su tema;
  - que cada subapartado pertenezca al tema de su pregunta.
- Cualquier fallo aborta la migración completa.

## Verificación técnica local

- 79 pruebas automatizadas superadas.
- TypeScript sin errores.
- Build de producción completado.
- Lint y formato de los archivos modificados superados.
- La migración contiene 22 sentencias válidas según el parser oficial de PostgreSQL.
- Ensayo en una base PostgreSQL aislada superado:
  - fusión de los temas duplicados;
  - conservación de todos los IDs de pregunta;
  - consolidación de subapartados equivalentes;
  - reutilización del tema existente al importar con una etiqueta histórica.

## Contrato de importación

No cambia el CSV V2:

- se mantienen exactamente 25 columnas;
- los códigos siguen siendo permanentes;
- `materia` continúa almacenándose y mostrándose;
- `numero_tema` y `tema` pasan a determinar la identidad estable del tema dentro de la oposición cargada en la cuenta.

## Validación necesaria

Después de publicar y aplicar la migración:

1. confirmar que existen 24 temas únicos para Auxiliar Administrativo SMS;
2. comprobar los totales 240, 220 y 180 de los temas 19, 20 y 21;
3. abrir Crear test y Progreso y verificar que cada tema aparece una vez;
4. abrir un test histórico que contenga preguntas de esos temas;
5. importar una pregunta de prueba usando una variante antigua de `materia`;
6. confirmar que reutiliza el tema existente y no crea otro;
7. retirar o desactivar la pregunta de prueba si no pertenece al banco definitivo.

## Prompt optimizado para Lovable

Trabaja exclusivamente sobre `OpoTest Study`; no modifiques `OpoTest: V2`. El sprint de identidad única de temas ya está implementado en GitHub. Sincroniza la rama publicada sin regenerar código y no cambies el contrato CSV. Después de que Supabase tenga aplicada la migración `20260729224023_normalize_topic_identity.sql`, verifica en móvil: (1) los temas 19, 20 y 21 aparecen una sola vez en Crear test y Progreso; (2) contienen respectivamente 240, 220 y 180 preguntas; (3) los tests históricos siguen abriendo correctamente; (4) la selección multitema y el simulacro no muestran temas duplicados; y (5) una importación con una etiqueta histórica de materia reutiliza el tema existente. No crees tablas, RPC ni migraciones adicionales.

## Prompt optimizado para el Generador de Preguntas

No requiere cambios en el Generador. Se mantiene exactamente el contrato CSV V2 de 25 columnas, los códigos permanentes y los catálogos vigentes. Para evitar incidencias, debe conservarse el nombre canónico de `materia` dentro de cada banco, aunque la aplicación ya impida que una variante de esa etiqueta duplique el tema.
