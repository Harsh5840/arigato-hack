'use client';

import {useState} from 'react';
import {summarizeRuns, tokenBreakdown} from '@/lib/dashboard-analytics';
import {isTerminal, liveStatusLabels, type LiveRun} from '@/types/live-orchestration';
import {durationLabel, japanTime, numberLabel} from './format';

const roles = {supply: 'Supply Chain', fixer: 'Remediation', reviewer: 'Senior review'};
const outcomeOf = (run: LiveRun) => isTerminal(run.status) ? run.status : 'active';
const outcomeLabel: Record<string, string> = {completed: 'Draft ready', blocked: 'Held by gate', failed: 'Failed', cancelled: 'Cancelled', active: 'Running'};

function HistoryChart({runs, selected, onSelect}: {runs: LiveRun[]; selected?: string; onSelect: (id: string) => void}) {
  const [hover, setHover] = useState<string | null>(null);
  const ordered = [...runs].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(-16);
  const elapsed = (run: LiveRun) => Math.max(0, Date.parse(run.updatedAt) - Date.parse(run.createdAt)) || 0;
  const max = Math.max(60_000, ...ordered.map(elapsed));
  const step = [30_000, 60_000, 120_000, 300_000, 600_000].find(value => max / value <= 4) ?? 600_000;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({length: top / step + 1}, (_, index) => index * step);
  const shown = ordered.find(run => run.id === hover);
  return <div className="history-chart">
    <div className="history-plot" role="img" aria-label={`Elapsed time of the last ${ordered.length} runs, oldest first. Details are in the run history table.`}>
      <div className="history-axis" aria-hidden="true">{ticks.reverse().map(tick => <span key={tick}>{durationLabel(tick)}</span>)}</div>
      <div className="history-bars">
        {ordered.map(run => <button key={run.id} className={`history-bar ${outcomeOf(run)}`} aria-pressed={run.id === selected} aria-label={`Run ${run.id.slice(0, 8)}, ${outcomeLabel[outcomeOf(run)]}, ${durationLabel(elapsed(run))}`} onClick={() => onSelect(run.id)} onMouseEnter={() => setHover(run.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(run.id)} onBlur={() => setHover(null)}>
          <span style={{height: `${Math.max(2, elapsed(run) / top * 100)}%`}}/>
        </button>)}
      </div>
      {shown && <div className="history-tip" role="status"><strong>{outcomeLabel[outcomeOf(shown)]}</strong><span>{durationLabel(elapsed(shown))} · {japanTime(shown.createdAt, true)} JST</span>{shown.pullRequest && <span>Draft PR #{shown.pullRequest.number}</span>}</div>}
    </div>
    <p className="history-caption">Oldest left, newest right. Bar height is elapsed time from queueing to the final state.</p>
  </div>;
}

export default function RunAnalytics({runs, run, onSelect}: {runs: LiveRun[]; run: LiveRun | null; onSelect: (id: string) => void}) {
  const summary = summarizeRuns(runs);
  const tokens = run ? tokenBreakdown(run) : [];
  const maxToken = Math.max(1, ...tokens.map(token => token.totalTokens));
  return <section className="observations" id="observations">
    <div className="section-head"><h2>Run observations</h2><p>{summary.sampleSize} stored runs for this repository. These describe workflow runs, not distinct vulnerabilities or a security score.</p></div>
    <div className="observation-grid">
      <div className="obs-card obs-history">
        <h3>Every run, by outcome</h3>
        {summary.sampleSize ? <>
          <ul className="outcome-legend">{summary.outcomes.filter(outcome => outcome.count > 0).map(outcome => <li key={outcome.status}><i className={outcome.status}/>{outcomeLabel[outcome.status]}<strong>{outcome.count}</strong></li>)}</ul>
          <HistoryChart runs={runs} selected={run?.id} onSelect={onSelect}/>
        </> : <p className="muted">Outcomes appear after the first stored run.</p>}
      </div>
      <div className="obs-card obs-tokens">
        <h3>Model usage, selected run</h3>
        <p className="muted">{tokens.reduce((sum, bucket) => sum + bucket.calls, 0)} metered calls. Only API-reported tokens are counted.</p>
        {tokens.length ? <ul className="role-bars">{tokens.map(bucket => <li key={`${bucket.role}-${bucket.model}`} className={bucket.role}>
          <div><span>{roles[bucket.role]}</span><strong>{numberLabel(bucket.totalTokens)}</strong></div>
          <span className="role-bar" style={{width: `${bucket.totalTokens / maxToken * 100}%`}}/>
          <code>{bucket.model}</code>
        </li>)}</ul> : <p className="muted">No reported usage for this run.</p>}
      </div>
    </div>
    <div className="history-head"><h3>Run history</h3><span>Times in Japan Standard Time</span></div>
    {runs.length ? <div className="table-scroll"><table className="history-table"><thead><tr><th>Run</th><th>Outcome</th><th>Source</th><th>Elapsed</th><th>Tokens</th><th>Draft</th></tr></thead><tbody>{runs.map(item => {const elapsed = Date.parse(item.updatedAt) - Date.parse(item.createdAt); const usage = item.agentCalls.reduce((sum, call) => sum + (call.usage?.totalTokens ?? 0), 0); return <tr key={item.id} className={item.id === run?.id ? 'selected' : ''}><td><button onClick={() => onSelect(item.id)} aria-pressed={item.id === run?.id}><strong>{item.id.slice(0, 8)}</strong><time dateTime={item.createdAt}>{japanTime(item.createdAt, true)}</time></button></td><td><span className={`status-tag ${outcomeOf(item)}`}><i/>{liveStatusLabels[item.status]}</span></td><td>{item.sourceMode === 'live' ? 'Fetched' : 'Recorded'}</td><td>{durationLabel(elapsed)}</td><td>{usage ? numberLabel(usage) : '-'}</td><td>{item.pullRequest ? <a href={item.pullRequest.url} target="_blank" rel="noreferrer">#{item.pullRequest.number}</a> : '-'}</td></tr>;})}</tbody></table></div> : <p className="muted">Start a run to create a durable trace and evidence history.</p>}
  </section>;
}
