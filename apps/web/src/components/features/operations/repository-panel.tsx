'use client';

import {useState, type FormEvent} from 'react';
import {Github, Plus, ArrowUpRight, SearchCheck, ChevronDown, Layers3, FlaskConical, FileCode2} from 'lucide-react';
import type {MonitoredRepository} from '@/types/monitoring';
import {japanTime} from './format';
import {canPrepareRepair, repairUnavailableReason} from './repair-capability';

interface Props {
  repositories: MonitoredRepository[]; selectedId: string; loaded: boolean; pending: string | null;
  onSelect: (id: string) => void; onAdd: (url: string) => Promise<boolean>;
  onUpdate: (id: string, changes: {enabled?: boolean; autoRemediate?: boolean}) => void;
  onScan: (id: string) => void;
}
function stackLabel(repository: MonitoredRepository): string {
  return repository.repairCapability?.stack.join(' · ') || [...new Set(repository.inventory.map(item => item.ecosystem === 'PyPI' ? 'Python' : item.ecosystem === 'Packagist' ? 'PHP' : item.ecosystem === 'Docker' ? 'Container' : 'Node.js'))].join(' · ');
}
export default function RepositoryPanel({repositories, selectedId, loaded, pending, onSelect, onAdd, onUpdate, onScan}: Props) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const selected = repositories.find(repository => repository.id === selectedId);
  async function submit(event: FormEvent) {event.preventDefault(); if (await onAdd(url.trim())) {setUrl(''); setAdding(false);}}
  const repairSupported = canPrepareRepair(selected);
  const capability = selected?.repairCapability;
  return <section className="ops-repository-panel" id="repositories"><div className="ops-panel-heading"><h2><Github size={15}/>Connected repositories</h2><button className="button subtle" onClick={() => setAdding(value => !value)} aria-expanded={adding}><Plus size={13}/>Add repository</button></div>
    {adding && <form className="ops-add-repository" onSubmit={event => void submit(event)}><label htmlFor="repository-url">GitHub repository URL</label><div><input id="repository-url" type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://github.com/owner/project" autoComplete="url" disabled={!!pending}/><button className="button primary" type="submit" disabled={!!pending}>{pending === 'add' ? 'Detecting stack…' : 'Connect & inspect'}</button></div><p>The server detects dependencies and tests, then checks whether it can prepare a verified fix. You choose whether fixes run automatically.</p></form>}
    <div className="ops-repository-list">{repositories.length ? repositories.map(repository => <button key={repository.id} aria-pressed={repository.id === selectedId} onClick={() => onSelect(repository.id)}><Github size={15}/><span><strong>{repository.owner}/{repository.name}</strong><small>{repository.inventorySha ? `${stackLabel(repository) || 'No supported stack found'} · ${repository.inventory.length} tracked dependencies` : 'Stack and GitHub access have not been checked'}</small></span><i className={repository.enabled ? 'enabled' : ''}>{repository.enabled ? 'Watching' : 'Paused'}</i></button>) : <p className="ops-muted">{loaded ? 'Add a GitHub repository. We will detect its stack and test plan.' : 'Loading connected repositories…'}</p>}</div>
    {selected && <div className="ops-repository-settings"><div className="ops-repository-capability"><span>{repairSupported ? 'Verified fixes available' : 'Monitoring available'}</span><a href={selected.url} target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={12}/></a></div>
      <div className="ops-detected-stack"><div><Layers3 size={14}/><strong>Detected stack</strong><span>{stackLabel(selected) || 'Awaiting repository scan'}</span></div><div><FlaskConical size={14}/><strong>Verification plan</strong><span>{capability ? capability.testsDetected ? `${capability.testCommands.length} detected test command${capability.testCommands.length === 1 ? '' : 's'}` : capability.supported ? 'Image and configuration checks' : 'No runnable tests detected' : 'Awaiting repository scan'}</span></div></div>
      {capability && <details className="ops-test-plan"><summary><FileCode2 size={13}/>How this repository will be tested<ChevronDown size={13}/></summary><p>{capability.reason}</p>{capability.testCommands.length > 0 && <ul>{capability.testCommands.map(command => <li key={command}><code>{command}</code></li>)}</ul>}<p>{capability.runner === 'central-actions' ? 'Checks run in an isolated GitHub Actions verifier.' : 'Checks use the repository’s GitHub Actions workflow.'} A draft PR still needs your review.</p></details>}
      <label><span>Watch for new vulnerabilities</span><input type="checkbox" checked={selected.enabled} disabled={!!pending} onChange={event => onUpdate(selected.id, {enabled: event.target.checked})}/></label><label><span>Automatically prepare a draft fix</span><input type="checkbox" checked={selected.autoRemediate} disabled={!repairSupported || !!pending} onChange={event => onUpdate(selected.id, {autoRemediate: event.target.checked})}/></label>{!repairSupported && <p className="ops-muted">{repairUnavailableReason(selected)}</p>}<div className="ops-repository-scan"><span>{selected.scanStatus === 'queued' ? 'Scan queued for the worker' : selected.scanStatus === 'scanning' ? 'Inspecting dependencies and advisory evidence…' : selected.lastCheckedAt ? `Last scan ${japanTime(selected.lastCheckedAt)} JST` : 'No scan result yet'}</span><button className="button outline" onClick={() => onScan(selected.id)} disabled={!!pending || selected.scanStatus === 'queued' || selected.scanStatus === 'scanning'}><SearchCheck size={13}/>{selected.scanStatus === 'scanning' ? 'Scanning…' : selected.scanStatus === 'queued' ? 'Queued' : 'Scan now'}</button></div>{selected.lastError && <p className="ops-monitor-error" role="status">{selected.lastError}</p>}<details className="ops-inventory"><summary>Packages & container images · {selected.inventory.length}<ChevronDown size={13}/></summary><ul>{selected.inventory.map(item => <li key={`${item.manifestPath}-${item.name}`}><div><strong>{item.name}</strong><code>{item.version}</code></div><span>{item.ecosystem === 'Docker' ? 'Container image' : item.ecosystem} · {item.manifestPath}</span></li>)}</ul></details></div>}
  </section>;
}
