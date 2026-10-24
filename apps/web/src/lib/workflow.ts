import type { Verification } from '../types/security.ts';
export function canPrepareDraft(result: Verification): boolean {
  return result.baselineFailed && result.patchedPassed && result.regressionPassed && result.testHashMatches && result.commitMatches;
}
export function verificationFor(failedRegression: boolean): Verification {
  return { baselineFailed: true, patchedPassed: true, regressionPassed: !failedRegression, testHashMatches: true, commitMatches: true };
}
