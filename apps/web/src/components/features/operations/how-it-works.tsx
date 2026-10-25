import {Bot, Box, ClipboardCheck, FlaskConical, GitPullRequestDraft, Github, Radar, SearchCheck, ShieldCheck, UserCheck, Wrench} from 'lucide-react';

type Lane = 'controller' | 'agent' | 'verifier' | 'human';
const laneLabel: Record<Lane, string> = {controller: 'Controller', agent: 'AI agent', verifier: 'Hosted verifier', human: 'You'};

const stages: {title: string; detail: string; lane: Lane; Icon: typeof Github}[] = [
  {title: 'Connect', detail: 'Add a GitHub URL. The server reads manifests and detects the stack and tests.', lane: 'controller', Icon: Github},
  {title: 'Watch', detail: 'Official advisories and forum leads are polled every five minutes.', lane: 'controller', Icon: Radar},
  {title: 'Triage', detail: 'Supply Chain agent reads new leads in read-only context and summarises them.', lane: 'agent', Icon: SearchCheck},
  {title: 'Repair', detail: 'Remediation agent edits only the exact package or image reference.', lane: 'agent', Icon: Wrench},
  {title: 'Verify', detail: 'Frozen tests and Trivy scans run in a no-network container.', lane: 'verifier', Icon: FlaskConical},
  {title: 'Review', detail: 'Senior reviewer inspects the real diff and the observed evidence.', lane: 'agent', Icon: ClipboardCheck},
  {title: 'Draft PR', detail: 'An open draft is published. A person decides whether to merge.', lane: 'human', Icon: GitPullRequestDraft},
];

const roles: {name: string; model: string; job: string; limit: string; Icon: typeof Bot; lane: Lane}[] = [
  {name: 'Supply Chain', model: 'openai/gpt-oss-20b', job: 'Triages new advisory and forum leads and records model, summary and token use.', limit: 'Read-only. Never confirms a finding on its own.', Icon: Radar, lane: 'agent'},
  {name: 'Remediation', model: 'openai/gpt-oss-120b', job: 'Proposes the smallest dependency or image-tag change, at most two attempts.', limit: 'Cannot touch application code or integrity metadata.', Icon: Wrench, lane: 'agent'},
  {name: 'Development Security', model: 'openai/gpt-oss-120b', job: 'Senior review of the actual change and the evidence the verifier observed.', limit: 'Separate context from the fixer. Advisory, not a gate.', Icon: ShieldCheck, lane: 'agent'},
  {name: 'Controller and verifier', model: 'Deterministic code', job: 'Matches exact versions against OSV, freezes baseline tests, validates identities, decides publication.', limit: 'The only authority that can block or publish.', Icon: Box, lane: 'controller'},
  {name: 'Human reviewer', model: 'You', job: 'Reads the draft PR, merges, deploys and confirms the running service.', limit: 'Nothing is merge-ready or closed automatically.', Icon: UserCheck, lane: 'human'},
];

const gates = [
  ['Exact match', 'Package and version are checked against OSV, not by keyword.'],
  ['Frozen baseline', 'Relevant tests are fixed before any change is written.'],
  ['Locked sandbox', 'Candidate runs with no external network, secrets or Docker socket.'],
  ['Before and after scan', 'A selected CVE still present in the candidate blocks the PR.'],
  ['Draft only', 'Publication opens a draft at the verified commit and nothing more.'],
];

const proofs = [
  {repo: 'arigato-python-demo', pr: '#2', stack: 'PyPI requirement', value: 12, unit: 'business assertions'},
  {repo: 'arigato-container-demo', pr: '#1', stack: 'nginx 1.26.0 to 1.30.6', value: 7, unit: 'live HTTP assertions'},
  {repo: 'arigato-php-demo', pr: '#6', stack: 'PHP 8.3.36 image', value: 15, unit: 'storefront assertions'},
];

const trivy = {before: 831, after: 391};

export default function HowItWorks({onStart}: {onStart: () => void}) {
  const drop = Math.round((1 - trivy.after / trivy.before) * 100);
  return <div className="how">
    <section className="how-hero">
      <div className="how-hero-copy">
        <h2>From a security alert to a pull request you can trust</h2>
        <p>ProofPatch watches your repositories, proves a fix works in a locked sandbox, and hands you a draft PR. Three AI agents help. Deterministic code makes every decision that matters.</p>
        <div className="how-hero-actions"><button className="button primary" onClick={onStart}>Connect a repository</button></div>
      </div>
      <figure className="how-track" aria-label="Seven stages from connecting a repository to a human reviewing a draft pull request">
        <ol>
          {stages.map(({title, detail, lane, Icon}, i) => <li key={title} data-lane={lane} style={{'--i': i} as React.CSSProperties}>
            <span className="how-node"><Icon size={20} strokeWidth={1.8}/></span>
            <strong>{title}</strong>
            <small>{detail}</small>
            <em>{laneLabel[lane]}</em>
          </li>)}
        </ol>
        <div className="how-rail" aria-hidden="true"><i/></div>
        <figcaption><span data-lane="controller">Controller</span><span data-lane="agent">AI agent</span><span data-lane="verifier">Hosted verifier</span><span data-lane="human">Human</span></figcaption>
      </figure>
    </section>

    <section className="how-section">
      <h3>Who does what</h3>
      <p className="how-lede">Authority is split on purpose. Models explain and propose. Only the controller and verifier can block or publish.</p>
      <div className="how-roles">
        {roles.map(({name, model, job, limit, Icon, lane}) => <article key={name} data-lane={lane}>
          <header><span><Icon size={18} strokeWidth={1.8}/></span><div><strong>{name}</strong><code>{model}</code></div></header>
          <p>{job}</p>
          <small>{limit}</small>
        </article>)}
      </div>
    </section>

    <section className="how-section how-split">
      <div>
        <h3>Five gates before a draft exists</h3>
        <ol className="how-gates">{gates.map(([title, body], i) => <li key={title} style={{'--i': i} as React.CSSProperties}><b>{i + 1}</b><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol>
      </div>
      <div className="how-proof">
        <h3>Recorded evidence</h3>
        <p className="how-lede">Real draft PRs from the three judging repositories. Counts are observed checks, not a security score.</p>
        <ul className="how-bars">{proofs.map(item => <li key={item.repo}>
          <div><strong>{item.repo}</strong><span>PR {item.pr} · {item.stack}</span></div>
          <div className="how-bar"><i style={{'--w': `${(item.value / 15) * 100}%`} as React.CSSProperties}/><b>{item.value}</b></div>
          <small>{item.unit}</small>
        </li>)}</ul>
        <div className="how-scan">
          <div><span>Trivy findings, nginx and PHP images</span><strong>{trivy.before} to {trivy.after}</strong></div>
          <div className="how-scan-bars" aria-label={`Findings fell from ${trivy.before} to ${trivy.after}, a ${drop} percent drop`}>
            <div><label>Baseline</label><i style={{'--w': '100%'} as React.CSSProperties} className="before"/><b>{trivy.before}</b></div>
            <div><label>Candidate</label><i style={{'--w': `${(trivy.after / trivy.before) * 100}%`} as React.CSSProperties} className="after"/><b>{trivy.after}</b></div>
          </div>
          <small>All severities. Residual findings stay visible for human review.</small>
        </div>
      </div>
    </section>
  </div>;
}
