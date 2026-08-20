// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  clusterExistingBankBySourceArticle,
  extractLegalArticleNumbers,
} from "../content-factory";

describe("Content Factory legal source clustering", () => {
  test("extracts one or several article numbers without confusing page numbers", () => {
    expect(extractLegalArticleNumbers("Ley 39/2015, art. 24.1, p. 125")).toEqual([24]);
    expect(extractLegalArticleNumbers("Ley 39/2015, arts. 23 y 32, pp. 124 y 135")).toEqual([23, 32]);
    expect(extractLegalArticleNumbers("Temario_new.pdf, p. 140")).toEqual([]);
  });

  test("uses article families as an additional review signal without assigning a primary concept", () => {
    const clusters = clusterExistingBankBySourceArticle([
      { code: "Q1", sourceReference: "Ley 39/2015, art. 24.1, p. 125" },
      { code: "Q2", sourceReference: "Ley 39/2015, arts. 23 y 32, pp. 124 y 135" },
      { code: "Q3", sourceReference: "Ley 39/2015, art. 32.1, p. 135" },
    ]);
    expect(clusters.map((entry) => [entry.article, entry.questionCodes])).toEqual([
      [23, ["Q2"]],
      [24, ["Q1"]],
      [32, ["Q2", "Q3"]],
    ]);
  });
});
