// @ts-expect-error bun:test is provided by the Bun test runtime
import { expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { topic13EstatutoMarcoMaterializedPackage } from "../v4-pilots/topic-13-estatuto-marco-materialized";

test("exports the validated Topic 13 V4 package for controlled import", () => {
  const serialized = JSON.stringify(topic13EstatutoMarcoMaterializedPackage);
  expect(topic13EstatutoMarcoMaterializedPackage.units).toHaveLength(18);
  expect(topic13EstatutoMarcoMaterializedPackage.concepts).toHaveLength(34);
  expect(topic13EstatutoMarcoMaterializedPackage.questionMappings).toHaveLength(144);
  expect(topic13EstatutoMarcoMaterializedPackage.flashcards).toHaveLength(68);
  writeFileSync("t13-v4-package.json", serialized, "utf8");
  console.log(`T13_V4_PACKAGE_END|${serialized.length}`);
});
