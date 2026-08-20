// @ts-expect-error bun:test is provided by the Bun test runtime
import { expect, test } from "bun:test";
import { topic20ProductionPlan } from "../content-factory/consumers/topic-20-run2";

test("Topic 20 production export payloads", () => {
  expect(topic20ProductionPlan.v2QuestionsForImport).toHaveLength(6);
  expect(topic20ProductionPlan.v4Package?.questionMappings).toHaveLength(226);
  console.log("TOPIC20_PRODUCTION_V2_JSON=" + JSON.stringify(topic20ProductionPlan.v2QuestionsForImport));
  console.log("TOPIC20_PRODUCTION_V4_JSON=" + JSON.stringify(topic20ProductionPlan.v4Package));
});
