'use client';

import {useState} from 'react';
import {ArrowUpRight, GitPullRequestDraft, Languages, LockKeyhole, AlertTriangle, ChevronDown} from 'lucide-react';
import type {LiveRun} from '@/types/live-orchestration';
import {japanTime} from './format';

export default function ReviewPanel({run}: {run: LiveRun | null}) {
  const [language, setLanguage] = useState<'en' | 'ja'>('en');
  const tasks = [...new Set([...(run?.advisory?.ownerTasks ?? []), ...(run?.review?.ownerTasks ?? [])])];
  return <section className="ops-review"><div className="ops-panel-heading"><h2>Review &amp; handoff</h2><button className="ops-language" onClick={() => setLanguage(value => value === 'en' ? 'ja' : 'en')}><Languages size={14}/>{language === 'en' ? '日本語' : 'English'}</button></div>
    <div className={`ops-review-decision ${run?.pullRequest ? 'ready' : ''}`}><GitPullRequestDraft size={22}/><div><strong>{run?.pullRequest ? `Draft PR #${run.pullRequest.number}` : run?.status === 'blocked' ? 'Draft blocked by evidence' : 'Waiting for a verified candidate'}</strong><p>{run?.pullRequest ? 'Ready for human review. Merge and deployment remain manual.' : 'The worker publishes only after checks and senior review satisfy policy.'}</p></div></div>
    {run?.pullRequest && <a className="button primary ops-open-pr" href={run.pullRequest.url} target="_blank" rel="noreferrer">Open draft PR<ArrowUpRight size={15}/></a>}
    <div className="ops-gate-row"><LockKeyhole size={14}/><span>Publication gate</span><strong>{run?.draftPRAllowed ? 'Passed' : 'Held'}</strong></div>
    {run?.review && <div className="ops-review-body"><div><span>Senior model review</span><strong>{run.review.decision === 'approve' ? 'Approved for draft' : 'Changes requested'}</strong></div><p lang={language === 'ja' ? 'ja' : 'en'}>{language === 'ja' ? run.review.summaryJa : run.review.summaryEn}</p>{run.review.concerns.length > 0 && <details><summary>{run.review.concerns.length} reviewer concerns<ChevronDown size={13}/></summary><ul>{run.review.concerns.map(concern => <li key={concern}>{concern}</li>)}</ul></details>}</div>}
    {tasks.length > 0 && <details className="ops-owner-tasks"><summary><AlertTriangle size={14}/>{tasks.length} owner follow-ups remain<ChevronDown size={13}/></summary><ul>{tasks.map(task => <li key={task}>{task}</li>)}</ul></details>}
    <details className="ops-advisory-detail"><summary>Japanese advisory evidence<ChevronDown size={13}/></summary>{run?.advisory ? <><h3 lang={language === 'ja' ? 'ja' : 'en'}>{language === 'ja' ? run.advisory.titleJa : run.advisory.titleEn}</h3><p>{run.advisory.summary}</p><span>{run.advisory.cves.join(' · ')} · PHP {run.advisory.fixedVersion}</span><ul>{run.advisory.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={12}/></a><small>{source.language} · retrieved {japanTime(source.retrievedAt, true)} JST</small></li>)}</ul></> : <p>No advisory snapshot recorded yet.</p>}</details>
  </section>;
}
