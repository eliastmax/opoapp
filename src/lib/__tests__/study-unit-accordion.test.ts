// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { toggleExclusiveUnit, toggleSection } from "../study-unit-accordion";

describe("study unit accordion", () => {
  test("opens and closes the unit section", () => {
    expect(toggleSection(false)).toBe(true);
    expect(toggleSection(true)).toBe(false);
  });

  test("keeps only one unit open at a time", () => {
    expect(toggleExclusiveUnit(null, "unit-1")).toBe("unit-1");
    expect(toggleExclusiveUnit("unit-1", "unit-2")).toBe("unit-2");
    expect(toggleExclusiveUnit("unit-2", "unit-2")).toBeNull();
  });
});
