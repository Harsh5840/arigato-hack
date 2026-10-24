import test from 'node:test';
import assert from 'node:assert/strict';
import { canPrepareDraft, verificationFor } from '../src/lib/workflow.ts';
test('all independent evidence gates must pass before a draft is eligible', () => {
  const valid = verificationFor(false);
  assert.equal(canPrepareDraft(valid), true);
  for (const key of Object.keys(valid) as (keyof typeof valid)[]) assert.equal(canPrepareDraft({ ...valid, [key]: false }), false, key);
});
test('security replay passing cannot override a benign regression failure', () => {
  const result = verificationFor(true);
  assert.equal(result.patchedPassed, true);
  assert.equal(canPrepareDraft(result), false);
});
