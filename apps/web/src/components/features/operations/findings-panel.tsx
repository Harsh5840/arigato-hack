import {ArrowUpRight, ChevronDown, Container, GitPullRequestDraft, SearchCheck, Wrench} from 'lucide-react';
import type {MonitoredRepository, SupplyFinding} from '@/types/monitoring';
import {canPrepareRepair, findingStatus, groupRepairFindings, repairUnavailableReason} from './repair-capability';

function AdvisoryEvidence({finding}: {finding: SupplyFinding}) {
  return <><p>{finding.summary}</p><span>{finding.aliases.join(' · ') || finding.advisoryId}</span>{finding.references[0] && <a href={finding.references[0].url} target="_blank" rel="noreferrer">Why this version is affected<ArrowUpRight size={12}/></a>}</>;
}

function FindingAction({finding, repository, pending, onRepair, onRun}: {finding: SupplyFinding; repository?: MonitoredRepository; pending: string | null; onRepair: (id: string) => void; onRun: (id: string) => void}) {
  const pr = finding.pullRequest;
  const prUrl = pr && repository && pr.url === 'https://github.com/' + repository.owner + '/' + repository.name + '/pull/' + pr.number ? pr.url : undefined;
  const canFix = canPrepareRepair(repository, finding);
  return <div className="ops-finding-action">
    <span>{findingStatus(finding.status)}</span>
    {prUrl ? <a className="button primary" href={prUrl} target="_blank" rel="noreferrer"><GitPullRequestDraft size={13}/>Open draft PR<ArrowUpRight size={12}/></a>
      : finding.runId ? <button className="button outline" onClick={() => onRun(finding.runId!)}><GitPullRequestDraft size={13}/>View fix &amp; tests</button>
      : finding.status === 'draft-created' && repository ? <a className="button outline" href={'https://github.com/' + encodeURIComponent(repository.owner) + '/' + encodeURIComponent(repository.name) + '/pulls'} target="_blank" rel="noreferrer"><GitPullRequestDraft size={13}/>Find existing PR<ArrowUpRight size={12}/></a>
      : finding.status === 'dismissed' ? <small>Finding dismissed</small>
      : <><button className="button primary" disabled={!canFix || !!pending || finding.status === 'queued'} onClick={() => onRepair(finding.id)} title={canFix ? 'Start the fix, verification, senior review, and draft PR workflow' : repairUnavailableReason(repository)}><Wrench size={13}/>{pending === 'repair:' + finding.id ? 'Starting fix…' : finding.status === 'needs-owner' ? 'Retry fix & create PR' : 'Fix & create draft PR'}</button><small>{canFix ? 'Tests and senior review must pass before the PR opens.' : repairUnavailableReason(repository)}</small></>}
  </div>;
}

export default function FindingsPanel({findings, repository, pending, onRepair, onRun}: {findings: SupplyFinding[]; repository?: MonitoredRepository; pending: string | null; onRepair: (id: string) => void; onRun: (id: string) => void}) {
  const groups = groupRepairFindings(findings);
  const affectedLabel = groups.length && groups.every(group => group.finding.ecosystem === 'Docker') ? 'image' + (groups.length === 1 ? '' : 's') : groups.every(group => group.finding.ecosystem !== 'Docker') ? 'package' + (groups.length === 1 ? '' : 's') : 'packages / images';
  return <section className="ops-detected-findings">
    <div className="ops-panel-heading"><h2><SearchCheck size={15}/>Vulnerabilities found</h2><span>{groups.length} affected {affectedLabel} · {findings.length} advisory match{findings.length === 1 ? '' : 'es'}</span></div>
    {groups.length ? <ul>{groups.map(({key, finding, advisories}) => <li key={key}>
      <div className="ops-finding-package"><strong>{finding.ecosystem === 'Docker' && <Container size={14}/>} {finding.packageName}</strong>{finding.ecosystem === 'Docker' && <span>{finding.status === 'draft-created' ? 'Old image → tested updated image' : 'Old image → proposed update'}</span>}<code>{finding.installedVersion} → {finding.fixedVersion || 'No verified target yet'}</code><span>{finding.ecosystem === 'Docker' ? 'Container image' : finding.ecosystem} · {finding.manifestPath}</span></div>
      <div className="ops-finding-reason">{advisories.length === 1 ? <AdvisoryEvidence finding={finding}/> : <><p>This {finding.ecosystem === 'Docker' ? 'image' : 'package'} version matches {advisories.length} published advisories. These matches share one repair and test run. Deployed exposure still depends on configuration.</p><details className="ops-advisory-matches"><summary>{advisories.length} advisory matches · one repair<ChevronDown size={13}/></summary><ul>{advisories.map(advisory => <li key={advisory.id}><AdvisoryEvidence finding={advisory}/></li>)}</ul></details></>}</div>
      <FindingAction finding={finding} repository={repository} pending={pending} onRepair={onRepair} onRun={onRun}/>
    </li>)}</ul> : <div className="ops-empty"><SearchCheck size={23}/><div><strong>No vulnerability recorded for {repository?.name ?? 'this repository'}</strong><p>Choose Scan now to compare its packages and images with advisory evidence. Results cover the sources and declarations checked.</p></div></div>}
  </section>;
}
