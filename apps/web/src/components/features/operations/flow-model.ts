import {isTerminal, type LiveRun} from '@/types/live-orchestration';
import type {MonitoredRepository, MonitoringSnapshot, SupplyFinding} from '@/types/monitoring';

export type ActorKind = 'you' | 'system' | 'agent';
export type FlowStep = {
  id: 'connect' | 'watch' | 'confirm' | 'prepare' | 'verify' | 'review';
  title: string; actor: string; actorKind: ActorKind;
  receives: string; does: string; produces: string; cannot: string;
};

/** The six-step explanation. Wording follows PRODUCT.md; it describes the built workflow, not a plan. */
export const flowSteps: FlowStep[] = [
  {id: 'connect', title: 'Connect & inspect', actor: 'You + server', actorKind: 'you',
    receives: 'A GitHub repository URL', does: 'Reads the manifests at an exact commit, detects the stack and the tests that can run, and checks branch-write access.',
    produces: 'Inventory of packages and images, plus a verification plan', cannot: 'Grant itself GitHub permissions the server identity lacks'},
  {id: 'watch', title: 'Watch for alerts', actor: 'Watcher', actorKind: 'system',
    receives: 'Official advisory feeds and allowlisted forum RSS', does: 'Checks every source on a fixed schedule. Forum posts go to a read-only scout and stay unconfirmed.',
    produces: 'Source health and new advisory candidates', cannot: 'Turn a failed source or a forum rumour into a clean result'},
  {id: 'confirm', title: 'Confirm the risk', actor: 'Supply Chain agent', actorKind: 'agent',
    receives: 'An advisory and the repository inventory', does: 'Exact version matching decides whether an installed package or image is affected. The agent explains the match.',
    produces: 'An affected package or image with a safe target version', cannot: 'Confirm a vulnerability on model judgement alone'},
  {id: 'prepare', title: 'Prepare the update', actor: 'Remediation agent', actorKind: 'agent',
    receives: 'The confirmed target and frozen baseline tests', does: 'DevSec freezes the relevant tests first. Remediation then writes the supported update on a candidate branch.',
    produces: 'A candidate commit with the exact package or image change', cannot: 'Edit the frozen tests or touch unsupported files'},
  {id: 'verify', title: 'Test & review', actor: 'DevSec agent + gate', actorKind: 'agent',
    receives: 'The candidate commit and the frozen verifier', does: 'A central GitHub Actions verifier runs the tests offline in a container. Senior review reads the real diff, then a deterministic gate checks every identity.',
    produces: 'Observed checks, scans and a publication decision', cannot: 'Let model text stand in for a test result'},
  {id: 'review', title: 'You review the PR', actor: 'You', actorKind: 'you',
    receives: 'A draft pull request with its evidence', does: 'You read the diff, checks and owner follow-ups, then decide whether to merge and deploy.',
    produces: 'Your merge decision', cannot: 'Merge or deploy automatically. The draft never closes the finding by itself.'},
];

const statusStep: Partial<Record<LiveRun['status'], number>> = {
  queued: 1, 'source-fetching': 1, triaging: 2, matching: 2, baseline: 3, patching: 3, verifying: 4, reviewing: 4, publishing: 5,
};

/** Index of the step the running workflow is on, or -1 when nothing is running. */
export function activeStepIndex(repository: MonitoredRepository | undefined, run: LiveRun | null): number {
  if (!repository) return -1;
  return run && !isTerminal(run.status) ? statusStep[run.status] ?? 1 : -1;
}

/** Recorded completion per step. Only stored evidence counts. */
export function stepDone(repository: MonitoredRepository | undefined, snapshot: MonitoringSnapshot | null, findings: SupplyFinding[], run: LiveRun | null): boolean[] {
  const matched = findings.length > 0 || !!run?.checks.some(check => check.id === 'affected_inventory' && check.status === 'passed');
  return [!!repository?.inventorySha, !!snapshot?.lastCycleAt, matched, !!run?.repo.candidateSha, !!run?.draftPRAllowed, !!run?.pullRequest];
}

/** The live, evidence-based line under each step title. */
export function stepEvidence(index: number, repository: MonitoredRepository | undefined, snapshot: MonitoringSnapshot | null, findings: SupplyFinding[], run: LiveRun | null): string {
  switch (index) {
    case 0: return repository?.inventorySha ? `${repository.repairCapability?.stack.join(', ') || 'Dependencies'} detected · ${repository.inventory.length} tracked` : 'Add a GitHub URL to detect its stack and tests';
    case 1: return snapshot?.lastCycleAt ? `${snapshot.sources.filter(source => source.status === 'ok').length} of ${snapshot.sources.length} sources healthy` : 'The server keeps checking security sources';
    case 2: return run?.target ? `${run.target.packageName} ${run.target.installedVersion}` : findings.length ? `${findings.length} advisory match${findings.length === 1 ? '' : 'es'} recorded` : 'Waiting for an exact version match';
    case 3: return run?.repo.candidateSha ? `Candidate ${run.repo.candidateSha.slice(0, 7)} on its own branch` : 'No candidate commit yet';
    case 4: return run?.checks.length ? `${run.checks.filter(check => check.status === 'passed').length} of ${run.checks.length} observed checks passed` : 'Checks appear after verification runs';
    default: return run?.pullRequest ? `Draft PR #${run.pullRequest.number} is waiting for you` : run?.status === 'blocked' ? 'Held: the evidence gate blocked this draft' : 'A draft PR appears only after every check passes';
  }
}
