# ELI-43 · Authenticated Auxiliar maintenance executor

This operator-side path exists only for governed Auxiliar catalog maintenance. It is not an admin CMS and it is not a SQL console.

## Security contract

- Authentication is a real Supabase Auth email/password session using the project publishable key.
- The CLI never accepts a password, JWT, token, service-role key or secret as a command-line argument.
- Password entry requires an interactive TTY and is hidden. The Supabase session is kept in memory only (`persistSession=false`) and is signed out locally before exit.
- The server RPC is `SECURITY INVOKER`. Existing RLS and `assign_catalog_opposition()` remain active.
- The RPC requires `current_user=authenticated`, non-null `auth.uid()`, Auxiliar as the current active opposition, and an `opposition_admins` row for that same user/opposition.
- The only server-side package IDs are `eli43_harmless_probe_v1` and `eli42_t11_oos_cleanup_v1`. Unknown keys/packages/modes are rejected.
- Opposition is hard-locked to Auxiliar Administrativo SMS (`00000000-0000-4000-8000-000000000001`). The ELI-42 package is additionally hard-locked to T11.
- No Celador Factory role, GUC, RLS policy or executor is reused or modified.

## Operator environment

Provide these values to the local process environment. The publishable key is a public client key; do not use a secret/service-role key.

```text
SUPABASE_URL=<production project URL>
SUPABASE_PUBLISHABLE_KEY=<production publishable key>
```

Do not add user passwords or access/refresh tokens to `.env`, shell history, CI variables, issue comments, logs, artifacts or chat.

## Commands

Harmless authentication/authorization proof (0 academic writes):

```bash
bun run maintenance:auxiliar -- probe
```

ELI-42 read-only preflight (0 academic writes):

```bash
bun run maintenance:auxiliar -- eli42-preflight
```

ELI-42 execution capability exists but **must not be used while ELI-43 is being proved**. Governance must explicitly resume ELI-42 first. The CLI then requires a second interactive exact confirmation phrase before making the RPC call:

```bash
bun run maintenance:auxiliar -- eli42-execute
```

## Expected rejection matrix

The server contract rejects:

- `anon` (no EXECUTE privilege);
- `service_role` and raw SQL/postgres shortcuts (`current_user` must be `authenticated`);
- authenticated users without Auxiliar `opposition_admin` membership;
- authenticated users whose active opposition is not Auxiliar;
- any package that requests another opposition, including Celador;
- unknown package IDs, modes or JSON keys;
- ELI-42 execute without the exact confirmation phrase;
- any ELI-42 pre-state drift from the approved 200/20/180 + PRIMARY ledger.

## ELI-42 sequencing

ELI-43 itself never runs the T11 cleanup. Once the harmless proof is GREEN and Governance resumes ELI-42, re-run the existing ELI-42 preflight. The RPC contains the exact allowlisted T11 transaction and post-checks; any exception aborts the RPC transaction.
