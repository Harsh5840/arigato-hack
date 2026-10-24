export type AgentId = 'supply-chain' | 'remediation' | 'devsec';
export type OrchestrationNodeId = AgentId | 'intake' | 'controller' | 'evidence' | 'gate' | 'review';
export type DemoCase = 'dependency' | 'local-change' | 'php-runtime' | 'package-compromise';
export type CandidateOutcome = 'pass' | 'regression';
export type RunStatus = 'idle' | 'running' | 'blocked' | 'ready' | 'needs-review' | 'cancelled';

export const agents = [
  {
    id:'supply-chain', name:'Supply Chain Agent', shortName:'Supply chain', verb:'Discover upstream risk',
    description:'Connect dependency and runtime inventory to authoritative advisories and package-compromise alerts.',
    inputs:['Lockfiles and SBOM','Runtime and image versions','Vendor advisories and provenance'],
    outputs:['Affected-component risk brief','Source, version range and confidence','Recommended remediation scope'],
    tools:['OSV / vendor advisory adapters','Composer and npm lockfile inventory','Runtime image inventory'],
    permission:'Read inventory and approved feeds. Cannot edit application code or run attacks.',
  },
  {
    id:'remediation', name:'Remediation Agent', shortName:'Remediation', verb:'Propose the repair',
    description:'Prepare a scoped code patch or supported fixed dependency/runtime update, then hand it back for independent checks.',
    inputs:['Risk brief or local-code finding','Frozen security expectation','Compatibility and change policy'],
    outputs:['Candidate diff and update plan','Regenerated lockfile proposal','Rationale and rollback notes'],
    tools:['Disposable Git branch','Package manager / runtime update plan','Build and compatibility checks'],
    permission:'Write only to a disposable branch. Cannot change frozen verifier tests or merge.',
  },
  {
    id:'devsec', name:'Development Security Agent', shortName:'DevSec', verb:'Watch, test and verify',
    description:'Watch local change events, inspect application logic, and run scoped security checks and legitimate-use regressions.',
    inputs:['Local commit or file-change event','Candidate code and frozen test pack','Explicitly authorized fixture scope'],
    outputs:['Local-code finding or replay result','Security and benign-control outcomes','Evidence linked to code and tests'],
    tools:['Local Git / file watcher','SAST and application regression adapters','Authorized staging security checks'],
    permission:'Run bounded checks in an isolated, owned environment. Cannot edit the candidate or target production.',
  },
] as const;

export const demoCases:Record<DemoCase,{label:string;summary:string;boundary:string;followUp:string|null}> = {
  dependency:{label:'Dependency update fixture',summary:'Fictional demo-parser 1.2.0 → 1.2.1. Follow an upstream finding through a candidate patch and verification.',boundary:'All versions and results in this fixture are synthetic.',followUp:null},
  'local-change':{label:'Local code-change fixture',summary:'A simulated local edit removes a tenant boundary. DevSec requests a repair, then verifies the candidate.',boundary:'No files are watched or changed. The local-change event is simulated.',followUp:null},
  'php-runtime':{label:'PHP runtime advisory snapshot',summary:'Illustrative inventory on PHP 8.3.35 is matched to the October 21 advisory. PHP 8.3.36 is the branch-specific candidate update.',boundary:'Real advisory, fictional inventory and simulated checks. No PHP service or exploit executes.',followUp:'The October 23 configuration follow-up still needs environment review. A version update alone does not close that review.'},
  'package-compromise':{label:'Composer compromise snapshot',summary:'The intercom/intercom-php 5.0.2 tag was compromised on April 30. The advisory identifies a clean 5.0.1 fallback and a reverted tag.',boundary:'Real incident, fictional inventory and simulated checks. No affected package is installed.',followUp:'Potential credential exposure requires incident review and credential rotation by the owner. A dependency diff cannot establish containment.'},
};

export interface RunEvent {sequence:number;node:OrchestrationNodeId;message:string}
export interface OrchestrationRun {
  status:RunStatus;scenario:DemoCase;outcome:CandidateOutcome;cursor:number;
  completed:OrchestrationNodeId[];events:RunEvent[];
}
export type RunAction =
  | {type:'start';scenario:DemoCase;outcome:CandidateOutcome}
  | {type:'advance'}
  | {type:'cancel'}
  | {type:'reset'};

export function sequenceFor(scenario:DemoCase):OrchestrationNodeId[] {
  return scenario==='local-change'
    ? ['controller','devsec','remediation','devsec','gate']
    : ['controller','supply-chain','devsec','remediation','devsec','gate'];
}
export function idleRun():OrchestrationRun {
  return {status:'idle',scenario:'dependency',outcome:'pass',cursor:0,completed:[],events:[]};
}
export function gateChecks(run:OrchestrationRun) {
  const replayFinished=run.completed.includes('devsec')&&run.completed.includes('remediation')&&run.completed.includes('gate');
  return [
    {label:run.scenario==='local-change'?'Baseline failure recorded':'Affected baseline recorded',pass:run.completed.includes('devsec')},
    {label:'Candidate security check passes',pass:replayFinished},
    {label:'Legitimate behavior preserved',pass:replayFinished&&run.outcome==='pass'},
    {label:'Same frozen test identity',pass:replayFinished},
    {label:'Matching code identity',pass:replayFinished},
  ];
}
function messageFor(node:OrchestrationNodeId,run:OrchestrationRun):string {
  if(node==='controller')return 'Controller accepted a scoped simulation job; budgets and permission boundaries are represented.';
  if(node==='supply-chain')return run.scenario==='php-runtime'?'Vendor PHP advisory linked to fictional runtime inventory.':run.scenario==='package-compromise'?'Composer compromise advisory linked; incident follow-up retained.':'Fictional dependency advisory matched to demo-parser 1.2.0.';
  if(node==='remediation')return 'Candidate repair and rollback notes prepared in the simulated branch; frozen tests remain unchanged.';
  if(node==='devsec')return (run.scenario==='local-change'&&run.cursor===1)?'Simulated local edit triggered a tenant-authorization finding; baseline test frozen.':run.cursor===2&&run.scenario!=='local-change'?'Affected baseline and check pack recorded before candidate writes (simulated).':run.outcome==='regression'?'Security replay passed but the legitimate-use control failed (simulated).':'Security replay and legitimate-use controls passed (simulated).';
  if(node==='gate')return run.outcome==='regression'?'Draft blocked. Return the failed regression evidence to Remediation.':demoCases[run.scenario].followUp?'Automated checks represented as passed; incident/configuration follow-up prevents draft eligibility.':'Five required evidence conditions satisfied. Human review is still required.';
  return '';
}
export function orchestrationReducer(run:OrchestrationRun,action:RunAction):OrchestrationRun {
  if(action.type==='reset')return idleRun();
  if(action.type==='start')return {...idleRun(),status:'running',scenario:action.scenario,outcome:action.outcome};
  if(action.type==='cancel')return run.status==='running'?{...run,status:'cancelled',events:[...run.events,{sequence:run.events.length+1,node:'controller',message:'Simulation stopped. No draft is eligible.'}]}:run;
  if(action.type!=='advance'||run.status!=='running')return run;
  const sequence=sequenceFor(run.scenario);
  const node=sequence[run.cursor];
  const final=run.cursor===sequence.length-1;
  const status:RunStatus=!final?'running':run.outcome==='regression'?'blocked':demoCases[run.scenario].followUp?'needs-review':'ready';
  return {...run,status,cursor:final?run.cursor:run.cursor+1,
    completed:Array.from(new Set([...run.completed,node])),
    events:[...run.events,{sequence:run.events.length+1,node,message:messageFor(node,run)}]};
}
export function draftEligible(run:OrchestrationRun):boolean {
  return run.status==='ready'&&gateChecks(run).every(check=>check.pass)&&!demoCases[run.scenario].followUp;
}
