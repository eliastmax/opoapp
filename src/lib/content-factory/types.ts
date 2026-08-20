import type { ParsedRow } from "../csv-parser";
import type {
  V4ConceptPackage,
  V4FlashcardPackage,
  V4SourceRef,
  V4StudyUnitPackage,
} from "../v4-content-package";
import type { V4SourceCapacity } from "../v4-source-capacity";

export const CONTENT_FACTORY_VERSION = "1.0" as const;
export const DEFAULT_QUESTION_CODE_DIGITS = 4;

export type ContentFactoryMode = "existing_bank" | "greenfield";
export type FactoryGateStatus = "pending" | "approved" | "rejected";
export type FactoryProposalConfidence = "low" | "medium" | "high";

export type FactoryEditorialGate = {
  status: FactoryGateStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string[];
};

export type FactoryGates = {
  conceptMap: FactoryEditorialGate;
  editorialQuality: FactoryEditorialGate;
};

export type FactoryCanonicalSourcePolicy = {
  canonicalOnly: true;
  document: string;
  externalVerificationAllowed?: false;
};

export type FactoryQuestionMetadata = {
  code: string;
  active?: boolean;
  stem?: string;
  apartado?: string | null;
  subapartado?: string | null;
  conceptLabel?: string | null;
  learningObjective?: string | null;
  perspective?: string | null;
  trapType?: string | null;
  sourceReference?: string | null;
  documentReference?: string | null;
  pageStart?: number | null;
  pageEnd?: number | null;
};

export type ContentFactoryJob = {
  version: typeof CONTENT_FACTORY_VERSION;
  oppositionCode: string;
  topicNumber: number;
  topicTitle?: string;
  mode: ContentFactoryMode;
  codePrefix: string;
  coverageThreshold?: number;
  sourceRevision?: string | null;
  source: V4SourceRef[];
  references?: V4SourceRef[];
  sourcePolicy?: FactoryCanonicalSourcePolicy;
  existingQuestions?: FactoryQuestionMetadata[];
};

export type FactorySourceCapacity =
  | {
      status: "source_review_required";
      reason: string;
    }
  | V4SourceCapacity;

export type ProposedStudyUnit = Pick<V4StudyUnitPackage, "code" | "title" | "position"> & {
  sourceSubtopicName?: string | null;
  sourceRefs: V4SourceRef[];
  sourceReviewRequired?: boolean;
  observations?: string[];
};

export type ProposedConcept = Omit<V4ConceptPackage, "sourceCapacity"> & {
  sourceRefs?: V4SourceRef[];
  confidence?: FactoryProposalConfidence;
  /** @deprecated Prefer sourceCapacity.status === "source_review_required". */
  sourceReviewRequired?: boolean;
  sourceCapacity?: FactorySourceCapacity;
  overlapCandidates?: string[];
  observations?: string[];
};

export type FactoryQuestionAssignment = {
  questionCode: string;
  primaryConceptCode: string;
  secondaryConceptCodes?: string[];
  rationale?: string;
  confidence?: FactoryProposalConfidence;
  sourceReviewRequired?: boolean;
};

export const FACTORY_EVIDENCE_DIMENSIONS = [
  "rule", "exception", "subject", "effect", "deadline", "dies_a_quo",
  "interruption", "requirement", "competence", "literal", "contrast", "mini_case",
] as const;

export type FactoryEvidenceDimension = (typeof FACTORY_EVIDENCE_DIMENSIONS)[number];

export type FactoryQuestionGenerationSlot = {
  questionCode: string;
  conceptCode: string;
  dimension: FactoryEvidenceDimension;
  reason: "coverage_gap" | "greenfield_baseline";
};

export type V2QuestionRow = Record<string, string | number>;

export type FactoryGeneratedQuestionCandidate = {
  conceptCode: string;
  dimensions: FactoryEvidenceDimension[];
  v2: V2QuestionRow;
};

export type FactoryStudyContent = {
  units: V4StudyUnitPackage[];
  concepts: ProposedConcept[];
  flashcards: V4FlashcardPackage[];
};

export type ExistingBankCluster = {
  key: string;
  apartado: string | null;
  subapartado: string | null;
  conceptLabels: string[];
  learningObjectives: string[];
  questionCodes: string[];
  sourceReferences: string[];
};

export type ExistingBankSourceCluster = {
  article: number;
  questionCodes: string[];
  sourceReferences: string[];
};

export function questionMetadataFromParsedRow(row: ParsedRow): FactoryQuestionMetadata {
  return {
    code: row.codigo ?? `row-${row.rowNumber}`,
    active: true,
    stem: row.pregunta,
    apartado: row.apartado,
    subapartado: row.subapartado || null,
    conceptLabel: row.concepto,
    learningObjective: row.objetivo_aprendizaje,
    perspective: row.perspectiva,
    trapType: row.tipo_trampa,
    sourceReference: row.referencia_fuente || null,
    documentReference: row.documento_referencia,
    pageStart: row.pagina_inicio,
    pageEnd: row.pagina_fin,
  };
}
