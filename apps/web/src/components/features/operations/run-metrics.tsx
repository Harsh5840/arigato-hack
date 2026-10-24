import {summarizeRuns} from '@/lib/dashboard-analytics';
import type {LiveRun} from '@/types/live-orchestration';
import {durationLabel, numberLabel} from './format';

export default function RunMetrics({runs, loaded}: {runs: LiveRun[]; loaded: boolean}) {
  const summary = summarizeRuns(runs);
  return <section className="ops-metrics" aria-label="Observed run metrics">
    <div><span>Stored runs</span><strong>{loaded ? summary.sampleSize : '—'}</strong><small>{loaded ? 'Checked services' : 'Waiting for stored history'}</small></div>
    <div><span>Drafts created</span><strong>{loaded ? summary.draftPRs : '—'}</strong><small>Unique recorded PR URLs</small></div>
    <div><span>Median completed run</span><strong>{loaded ? durationLabel(summary.completedDurationMedianMs) : '—'}</strong><small>{loaded ? `${summary.completedDurationSamples} timed completed runs` : 'No timing data loaded'}</small></div>
    <div><span>Recorded tokens</span><strong>{loaded ? numberLabel(summary.totalTokens) : '—'}</strong><small>{loaded ? `${summary.meteredCalls} metered agent calls` : 'No usage data loaded'}</small></div>
  </section>;
}
