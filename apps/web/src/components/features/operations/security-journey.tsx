import {Github, Rss, SearchCheck, Wrench, ShieldCheck, GitPullRequestDraft, ArrowRight, Radio, Check} from 'lucide-react';
import {isTerminal, liveStatusLabels, type LiveEvent, type LiveRun} from '@/types/live-orchestration';
import type {MonitoredRepository, MonitoringSnapshot, SupplyFinding} from '@/types/monitoring';
import {japanTime} from './format';

export default function SecurityJourney({repository, snapshot, findings, run, events}: {repository?: MonitoredRepository; snapshot: MonitoringSnapshot | null; findings: SupplyFinding[]; run: LiveRun | null; events: LiveEvent[]}) {
  const activeStep = !repository ? 0 : run && !isTerminal(run.status) ? ['patching'].includes(run.status) ? 3 : ['verifying', 'reviewing'].includes(run.status) ? 4 : run.status === 'publishing' ? 5 : ['queued', 'baseline'].includes(run.status) ? 2 : 1 : -1;
  const matched = findings.length > 0 || !!run?.checks.some(check => check.id === 'affected_inventory' && check.status === 'passed');
  const steps = [
    {title: 'Connect repository', detail: repository ? `${repository.inventory.length} dependencies inventoried` : 'Add a GitHub URL you can access', Icon: Github, done: !!repository},
    {title: 'Watch security news', detail: snapshot?.lastCycleAt ? 'Official feeds and forum leads checked' : 'A server worker checks the sources', Icon: Rss, done: !!snapshot?.lastCycleAt},
    {title: 'Find affected package', detail: run?.target ? `${run.target.packageName} ${run.target.installedVersion}` : matched ? 'An installed dependency matches an advisory' : 'Compare the alert with your inventory', Icon: SearchCheck, done: matched},
    {title: 'Prepare a fix', detail: run?.repo.candidateSha ? `Candidate ${run.repo.candidateSha.slice(0, 7)}` : 'Fix Agent proposes a bounded change', Icon: Wrench, done: !!run?.repo.candidateSha},
    {title: 'Test & senior review', detail: run?.checks.length ? `${run.checks.filter(check => check.status === 'passed').length}/${run.checks.length} observed checks passed` : 'Run checks; a separate context reviews', Icon: ShieldCheck, done: !!run?.draftPRAllowed},
    {title: 'Draft PR → human', detail: run?.pullRequest ? `PR #${run.pullRequest.number} awaits your review` : 'You inspect and decide whether to merge', Icon: GitPullRequestDraft, done: !!run?.pullRequest},
  ];
  const latest = events.at(-1);
  return <section className="ops-security-journey" aria-label="How a security alert becomes a reviewed repair"><div className="ops-journey-heading"><h2>From alert to a fix you can review</h2><span>{run?.orchestrationEngine === 'langgraph' ? 'LangGraph · separate server worker' : 'Server-run orchestration'}</span></div><ol>{steps.map(({title, detail, Icon, done}, index) => <li key={title} className={`${activeStep === index ? 'active' : ''} ${done ? 'done' : ''}`} aria-current={activeStep === index ? 'step' : undefined}><div><span>{index + 1}</span>{done ? <Check size={17}/> : <Icon size={17}/>}</div><strong>{title}</strong><p>{detail}</p>{index < steps.length - 1 && <ArrowRight size={15} className="ops-step-arrow"/>}</li>)}</ol><div className="ops-journey-activity" role="status"><Radio size={14}/><strong>{run ? liveStatusLabels[run.status] : repository ? 'Ready to watch this repository' : 'Connect a repository to begin'}</strong><p>{latest?.message ?? (run?.status === 'queued' ? 'The run is queued for the separate worker.' : 'No execution results are invented. The activity here comes from stored worker events.')}</p>{latest && <time dateTime={latest.at}>{japanTime(latest.at)} JST</time>}</div></section>;
}
