import type {MonitoredRepository, SupplyFinding} from '@/types/monitoring';

export interface CreatedPullRequest {
  repository: MonitoredRepository;
  url: string;
  number: number;
  draftAtCreation: boolean;
  advisoryCount: number;
  targets: {ecosystem: string; packageName: string; installedVersion: string; fixedVersion: string; manifestPath: string}[];
}

/** Many advisory findings can describe one repaired target and one GitHub PR. */
export function collectCreatedPullRequests(repositories: readonly MonitoredRepository[], findings: readonly SupplyFinding[]): CreatedPullRequest[] {
  const byRepository = new Map(repositories.map(repository => [repository.id, repository]));
  const records = new Map<string, CreatedPullRequest & {advisories: Set<string>; targetKeys: Set<string>}>();
  for (const finding of findings) {
    const repository = byRepository.get(finding.repositoryId);
    const pr = finding.pullRequest;
    if (!repository || !pr || !Number.isSafeInteger(pr.number) || pr.number < 1 ||
      pr.url !== `https://github.com/${repository.owner}/${repository.name}/pull/${pr.number}`) continue;
    const key = `${repository.id}:${pr.number}`;
    let record = records.get(key);
    if (!record) {
      record = {repository, url: pr.url, number: pr.number, draftAtCreation: pr.draft, advisoryCount: 0, targets: [], advisories: new Set(), targetKeys: new Set()};
      records.set(key, record);
    }
    record.advisories.add(finding.advisoryId);
    const targetKey = JSON.stringify([finding.ecosystem, finding.packageName, finding.installedVersion, finding.fixedVersion, finding.manifestPath]);
    if (!record.targetKeys.has(targetKey)) {
      record.targetKeys.add(targetKey);
      record.targets.push({ecosystem: finding.ecosystem, packageName: finding.packageName, installedVersion: finding.installedVersion, fixedVersion: finding.fixedVersion, manifestPath: finding.manifestPath});
    }
  }
  return [...records.values()].map(({advisories, targetKeys: _targetKeys, ...record}) => ({...record, advisoryCount: advisories.size}))
    .sort((left, right) => `${left.repository.owner}/${left.repository.name}`.localeCompare(`${right.repository.owner}/${right.repository.name}`) || right.number - left.number);
}
