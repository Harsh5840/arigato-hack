'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {ArrowUpRight, ChevronDown, FileCode2, Github, Plus, Trash2} from 'lucide-react';
import type {MonitoredRepository} from '@/types/monitoring';
import {japanTime} from './format';
import {canPrepareRepair, repairUnavailableReason} from './repair-capability';

interface Props {
  repositories: MonitoredRepository[];
  selectedIds: string[];
  focusedId: string;
  loaded: boolean;
  pending: string | null;
  onToggle: (id: string) => void;
  onAll: (selected: boolean) => void;
  onFocus: (id: string) => void;
  onAdd: (url: string) => Promise<boolean>;
  onWatch: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
}

function stackLabel(repository: MonitoredRepository): string {
  return repository.repairCapability?.stack.join(' · ') || [...new Set(repository.inventory.map(item => item.ecosystem === 'PyPI' ? 'Python' : item.ecosystem === 'Packagist' ? 'PHP' : item.ecosystem === 'Docker' ? 'Container' : 'Node.js'))].join(' · ');
}

export default function RepositoryPanel({repositories, selectedIds, focusedId, loaded, pending, onToggle, onAll, onFocus, onAdd, onWatch, onRemove}: Props) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const allRef = useRef<HTMLInputElement>(null);
  const focused = repositories.find(repository => repository.id === focusedId);
  const allSelected = repositories.length > 0 && selectedIds.length === repositories.length;
  useEffect(() => {if (allRef.current) allRef.current.indeterminate = selectedIds.length > 0 && !allSelected;}, [selectedIds.length, allSelected]);
  async function submit(event: FormEvent) {event.preventDefault(); if (await onAdd(url.trim())) {setUrl(''); setAdding(false);}}

  return <section className="ops-repository-panel ops-service-selector" id="repositories">
    <div className="ops-panel-heading"><div><h2><Github size={15}/>Choose services</h2><p>Check one service or Select all. These checkboxes control the next scan.</p></div><button className="button subtle" onClick={() => setAdding(value => !value)} aria-expanded={adding}><Plus size={13}/>Add repository</button></div>
    {adding && <form className="ops-add-repository" onSubmit={event => void submit(event)}><label htmlFor="repository-url">GitHub repository URL</label><div><input id="repository-url" type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://github.com/owner/project" autoComplete="url" disabled={!!pending}/><button className="button primary" type="submit" disabled={!!pending}>{pending === 'add' ? 'Detecting stack…' : 'Connect & inspect'}</button></div><p>The server checks repository access, detects packages and images, and identifies a test plan.</p></form>}
    <div className="ops-selector-toolbar"><label><input ref={allRef} type="checkbox" checked={allSelected} disabled={!repositories.length || !!pending} onChange={event => onAll(event.target.checked)}/>Select all</label><span>{selectedIds.length} of {repositories.length} selected</span></div>
    <ul className="ops-service-list">{repositories.map(repository => <li key={repository.id} className={repository.id === focusedId ? 'focused' : ''}>
      <label className="ops-service-check"><input type="checkbox" checked={selectedIds.includes(repository.id)} onChange={() => onToggle(repository.id)} aria-label={`Include ${repository.owner}/${repository.name}`} disabled={!!pending}/></label>
      <div className="ops-service-identity"><button onClick={() => onFocus(repository.id)} aria-current={repository.id === focusedId ? 'true' : undefined}>{repository.owner}/{repository.name}</button><span>{stackLabel(repository) || 'Stack detection pending'} · {repository.inventory.length} tracked</span><small>{repository.scanStatus === 'scanning' ? 'Scanning now' : repository.scanStatus === 'queued' ? 'Scan queued' : repository.lastCheckedAt ? `Last scan ${japanTime(repository.lastCheckedAt)} JST` : 'Never scanned'}</small></div>
      <div className="ops-service-row-controls"><label><input type="checkbox" checked={repository.enabled} disabled={!!pending} onChange={event => onWatch(repository.id, event.target.checked)}/>Continuous watch</label><span className={repository.autoRemediate ? 'automatic' : ''}>{repository.autoRemediate ? 'Auto fix on' : 'Scan only'}</span><button type="button" className="ops-service-remove" disabled={!!pending || repository.scanStatus === 'scanning'} title={repository.scanStatus === 'scanning' ? 'Wait for this scan to finish' : 'Stop monitoring and remove this service from ProofPatch'} onClick={() => onRemove(repository.id)}><Trash2 size={12}/>{pending === `remove:${repository.id}` ? 'Removing…' : 'Remove service'}</button></div>
    </li>)}</ul>
    {!repositories.length && <p className="ops-selector-empty">{loaded ? 'Add a GitHub repository to get started.' : 'Loading connected repositories…'}</p>}
    {focused && <details className="ops-focused-repository"><summary><FileCode2 size={14}/>Inspect {focused.owner}/{focused.name}<ChevronDown size={14}/></summary><div className="ops-focused-body"><p>{focused.repairCapability?.reason || repairUnavailableReason(focused)}</p><dl><div><dt>Detected stack</dt><dd>{stackLabel(focused) || 'Awaiting scan'}</dd></div><div><dt>Draft PR access</dt><dd>{focused.canPush ? 'Branch and PR permission verified' : 'Read only or unverified'}</dd></div><div><dt>Fix capability</dt><dd>{canPrepareRepair(focused) ? 'Supported after a confirmed advisory' : 'Scan and review only'}</dd></div></dl>{focused.repairCapability?.testCommands.length ? <div><strong>Relevant tests</strong><ul>{focused.repairCapability.testCommands.map(command => <li key={command}><code>{command}</code></li>)}</ul></div> : <p>No runnable test command detected yet.</p>}<a href={focused.url} target="_blank" rel="noreferrer">Open GitHub repository<ArrowUpRight size={12}/></a></div></details>}
  </section>;
}
