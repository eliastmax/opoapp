// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  evaluateFactoryPipelineState,
  generationAllowed,
  importReadyAllowed,
  type FactoryGates,
} from "../content-factory";

function gates(conceptMap: FactoryGates["conceptMap"]["status"], editorialQuality: FactoryGates["editorialQuality"]["status"]): FactoryGates {
  return {
    conceptMap: { status: conceptMap },
    editorialQuality: { status: editorialQuality },
  };
}

describe("Content Factory pipeline readiness semantics", () => {
  test("keeps a pending draft structurally valid while generation and import remain blocked", () => {
    const state = evaluateFactoryPipelineState(gates("pending", "pending"));
    expect(state.structural.valid).toBe(true);
    expect(state.structural.errors).toEqual([]);
    expect(state.generation.allowed).toBe(false);
    expect(state.generation.blockers.map((entry) => entry.code)).toEqual(["gate_1_pending"]);
    expect(state.importReadiness.ready).toBe(false);
    expect(state.importReadiness.blockers.map((entry) => entry.code)).toEqual(["gate_1_pending", "gate_2_pending"]);
  });

  test("Gate 1 approved plus Gate 2 pending is a legitimate generation state, not an invalid draft", () => {
    const current = gates("approved", "pending");
    const state = evaluateFactoryPipelineState(current);
    expect(state.structural.valid).toBe(true);
    expect(state.generation.allowed).toBe(true);
    expect(state.generation.blockers).toEqual([]);
    expect(state.importReadiness.ready).toBe(false);
    expect(state.importReadiness.blockers.map((entry) => entry.code)).toEqual(["gate_2_pending"]);
    expect(generationAllowed(current)).toBe(true);
    expect(importReadyAllowed(current)).toBe(false);
  });

  test("only both approved gates remove the editorial import blockers", () => {
    const current = gates("approved", "approved");
    const state = evaluateFactoryPipelineState(current);
    expect(state.structural.valid).toBe(true);
    expect(state.generation.allowed).toBe(true);
    expect(state.importReadiness.ready).toBe(true);
    expect(state.importReadiness.blockers).toEqual([]);
    expect(importReadyAllowed(current)).toBe(true);
  });

  test("rejected gates are legitimate workflow states but block the corresponding transition", () => {
    const state = evaluateFactoryPipelineState(gates("rejected", "rejected"));
    expect(state.structural.valid).toBe(true);
    expect(state.generation.allowed).toBe(false);
    expect(state.importReadiness.ready).toBe(false);
    expect(state.generation.blockers.map((entry) => entry.code)).toEqual(["gate_1_rejected"]);
    expect(state.importReadiness.blockers.map((entry) => entry.code)).toEqual(["gate_1_rejected", "gate_2_rejected"]);
  });
});
