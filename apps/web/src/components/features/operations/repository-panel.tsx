'use client';

import {useState, type FormEvent} from 'react';
import {Github, Plus, ArrowUpRight, SearchCheck, ChevronDown} from 'lucide-react';
import type {MonitoredRepository} from '@/types/monitoring';
import {japanTime} from './format';

interface Props {
  repositories: MonitoredRepository[]; selectedId: string; loaded: boolean; pending: string | null;
  onSelect: (id: string) => void; onAdd: (url: string) => Promise<boolean>;
  onUpdate: (id: string, changes: {enabled?: boolean; autoRemediate?: boolean}) => void;
  onScan: (id: string) => void;
}
export default function RepositoryPanel({repositories, selectedId, loaded, pending, onSelect, onAdd, onUpdate, onScan}: Props) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const selected = repositories.find(repository => repository.id === selectedId);
  async function submit(event: FormEvent) {event.preventDefault(); if (await onAdd(url.trim())) {setUrl(''); setAdding(false);}}
  const repairSupported = !!selected && selected.profile === 'python-requests-demo' && !!selected.inventorySha && selected.canPush;
  return <section className="ops-repository-panel" id="repositories"><div className="ops-panel-heading"><h2><Github size={15}/>Repositories</h2><button className="button subtle" onClick={() => setAdding(value => !value)} aria-expanded={adding}><Plus size={13}/>Add repository</button></div>
    {adding && <form className="ops-add-repository" onSubmit={event => void submit(event)}><label htmlFor="repository-url">GitHub repository URL</label><div><input id="repository-url" type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://github.com/owner/project" autoComplete="url" disabled={!!pending}/><button className="button primary" type="submit" disabled={!!pending}>{pending === 'add' ? 'Connecting…' : 'Connect'}</button></div><p>The server verifies access and reads dependency manifests. New repositories start in monitor-only mode.</p></form>}
    <div className="ops-repository-list">{repositories.length ? repositories.map(repository => <button key={repository.id} aria-pressed={repository.id === selectedId} onClick={() => onSelect(repository.id)}><Github size={15}/><span><strong>{repository.owner}/{repository.name}</strong><small>{repository.inventorySha ? `${repository.inventory.length} dependencies · ${[...new Set(repository.inventory.map(item => item.ecosystem))].join(', ') || 'No supported manifest found'}` : 'Inventory and GitHub access not verified yet'}</small></span><i className={repository.enabled ? 'enabled' : ''}>{repository.enabled ? 'Enabled' : 'Paused'}</i></button>) : <p className="ops-muted">{loaded ? 'Connect a GitHub repository to inspect its dependency inventory.' : 'Loading connected repositories…'}</p>}</div>
    {selected && <div className="ops-repository-settings"><div className="ops-repository-capability"><span>{selected.profile === 'monitor-only' ? 'Monitor only' : selected.profile === 'python-requests-demo' ? 'Python requests repair profile' : 'PHP runtime repair profile'}</span><a href={selected.url} target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={12}/></a></div><label><span>Watch this repository</span><input type="checkbox" checked={selected.enabled} disabled={!!pending} onChange={event => onUpdate(selected.id, {enabled: event.target.checked})}/></label><label><span>Automatically prepare a draft fix</span><input type="checkbox" checked={selected.autoRemediate} disabled={!repairSupported || !!pending} onChange={event => onUpdate(selected.id, {autoRemediate: event.target.checked})}/></label>{!repairSupported && <p className="ops-muted">{!selected.inventorySha ? 'GitHub access has not been verified yet. Use Watch now to read the inventory and check permissions.' : selected.canPush ? 'Automatic fixes require the reviewed Python requests profile. Other repositories remain monitored.' : 'This verified connection has read access only. A repair requires branch-write permission and a supported profile.'}</p>}<div className="ops-repository-scan"><span>{selected.lastCheckedAt ? `Inventory checked ${japanTime(selected.lastCheckedAt)} JST` : 'Inventory has not been checked yet'}</span><button className="button outline" onClick={() => onScan(selected.id)} disabled={!!pending}><SearchCheck size={13}/>{pending === `scan:${selected.id}` ? 'Checking…' : 'Watch now'}</button></div>{selected.lastError && <p className="ops-monitor-error" role="status">{selected.lastError}</p>}<details className="ops-inventory"><summary>Dependency inventory · {selected.inventory.length}<ChevronDown size={13}/></summary><ul>{selected.inventory.map(item => <li key={`${item.manifestPath}-${item.name}`}><div><strong>{item.name}</strong><code>{item.version}</code></div><span>{item.ecosystem} · {item.manifestPath}</span></li>)}</ul></details></div>}
  </section>;
}
