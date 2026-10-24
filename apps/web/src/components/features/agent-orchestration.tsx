'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, applyNodeChanges, useNodesInitialized, useReactFlow, useStore, type Node, type NodeProps, type NodeChange, type Edge } from '@xyflow/react';
import { Radar, Wrench, ShieldCheck, GitBranch, Network, Database, LockKeyhole, UserCheck, Play, Square, RotateCcw, Download, ArrowUpRight, Check, Minus, AlertTriangle } from 'lucide-react';
import { agents, demoCases, draftEligible, gateChecks, idleRun, orchestrationReducer, sequenceFor, type CandidateOutcome, type DemoCase, type OrchestrationNodeId, type RunStatus } from '@/lib/orchestration';

type FlowData = { title:string; subtitle:string; detail:string; kind:'agent'|'system'; index?:string; state:string; active:boolean; done:boolean; held:boolean; mobile:boolean };
type SecurityNode = Node<FlowData, 'security'>;
const icons = { 'supply-chain':Radar, remediation:Wrench, devsec:ShieldCheck, intake:GitBranch, controller:Network, evidence:Database, gate:LockKeyhole, review:UserCheck };
const labels:Record<OrchestrationNodeId,string> = { 'supply-chain':'Supply Chain Agent', remediation:'Remediation Agent', devsec:'Development Security Agent', intake:'Repository + advisories', controller:'Orchestration controller', evidence:'Shared evidence store', gate:'Deterministic gate', review:'Developer review' };
const systemDetails:Record<string,{description:string;inputs:string[];outputs:string[];permission:string}> = {
  intake:{description:'A repository, its component inventory, approved advisory feeds and local change events start a scoped job.',inputs:['Repository and lockfile snapshot','Local change or advisory event'],outputs:['Versioned input snapshot'],permission:'Only explicitly connected repositories and approved sources enter the workflow.'},
  controller:{description:'Routes typed jobs between the three agents and enforces budgets, timeouts and tool permissions. This is deterministic infrastructure, not a fourth agent.',inputs:['Trigger and repository scope','Execution policy and run budget'],outputs:['Agent job and trace ID','Stop, retry or escalation decision'],permission:'Cannot override the evidence gate or grant an agent merge authority.'},
  evidence:{description:'Keep the baseline, candidate diff, frozen tests, results and code identities in one replayable record.',inputs:['Artifacts from all three agents'],outputs:['Versioned evidence manifest'],permission:'Planned append-only artifacts. Demo IDs are illustrative, not cryptographic hashes.'},
  gate:{description:'Compute eligibility from recorded conditions and unresolved follow-up. A failed or missing check holds the draft.',inputs:['Security and benign-control results','Test and code identities','Outstanding incident or environment review'],outputs:['Ready for review, blocked, or follow-up required'],permission:'No agent may override this decision. Passing checks do not prove absence of other vulnerabilities.'},
  review:{description:'A developer inspects the patch, evidence and outstanding limits before deciding whether to merge.',inputs:['Eligible candidate and evidence bundle'],outputs:['Human review decision'],permission:'No automatic merge or production deployment. The prototype does not create a pull request.'},
};
const statusText:Record<RunStatus,string> = {idle:'Ready to simulate',running:'Simulation running',blocked:'Held · regression failed',ready:'Ready for human review','needs-review':'Follow-up required',cancelled:'Simulation stopped'};

function AgentNode({data,id}:NodeProps<SecurityNode>) {
  const Icon=icons[id as OrchestrationNodeId];
  return <div className={`orchestration-node ${data.kind} ${data.active?'is-active':''} ${data.done?'is-done':''} ${data.held?'is-held':''}`}>
    <Handle type="target" position={Position.Left} id="in-left"/><Handle type="target" position={Position.Top} id="in-top"/><Handle type="target" position={Position.Right} id="in-right"/><Handle type="target" position={Position.Bottom} id="in-bottom"/>
    <div className="flow-node-heading"><Icon size={18}/><span>{data.kind==='agent'?`Agent ${data.index}`:'Control layer'}</span><i className={data.active?'live':''}/></div>
    <strong>{data.title}</strong><p>{data.subtitle}</p>
    {data.kind==='agent'&&<div className="flow-node-footer"><span>{data.detail}</span><span>{data.state}</span></div>}
    <Handle type="source" position={Position.Right} id="out-right"/><Handle type="source" position={Position.Bottom} id="out-bottom"/><Handle type="source" position={Position.Top} id="out-top"/><Handle type="source" position={Position.Left} id="out-left"/>
  </div>;
}
const nodeTypes={security:AgentNode};
function InitialFit({mobile}:{mobile:boolean}) {
  const initialized=useNodesInitialized();
  const {fitView}=useReactFlow();
  const width=useStore(state=>state.width);
  const height=useStore(state=>state.height);
  useEffect(()=>{if(initialized&&width>0&&height>0)void fitView({padding:mobile?.3:.08,duration:0});},[initialized,mobile,fitView,width,height]);
  return null;
}
const order:OrchestrationNodeId[]=['intake','controller','supply-chain','remediation','devsec','evidence','gate','review'];
const desktopPositions={intake:{x:0,y:0},controller:{x:350,y:0},'supply-chain':{x:0,y:160},remediation:{x:700,y:160},devsec:{x:350,y:160},evidence:{x:0,y:430},gate:{x:350,y:430},review:{x:700,y:430}};
const mobileOrder:OrchestrationNodeId[]=['controller','supply-chain','devsec','remediation','gate','review'];
function makeNodes(mobile:boolean):SecurityNode[] {
  return order.filter(id=>!mobile||mobileOrder.includes(id)).map(id=>{
    const agent=agents.find(a=>a.id===id);
    const mobileIndex=mobileOrder.indexOf(id);
    const subtitle=agent?.verb??({intake:'Inventory, feeds, local changes',controller:'Scope · dispatch · budgets',evidence:'Baseline · patch · test identity',gate:'All checks + no open follow-up',review:'A human owns the merge'}[id as keyof typeof systemDetails]??'');
    return {id,type:'security',position:mobile?{x:0,y:mobileIndex===0?0:mobileIndex===1?135:mobileIndex===2?365:mobileIndex===3?595:mobileIndex===4?825:980}:desktopPositions[id],data:{title:labels[id],subtitle,detail:agent?agent.id==='supply-chain'?'Read inventory + feeds':agent.id==='remediation'?'Write candidate branch':'Run isolated checks':'',kind:agent?'agent':'system',index:agent?String(agents.indexOf(agent)+1):undefined,state:'Planned',active:false,done:false,held:false,mobile},style:{width:250}};
  });
}
function baseEdges(mobile:boolean):Edge[] {
  const connections:[string,string,string,string,string][] = mobile ? [
    ['dispatch','controller','supply-chain','bottom','top'],['risk','supply-chain','devsec','bottom','top'],['repair','devsec','remediation','bottom','top'],['candidate','remediation','devsec','right','right'],['checks','devsec','gate','left','left'],['eligible','gate','review','bottom','top'],['feedback','gate','remediation','right','right'],
  ] : [
    ['inventory','intake','supply-chain','bottom','top'],['dispatch','controller','devsec','bottom','top'],['risk','supply-chain','devsec','right','left'],['repair','devsec','remediation','right','left'],['candidate','remediation','devsec','top','top'],['checks','devsec','gate','bottom','left'],['eligible','gate','review','right','left'],['artifacts','supply-chain','evidence','bottom','top'],['manifest','evidence','gate','right','left'],['feedback','gate','remediation','top','bottom'],
  ];
  const edgeLabels:Record<string,string>={dispatch:'Scoped job',risk:'Risk brief',repair:mobile?'Frozen checks':'Repair request',candidate:mobile?'Candidate':'Candidate replay',checks:mobile?'Results':'Check results',eligible:'Review gate',artifacts:'Artifacts',manifest:'Evidence',feedback:mobile?'Retry':'Failed check'};
  return connections.map(([id,source,target,sourceHandle,targetHandle])=>({id,source,target,sourceHandle:`out-${sourceHandle}`,targetHandle:`in-${targetHandle}`,type:'smoothstep',label:edgeLabels[id],pathOptions:{offset:mobile&&id==='feedback'?35:20},markerEnd:{type:MarkerType.ArrowClosed,color:'#879878',width:16,height:16},style:{stroke:'#69795b',strokeWidth:1.4},labelStyle:{fill:'#c5cdbb',fontSize:11,fontWeight:500},labelBgStyle:{fill:'#181c16'},labelBgPadding:[7,4] as [number,number],labelBgBorderRadius:4}));
}

export default function AgentOrchestration({onOpenFindings}:{onOpenFindings:()=>void}) {
  const [run,dispatch]=useReducer(orchestrationReducer,undefined,idleRun);
  const [scenario,setScenario]=useState<DemoCase>('dependency');
  const [outcome,setOutcome]=useState<CandidateOutcome>('pass');
  const [selected,setSelected]=useState<OrchestrationNodeId>('supply-chain');
  const [mobile,setMobile]=useState(false);
  const [nodes,setNodes]=useState<SecurityNode[]>(()=>makeNodes(false));
  useEffect(()=>{const query=window.matchMedia('(max-width: 680px)');const update=()=>{setNodes(makeNodes(query.matches));setMobile(query.matches);};update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  useEffect(()=>{if(run.status!=='running')return;const timer=setTimeout(()=>dispatch({type:'advance'}),850);return()=>clearTimeout(timer);},[run.status,run.cursor]);
  const current=run.status==='running'?sequenceFor(run.scenario)[run.cursor]:null;
  const shownNodes=useMemo(()=>nodes.map(node=>({...node,selected:node.id===selected,data:{...node.data,active:node.id===current,done:run.completed.includes(node.id as OrchestrationNodeId),held:node.id==='gate'&&(run.status==='blocked'||run.status==='needs-review'),state:node.id===current?'Running':run.completed.includes(node.id as OrchestrationNodeId)?'Recorded':'Planned'}})),[nodes,selected,current,run.completed,run.status]);
  const edges=useMemo(()=>baseEdges(mobile).map(edge=>({...edge,animated:run.status==='running'&&(edge.source===current||edge.target===current),style:{...edge.style,...(edge.id==='feedback'?{strokeDasharray:'5 5'}:{})}})),[mobile,run.status,current]);
  const onNodesChange=useCallback((changes:NodeChange<SecurityNode>[])=>{const selection=changes.find(change=>change.type==='select'&&change.selected);if(selection?.type==='select')setSelected(selection.id as OrchestrationNodeId);setNodes(nodes=>applyNodeChanges(changes,nodes));},[]);
  const agent=agents.find(a=>a.id===selected);
  const detail=agent??systemDetails[selected];
  const activeCase=demoCases[run.status==='idle'?scenario:run.scenario];
  const checks=gateChecks(run);
  function reset(){dispatch({type:'reset'});setScenario('dependency');setOutcome('pass');setNodes(makeNodes(mobile));}
  function exportTrace(){const report={product:'ProofPatch',mode:'SIMULATED_DEMO',run,agents,gate:checks,draftEligible:draftEligible(run),followUp:activeCase.followUp,limitations:['No model agent, scanner, watcher or pentest executed','No repository or runtime changed','No pull request created','Demo identities are not cryptographic hashes']};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='proofpatch-orchestration-demo.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  return <div className="orchestration-page">
    <section className="hero orchestration-hero"><div><h1>Agent orchestration</h1><p>Three agents. One evidence trail. A human at the merge.</p></div><button className="button subtle" onClick={onOpenFindings}>Review findings<ArrowUpRight size={14}/></button></section>
    <section className="mobile-agent-summary" aria-label="Three agent roles and handoffs"><dl>{agents.map(item=><div key={item.id}><dt>{item.name}</dt><dd>{item.verb}</dd></div>)}</dl><p>Supply Chain → DevSec baseline → Remediation → DevSec replay → human review</p></section>
    <div className="orchestration-intro"><p>Catch upstream risk, prepare the repair, and verify local behavior.</p><span><span className="orchestration-dot"/>Interactive architecture · simulated execution</span></div>
    <section className="orchestration-workbench" aria-label="Three-agent orchestration simulator">
      <div className="orchestration-toolbar">
        <label>Demo case<select value={scenario} disabled={run.status==='running'} onChange={e=>{dispatch({type:'reset'});setScenario(e.target.value as DemoCase);}}>{Object.entries(demoCases).map(([id,item])=><option key={id} value={id}>{item.label}</option>)}</select></label>
        <label>Candidate outcome<select value={outcome} disabled={run.status==='running'} onChange={e=>{dispatch({type:'reset'});setOutcome(e.target.value as CandidateOutcome);}}><option value="pass">Checks pass</option><option value="regression">Regression fails</option></select></label>
        <div className="orchestration-run-actions">{run.status==='running'?<button className="button outline" onClick={()=>dispatch({type:'cancel'})}><Square size={13}/>Stop simulation</button>:<button className="button primary" onClick={()=>dispatch({type:'start',scenario,outcome})}><Play size={14} fill="currentColor"/>{run.status==='idle'?'Simulate handoff':'Run again'}</button>}<button className="flow-reset" onClick={reset} aria-label="Reset orchestration"><RotateCcw size={16}/></button></div>
      </div>
      <div className="orchestration-case"><p>{activeCase.summary}</p><span>{activeCase.boundary}</span></div>
      <div className="flow-status-strip"><span className={run.status==='blocked'||run.status==='needs-review'?'flow-status held':'flow-status'} role="status" aria-live="polite"><i/>{statusText[run.status]}</span><span>Drag nodes · zoom · select a role</span></div>
      <div className={`orchestration-canvas ${mobile?'is-mobile':''}`} style={{width:'100%',height:mobile?1160:570}} aria-label="Interactive agent handoff diagram">
        <ReactFlow key={mobile?'mobile':'desktop'} nodes={shownNodes} edges={edges} onNodesChange={onNodesChange} onNodeClick={(_,node)=>setSelected(node.id as OrchestrationNodeId)} nodeTypes={nodeTypes} fitViewOptions={{padding:mobile?.3:.08}} minZoom={.3} maxZoom={1.8} nodesConnectable={false} deleteKeyCode={null} colorMode="dark" preventScrolling={false} proOptions={{hideAttribution:false}} ariaLabelConfig={{'controls.zoomIn.ariaLabel':'Zoom into agent diagram','controls.zoomOut.ariaLabel':'Zoom out of agent diagram','controls.fitView.ariaLabel':'Fit agent diagram','node.a11yDescription.default':'Press Enter to select a node, then use arrow keys to move it.'}}>
          <InitialFit mobile={mobile}/><Background gap={24} size={1} color="#394131"/><Controls showInteractive={false} fitViewOptions={{padding:mobile?.3:.08}}/>
        </ReactFlow>
      </div>
      <div className="orchestration-flow-caption"><span><Network size={14}/>DevSec records the baseline before Remediation writes.</span><span><Database size={14}/>Controller routes jobs; the gate decides eligibility.</span></div>
    </section>
    <div className="orchestration-detail-grid">
      <section className="orchestration-inspector" aria-label="Selected role details">
        <div className="orchestration-section-heading"><h2>Inside the role</h2><span>Permissions are separate</span></div>
        <div className="agent-picker" aria-label="Select agent">{agents.map(item=><button key={item.id} aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}>{item.shortName}</button>)}</div>
        <h3>{labels[selected]}</h3><p className="agent-description">{detail.description}</p>
        <div className="agent-contract"><div><h4>Receives</h4><ul>{detail.inputs.map(input=><li key={input}>{input}</li>)}</ul></div><div><h4>Returns</h4><ul>{detail.outputs.map(output=><li key={output}>{output}</li>)}</ul></div></div>
        {agent&&<p className="agent-tools"><strong>Planned tools</strong>{agent.tools.join(' · ')}</p>}
        <p className="agent-permission"><LockKeyhole size={15}/>{detail.permission}</p>
      </section>
      <section className="orchestration-gate" aria-label="Evidence gate">
        <div className="orchestration-section-heading"><h2>Evidence gate</h2><span>{checks.filter(c=>c.pass).length} / 5 recorded</span></div>
        <ul>{checks.map(check=><li key={check.label} className={check.pass?'passed':''}>{check.pass?<Check size={15}/>:<Minus size={15}/>}<span>{check.label}</span><small>{check.pass?'Pass':run.status==='blocked'&&check.label==='Legitimate behavior preserved'?'Failed':'Pending'}</small></li>)}</ul>
        <div className={`orchestration-decision ${draftEligible(run)?'eligible':''}`}><UserCheck size={19}/><div><strong>{draftEligible(run)?'Eligible for developer review':run.status==='blocked'?'Draft held. Send evidence back.':run.status==='needs-review'?'Owner follow-up required':'Draft remains held'}</strong><p>{draftEligible(run)?'All represented checks passed. A human still decides whether to merge.':run.status==='blocked'?'The repair broke legitimate behavior. Remediation must propose another candidate.':'Missing checks or outstanding review prevent draft eligibility.'}</p></div></div>
        {run.status==='needs-review'&&<p className="orchestration-followup"><AlertTriangle size={16}/>{activeCase.followUp}</p>}
      </section>
    </div>
    <section className="orchestration-trace"><div className="orchestration-section-heading"><h2>Handoff trace</h2><button className="button subtle" onClick={exportTrace} disabled={!run.events.length}><Download size={14}/>Export trace</button></div>{run.events.length?<ol>{run.events.map(event=><li key={event.sequence}><span>{String(event.sequence).padStart(2,'0')}</span><div><strong>{labels[event.node]}</strong><p>{event.message}</p></div></li>)}</ol>:<div className="trace-empty"><GitBranch size={22}/><div><strong>No handoff recorded yet</strong><p>Choose a case and simulate the agent workflow. No scanner or security test executes.</p></div></div>}</section>
    <section className="orchestration-sources"><h2>Upstream risk has more than one shape.</h2><div><p><strong>Vulnerable runtime</strong>The October 21 PHP advisory concerns runtime vulnerabilities. Its October 23 follow-up retains a configuration review after the version update.<a href="https://www.php.net/archive/2026.php" target="_blank" rel="noreferrer">PHP security notices<ArrowUpRight size={13}/></a></p><p><strong>Compromised package</strong>The intercom/intercom-php Composer incident involves a malicious release. Investigation and credential response extend beyond a clean dependency diff.<a href="https://github.com/intercom/intercom-php/security/advisories/GHSA-gr3r-crp5-qrrm" target="_blank" rel="noreferrer">Maintainer advisory<ArrowUpRight size={13}/></a></p></div><span>Advisory snapshots checked 24 October 2026. Inventory and run outcomes above are fictional. Coverage is bounded; the system cannot establish that an application is fault-proof.</span></section>
  </div>;
}
