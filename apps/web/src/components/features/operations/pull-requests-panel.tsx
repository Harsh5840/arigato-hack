import {ArrowRight, ArrowUpRight, GitPullRequestDraft, ShieldCheck} from 'lucide-react';
import type {CreatedPullRequest} from './pull-request-records';

export default function PullRequestsPanel({records, selectedCount, onServices, onFindings}: {records: CreatedPullRequest[]; selectedCount: number; onServices: () => void; onFindings: () => void}) {
  return <section className="ops-prs-view">
    <div className="ops-tab-intro"><div><span>05 / HUMAN REVIEW</span><h2>PRs created</h2><p>One card per recorded GitHub PR for the checked services. Open the PR to review its current status and decide whether to merge.</p></div><button onClick={onServices}>Change services<ArrowRight size={13}/></button></div>
    {records.length ? <div className="ops-pr-list">{records.map(record => <article className="ops-pr-card" key={record.url}>
      <div className="ops-pr-card-top"><span><GitPullRequestDraft size={15}/>PR #{record.number}</span><small>{record.draftAtCreation ? 'Created as draft' : 'PR created'}</small></div>
      <h3>{record.repository.owner}/{record.repository.name}</h3>
      <p>{record.targets.length === 1 && record.targets[0].ecosystem === 'Docker' ? 'Verified image update' : record.targets.length === 1 ? 'Verified dependency update' : `${record.targets.length} verified dependency updates`}</p>
      <ul>{record.targets.map(target => <li key={`${target.ecosystem}:${target.packageName}:${target.manifestPath}`}><strong>{target.packageName}</strong><code>{target.installedVersion} → {target.fixedVersion}</code><span>{target.manifestPath}</span></li>)}</ul>
      <div className="ops-pr-card-foot"><span><ShieldCheck size={13}/>{record.advisoryCount} advisory match{record.advisoryCount === 1 ? '' : 'es'} · human review</span><a className="button primary" href={record.url} target="_blank" rel="noreferrer">Open PR on GitHub<ArrowUpRight size={13}/></a></div>
    </article>)}</div> : <div className="ops-tab-empty"><strong>{selectedCount ? 'No PR created for checked services' : 'No services selected'}</strong><p>{selectedCount ? 'A supported finding gets a draft PR only after its fix, tests, and senior review pass. Check Findings to start one.' : 'Check one repository or Select all in Services to see its PRs.'}</p><button className="button primary" onClick={selectedCount ? onFindings : onServices}>{selectedCount ? 'Review findings' : 'Choose services'}</button></div>}
  </section>;
}
