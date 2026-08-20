import { mkdir } from "node:fs/promises";
import { topic18Gate21QuestionCandidates } from "../src/lib/content-factory/consumers/topic-18-gap-questions-gate21";
import { topic18Gate2Package } from "../src/lib/content-factory/consumers/topic-18-v4-content";
import { validateV4StudyContentPackage } from "../src/lib/v4-content-package";

const questions = topic18Gate21QuestionCandidates.map((candidate) => candidate.v2);
const validation = validateV4StudyContentPackage(topic18Gate2Package);

if (questions.length !== 20) throw new Error(`Expected 20 questions, got ${questions.length}`);
if (!validation.valid) throw new Error(`V4 package invalid: ${validation.errors.join(" | ")}`);
if (validation.coverage.underCoveredConceptIds.length !== 0) {
  throw new Error(`Actionable V4 coverage gaps remain: ${validation.coverage.underCoveredConceptIds.join(", ")}`);
}

await mkdir("artifacts", { recursive: true });
await Bun.write("artifacts/t18-questions.json", JSON.stringify(questions, null, 2));
await Bun.write("artifacts/t18-package.json", JSON.stringify(topic18Gate2Package, null, 2));
await Bun.write(
  "artifacts/t18-manifest.json",
  JSON.stringify(
    {
      questions: questions.length,
      answerDistribution: Object.fromEntries(
        ["A", "B", "C", "D"].map((letter) => [
          letter,
          questions.filter((question) => question.respuesta_correcta === letter).length,
        ]),
      ),
      units: topic18Gate2Package.units.length,
      concepts: topic18Gate2Package.concepts.length,
      questionMappings: topic18Gate2Package.questionMappings.length,
      flashcards: topic18Gate2Package.flashcards.length,
      actionableCoverageGaps: validation.coverage.underCoveredConceptIds,
      nominalUnderCoveredConcepts: validation.coverage.nominalUnderCoveredConceptIds,
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({
  questions: questions.length,
  units: topic18Gate2Package.units.length,
  concepts: topic18Gate2Package.concepts.length,
  questionMappings: topic18Gate2Package.questionMappings.length,
  flashcards: topic18Gate2Package.flashcards.length,
  actionableCoverageGaps: validation.coverage.underCoveredConceptIds.length,
  nominalUnderCoveredConcepts: validation.coverage.nominalUnderCoveredConceptIds,
}));
