'use client';

import {useEffect, useMemo, useState} from 'react';
import {Clock3, ListTree} from 'lucide-react';
import {phaseSegments} from '@/lib/dashboard-analytics';
import {isTerminal, type LiveEvent, type LiveNode, type LiveRun} from '@/types/live-orchestration';
import {durationLabel, japanTime} from './format';

const lanes: {node: LiveNode; label: string; short: string; role?: 'supply' | 'fixer' | 'reviewer'}[] = [
  {node: 'controller', label: 'Controller', short: 'Controller'},
  {node: 'supply-chain', label: 'Supply Chain agent', short: 'Supply Chain', role: 'supply'},
  {node: 'devsec', label: 'DevSec agent', short: 'DevSec', role: 'reviewer'},
  {node: 'remediation', label: 'Remediation agent', short: 'Remediation', role: 'fixer'},
  {node: 'gate', label: 'Evidence gate', short: 'Gate'},
  {node: 'review', label: 'Human review', short: 'You'},
];
const laneIndex = new Map(lanes.map((lane, index) => [lane.node, index]));
const bookkeeping = new Set(['graph-node-started', 'graph-node-completed']);
const steps = [5e3, 1e4, 15e3, 3e4, 6e4, 12e4, 3e5, 6e5, 9e5];
const laneHeight = 42, top = 6, axis = 30, right = 18;

// A callback ref: the plot mounts only after a run with timed phases loads.
function useWidth<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element); return () => observer.disconnect();
  }, [element]);
  return [setElement, width] as const;
}

export default function RunTimeline({run, events}: {run: LiveRun | null; events: LiveEvent[]}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<LiveEvent | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const live = !!run && !isTerminal(run.status);
  useEffect(() => {if (!live) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer);}, [live]);
  const model = useMemo(() => {
    if (!run) return null;
    const segments = phaseSegments(run, events, now);
    const queued = segments.find(segment => segment.stage === 'queued');
    const work = segments.filter(segment => segment.stage !== 'queued');
    if (!work.length) return {segments: [], queued, start: 0, end: 0, inside: [], after: [], handoffs: 0};
    const start = work[0].start, end = Math.max(work.at(-1)!.end, start + 1000);
    const timed = events.filter(event => event.runId === run.id).map(event => ({event, at: Date.parse(event.at)})).filter(item => Number.isFinite(item.at));
    const inside = timed.filter(item => item.at >= start && item.at <= end + 1500);
    const after = timed.filter(item => item.at > end + 1500);
    const handoffs = work.filter((segment, index) => index > 0 && work[index - 1].node !== segment.node).length;
    return {segments: work, queued, start, end, inside, after, handoffs};
  }, [run, events, now]);

  const head = <div className="section-head"><h2>Who did what, when</h2><p>The selected run, replayed from its stored events. Each lane is one actor; a coloured bar is a phase that actor owned, and each vertical line is a handoff.</p></div>;
  if (!run || !model || !model.segments.length) return <section className="timeline">{head}<div className="empty"><Clock3 size={22}/><div><strong>{run ? 'No timed phases recorded yet' : 'No run selected'}</strong><p>{run ? 'Phases appear here as the worker records transitions. Nothing is drawn without a stored event.' : 'Select a run in the history below, or prepare a fix, to see its timeline.'}</p></div></div></section>;

  const narrow = width < 560, label = narrow ? 92 : 176;
  const plot = Math.max(120, width - label - right);
  const span = model.end - model.start;
  const x = (at: number) => label + (at - model.start) / span * plot;
  const y = (node: LiveNode) => top + (laneIndex.get(node) ?? 0) * laneHeight + laneHeight / 2;
  const step = steps.find(value => span / value <= 7) ?? steps.at(-1)!;
  const ticks = Array.from({length: Math.floor(span / step) + 1}, (_, index) => index * step);
  const height = top + lanes.length * laneHeight + axis;
  const roleClass = (node: LiveNode) => lanes[laneIndex.get(node) ?? 0].role ?? 'neutral';
  const summary = `${model.segments.length} phases over ${durationLabel(span)} with ${model.handoffs} handoffs between actors.`;

  return <section className="timeline" aria-label="Run timeline">
    {head}
    <div className="timeline-stats">
      <div><span>Active work</span><strong>{durationLabel(span)}</strong></div>
      <div><span>Handoffs</span><strong>{model.handoffs}</strong></div>
      <div><span>Recorded events</span><strong>{model.inside.length + model.after.length}</strong></div>
      {model.queued && <div><span>Queue wait before work</span><strong>{durationLabel(model.queued.end - model.queued.start)}</strong></div>}
    </div>
    <div className="timeline-plot" ref={ref}>
      {width > 0 && <svg width={width} height={height} role="img" aria-label={`Run timeline. ${summary}`}>
        {ticks.map(tick => <g key={tick} className="timeline-tick"><line x1={x(model.start + tick)} x2={x(model.start + tick)} y1={top} y2={height - axis + 4}/><text x={x(model.start + tick)} y={height - 10}>{durationLabel(tick)}</text></g>)}
        {lanes.map(lane => <g key={lane.node} className="timeline-lane"><line x1={label} x2={label + plot} y1={y(lane.node)} y2={y(lane.node)}/><text x={0} y={y(lane.node) + 4}>{narrow ? lane.short : lane.label}</text></g>)}
        {model.segments.map((segment, index) => {const previous = model.segments[index - 1]; return previous && previous.node !== segment.node && <line key={`h${index}`} className="timeline-handoff" x1={x(segment.start)} x2={x(segment.start)} y1={y(previous.node)} y2={y(segment.node)}/>;})}
        {model.segments.map((segment, index) => {const left = x(segment.start), w = Math.max(3, x(segment.end) - left); return <g key={`s${index}`} className={`timeline-phase ${roleClass(segment.node)}`} style={{transformOrigin: `${left}px 0`, animationDelay: `${index * 60}ms`}}>
          <rect x={left} y={y(segment.node) - 8} width={w} height={16} rx={4}/>
          {w > (narrow ? 54 : 70) && <text x={left + 1} y={y(segment.node) - 12}>{segment.label}</text>}
        </g>;})}
        {model.inside.map(({event, at}) => {const minor = bookkeeping.has(event.kind); const cx = x(Math.min(at, model.end)), cy = y(event.node) + (minor ? 13 : 0); return <g key={event.id} className={`timeline-event ${roleClass(event.node)} ${minor ? 'minor' : ''} ${hover?.id === event.id ? 'hover' : ''}`} tabIndex={minor ? -1 : 0} onMouseEnter={() => setHover(event)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(event)} onBlur={() => setHover(null)}>
          <circle className="hit" cx={cx} cy={cy} r={minor ? 5 : 9}/><circle cx={cx} cy={cy} r={minor ? 1.6 : 3.6}/>
        </g>;})}
        {live && <line className="timeline-now" x1={x(model.end)} x2={x(model.end)} y1={top} y2={height - axis + 4}/>}
      </svg>}
      {hover && width > 0 && <div className="timeline-tooltip" style={{left: Math.min(width - Math.min(300, width), Math.max(0, x(Math.min(Date.parse(hover.at), model.end)) - 150)), top: y(hover.node) + 16}} role="status">
        <span>{japanTime(hover.at)} JST · +{durationLabel(Math.max(0, Date.parse(hover.at) - model.start))}</span>
        <strong>{lanes[laneIndex.get(hover.node) ?? 0].label}</strong><p>{hover.message}</p>
      </div>}
    </div>
    <div className="timeline-foot">
      {model.after.length > 0 && <p><Clock3 size={14}/>{model.after.length} later event{model.after.length === 1 ? '' : 's'} after the run finished, such as post-publication CI readback, are listed in the event log.</p>}
      <details className="timeline-log"><summary><ListTree size={14}/>Event log · {model.inside.length + model.after.length} events</summary><ol>{[...model.inside, ...model.after].map(({event}) => <li key={event.id}><time dateTime={event.at}>{japanTime(event.at)}</time><span>{lanes[laneIndex.get(event.node) ?? 0].label}</span><p>{event.message}</p></li>)}</ol></details>
    </div>
  </section>;
}
