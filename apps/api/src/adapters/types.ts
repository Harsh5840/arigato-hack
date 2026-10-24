export interface AdvisorySource {
  url: string;
  title: string;
  language: 'ja' | 'en';
  retrievedAt: string;
  publishedAt?: string;
  sha256: string;
}

export interface Advisory {
  id: string;
  titleEn: string;
  titleJa: string;
  sourceMode: 'live' | 'cached';
  sources: AdvisorySource[];
  summary: string;
  body: string;
  fixedVersion: '8.3.36';
  image: 'php:8.3.36-cli-bookworm@sha256:cdb77e306d6bb99db40e513fbe036ecc6c53b575cbcb7e581387845fef26d755';
  cves: string[];
  ownerTasks: string[];
}

export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Analysis {
  summaryEn: string;
  summaryJa: string;
  affected: boolean;
  confidence: 'high' | 'medium' | 'low';
  usage: ModelUsage;
  model: string;
}

export interface Repair {
  files: { path: string; content: string }[];
  summaryEn: string;
  summaryJa: string;
  rollbackNotes: string[];
  ownerTasks: string[];
  usage: ModelUsage;
  model: string;
}

export interface Review {
  decision: 'approve' | 'request_changes';
  summaryEn: string;
  summaryJa: string;
  concerns: string[];
  ownerTasks: string[];
  usage: ModelUsage;
  model: string;
}

export interface Baseline {
  sha: string;
  treeSha: string;
  files: Record<string, string>;
  verifierSha256: string;
}

export interface EvidenceCheck {
  id: string;
  label: string;
  status: 'passed' | 'failed' | 'not-run';
  detail: string;
}

export interface Evidence {
  ci: { id: number; url: string; status: string; conclusion: string | null };
  checks: EvidenceCheck[];
  runtime?: Record<string, unknown>;
  businessLog?: string;
  policy?: Record<string, unknown>;
  builtImageId?: string;
  artifactSha256?: string;
  baseSha: string;
  candidateSha: string;
  verifierSha256: string;
  rawFiles: Record<string, string>;
}

export interface VerificationProgress {
  status: string;
  message: string;
  ciUrl?: string;
  steps?: { name: string; status: string; conclusion: string | null }[];
}

export const targetRepository = 'Harsh5840/arigato-php-demo';
export const allowedPaths = ['Dockerfile', 'composer.json', 'config/security.ini'] as const;
export const verifierPaths = [
  'verification/policy.mjs',
  'verification/policy.test.mjs',
  'verification/business.php',
  'verification/runtime-probe.php',
  'verification/ci-candidate.mjs',
] as const;
export const fixedImage: Advisory['image'] = 'php:8.3.36-cli-bookworm@sha256:cdb77e306d6bb99db40e513fbe036ecc6c53b575cbcb7e581387845fef26d755';
