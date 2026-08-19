import type { V4StudyContentPackage } from "../v4-content-package";
import { topic13ReviewedCoverageGapQuestions } from "./topic-13-coverage-gap-questions-reviewed";
import { topic13EstatutoMarcoPackage } from "./topic-13-estatuto-marco";

const approvedNewPrimaryMappings = topic13ReviewedCoverageGapQuestions.map((entry) => ({
  questionCode: entry.questionCode,
  primaryConceptCode: entry.conceptCode,
}));

/**
 * Final Topic 13 package after the approved V2 questions were materialized in the normal bank.
 * The source package keeps the 99-original-question audit intact; this is the canonical package
 * for the production V4 import and adds exactly one approved primary mapping for each new row.
 */
export const topic13EstatutoMarcoMaterializedPackage = {
  ...topic13EstatutoMarcoPackage,
  questionMappings: [
    ...topic13EstatutoMarcoPackage.questionMappings,
    ...approvedNewPrimaryMappings,
  ],
} satisfies V4StudyContentPackage;
