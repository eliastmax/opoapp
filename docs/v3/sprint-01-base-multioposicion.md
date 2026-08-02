# V3.0 — Base multioposición y catálogo compartido

## Objetivo

Separar explícitamente el contenido común de una oposición del aprendizaje privado de cada persona,
sin reescribir preguntas, respuestas, tests ni estadísticas históricas.

## Alcance de esta primera base

- catálogo raíz `oppositions`;
- inscripción privada mediante `user_oppositions`;
- oposición activa en el perfil;
- administración explícita de cada catálogo;
- `opposition_id` estable en materias, temas, subapartados, preguntas y tests;
- integridad completa de la jerarquía dentro de una misma oposición;
- lectura del catálogo activo y mutaciones reservadas a administradores;
- migración separada de los catálogos actuales de Auxiliar Administrativo SMS y Celador SMS.

Los campos `user_id` de las tablas de catálogo se conservan temporalmente como referencia del
curador original. Ya no representan el futuro propietario del aprendizaje y se retirarán únicamente
cuando todos los motores hayan pasado a trabajar con `opposition_id`.

## Privacidad y continuidad

El contenido de una oposición puede compartirse. El progreso no: `tests`, `test_answers`,
`question_statistics`, incidencias y selecciones siguen aislados por `user_id` y RLS.

La migración no cambia ids de preguntas ni actualiza respuestas o estadísticas. Los tests históricos
reciben la oposición correspondiente para que sigan siendo interpretables aunque el usuario cambie
de oposición en el futuro.

## Activación gradual

Esta base no añade todavía el selector visual ni el onboarding. V3.1 utilizará
`set_active_opposition()` y adaptará los motores de creación de tests para que un nuevo usuario pueda
practicar el catálogo compartido sin ser su curador.

## Validación requerida

- dos catálogos migrados y sin filas huérfanas;
- mismos ids y recuentos de preguntas, tests, respuestas y estadísticas antes y después;
- cada catálogo conserva sus administradores e inscritos iniciales;
- RLS impide leer inscripciones ajenas;
- no se puede activar una oposición sin inscripción;
- el importador existente sigue funcionando para el administrador del catálogo activo.
