'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import { Play, RotateCcw, Download, CheckCircle2, GitBranch, ShieldCheck, CircleDot, ArrowUpRight, Activity } from 'lucide-react';

import Sidebar from '@/components/layout/sidebar';

import Queue from './queue';

import EvidencePreview from './evidence-preview';

import FindingDialog from './finding-dialog';

import Roadmap from './roadmap';

import VerificationMachine from './verification-machine';

import EvidenceCoverage from './evidence-coverage';

import { findings } from '@/lib/findings';

import { canPrepareDraft, verificationFor } from '@/lib/workflow';

import type { Scenario, Severity, Stage, View } from '@/types/security';

const initial: Record<string, Stage> = {'PP-001': 0, 'PP-002': 0, 'PP-003': 0};
const AgentOrchestration = dynamic(()=>import('./agent-orchestration'),{ssr:false,loading:()=> <p role="status">Loading agent workspace…</p>});

export default function Workspace() {

  const [view, setView] = useState<View>('Agents');
  const [orchestrationKey,setOrchestrationKey]=useState(0);

  const [selected, setSelected] = useState('PP-001');

  const [filter, setFilter] = useState<'All' | Severity>('All');

  const [stages, setStages] = useState(initial);

  const [blocked, setBlocked] = useState<Record<string,boolean>>({});

  const [scenario, setScenario] = useState<Scenario>('pass');

  const [dialog, setDialog] = useState(false);

  const [running, setRunning] = useState(false);

  const [activity, setActivity] = useState('Workspace ready. Run the demo to follow the full workflow.');

  const [loaded, setLoaded] = useState(false);

  const runId = useRef(0);

  const finding = findings.find(f => f.id === selected)!;

  const stage = stages[selected] || 0;

  const close = useCallback(() => setDialog(false), []);

  useEffect(() => {

    try { const saved = JSON.parse(localStorage.getItem('proofpatch-demo-v1') || 'null'); if (saved) { const safe = {...initial}; for(const id of Object.keys(safe)) if (Number.isInteger(saved.stages?.[id]) && saved.stages[id] >= 0 && saved.stages[id] <= 4) safe[id] = saved.stages[id]; setStages(safe); setBlocked(Object.fromEntries(Object.keys(safe).map(id=>[id,saved.blocked?.[id] === true]))); } } catch { /* Invalid or unavailable storage falls back to a clean demo. */ } setLoaded(true);

    return () => { runId.current += 1; };

  }, []);

  useEffect(() => { if (loaded) { try { localStorage.setItem('proofpatch-demo-v1', JSON.stringify({stages,blocked})); } catch { /* Demo still works without persistence. */ } } }, [stages,blocked,loaded]);

  function reset() { runId.current += 1; setOrchestrationKey(key=>key+1); setRunning(false); setStages({...initial}); setBlocked({}); setSelected('PP-001'); setScenario('pass'); setFilter('All'); setDialog(false); setActivity('Workspace ready. Run the demo to follow the full workflow.'); }

  function step() {

    if (stage === 4) return;

    if (stage === 2 || (stage === 3 && blocked[selected])) { const failed = scenario === 'regression'; setBlocked(p=>({...p,[selected]:failed})); setStages(p=>({...p,[selected]:3})); setActivity(failed ? 'DevSec: regression failed. Draft preparation blocked.' : 'DevSec: simulated replay and regression checks passed. Human review required.'); return; }

    if (stage === 3 && !canPrepareDraft(verificationFor(Boolean(blocked[selected])))) return;

    setStages(p=>({...p,[selected]:(stage+1) as Stage}));

    setActivity(stage===0 ? 'DevSec: seeded failure reproduced in the demo fixture.' : stage===1 ? 'Remediation: illustrative patch proposed. Verification is still required.' : 'Local draft prepared. No pull request was sent to GitHub.');

  }

  async function runDemo() {

    const token = ++runId.current; setRunning(true); setSelected('PP-001'); setFilter('All'); setScenario('pass'); setBlocked(p=>({...p,'PP-001':false})); setStages(p=>({...p,'PP-001':0}));

    const updates=['Controller: local-code finding routed to DevSec for tenant-boundary review.','DevSec: seeded failure reproduced. Tenant B received Tenant A’s invoice.','Remediation: tenant-scoped query proposed in the demo patch.','DevSec: seeded security replay and benign regressions passed.'];

    for (let i=0;i<4;i++) { setActivity(updates[i]); if(i) setStages(p=>({...p,'PP-001':i as Stage})); await new Promise(r=>setTimeout(r,850)); if(token!==runId.current) return; }

    setRunning(false); setDialog(true);

  }

  function changeScenario(value: Scenario) { setScenario(value); if(stage >=3) { setStages(p=>({...p,[selected]:2})); setBlocked(p=>({...p,[selected]:false})); setActivity('Demo outcome changed. Rerun verification before preparing a draft.'); } }

  function exportEvidence() {

    const report = { product:'ProofPatch', mode:'SIMULATED_DEMO', generatedAt:new Date().toISOString(), finding, stage, verification: stage >=3 ? verificationFor(Boolean(blocked[selected])) : null, draftEligible:stage>=3 && canPrepareDraft(verificationFor(Boolean(blocked[selected]))), baselineCommit:'DEMO-BASE',patchCommit:'DEMO-PATCH',testId:'DEMO-TEST-001',limitations:['Synthetic data only','No scanner or agent executed','No repository changed','No GitHub PR created','Demo identifiers are not cryptographic hashes']};

    const url = URL.createObjectURL(new Blob([JSON.stringify(report,null,2)], {type:'application/json'})); const a=document.createElement('a'); a.href=url;a.download=`proofpatch-${selected}-demo-evidence.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setActivity('Synthetic evidence bundle exported as JSON.');

  }

  const verified = findings.filter(f=>stages[f.id]>=3 && !blocked[f.id]).length;

  const reproduced = findings.filter(f=>stages[f.id]>=1).length;




  return <div className="app-shell">
    <Sidebar view={view} onChange={setView}/>
    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumb"><span className="workspace-avatar">A</span>Acme<span>/</span><strong>{view}</strong></div>
        <div className="topbar-actions"><span className="demo-badge"><i/>Synthetic workspace</span><button onClick={reset} className="reset"><RotateCcw size={14}/>Reset demo</button></div>
      </header>
      <main>
        {view === 'Agents' ? <AgentOrchestration key={orchestrationKey} onOpenFindings={()=>setView('Findings')}/> : view === 'Roadmap' ? <Roadmap/> : <>
          <section className="hero">
            <div><h1>{view === 'Overview' ? 'Security overview' : view === 'Findings' ? 'Findings' : 'Evidence library'}</h1><p>{view === 'Overview' ? 'From a security finding to a fix you can review.' : view === 'Findings' ? 'Prioritize the risk. Inspect the proposed repair.' : 'One trace for the failure, the patch, and the result.'}</p></div>
            <button className="button primary run-demo" onClick={runDemo} disabled={running}><Play size={15} fill="currentColor"/>{running ? 'Running demo…' : 'Run demo'}</button>
          </section>
          <div className="metrics">
            <div><span>Open findings</span><strong>{3-verified}<small>across 2 repositories</small></strong></div>
            <div><span>Reproduced</span><strong>{reproduced}<small>failure in a seeded fixture</small></strong></div>
            <div><span>Verified fixes</span><strong className={verified ? 'text-green' : ''}>{verified}<small>{verified ? 'ready for human review' : 'awaiting replay'}</small></strong></div>
            <div><span>Merge authority</span><strong className="human-metric"><ShieldCheck size={23}/>Human<small>always reviewed</small></strong></div>
          </div>
          {view === 'Overview' && <section className="review-stage">
            <div className="case-focus">
              <div className="case-meta"><span className={'severity '+finding.severity.toLowerCase()}>{finding.severity}</span><span>{finding.id}</span><span className="case-status"><CircleDot size={12}/>{blocked[selected] ? 'Blocked by regression' : stage >= 3 ? 'Evidence ready' : 'Needs verification'}</span></div>
              <h2>{finding.title}</h2>
              <p>{finding.summary}</p>
              <div className="case-repo"><GitBranch size={14}/>{finding.repo}<span>/</span>{finding.area}</div>
              <button className="button outline" onClick={()=>setDialog(true)}>Review finding<ArrowUpRight size={15}/></button>
              <div className="agent-pipeline" aria-label="Security agent workflow">
                {[['Supply chain','Discover'],['Remediation','Repair'],['DevSec','Verify']].map(([name,job],i)=><div key={name} className={running || stage>i ? 'agent-complete' : ''}><span className="pipeline-node">{i+1}</span><span><strong>{name}</strong><small>{job}</small></span>{i<2 && <span className="pipeline-connection"/>}</div>)}
              </div>
            </div>
            <div className="machine-panel">
              <div className="machine-panel-heading"><span>Verification interlock</span><span className="machine-state"><i/>{blocked[selected] ? 'Held' : stage>=3 ? 'Ready' : 'Awaiting checks'}</span></div>
              <VerificationMachine stage={stage} blocked={Boolean(blocked[selected])} running={running}/>
              <div className="machine-caption"><span>{blocked[selected] ? 'One failed check keeps the patch held.' : 'Every required check must align.'}</span><span>Synthetic model</span></div>
            </div>
          </section>}
          {view === 'Evidence' ? <section className="panel evidence-library">
            <div className="panel-heading"><h2>Reviewable records<span>3 synthetic fixtures</span></h2><button className="button subtle" onClick={exportEvidence}><Download size={14}/>Export selected</button></div>
            {findings.map(f=><button className="evidence-record" key={f.id} onClick={()=>{setSelected(f.id);setDialog(true);}}><CheckCircle2 size={21}/><div><strong>{f.title}</strong><span>{f.id} / {stages[f.id]>=3 ? blocked[f.id] ? 'Blocked by regression' : 'Verification available' : 'Verification pending'}</span></div><span>View evidence<ArrowUpRight size={14}/></span></button>)}
          </section> : <div className="workspace-grid">
            <Queue items={findings} selected={selected} onSelect={setSelected} filter={filter} setFilter={setFilter} stages={stages} blocked={blocked}/>
            <EvidencePreview finding={finding} stage={stage} blocked={Boolean(blocked[selected])} open={()=>setDialog(true)}/>
          </div>}
          <div className="coverage-activity"><EvidenceCoverage stage={stage} blocked={Boolean(blocked[selected])}/><div className="activity" role="status" aria-live="polite"><div><Activity size={15}/><strong>Latest activity</strong><span>Demo session</span></div><p>{activity}</p><span>Simulation only. Run checks in an isolated fixture in the next phase.</span></div></div>
        </>}
      </main>
    </div>
    {dialog && <FindingDialog key={selected} finding={finding} stage={stage} blocked={Boolean(blocked[selected])} scenario={scenario} onScenario={changeScenario} onStep={step} onClose={close} onExport={exportEvidence}/>}
  </div>;
}
