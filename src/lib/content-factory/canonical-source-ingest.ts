import type { SemanticSourceSpan } from "./semantic-draft";

export type CanonicalPageText = {
  document: string;
  pageNumber: number;
  text: string;
};

export type CanonicalSpanBuildOptions = {
  document: string;
  codePrefix?: string;
  referencePrefix?: string;
};

const ARTICLE_RE = /^(Artículo|Article)\s+(\d+[A-Za-z]?(?:\s*bis|\s*ter|\s*quater)?)\b(?:[.\s-]+(.*))?$/i;
const STRUCTURE_RE = /^(T[ÍI]TULO|CAP[ÍI]TULO|SECCI[ÓO]N|SUBSECCI[ÓO]N|LIBRO|PARTE|DISPOSICI[ÓO]N)\b.*$/i;

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stableToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "span";
}

function isStructureHeading(line: string) {
  return STRUCTURE_RE.test(line);
}

function parseArticleHeading(line: string) {
  const match = cleanLine(line).match(ARTICLE_RE);
  if (!match) return null;
  const article = `Artículo ${match[2]}`;
  const title = cleanLine(match[3] ?? "");
  return {
    article,
    heading: title ? `${article}. ${title}` : article,
  };
}

type MutableSpan = {
  id: string;
  document: string;
  reference: string;
  heading?: string;
  sectionPath?: string[];
  article?: string | null;
  text: string;
  pageStart: number;
  pageEnd: number;
};

function appendText(span: MutableSpan, text: string, pageNumber: number) {
  const normalized = text.trim();
  if (!normalized) return;
  span.text = span.text ? `${span.text}\n${normalized}` : normalized;
  span.pageEnd = Math.max(span.pageEnd, pageNumber);
}

function referenceFor(input: {
  options: CanonicalSpanBuildOptions;
  heading?: string;
  article?: string | null;
  pageStart: number;
  pageEnd: number;
}) {
  const prefix = input.options.referencePrefix?.trim() || input.options.document;
  const anchor = input.heading?.trim() || input.article?.trim() || `p. ${input.pageStart}`;
  const pages = input.pageStart === input.pageEnd
    ? `p. ${input.pageStart}`
    : `pp. ${input.pageStart}-${input.pageEnd}`;
  return `${prefix} · ${anchor} · ${pages}`;
}

/**
 * Converts already extracted canonical page text into semantic source spans.
 *
 * This layer is deliberately independent from any PDF library/CLI. PDF bytes,
 * OCR output or other structured canonical sources may all feed the same
 * CanonicalPageText[] contract before Semantic Builder runs.
 */
export function canonicalPageTextToSemanticSourceSpans(
  pages: CanonicalPageText[],
  options: CanonicalSpanBuildOptions,
): SemanticSourceSpan[] {
  const ordered = pages
    .filter((page) => page.document === options.document)
    .filter((page) => Number.isInteger(page.pageNumber) && page.pageNumber > 0)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  const spans: MutableSpan[] = [];
  const sectionPath: string[] = [];
  let current: MutableSpan | null = null;
  let sequence = 0;

  const openSpan = (input: {
    pageNumber: number;
    heading?: string;
    article?: string | null;
    text?: string;
  }) => {
    sequence += 1;
    const heading = input.heading?.trim();
    const article = input.article?.trim() || null;
    const idBase = article || heading || `page-${input.pageNumber}`;
    current = {
      id: `${options.codePrefix ?? stableToken(options.document)}-SRC-${String(sequence).padStart(3, "0")}-${stableToken(idBase)}`,
      document: options.document,
      reference: "",
      heading,
      sectionPath: [...sectionPath],
      article,
      text: input.text?.trim() ?? "",
      pageStart: input.pageNumber,
      pageEnd: input.pageNumber,
    };
    spans.push(current);
  };

  for (const page of ordered) {
    const lines = page.text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map(cleanLine)
      .filter(Boolean);

    const preamble: string[] = [];
    for (const line of lines) {
      const structureHeading = isStructureHeading(line);
      const articleHeading = parseArticleHeading(line);

      if (structureHeading) {
        if (sectionPath[sectionPath.length - 1] !== line) {
          const depth = /^(LIBRO|PARTE|T[ÍI]TULO)/i.test(line)
            ? 0
            : /^CAP[ÍI]TULO/i.test(line)
              ? 1
              : /^SECCI[ÓO]N/i.test(line)
                ? 2
                : 3;
          sectionPath.splice(depth);
          sectionPath[depth] = line;
        }
        if (!current) preamble.push(line);
        continue;
      }

      if (articleHeading) {
        openSpan({
          pageNumber: page.pageNumber,
          heading: articleHeading.heading,
          article: articleHeading.article,
          text: line,
        });
        continue;
      }

      if (current) appendText(current, line, page.pageNumber);
      else preamble.push(line);
    }

    if (!current && preamble.length > 0) {
      openSpan({
        pageNumber: page.pageNumber,
        heading: sectionPath[sectionPath.length - 1],
        text: preamble.join("\n"),
      });
    }
  }

  return spans
    .filter((span) => span.text.trim().length > 0)
    .map((span) => ({
      ...span,
      reference: referenceFor({
        options,
        heading: span.heading,
        article: span.article,
        pageStart: span.pageStart,
        pageEnd: span.pageEnd,
      }),
    }));
}

export function canonicalSourceHasUsableText(spans: SemanticSourceSpan[]) {
  return spans.length > 0 && spans.every((span) => (span.text ?? "").trim().length > 0);
}
