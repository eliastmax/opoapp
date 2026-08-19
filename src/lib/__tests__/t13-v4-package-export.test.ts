// @ts-expect-error bun:test is provided by the Bun test runtime
import { expect, test } from "bun:test";
import { topic13EstatutoMarcoMaterializedPackage } from "../v4-pilots/topic-13-estatuto-marco-materialized";

test("exports the validated Topic 13 V4 package for controlled import", () => {
  const serialized = JSON.stringify(topic13EstatutoMarcoMaterializedPackage);
  const chunkSize = 1500;
  expect(topic13EstatutoMarcoMaterializedPackage.units).toHaveLength(18);
  expect(topic13EstatutoMarcoMaterializedPackage.concepts).toHaveLength(34);
  expect(topic13EstatutoMarcoMaterializedPackage.questionMappings).toHaveLength(144);
  expect(topic13EstatutoMarcoMaterializedPackage.flashcards).toHaveLength(68);
  for (let offset = 0, part = 0; offset < serialized.length; offset += chunkSize, part += 1) {
    console.log(`T13_V4_PACKAGE|${String(part).padStart(3, "0")}|${serialized.slice(offset, offset + chunkSize)}`);
  }
  console.log(`T13_V4_PACKAGE_END|${serialized.length}`);
});
