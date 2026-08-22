# Work Supabase write preflight

Mandatory precondition for Celador Content Factory Works that need to import content.

## Confirmed state

- Supabase project ref: `kimswvynzehmilqydcgz`.
- Celador opposition id: `00000000-0000-4000-8000-000000000002`.
- The connected Supabase app has plugin-specific permission `Allow all actions`.
- The T10 Work could read Supabase, but its write invocation path returned `INVALID_ARGUMENT`.
- The same database accepted writes from the continuation Chat, so the incident was an environment/tool-invocation failure, not a database/RLS permission blocker.

## Mandatory route

1. Read the installed Supabase skill before using Supabase.
2. Rediscover the current Supabase action schema in the session; never guess a stale signature.
3. Use the connected SQL execution action for ordinary SQL/DML and validation.
4. Do not use migration actions for content DML.
5. Use a migration action only for a genuine persistent schema migration, and only after the SQL has been validated.
6. Do not pass guessed or unsupported arguments.

## Mandatory preflight before expensive Factory work

Run this before the long source-production pass:

1. Minimal read check against the target project.
2. One rollback-only DML write in a single SQL call, using an existing row and a no-op update, for example conceptually:
   `BEGIN; UPDATE public.profiles SET nombre = nombre WHERE id = <known curator id>; ROLLBACK;`
3. Verify zero residue.

If reads work but DML returns `INVALID_ARGUMENT`:

- do not loop the same call;
- rediscover the current action schema;
- retry once using only the required project identifier and SQL/query fields.

If it still fails, STOP immediately as:

`WORK_CONNECTOR_WRITE_PATH_BLOCKED`

Do not spend the Work completing source analysis first, and do not classify this as an RLS, database, Factory or content blocker.

## Production write rules once GREEN

- Snapshot before writes.
- Catalog is scoped by real `opposition_id`.
- Topic identity is `opposition_id + subjectName + officialTopicNumber`.
- Never isolate by `numero_tema` alone.
- Shared catalog is never learner-owned; personal state remains scoped by `auth.uid()`.
- Import atomically or in verified atomic batches.
- Any failed batch must leave zero partial residue.

## Closure

A Work may report `CLOSED / V4 PRODUCTION` only after import, V4/V2/V3 smokes, fresh-user gate, cross-opposition isolation, contamination/regressions, Quality and normal merge.

Never rebase, squash, force-push, hard-reset or pushed-amend.
