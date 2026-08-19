import { DEFAULT_QUESTION_CODE_DIGITS } from "./types";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function positiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer.`);
  return value;
}

export function stableUnitCode(prefix: string, position: number) {
  return `${prefix}-U${String(positiveInteger(position, "position")).padStart(2, "0")}`;
}

export function stableConceptCode(prefix: string, position: number) {
  return `${prefix}-C${String(positiveInteger(position, "position")).padStart(2, "0")}`;
}

export function stableFlashcardCode(prefix: string, position: number) {
  return `${prefix}-F${String(positiveInteger(position, "position")).padStart(2, "0")}`;
}

export function allocateStableQuestionCodes(input: {
  codePrefix: string;
  usedCodes: Iterable<string>;
  count: number;
  digits?: number;
}): string[] {
  const count = Math.max(0, Math.trunc(input.count));
  if (count === 0) return [];
  const digits = input.digits ?? DEFAULT_QUESTION_CODE_DIGITS;
  if (!Number.isInteger(digits) || digits < 1) throw new Error("digits must be a positive integer.");

  const used = new Set([...input.usedCodes].map((code) => code.trim()).filter(Boolean));
  const pattern = new RegExp(`^${escapeRegExp(input.codePrefix)}-(\\d+)$`);
  let cursor = 0;
  for (const code of used) {
    const match = code.match(pattern);
    if (match) cursor = Math.max(cursor, Number.parseInt(match[1], 10));
  }

  const output: string[] = [];
  while (output.length < count) {
    cursor += 1;
    const code = `${input.codePrefix}-${String(cursor).padStart(digits, "0")}`;
    if (used.has(code)) continue;
    used.add(code);
    output.push(code);
  }
  return output;
}
