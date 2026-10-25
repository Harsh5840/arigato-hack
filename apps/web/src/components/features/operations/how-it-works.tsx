'use client';

import dynamic from 'next/dynamic';
import {useEffect, useRef, useState} from 'react';
import {ArrowRight, Bot, Box, ShieldCheck, UserCheck, Wrench, Radar} from 'lucide-react';

const ProofCore = dynamic(() => import('./proof-core'), {ssr: false, loading: () => <div className="how-core-loading" aria-hidden="true"/>});

type Lane = 'controller' | 'agent' | 'verifier' | 'human';
const laneLabel: Record<Lane, string> = {controller: 'Controller', agent: 'AI agent', verifier: 'Hosted verifier', human: 'You'};

const stations: {name: string; body: string; lanes: Lane[]; fact: string}[] = [
  {name: 'Watch', body: 'Official advisories and allowlisted forum leads are polled every five minutes. The Supply Chain agent triages new leads read-only. Exact version matching against OSV decides, never the model.', lanes: ['controller', 'agent'], fact: 'nginx 1.26.0 matched exactly'},
  {name: 'Repair', body: 'The Remediation agent changes one exact package or image reference, in at most two attempts. It cannot touch application code or integrity metadata.', lanes: ['agent'], fact: 'One line: 1.26.0 to 1.30.6'},
  {name: 'Verify', body: 'A hosted workflow freezes the baseline tests, runs the candidate in a no-network container, then scans before and after. A selected CVE still present blocks the PR.', lanes: ['verifier'], fact: '5 check groups, 7 HTTP assertions'},
  {name: 'Review', body: 'A separate senior reviewer reads the real diff and the evidence the verifier observed. Its opinion is advisory, the controller gates are not.', lanes: ['agent', 'controller'], fact: '11 of 11 controller gates'},
  {name: 'Draft PR', body: 'An open draft is published at the verified commit. Merging, deploying and incident follow-up stay with a person. Nothing is merge-ready automatically.', lanes: ['human'], fact: 'Draft only, you decide'},
];

const numbers = [
  ['7', 'live HTTP assertions on the container draft PR'],
  ['11', 'controller and runner gates that passed'],
  ['831 to 391', 'Trivy findings, baseline to candidate'],
  ['0', 'automatic merges, ever'],
];

const gates = [
  ['Exact match', 'Package and version checked against OSV, not by keyword.'],
  ['Frozen baseline', 'Relevant tests are fixed before any change is written.'],
  ['Locked sandbox', 'No external network, secrets or Docker socket.'],
  ['Before and after', 'A selected CVE still present blocks publication.'],
  ['Draft only', 'Opens a draft at the verified commit and stops.'],
];

const proofs = [
  {repo: 'arigato-python-demo', pr: '#2', stack: 'PyPI requirement', value: 12, unit: 'business assertions'},
  {repo: 'arigato-container-demo', pr: '#1', stack: 'nginx 1.26.0 to 1.30.6', value: 7, unit: 'live HTTP assertions'},
  {repo: 'arigato-php-demo', pr: '#6', stack: 'PHP 8.3.36 image', value: 15, unit: 'storefront assertions'},
];

const CELLS = 22;
const blocks = (value: number, max: number) => {
  const filled = Math.max(1, Math.round((value / max) * CELLS));
  return '█'.repeat(filled) + '░'.repeat(CELLS - filled);
};

export default function HowItWorks({onStart}: {onStart: () => void}) {
  const [active, setActive] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data as {source?: string; stage?: number};
      if (data?.source === 'proof-press' && typeof data.stage === 'number') setActive(data.stage);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);
  const go = (index: number) => {
    setActive(index);
    frame.current?.contentWindow?.postMessage({source: 'proofpatch-ui', goto: index}, window.location.origin);
  };

  return <div className="how">
    <section className="how-hero">
      <div className="how-hero-copy">
        <h2>A security alert in. A reviewed fix out. <em>Nothing merges itself.</em></h2>
        <p>ProofPatch watches your repositories, proves a fix in a locked sandbox, and opens a draft PR. AI agents help. Deterministic code decides.</p>
        <div className="how-hero-actions">
          <button className="button primary" onClick={onStart}>Connect a repository<ArrowRight size={15}/></button>
          <a className="how-link" href="#how-press">Watch the press run</a>
        </div>
      </div>
      <div className="how-hero-stage" aria-hidden={false}>
        <ProofCore className="how-core"/>
        <ul className="how-legend" aria-label="Authorities shown as satellites on the ring">
          {(['controller', 'agent', 'verifier', 'human'] as Lane[]).map(lane => <li key={lane} data-lane={lane}><i/>{laneLabel[lane]}</li>)}
        </ul>
      </div>
      <dl className="how-numbers">
        {numbers.map(([value, label]) => <div key={label}><dt>{value}</dt><dd>{label}</dd></div>)}
      </dl>
    </section>

    <section className="how-press" id="how-press">
      <ol className="how-steps" aria-label="Pipeline stages">
        {stations.map((station, index) => <li key={station.name} data-active={active === index} data-done={index < active}>
          <button onClick={() => go(index)} aria-current={active === index ? 'step' : undefined}>
            <span className="how-step-mark"/>
            <span className="how-step-head"><strong>{station.name}</strong><small>{station.fact}</small></span>
          </button>
          <div className="how-step-body" hidden={active !== index}>
            <p>{station.body}</p>
            <div>{station.lanes.map(lane => <span key={lane} data-lane={lane}>{laneLabel[lane]}</span>)}</div>
          </div>
        </li>)}
      </ol>
      <div className="how-press-frame">
        <iframe ref={frame} src="/figures/proof-press.html" title="Interactive proof press: a cartridge moves through five stations" loading="lazy"/>
      </div>
    </section>

    <section className="how-authority">
      <header><h3>Who is allowed to decide</h3><p>Models explain and propose. Only the controller and the verifier can block or publish. A person owns everything after that.</p></header>
      <article className="how-a-controller" data-lane="controller">
        <Box size={20} strokeWidth={1.7}/>
        <h4>Controller and verifier</h4>
        <code>Deterministic code</code>
        <p>Matches exact versions against OSV, freezes baseline tests, validates every identity and artifact, and is the only authority that can publish.</p>
      </article>
      <article data-lane="agent"><Radar size={18} strokeWidth={1.7}/><h4>Supply Chain</h4><code>gpt-oss-20b</code><p>Triages leads. Read-only.</p></article>
      <article data-lane="agent"><Wrench size={18} strokeWidth={1.7}/><h4>Remediation</h4><code>gpt-oss-120b</code><p>Smallest change, two attempts.</p></article>
      <article data-lane="agent"><ShieldCheck size={18} strokeWidth={1.7}/><h4>Senior review</h4><code>gpt-oss-120b</code><p>Separate context from the fixer.</p></article>
      <article className="how-a-human" data-lane="human">
        <UserCheck size={20} strokeWidth={1.7}/>
        <h4>You</h4>
        <p>Read the draft, merge, deploy and confirm the running service. The knob beside the tray on the press is the only part the machine never turns.</p>
      </article>
    </section>

    <section className="how-evidence">
      <div className="how-gates">
        <h3>Five gates before a draft exists</h3>
        <ol>{gates.map(([title, body], i) => <li key={title}><b>{i + 1}</b><div><strong>{title}</strong><span>{body}</span></div></li>)}</ol>
      </div>
      <div className="how-proof">
        <h3>Recorded on real draft PRs</h3>
        <ul className="how-bars">{proofs.map(item => <li key={item.repo}>
          <div><strong>{item.repo}</strong><span>PR {item.pr} · {item.stack}</span></div>
          <div className="how-bar"><span className="how-blocks" aria-hidden="true">{blocks(item.value, 15)}</span><b>{item.value}</b><small>{item.unit}</small></div>
        </li>)}</ul>
        <p className="how-note"><Bot size={14}/>Counts are observed checks, not a security score. Residual scanner findings stay visible for review.</p>
      </div>
    </section>
  </div>;
}
