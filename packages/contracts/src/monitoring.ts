export type Ecosystem = 'PyPI' | 'npm' | 'Packagist' | 'Docker';
export interface Dependency { ecosystem: Ecosystem; name: string; version: string; manifestPath: string; direct: boolean; imageRef?: string; digest?: string }
export interface RepairCapability { supported: boolean; reason: string; ecosystems: string[]; testCommands: string[]; stack: string[]; runner: 'central-actions' | 'repository-actions'; testsDetected: boolean; targets?: {ecosystem: string; packageName: string; manifestPath: string}[] }
export interface MonitoredRepository {
  id: string; owner: string; name: string; url: string; defaultBranch: string;
  enabled: boolean; autoRemediate: boolean; profile: 'monitor-only' | 'generic' | 'php-runtime-demo' | 'python-requests-demo';
  createdAt: string; updatedAt: string; lastCheckedAt?: string; nextCheckAt?: string; lastError?: string;
  inventory: Dependency[]; inventorySha?: string; canPush: boolean;
  repairCapability?: RepairCapability;
  scanStatus?: 'idle' | 'queued' | 'scanning' | 'error'; scanRequestedAt?: string;
}
export interface AdvisoryLead { id: string; title: string; url: string; source: string; publishedAt?: string; retrievedAt: string; trust: 'unconfirmed' | 'corroborated'; aliases: string[]; summary: string }
export interface SupplyFinding {
  id: string; repositoryId: string; advisoryId: string; aliases: string[];
  ecosystem: Ecosystem; packageName: string; installedVersion: string; fixedVersion: string;
  manifestPath: string; summary: string; references: { title: string; url: string }[];
  imageRef?: string; fixedImageRef?: string; fixedDigest?: string;
  affectedRanges?: { type: string; events: Record<string, string>[] }[];
  detectedAt: string; status: 'detected' | 'queued' | 'draft-created' | 'needs-owner' | 'dismissed'; runId?: string;
}
export interface MonitoringSnapshot {
  enabled: boolean; intervalSeconds: number; workerLastSeenAt?: string;
  lastCycleAt?: string; nextCycleAt?: string; lastError?: string;
  sources: { id: string; name: string; kind: 'advisory' | 'forum'; status: 'idle' | 'ok' | 'error'; checkedAt?: string; error?: string }[];
  leads: AdvisoryLead[]; findings: SupplyFinding[];
  supplyTriage?: { checkedAt: string; model: string; summary: string; securityLeadIds: string[]; usage: { promptTokens: number; completionTokens: number; totalTokens: number } };
  scoutError?: string;
}
export interface PackageTarget {
  repositoryId: string; findingId: string; advisoryId: string; ecosystem: Ecosystem;
  packageName: string; installedVersion: string; fixedVersion: string; manifestPath: string;
  imageRef?: string; fixedImageRef?: string; fixedDigest?: string;
  repairPolicyVersion?: string;
}
