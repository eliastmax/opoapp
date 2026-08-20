# Content Factory.6 — Anti-overmerge guard

Base: `5834564cc222b4498bd6ffa5633f9190ec9145ff`.

## Defect

Semantic Builder used Union-Find over pairwise `shouldMerge` compatibility. Pairwise compatibility is not transitive, so A↔B and B↔C could collapse A+B+C even when A↔C was incompatible. `sameSubpart + sharedSpan` also acted as an unconditional merge signal.

## Fix

- Remove Union-Find single-link clustering.
- Remove unconditional `sameSubpart + sameSource` concept identity.
- Preserve exact normalized `conceptLabel` and `learningObjective` as strong pair signals.
- Use deterministic complete-link agglomeration: two clusters merge only when every cross-cluster pair is semantically compatible.
- Confidence thresholds are unchanged.

## Regression coverage

Synthetic tests cover the incompatible bridge chain, genuinely homogeneous groups, exact sameLabel, exact sameObjective, and distinct nearby concepts sharing source/subpart.

No T21-specific rule or threshold is introduced.
