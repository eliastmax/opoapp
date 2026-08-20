import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CanonicalPageText } from "../canonical-source-ingest";

const execFileAsync = promisify(execFile);

export type PdfTextExtractionOptions = {
  pdfPath: string;
  document: string;
  pageStart?: number;
  pageEnd?: number;
  executable?: string;
};

export function buildPdftotextArgs(input: PdfTextExtractionOptions) {
  const args: string[] = ["-layout"];
  if (input.pageStart != null) args.push("-f", String(input.pageStart));
  if (input.pageEnd != null) args.push("-l", String(input.pageEnd));
  args.push(input.pdfPath, "-");
  return args;
}

/**
 * Parses Poppler pdftotext stdout into the core CanonicalPageText[] contract.
 * The form-feed page separator is emitted by pdftotext and preserves page order.
 */
export function pdftotextOutputToCanonicalPages(input: {
  stdout: string;
  document: string;
  firstPage?: number;
}): CanonicalPageText[] {
  const firstPage = input.firstPage ?? 1;
  const chunks = input.stdout.replace(/\r\n?/g, "\n").split("\f");
  while (chunks.length > 0 && chunks[chunks.length - 1].trim().length === 0) chunks.pop();
  return chunks.map((text, index) => ({
    document: input.document,
    pageNumber: firstPage + index,
    text: text.trim(),
  }));
}

/**
 * Offline/local PDF text adapter for Content Factory tooling.
 *
 * Uses the local Poppler `pdftotext` executable. It never performs network IO,
 * web lookup or OCR. Scanned/image-only PDFs therefore fail closed with empty
 * page text and must be handled explicitly by source governance.
 */
export async function extractCanonicalPageTextFromPdf(
  input: PdfTextExtractionOptions,
): Promise<CanonicalPageText[]> {
  const executable = input.executable ?? "pdftotext";
  let stdout: string;
  try {
    const result = await execFileAsync(executable, buildPdftotextArgs(input), {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Canonical PDF extraction failed with ${executable}: ${message}`);
  }

  const pages = pdftotextOutputToCanonicalPages({
    stdout,
    document: input.document,
    firstPage: input.pageStart ?? 1,
  });
  if (pages.length === 0 || pages.every((page) => page.text.trim().length === 0)) {
    throw new Error(
      `Canonical PDF ${input.document} produced no usable text. OCR is not performed automatically.`,
    );
  }
  return pages;
}
