import { ChevronRight } from 'lucide-react';
import type { Finding, Severity, Stage } from '@/types/security';
export function statusFor(finding: Finding, stage: Stage, blocked: boolean) {
  if (stage === 4) return 'Draft prepared';
  if (stage === 3) return blocked ? 'Blocked' : 'Verified';
  if (stage === 2) return 'Patch proposed';
  return stage >= 1 ? 'Reproduced' : 'Needs verification';
}
export default function Queue({ items, selected, onSelect, filter, setFilter, stages, blocked }: { items: Finding[]; selected: string; onSelect: (id: string) => void; filter: 'All' | Severity; setFilter: (v: 'All' | Severity) => void; stages: Record<string, Stage>; blocked: Record<string, boolean> }) {
  const visible = items.filter(f => filter === 'All' || f.severity === filter);
  return <section className="panel queue"><div className="panel-heading"><h2>Priority queue <span>{visible.length} findings</span></h2><div className="filters" aria-label="Filter by severity">{(['All', 'Critical', 'High'] as const).map(value => <button key={value} aria-pressed={filter === value} className={value === filter ? 'selected' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div></div><div className="queue-scroll"><table><thead><tr><th>Severity</th><th>Finding</th><th>Repository · Area</th><th>Status</th><th><span className="sr-only">Select</span></th></tr></thead><tbody>{visible.map(f => <tr key={f.id} className={selected === f.id ? 'selected-row' : ''}><td><span className={`severity ${f.severity.toLowerCase()}`}>{f.severity}</span></td><td><button className="finding-link" onClick={() => onSelect(f.id)}>{f.title}</button></td><td className="repo-cell">{f.repo} · {f.area}</td><td><span className={`status-dot ${stages[f.id] >= 3 && !blocked[f.id] ? 'green' : f.severity === 'Critical' ? 'red' : ''}`}/>{statusFor(f, stages[f.id] || 0, blocked[f.id])}</td><td><button aria-label={`Select ${f.title}`} className="icon-button" onClick={() => onSelect(f.id)}><ChevronRight size={16}/></button></td></tr>)}</tbody></table></div></section>;
}
