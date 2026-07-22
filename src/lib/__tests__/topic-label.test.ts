// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { topicLabel } from "../topic-label";

describe("topic label", () => {
  it("always displays the structured topic number", () => {
    expect(topicLabel(14, "Clasificación del personal estatutario")).toBe(
      "Tema 14. Clasificación del personal estatutario",
    );
  });

  it("removes a duplicated or incorrect number written in the name", () => {
    expect(topicLabel(20, "Tema 19. Régimen jurídico del sector público")).toBe(
      "Tema 20. Régimen jurídico del sector público",
    );
    expect(topicLabel(13, "TEMA 13: Estatuto Marco")).toBe("Tema 13. Estatuto Marco");
  });

  it("still produces a useful label when the stored name is empty", () => {
    expect(topicLabel(7, "  ")).toBe("Tema 7");
  });
});
