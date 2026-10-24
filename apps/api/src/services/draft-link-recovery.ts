import {lstatSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Run} from '../../../../packages/contracts/src/live.js';
import type {MonitoringStore} from '../db/monitoring.js';

/** Restore PR links for findings whose database run history was cleared earlier. */
export function recoverDraftLinks(monitor: MonitoringStore, projectRoot: string): number {
  const directory = resolve(projectRoot, 'output/live-runs');
  let folders;
  try { folders = readdirSync(directory, {withFileTypes: true}); }
  catch { return 0; }
  const exported: Run[] = [];
  for (const folder of folders.filter(item => item.isDirectory() && /^[0-9a-f-]{36}$/i.test(item.name)).slice(0, 500)) {
    const path = resolve(directory, folder.name, 'run.json');
    try {
      const file = lstatSync(path);
      if (!file.isFile() || file.size > 2_000_000) continue;
      const run = (JSON.parse(readFileSync(path, 'utf8')) as {run?: Run}).run;
      if (run?.target && run.pullRequest && run.repo) exported.push(run);
    } catch { /* A missing or invalid archived export is not evidence. */ }
  }
  exported.sort((left, right) => (Date.parse(right.updatedAt) || 0) - (Date.parse(left.updatedAt) || 0));
  let restored = 0;
  for (const run of exported) {
    const target = run.target!, pr = run.pullRequest!;
    const repo = monitor.repository(target.repositoryId);
    if (!repo || repo.owner !== run.repo.owner || repo.name !== run.repo.name ||
      !Number.isSafeInteger(pr.number) || pr.number < 1 || typeof pr.draft !== 'boolean' ||
      pr.url !== `https://github.com/${repo.owner}/${repo.name}/pull/${pr.number}`) continue;
    for (const finding of monitor.findings(repo.id)) {
      if (finding.status !== 'draft-created' || finding.pullRequest ||
        finding.ecosystem !== target.ecosystem || finding.packageName !== target.packageName ||
        finding.installedVersion !== target.installedVersion || finding.fixedVersion !== target.fixedVersion ||
        finding.manifestPath !== target.manifestPath || (finding.fixedDigest ?? null) !== (target.fixedDigest ?? null)) continue;
      monitor.patchFinding(finding.id, {pullRequest: {url: pr.url, number: pr.number, draft: pr.draft}});
      restored++;
    }
  }
  return restored;
}
