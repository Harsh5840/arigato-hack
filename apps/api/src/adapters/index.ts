export * from './types.js';
export { fetchAdvisory } from './advisory.js';
export { analyzeAdvisory, proposeRepair, reviewRepair } from './groq.js';
export { computeVerifierDigest, readBaseline, ensureCandidateBranch, dispatchVerification, waitForVerification, ensureDraftPullRequest } from './github.js';

import { configuredModels, verifyGroqModels } from './groq.js';
import { getGitHubCredential } from './github.js';

export async function getProviderStatus(signal?: AbortSignal): Promise<{ groqConfigured: boolean; githubConfigured: boolean; models: { supply: string; fixer: string; reviewer: string } }> {
  const groqConfigured = Boolean(process.env.GROQ_API_KEY?.trim());
  const models = groqConfigured ? await verifyGroqModels(signal) : configuredModels();
  return { groqConfigured, githubConfigured: Boolean(await getGitHubCredential()), models };
}
