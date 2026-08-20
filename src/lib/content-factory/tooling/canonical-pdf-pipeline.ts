import { canonicalPageTextToSemanticSourceSpans, type CanonicalPageText } from "../canonical-source-ingest";
import { buildSemanticTopicDraft, type BuildSemanticTopicDraftInput, type SemanticTopicDraft } from "../semantic-draft";
import { extractCanonicalPageTextFromPdf, type PdfTextExtractionOptions } from "./pdf-source-ingest";

export type CanonicalPageSemanticInput = Omit<BuildSemanticTopicDraftInput, "canonicalSource"> & {
  pages: CanonicalPageText[];
};

export function buildSemanticTopicDraftFromCanonicalPages(
  input: CanonicalPageSemanticInput,
): SemanticTopicDraft {
  const document = input.policy?.document ?? input.job.sourcePolicy?.document ?? "";
  if (!document.trim()) throw new Error("Canonical page pipeline requires an explicit canonical document.");
  const canonicalSource = canonicalPageTextToSemanticSourceSpans(input.pages, {
    document,
    codePrefix: input.job.codePrefix,
    referencePrefix: input.job.topicTitle
      ? `${document} · Tema ${input.job.topicNumber}`
      : document,
  });
  return buildSemanticTopicDraft({
    ...input,
    canonicalSource,
  });
}

export type CanonicalPdfSemanticInput = Omit<BuildSemanticTopicDraftInput, "canonicalSource"> & {
  pdf: Omit<PdfTextExtractionOptions, "document">;
};

export async function buildSemanticTopicDraftFromPdf(
  input: CanonicalPdfSemanticInput,
): Promise<{
  pages: CanonicalPageText[];
  canonicalSource: ReturnType<typeof canonicalPageTextToSemanticSourceSpans>;
  semanticDraft: SemanticTopicDraft;
}> {
  const document = input.policy?.document ?? input.job.sourcePolicy?.document ?? "";
  if (!document.trim()) throw new Error("Canonical PDF pipeline requires an explicit canonical document.");
  const pages = await extractCanonicalPageTextFromPdf({
    ...input.pdf,
    document,
  });
  const canonicalSource = canonicalPageTextToSemanticSourceSpans(pages, {
    document,
    codePrefix: input.job.codePrefix,
    referencePrefix: `${document} · Tema ${input.job.topicNumber}`,
  });
  const semanticDraft = buildSemanticTopicDraft({
    ...input,
    canonicalSource,
  });
  return { pages, canonicalSource, semanticDraft };
}
