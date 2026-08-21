import type { V4SourceRef, V4StudyContentPackage } from "../v4-content-package";
import { normalizeText } from "../similarity";
import { stableConceptCode, stableUnitCode } from "./codes";
import type { ResolvedMasteryFamily } from "./mastery-family-resolution";
import type { SemanticSourceSpan } from "./semantic-draft";
import type { ContentFactoryJob, FactoryProposalConfidence, FactoryQuestionAssignment, ProposedStudyUnit } from "./types";

export const CONTENT_FACTORY_SOURCE_COVERAGE_VERSION = "1.0" as const;

export type SourceCoverageFamilyOrigin = "question_backed" | "source_only";

export type SourceCoverageFamily = ResolvedMasteryFamily & {
  origin: SourceCoverageFamilyOrigin;
  generationRequired: boolean;
  sourceChunkIds: string[];
};

export type SourceCoverageChunk = {
  id: string;
  spanId: string;
  document: string;
  reference: string;
  heading: string | null;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
};

export type SourceCoverageFamilySummary = Pick<
  SourceCoverageFamily,
  "code" | "title" | "masteryStatement" | "unitCode" | "questionCodes" | "sourceRefs"
>;

export type SourceCoverageWorkPacket = {
  kind: "source_coverage_resolution";
  packetId: string;
  chunks: SourceCoverageChunk[];
  representedFamilies: SourceCoverageFamilySummary[];
  representedUnits: ProposedStudyUnit[];
  constraints: string[];
};

export type SourceCoverageUnitTarget =
  | { kind: "existing"; unitCode: string }
  | { kind: "new"; title: string };

type DecisionBase = {
  chunkId: string;
  /** Required when a coarse chunk needs more than one decision. */
  sourceExcerpt?: string | null;
  rationale: string;
};

export type AttachToExistingFamilyDecision = DecisionBase & {
  action: "ATTACH_TO_EXISTING_FAMILY";
  existingFamilyCode: string;
};

export type CreateSourceFamilyDecision = DecisionBase & {
  action: "CREATE_SOURCE_FAMILY";
  provisionalFamilyId: string;
  title: string;
  masteryStatement: string;
  includedFacets: string[];
  excludedNearbyFamilyReason: string;
  confidence: FactoryProposalConfidence;
  unit: SourceCoverageUnitTarget;
};

export type IgnoreNonmaterialDecision = DecisionBase & {
  action: "IGNORE_NONMATERIAL";
};

export type SourceCoverageDecision =
  | AttachToExistingFamilyDecision
  | CreateSourceFamilyDecision
  | IgnoreNonmaterialDecision;

export type SourceCoverageOperationResult = {
  decisions: SourceCoverageDecision[];
};

export type SourceCoverageValidationIssue = {
  code:
    | "missing_chunk_decision"
    | "unknown_chunk"
    | "invalid_excerpt"
    | "invalid_ignore"
    | "unknown_family"
    | "unknown_unit"
    | "invalid_source_family"
    | "duplicate_source_family_id"
    | "source_only_unmapped";
  message: string;
  chunkId?: string;
  familyCode?: string;
};

export type SourceCoverageValidationPhase = "pre_generation" | "import_ready";

export type SourceCoverageValidationReport = {
  valid: boolean;
  phase: SourceCoverageValidationPhase;
  issues: SourceCoverageValidationIssue[];
  uncoveredChunkIds: string[];
  sourceOnlyFamilies: number;
  sourceOnlyFamiliesWithoutQuestions: number;
};

export type SourceCoverageClosureRun = {
  version: typeof CONTENT_FACTORY_SOURCE_COVERAGE_VERSION;
  mode: "semantic_resolution" | "approved_replay";
  packets: SourceCoverageWorkPacket[];
  operationCount: number;
  decisions: SourceCoverageDecision[];
  families: SourceCoverageFamily[];
  units: ProposedStudyUnit[];
  ignored: IgnoreNonmaterialDecision[];
  validation: SourceCoverageValidationReport;
  approvedStructure: V4StudyContentPackage | null;
};

const HEADING_RE = /^(?:[IVXLCDM]+(?:\.\d+)*\.?|\d+(?:\.\d+)+\.?|ART[ÍI]CULO\s+\d+|T[ÍI]TULO\b|CAP[ÍI]TULO\b|SECCI[ÓO]N\b|SUBSECCI[ÓO]N\b)/i;

function clean(value?: string | null) {
  const result = value?.replace(/\s+/g, " ").trim();
  return result ? result : null;
}

function looksLikeHeading(line: string) {
  const normalized = clean(line) ?? "";
  if (!normalized || normalized.length > 180) return false;
  if (HEADING_RE.test(normalized)) return true;
  const letters = normalized.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  return letters.length >= 6 && normalized === normalized.toUpperCase();
}

function sourceRefForChunk(chunk: SourceCoverageChunk): V4SourceRef {
  return {
    label: chunk.document,
    reference: chunk.reference,
    pageStart: chunk.pageStart,
    pageEnd: chunk.pageEnd,
  };
}

function stableChunkId(spanId: string, index: number) {
  return `${spanId}-CH${String(index).padStart(2, "0")}`;
}

/**
 * Deterministic candidate segmentation for Source Coverage Closure.
 * It is intentionally more granular than SemanticSourceSpan[] and does not assume
 * the upstream parser already separated every material section.
 */
export function splitSemanticSourceSpanForCoverage(span: SemanticSourceSpan): SourceCoverageChunk[] {
  const lines = (span.text ?? "").replace(/\r\n?/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const groups: Array<{ heading: string | null; lines: string[] }> = [];
  let current: { heading: string | null; lines: string[] } = { heading: clean(span.heading), lines: [] };

  for (const line of lines) {
    if (looksLikeHeading(line) && current.lines.length > 0) {
      groups.push(current);
      current = { heading: line, lines: [line] };
    } else if (looksLikeHeading(line) && current.lines.length === 0) {
      current.heading = line;
      current.lines.push(line);
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) groups.push(current);

  return groups.map((group, index) => ({
    id: stableChunkId(span.id, index + 1),
    spanId: span.id,
    document: span.document,
    reference: `${span.reference}${group.heading ? ` · ${group.heading}` : ""}`,
    heading: group.heading,
    text: group.lines.join("\n"),
    pageStart: span.pageStart ?? null,
    pageEnd: span.pageEnd ?? null,
  }));
}

function baseFamilies(families: ResolvedMasteryFamily[]): SourceCoverageFamily[] {
  return families.map((family) => ({
    ...family,
    origin: "question_backed" as const,
    generationRequired: false,
    sourceChunkIds: [],
  }));
}

function packetForSpan(input: {
  span: SemanticSourceSpan;
  index: number;
  families: SourceCoverageFamily[];
  units: ProposedStudyUnit[];
}): SourceCoverageWorkPacket | null {
  const chunks = splitSemanticSourceSpanForCoverage(input.span);
  if (chunks.length === 0) return null;
  return {
    kind: "source_coverage_resolution",
    packetId: `SOURCE-COVERAGE-P${String(input.index + 1).padStart(3, "0")}`,
    chunks,
    representedFamilies: input.families.map(({ code, title, masteryStatement, unitCode, questionCodes, sourceRefs }) => ({
      code,
      title,
      masteryStatement,
      unitCode,
      questionCodes: [...questionCodes],
      sourceRefs: [...sourceRefs],
    })),
    representedUnits: input.units.map((unit) => ({ ...unit, sourceRefs: [...unit.sourceRefs] })),
    constraints: [
      "Represent every materially examinable canonical knowledge nucleus.",
      "ATTACH when the uncovered text is another facet of an existing mastery family.",
      "CREATE_SOURCE_FAMILY when the text requires materially additional knowledge to learn and retain.",
      "IGNORE_NONMATERIAL only for headings without knowledge, purely graphical examples, formatting debris or non-evaluable text, with rationale.",
      "A coarse chunk may receive multiple excerpt-scoped decisions so covered and uncovered material can coexist inside one upstream span.",
      "Do not infer from headings alone that one heading equals one unit.",
    ],
  };
}

export function buildSourceCoverageWorkPackets(input: {
  canonicalSource: SemanticSourceSpan[];
  families: ResolvedMasteryFamily[];
  units: ProposedStudyUnit[];
}) {
  const families = baseFamilies(input.families);
  return input.canonicalSource
    .map((span, index) => packetForSpan({ span, index, families, units: input.units }))
    .filter((packet): packet is SourceCoverageWorkPacket => packet !== null);
}

function maxSuffix(codes: string[], marker: "C" | "U") {
  const re = new RegExp(`-${marker}(\\d+)$`);
  return codes.reduce((max, code) => {
    const match = code.match(re);
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, 0);
}

function excerptValid(chunk: SourceCoverageChunk, excerpt?: string | null) {
  const value = clean(excerpt);
  return value == null || normalizeText(chunk.text).includes(normalizeText(value));
}

function validateDecisions(input: {
  packets: SourceCoverageWorkPacket[];
  decisions: SourceCoverageDecision[];
  families: SourceCoverageFamily[];
  units: ProposedStudyUnit[];
}) {
  const issues: SourceCoverageValidationIssue[] = [];
  const chunks = new Map(input.packets.flatMap((packet) => packet.chunks).map((chunk) => [chunk.id, chunk]));
  const familyCodes = new Set(input.families.map((family) => family.code));
  const unitCodes = new Set(input.units.map((unit) => unit.code));
  const provisionalIds = new Set<string>();

  for (const decision of input.decisions) {
    const chunk = chunks.get(decision.chunkId);
    if (!chunk) {
      issues.push({ code: "unknown_chunk", chunkId: decision.chunkId, message: `Unknown source coverage chunk ${decision.chunkId}.` });
      continue;
    }
    if (!excerptValid(chunk, decision.sourceExcerpt)) {
      issues.push({ code: "invalid_excerpt", chunkId: decision.chunkId, message: `Decision excerpt is not contained in ${decision.chunkId}.` });
    }
    if (!decision.rationale.trim()) {
      issues.push({ code: decision.action === "IGNORE_NONMATERIAL" ? "invalid_ignore" : "invalid_source_family", chunkId: decision.chunkId, message: "Source coverage decision requires rationale." });
    }
    if (decision.action === "ATTACH_TO_EXISTING_FAMILY" && !familyCodes.has(decision.existingFamilyCode)) {
      issues.push({ code: "unknown_family", chunkId: decision.chunkId, familyCode: decision.existingFamilyCode, message: `Unknown existing family ${decision.existingFamilyCode}.` });
    }
    if (decision.action === "CREATE_SOURCE_FAMILY") {
      if (provisionalIds.has(decision.provisionalFamilyId)) {
        issues.push({ code: "duplicate_source_family_id", chunkId: decision.chunkId, message: `Duplicate source family id ${decision.provisionalFamilyId}.` });
      }
      provisionalIds.add(decision.provisionalFamilyId);
      if (!decision.provisionalFamilyId.trim() || !decision.title.trim() || !decision.masteryStatement.trim() || !decision.excludedNearbyFamilyReason.trim() || decision.includedFacets.length === 0) {
        issues.push({ code: "invalid_source_family", chunkId: decision.chunkId, message: `Source family ${decision.provisionalFamilyId || "<missing>"} is incomplete.` });
      }
      if (decision.unit.kind === "existing" && !unitCodes.has(decision.unit.unitCode)) {
        issues.push({ code: "unknown_unit", chunkId: decision.chunkId, message: `Unknown existing unit ${decision.unit.unitCode}.` });
      }
      if (decision.unit.kind === "new" && !decision.unit.title.trim()) {
        issues.push({ code: "invalid_source_family", chunkId: decision.chunkId, message: "New source-only unit requires a semantic title." });
      }
    }
  }

  const decided = new Set(input.decisions.map((decision) => decision.chunkId));
  for (const chunkId of chunks.keys()) {
    if (!decided.has(chunkId)) issues.push({ code: "missing_chunk_decision", chunkId, message: `Canonical chunk ${chunkId} has no source coverage decision.` });
  }
  return issues;
}

function applyDecisions(input: {
  job: ContentFactoryJob;
  packets: SourceCoverageWorkPacket[];
  decisions: SourceCoverageDecision[];
  initialFamilies: ResolvedMasteryFamily[];
  initialUnits: ProposedStudyUnit[];
}) {
  const families = baseFamilies(input.initialFamilies);
  const units = input.initialUnits.map((unit) => ({ ...unit, sourceRefs: [...unit.sourceRefs] }));
  const chunks = new Map(input.packets.flatMap((packet) => packet.chunks).map((chunk) => [chunk.id, chunk]));
  const byFamilyCode = new Map(families.map((family) => [family.code, family]));
  const newUnitByTitle = new Map<string, ProposedStudyUnit>();
  let conceptOrdinal = maxSuffix(families.map((family) => family.code), "C");
  let unitOrdinal = maxSuffix(units.map((unit) => unit.code), "U");

  for (const decision of input.decisions) {
    const chunk = chunks.get(decision.chunkId);
    if (!chunk) continue;
    const ref = sourceRefForChunk(chunk);

    if (decision.action === "ATTACH_TO_EXISTING_FAMILY") {
      const family = byFamilyCode.get(decision.existingFamilyCode);
      if (!family) continue;
      if (!family.sourceRefs.some((candidate) => normalizeText(candidate.reference) === normalizeText(ref.reference))) family.sourceRefs.push(ref);
      if (!family.sourceChunkIds.includes(chunk.id)) family.sourceChunkIds.push(chunk.id);
      continue;
    }
    if (decision.action !== "CREATE_SOURCE_FAMILY") continue;

    let unitCode: string;
    if (decision.unit.kind === "existing") {
      unitCode = decision.unit.unitCode;
    } else {
      const key = normalizeText(decision.unit.title);
      let unit = newUnitByTitle.get(key);
      if (!unit) {
        unitOrdinal += 1;
        unit = {
          code: stableUnitCode(input.job.codePrefix, unitOrdinal),
          title: decision.unit.title.trim(),
          position: unitOrdinal,
          sourceRefs: [ref],
          observations: ["Factory.8 source-only unit created by Source Coverage Closure."],
        };
        units.push(unit);
        newUnitByTitle.set(key, unit);
      } else if (!unit.sourceRefs.some((candidate) => normalizeText(candidate.reference) === normalizeText(ref.reference))) {
        unit.sourceRefs.push(ref);
      }
      unitCode = unit.code;
    }

    conceptOrdinal += 1;
    const family: SourceCoverageFamily = {
      provisionalFamilyId: decision.provisionalFamilyId,
      code: stableConceptCode(input.job.codePrefix, conceptOrdinal),
      unitCode,
      position: conceptOrdinal,
      packetId: input.packets.find((packet) => packet.chunks.some((item) => item.id === chunk.id))?.packetId ?? "SOURCE-COVERAGE",
      title: decision.title.trim(),
      masteryStatement: decision.masteryStatement.trim(),
      questionCodes: [],
      sourceRefs: [ref],
      includedFacets: [...decision.includedFacets],
      excludedNearbyFamilyReason: decision.excludedNearbyFamilyReason.trim(),
      confidence: decision.confidence,
      rationale: decision.rationale.trim(),
      origin: "source_only",
      generationRequired: true,
      sourceChunkIds: [chunk.id],
    };
    families.push(family);
    byFamilyCode.set(family.code, family);
  }

  return { families, units };
}

export function validateSourceCoverageClosure(input: {
  run: Pick<SourceCoverageClosureRun, "packets" | "decisions" | "families" | "units">;
  phase: SourceCoverageValidationPhase;
}): SourceCoverageValidationReport {
  const issues = validateDecisions({
    packets: input.run.packets,
    decisions: input.run.decisions,
    families: input.run.families,
    units: input.run.units,
  });
  const sourceOnly = input.run.families.filter((family) => family.origin === "source_only");
  const withoutQuestions = sourceOnly.filter((family) => family.questionCodes.length === 0);
  if (input.phase === "import_ready") {
    for (const family of withoutQuestions) {
      issues.push({ code: "source_only_unmapped", familyCode: family.code, message: `${family.code} is source-only and still has zero primary questions at import-ready validation.` });
    }
  }
  const decided = new Set(input.run.decisions.map((decision) => decision.chunkId));
  const allChunks = input.run.packets.flatMap((packet) => packet.chunks.map((chunk) => chunk.id));
  const uncoveredChunkIds = allChunks.filter((chunkId) => !decided.has(chunkId));
  return {
    valid: issues.length === 0,
    phase: input.phase,
    issues,
    uncoveredChunkIds,
    sourceOnlyFamilies: sourceOnly.length,
    sourceOnlyFamiliesWithoutQuestions: withoutQuestions.length,
  };
}

export function runSourceCoverageClosure(input: {
  job: ContentFactoryJob;
  canonicalSource: SemanticSourceSpan[];
  families: ResolvedMasteryFamily[];
  units: ProposedStudyUnit[];
  resolveSourceCoverage: (packet: SourceCoverageWorkPacket) => SourceCoverageOperationResult;
  approvedStructure?: V4StudyContentPackage;
}): SourceCoverageClosureRun {
  if (input.approvedStructure) {
    const empty: SourceCoverageClosureRun = {
      version: CONTENT_FACTORY_SOURCE_COVERAGE_VERSION,
      mode: "approved_replay",
      packets: [],
      operationCount: 0,
      decisions: [],
      families: baseFamilies(input.families),
      units: input.units,
      ignored: [],
      validation: { valid: true, phase: "pre_generation", issues: [], uncoveredChunkIds: [], sourceOnlyFamilies: 0, sourceOnlyFamiliesWithoutQuestions: 0 },
      approvedStructure: input.approvedStructure,
    };
    return empty;
  }

  const packets = buildSourceCoverageWorkPackets({ canonicalSource: input.canonicalSource, families: input.families, units: input.units });
  const decisions = packets.flatMap((packet) => input.resolveSourceCoverage(packet).decisions);
  const applied = applyDecisions({ job: input.job, packets, decisions, initialFamilies: input.families, initialUnits: input.units });
  const provisional: SourceCoverageClosureRun = {
    version: CONTENT_FACTORY_SOURCE_COVERAGE_VERSION,
    mode: "semantic_resolution",
    packets,
    operationCount: packets.length,
    decisions,
    families: applied.families,
    units: applied.units,
    ignored: decisions.filter((decision): decision is IgnoreNonmaterialDecision => decision.action === "IGNORE_NONMATERIAL"),
    validation: null as never,
    approvedStructure: null,
  };
  provisional.validation = validateSourceCoverageClosure({ run: provisional, phase: "pre_generation" });
  return provisional;
}

/**
 * Applies generation output only when the question was born with the exact stable conceptCode.
 * It also returns the primary mappings that must be materialized with the generated questions.
 */
export function applyGeneratedQuestionsToSourceCoverage(input: {
  run: SourceCoverageClosureRun;
  generated: Array<{ questionCode: string; conceptCode: string }>;
}): { run: SourceCoverageClosureRun; primaryMappings: FactoryQuestionAssignment[] } {
  const families = input.run.families.map((family) => ({ ...family, questionCodes: [...family.questionCodes] }));
  const byCode = new Map(families.map((family) => [family.code, family]));
  const mappings: FactoryQuestionAssignment[] = [];

  for (const generated of input.generated) {
    const family = byCode.get(generated.conceptCode);
    if (!family) throw new Error(`Generated question ${generated.questionCode} references unknown conceptCode ${generated.conceptCode}.`);
    if (family.origin !== "source_only") throw new Error(`Generated source-coverage question ${generated.questionCode} must target a source_only family.`);
    if (!family.questionCodes.includes(generated.questionCode)) family.questionCodes.push(generated.questionCode);
    family.generationRequired = family.questionCodes.length === 0;
    mappings.push({
      questionCode: generated.questionCode,
      primaryConceptCode: family.code,
      rationale: "Factory.8 source coverage generation; conceptCode assigned at birth.",
      confidence: family.confidence,
    });
  }

  const next: SourceCoverageClosureRun = { ...input.run, families };
  next.validation = validateSourceCoverageClosure({ run: next, phase: "pre_generation" });
  return { run: next, primaryMappings: mappings };
}
