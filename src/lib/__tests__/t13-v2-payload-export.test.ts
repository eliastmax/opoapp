// @ts-expect-error bun:test is provided by the Bun test runtime
import { expect, test } from "bun:test";
import { topic13V2QuestionCandidates } from "../v4-pilots/topic-13-v2-question-candidates";

test("exports the approved Topic 13 V2 payload for controlled import", async () => {
  expect(topic13V2QuestionCandidates).toHaveLength(45);
  const serialized = JSON.stringify(topic13V2QuestionCandidates);
  await Bun.write("t13-v2-payload.json", serialized);
  expect(serialized.length).toBe(78452);
});
