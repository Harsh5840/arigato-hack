import type {MonitoredRepository, SupplyFinding} from '@/types/monitoring';

/** The server detects the stack and verification plan; repository names grant no capability. */
export function canPrepareRepair(repository?: MonitoredRepository, finding?: SupplyFinding): boolean {
  const capability = repository?.repairCapability;
  return !!repository?.canPush && !!repository.inventorySha && !!capability?.supported
    && (!finding || !!finding.fixedVersion && capability.ecosystems.includes(finding.ecosystem)
      && (!capability.targets || capability.targets.some(target => target.ecosystem === finding.ecosystem && target.packageName === finding.packageName && target.manifestPath === finding.manifestPath)));
}

export function repairUnavailableReason(repository?: MonitoredRepository): string {
  if (!repository?.inventorySha) return 'Scan this repository to detect its stack, tests and GitHub permissions.';
  if (!repository.canPush) return 'This connection can read the code. Branch-write permission is required to prepare a draft PR.';
  return repository.repairCapability?.reason || 'The stack and a supported verification plan must be detected before a fix can run.';
}

export function findingStatus(status: SupplyFinding['status']): string {
  return {detected: 'Fix available', queued: 'Fix queued', 'draft-created': 'Draft PR created', 'needs-owner': 'Needs your attention', dismissed: 'Dismissed'}[status];
}

export function groupRepairFindings(findings: readonly SupplyFinding[]): {key: string; finding: SupplyFinding; advisories: SupplyFinding[]}[] {
  const groups = new Map<string, {key: string; finding: SupplyFinding; advisories: SupplyFinding[]}>();
  for (const finding of findings) {
    const key = JSON.stringify([finding.repositoryId, finding.ecosystem, finding.packageName, finding.installedVersion, finding.fixedVersion, finding.manifestPath, finding.fixedDigest ?? '']);
    const group = groups.get(key);
    if (!group) groups.set(key, {key, finding, advisories: [finding]});
    else {
      group.advisories.push(finding);
      if ((!group.finding.runId && finding.runId) || (!group.finding.runId && finding.status === 'detected')) group.finding = finding;
    }
  }
  return [...groups.values()];
}
