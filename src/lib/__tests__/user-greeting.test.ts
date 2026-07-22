// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { displayName } from "../user-greeting";

describe("personalized greeting", () => {
  it("prefers the saved profile name", () => {
    expect(
      displayName({ profileName: "  María  ", metadataName: "Otro", email: "maria@example.com" }),
    ).toBe("María");
  });

  it("falls back to sign-up metadata and then email", () => {
    expect(displayName({ metadataName: "Elías", email: "alias@example.com" })).toBe("Elías");
    expect(displayName({ email: "opositora@example.com" })).toBe("opositora");
  });

  it("keeps the greeting neutral when no name is available", () => {
    expect(displayName({})).toBe("estudiante");
  });
});
