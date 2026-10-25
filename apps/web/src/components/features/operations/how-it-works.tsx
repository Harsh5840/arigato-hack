'use client';

import dynamic from 'next/dynamic';
import {useEffect, useRef, useState} from 'react';

const VerificationMachine = dynamic(() => import('../verification-machine'), {ssr: false, loading: () => <div className="how-core-loading" aria-hidden="true"/>});
/*
 * One source of truth for every number on this page: the recorded runs in output/live-runs.
 * Each completed run records the same 11 checks (all passed) and 3 model calls. The five groups
 * below partition those 11 checks; they are the interlock's five fingers, the five gates and the
 * press figure's five lamps.
 */
const checkGroups = [
  {name: 'Exact match', count: 1, body: 'The installed package or image version is matched against OSV, not by keyword.', ids: 'affected_inventory'},
  {name: 'Frozen baseline', count: 2, body: 'Baseline tests and the central runner are frozen before any change is written.', ids: 'frozen_baseline, runner_verifier'},
  {name: 'Scoped change', count: 2, body: 'Only the discovered manifest and its lockfile may change, and only as policy allows.', ids: 'candidate_scope, runner_scope'},
  {name: 'Fixed and passing', count: 3, body: 'The selected advisories no longer apply, the new version is what runs, and the frozen app tests pass.', ids: 'runner_no_known_advisories, runner_package_version, runner_business_suite'},
  {name: 'Verified identity', count: 3, body: 'Candidate, frozen tests and the trusted workflow run all match before a draft is opened.', ids: 'evidence_identity, evidence_schema, trusted_workflow'},
];
const TOTAL_CHECKS = checkGroups.reduce((sum, group) => sum + group.count, 0);
const HERO_STEPS = [0, 1, 2, 3, 4, 4];

type Lane = 'controller' | 'agent' | 'verifier' | 'human';
const laneLabel: Record<Lane, string> = {controller: 'Controller', agent: 'AI agent', verifier: 'Hosted verifier', human: 'You'};

const stations: {name: string; body: string; lanes: Lane[]; fact: string}[] = [
  {name: 'Watch', body: 'Official advisories and allowlisted forum leads are polled every five minutes. The Supply Chain agent triages new leads read-only. Exact version matching against OSV decides, never the model.', lanes: ['controller', 'agent'], fact: 'nginx 1.26.0 matched exactly'},
  {name: 'Repair', body: 'The Remediation agent changes one exact package or image reference, in at most two attempts. It cannot touch application code or integrity metadata.', lanes: ['agent'], fact: 'One line: 1.26.0 to 1.30.6'},
  {name: 'Verify', body: 'A hosted workflow freezes the baseline tests, runs the candidate in a no-network container, and records every check. A selected advisory that still applies blocks the PR.', lanes: ['verifier'], fact: '11 of 11 checks passed'},
  {name: 'Review', body: 'A separate senior reviewer reads the real diff and the 11 recorded checks. Its opinion is advisory. The checks are not.', lanes: ['agent', 'controller'], fact: '3 model calls per run'},
  {name: 'Draft PR', body: 'An open draft is published at the verified commit. Merging, deploying and incident follow-up stay with a person. Nothing is merge-ready automatically.', lanes: ['human'], fact: 'Draft PR #1, you decide'},
];

const shipped = [
  {repo: 'arigato-container-demo', pr: 1, stack: 'Container', change: 'nginx 1.26.0 to 1.30.6 in compose.yaml', elapsed: '1m 44s', tokens: 7136, url: 'https://github.com/Harsh5840/arigato-container-demo/pull/1', tone: 'sky'},
  {repo: 'arigato-python-demo', pr: 2, stack: 'Python', change: 'requests 2.31.0 to 2.34.2 in requirements.txt', elapsed: '55s', tokens: 5221, url: 'https://github.com/Harsh5840/arigato-python-demo/pull/2', tone: 'peri'},
  {repo: 'arigato-php-demo', pr: 6, stack: 'PHP', change: 'PHP 8.3.35 to 8.3.36 in the Dockerfile', elapsed: '2m 56s', tokens: 6210, url: 'https://github.com/Harsh5840/arigato-php-demo/pull/6', tone: 'terra'},
];

const numbers = [
  [String(shipped.length), 'draft PRs opened, one per demo repository'],
  [`${TOTAL_CHECKS} / ${TOTAL_CHECKS}`, 'recorded checks passed on every run'],
  ['3', 'model calls per run, in separate contexts'],
  ['0', 'automatic merges'],
];

const faqs = [
  ['Does ProofPatch merge or deploy anything?', 'No. It opens a draft pull request at the verified commit. A person reads it, merges it, deploys it and confirms the running service. mergeReady and findingClosed stay false.'],
  ['What can it repair automatically?', 'Exact PyPI pins, direct npm or Composer dependencies that have committed lockfiles, and official PHP or nginx image references in Dockerfiles or Compose files, when the repository has meaningful baseline tests. Everything else is monitored or blocked, never guessed at.'],
  ['What do the AI models actually do?', 'Three Groq-hosted gpt-oss agents triage leads, propose the smallest change and review it, each in a separate context. They are not Claude models and not independent assurance. Their explanations are untrusted. Exact findings, frozen tests and controller decisions are the evidence.'],
  ['Does a clean run mean the service is secure?', 'No. Counts are observed checks, not a security score. A selected CVE must disappear from the candidate, but unrelated scanner findings and coverage gaps stay visible for human review.'],
  ['Can it work on private repositories?', 'It can read the inventory of a private repository it has access to. The central verifier currently checks out public source anonymously, so private repositories are not yet eligible for automatic fixes.'],
];

export default function HowItWorks({onStart}: {onStart: () => void}) {
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const heroStage = HERO_STEPS[tick % HERO_STEPS.length];

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setTick(4); return; }
    const timer = setInterval(() => setTick(t => t + 1), 1700);
    return () => clearInterval(timer);
  }, []);

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
        <p className="how-label">Repository security watch</p>
        <h2>A security alert in. A reviewed fix out. <em>Nothing merges itself.</em></h2>
        <p className="how-lede">ProofPatch watches the dependencies your team already ships, proves a fix in a locked sandbox, and opens a draft pull request for a person to review.</p>
        <div className="how-actions">
          <button className="button primary" onClick={onStart}>Connect a repository</button>
          <a className="button" href="#how-press">Watch the press run</a>
        </div>
      </div>
      <figure className="how-plate how-machine">
        <figcaption>Fig. 1. The verification interlock. Each finger is one group of the {TOTAL_CHECKS} recorded checks. The patch cartridge slides out only when all five lift.</figcaption>
        <VerificationMachine stage={heroStage} blocked={false} running={heroStage > 0 && heroStage < 4}/>
        <ol className="how-checks" aria-label="The five check groups the fingers stand for">
          {checkGroups.map((group, i) => <li key={group.name} data-on={heroStage >= (i === 0 ? 1 : 3)}><b>{String(i + 1).padStart(2, '0')} · {group.count}</b>{group.name}</li>)}
        </ol>
      </figure>
    </section>

    <section className="how-mission">
      <p>Security tools usually end at an alert. This one ends at a <em>tested change</em> that a person can read in a minute. AI helps to find and write it. Deterministic code decides whether it is safe to show you.</p>
      <dl className="how-numbers">
        {numbers.map(([value, label]) => <div key={label}><dt>{value}</dt><dd>{label}</dd></div>)}
      </dl>
    </section>

    <section className="how-block" id="how-press">
      <header className="how-head"><span>01</span><h3>Five stations, one cartridge</h3></header>
      <div className="how-press">
        <ol className="how-steps" aria-label="Pipeline stages">
          {stations.map((station, index) => <li key={station.name} data-active={active === index} data-done={index < active}>
            <button onClick={() => go(index)} aria-current={active === index ? 'step' : undefined}>
              <span className="how-step-no">{String(index + 1).padStart(2, '0')}</span>
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
      </div>
    </section>

    <section className="how-block">
      <header className="how-head"><span>02</span><h3>Who is allowed to decide</h3></header>
      <div className="how-tracks">
        <article data-tone="peri">
          <span className="how-track-no">01</span>
          <h4>Controller and verifier</h4>
          <p>Plain code. It matches exact versions against OSV, freezes baseline tests, validates every identity and artifact, and is the only authority that can block or publish.</p>
          <small>Deterministic. No model in the loop.</small>
        </article>
        <article data-tone="sky">
          <span className="how-track-no">02</span>
          <h4>Three AI agents</h4>
          <ul>
            <li><b>Supply Chain</b><code>gpt-oss-20b</code><span>Triages leads, read-only.</span></li>
            <li><b>Remediation</b><code>gpt-oss-120b</code><span>Smallest change, two attempts.</span></li>
            <li><b>Senior review</b><code>gpt-oss-120b</code><span>Separate context from the fixer.</span></li>
          </ul>
          <small>They propose and explain. They cannot publish.</small>
        </article>
        <article data-tone="terra">
          <span className="how-track-no">03</span>
          <h4>You</h4>
          <p>Read the draft, merge it, deploy it and confirm the running service. The knob beside the tray on the press is the one part the machine never turns.</p>
          <small>The last word is always human.</small>
        </article>
      </div>
    </section>

    <section className="how-block">
      <header className="how-head"><span>03</span><h3>What it has shipped</h3></header>
      <ul className="how-shipped">
        {shipped.map(item => <li key={item.repo} data-tone={item.tone}>
          <span className="how-ship-no">#{item.pr}</span>
          <div className="how-ship-main"><h4>{item.repo}</h4><p>{item.change}</p><small>{item.stack}</small></div>
          <div className="how-ship-metric"><b>{TOTAL_CHECKS}/{TOTAL_CHECKS}</b><span>checks · {item.elapsed} · {item.tokens.toLocaleString('en-US')} tokens</span></div>
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Open draft PR ${item.pr} on ${item.repo}`}>Draft PR <span aria-hidden="true">↗</span></a>
        </li>)}
      </ul>
      <p className="how-note">Each figure is read from the recorded run: checks passed, time from start to draft, and tokens across its 3 model calls. Counts are observed checks, not a security score.</p>
    </section>

    <section className="how-block">
      <header className="how-head"><span>04</span><h3>{TOTAL_CHECKS} checks in five groups</h3></header>
      <ol className="how-gates">{checkGroups.map((group, i) => <li key={group.name}><b>{String(i + 1).padStart(2, '0')} · {group.count} {group.count === 1 ? 'check' : 'checks'}</b><strong>{group.name}</strong><p>{group.body}</p><code>{group.ids}</code></li>)}</ol>
    </section>

    <section className="how-block">
      <header className="how-head"><span>05</span><h3>Questions, answered</h3></header>
      <div className="how-faq">{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </section>
  </div>;
}
