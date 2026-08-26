# ELI-45 production compatibility note

The first merged ELI-45 design used an intermediate NOLOGIN role. Production rejected that migration before applying any object because the managed runtime cannot transfer function ownership to that role in this context.

The corrected design keeps the same governed contract but removes the unnecessary intermediate role. The private executor is callable only by the trusted `postgres` maintenance runtime, while app/learner RLS and the authenticated ELI-43 fallback remain unchanged.

This note records the deployment compatibility correction; it does not authorize or perform academic writes.
