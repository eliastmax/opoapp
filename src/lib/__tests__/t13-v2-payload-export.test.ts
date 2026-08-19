// @ts-expect-error bun:test is provided by the Bun test runtime
import { expect, test } from "bun:test";
import { topic13V2QuestionCandidates } from "../v4-pilots/topic-13-v2-question-candidates";

test("exports the approved Topic 13 V2 payload in deterministic chunks", () => {
  expect(topic13V2QuestionCandidates).toHaveLength(45);
  const serialized = JSON.stringify(topic13V2QuestionCandidates);
  const chunkSize = 1500;
  for (let offset = 0, part = 0; offset < serialized.length; offset += chunkSize, part += 1) {
    console.log(`T13_V2_PAYLOAD|${String(part).padStart(3, "0")}|${serialized.slice(offset, offset + chunkSize)}`);
  }
  console.log(`T13_V2_PAYLOAD_END|${serialized.length}`);
});
