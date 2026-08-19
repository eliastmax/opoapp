// @ts-expect-error bun:test is provided by the Bun test runtime
import { expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { topic13EstatutoMarcoMaterializedPackage } from "../v4-pilots/topic-13-estatuto-marco-materialized";

test("exports the validated materialized Topic 13 V4 package", async () => {
  expect(topic13EstatutoMarcoMaterializedPackage.units).toHaveLength(18);
  expect(topic13EstatutoMarcoMaterializedPackage.concepts).toHaveLength(34);
  expect(topic13EstatutoMarcoMaterializedPackage.questionMappings).toHaveLength(144);
  expect(topic13EstatutoMarcoMaterializedPackage.flashcards).toHaveLength(68);
  await writeFile(
    "t13-v4-package.json",
    JSON.stringify(topic13EstatutoMarcoMaterializedPackage),
    "utf8",
  );
});
