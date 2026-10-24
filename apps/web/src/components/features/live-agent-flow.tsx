'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {ReactFlow, Background, Controls, Handle, Position, MarkerType, applyNodeChanges, useNodesInitialized, useReactFlow, useStore, type Node, type NodeProps, type NodeChange, type Edge} from '@xyflow/react';
import {Network, Radar, Wrench, ShieldCheck, LockKeyhole, UserCheck} from 'lucide-react';
import type {LiveEvent, LiveNode, LiveRun} from '@/types/live-orchestration';

type FlowData = {title: string; subtitle: string; agent: boolean; state: string; active: boolean; done: boolean; held: boolean};
type FlowNode = Node<FlowData, 'liveAgent'>;
const icons = {controller: Network, 'supply-chain': Radar, remediation: Wrench, devsec: ShieldCheck, gate: LockKeyhole, review: UserCheck};
const definitions: {id: LiveNode; title: string; subtitle: string; agent: boolean}[] = [
  {id: 'controller', title: 'Orchestration controller', subtitle: 'Scope, persistence and routing', agent: false},
  {id: 'supply-chain', title: 'Supply Chain Agent', subtitle: 'Corroborated alert → affected inventory', agent: true},
  {id: 'devsec', title: 'Development Security Agent', subtitle: 'Baseline, real checks and senior review', agent: true},
  {id: 'remediation', title: 'Remediation Agent', subtitle: 'Scoped update on a candidate branch', agent: true},
  {id: 'gate', title: 'Deterministic evidence gate', subtitle: 'Actual checks + reviewer decision', agent: false},
  {id: 'review', title: 'Human review', subtitle: 'Draft PR; merge stays with you', agent: false},
];
const positions: Record<LiveNode, {x: number; y: number}> = {controller: {x: 410, y: 0}, 'supply-chain': {x: 0, y: 145}, devsec: {x: 410, y: 145}, remediation: {x: 820, y: 145}, gate: {x: 410, y: 345}, review: {x: 820, y: 345}};
const mobileOrder: LiveNode[] = ['controller', 'supply-chain', 'devsec', 'remediation', 'gate', 'review'];
const mobileHandoffs = ['Controller → Supply Chain: scoped job', 'Supply Chain → DevSec: affected inventory', 'DevSec → Remediation: frozen baseline', 'Remediation → DevSec: candidate replay', 'DevSec → evidence gate: checks and review', 'Evidence gate → human: draft PR'];
function LiveAgentNode({id, data}: NodeProps<FlowNode>) {
  const Icon = icons[id as LiveNode];
  return <div className={`live-flow-node ${data.agent ? 'agent' : 'system'} ${data.active ? 'is-active' : ''} ${data.done ? 'is-done' : ''} ${data.held ? 'is-held' : ''}`}>
    <Handle type="target" position={Position.Top} id="top-in"/><Handle type="target" position={Position.Left} id="left-in"/><Handle type="target" position={Position.Right} id="right-in"/>
    <div><Icon size={17}/><span>{data.agent ? 'Agent' : id === 'review' ? 'Human authority' : 'Control layer'}</span><span>{data.state}</span></div>
    <strong>{data.title}</strong><p>{data.subtitle}</p>
    <Handle type="source" position={Position.Bottom} id="bottom-out"/><Handle type="source" position={Position.Right} id="right-out"/><Handle type="source" position={Position.Top} id="top-out"/>
  </div>;
}
const nodeTypes = {liveAgent: LiveAgentNode};
function InitialFit({mobile, compact}: {mobile: boolean; compact: boolean}) {
  const initialized = useNodesInitialized();
  const {fitView, fitBounds} = useReactFlow();
  const width = useStore(state => state.width);
  const height = useStore(state => state.height);
  const fit = useCallback(() => {
    // Mobile return paths use two reserved lanes beyond the node bounds.
    if (mobile) void fitBounds({x: -8, y: -10, width: 356, height: 1000}, {padding: .05, duration: 0});
    else void fitView({padding: compact ? .05 : .08, duration: 0});
  }, [mobile, compact, fitView, fitBounds]);
  useEffect(() => { if (initialized && width && height) fit(); }, [initialized, width, height, fit]);
  return <Controls showInteractive={false} onFitView={fit}/>;
}
function initialNodes(mobile: boolean, compact = false): FlowNode[] {
  return definitions.map(item => ({id: item.id, type: 'liveAgent', position: mobile ? {x: 0, y: mobileOrder.indexOf(item.id) * 174} : {...positions[item.id], x: compact ? positions[item.id].x / 410 * 340 : positions[item.id].x}, data: {...item, state: 'Not run', active: false, done: false, held: false}, style: {width: 250}}));
}
const statusNode: Partial<Record<LiveRun['status'], LiveNode>> = {queued: 'controller', 'source-fetching': 'supply-chain', triaging: 'supply-chain', matching: 'supply-chain', baseline: 'devsec', patching: 'remediation', verifying: 'devsec', reviewing: 'devsec', publishing: 'review'};
export default function LiveAgentFlow({run, events, onSelect, compact = false}: {run: LiveRun | null; events: LiveEvent[]; onSelect: (node: LiveNode) => void; compact?: boolean}) {
  const [mobile, setMobile] = useState(false);
  const [nodes, setNodes] = useState<FlowNode[]>(() => initialNodes(false, compact));
  useEffect(() => { const query = matchMedia('(max-width: 680px)'); const update = () => {setMobile(query.matches); setNodes(initialNodes(query.matches, compact));}; update(); query.addEventListener('change', update); return () => query.removeEventListener('change', update); }, [compact]);
  const active = run ? statusNode[run.status] : undefined;
  const shownNodes = useMemo(() => nodes.map(node => {
    const role = node.id === 'supply-chain' ? 'supply' : node.id === 'remediation' ? 'fixer' : node.id === 'devsec' ? 'reviewer' : null;
    const call = role ? run?.agentCalls.filter(item => item.role === role).at(-1) : undefined;
    const visited = events.some(event => event.node === node.id);
    const held = node.id === 'gate' && (run?.status === 'blocked' || run?.status === 'failed');
    const done = call?.status === 'completed' || (node.id === 'review' && !!run?.pullRequest) || (node.id === 'gate' && !!run?.draftPRAllowed);
    return {...node, data: {...node.data, active: node.id === active, done, held, state: node.id === active ? 'Running' : held ? 'Held' : done ? 'Recorded' : call?.status === 'failed' ? 'Failed' : visited ? 'Visited' : 'Not run'}};
  }), [nodes, active, run, events]);
  const edges = useMemo(() => {
    const links = mobile ? [
      ['dispatch', 'controller', 'supply-chain', 'Scoped job', 'bottom-out', 'top-in'],
      ['risk', 'supply-chain', 'devsec', 'Affected inventory', 'bottom-out', 'top-in'],
      ['frozen', 'devsec', 'remediation', 'Frozen baseline', 'bottom-out', 'top-in'],
      ['candidate', 'remediation', 'devsec', 'Candidate replay', 'right-out', 'right-in'],
      ['evidence', 'devsec', 'gate', 'Checks + review', 'right-out', 'right-in'],
      ['pr', 'gate', 'review', 'Draft PR', 'bottom-out', 'top-in'],
    ] : [
      ['dispatch', 'controller', 'supply-chain', 'Scoped job', 'bottom-out', 'top-in'],
      ['risk', 'supply-chain', 'devsec', 'Affected inventory', 'right-out', 'left-in'],
      ['frozen', 'devsec', 'remediation', 'Frozen baseline', 'right-out', 'left-in'],
      ['candidate', 'remediation', 'devsec', 'Candidate replay', 'top-out', 'top-in'],
      ['evidence', 'devsec', 'gate', 'Checks + review', 'bottom-out', 'top-in'],
      ['pr', 'gate', 'review', 'Draft PR', 'right-out', 'left-in'],
    ];
    return links.map(([id, source, target, label, sourceHandle, targetHandle], index) => ({id, source, target, label: mobile || compact ? String(index + 1) : label, ariaLabel: mobile || compact ? `${index + 1}. ${mobileHandoffs[index]}` : label, sourceHandle, targetHandle, type: 'smoothstep', pathOptions: {offset: mobile && id === 'candidate' ? 40 : mobile && id === 'evidence' ? 72 : 20}, animated: !!active && (source === active || target === active), markerEnd: {type: MarkerType.ArrowClosed, color: '#879878'}, style: {stroke: '#69795b', strokeWidth: 1.4}, labelStyle: {fill: '#c5cdbb', fontSize: 11}, labelBgStyle: {fill: '#181c16'}, labelBgPadding: [6, 4]} as Edge));
  }, [mobile, compact, active]);
  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => setNodes(previous => applyNodeChanges(changes, previous)), []);
  return <><div className={`orchestration-canvas live-flow-canvas ${mobile ? 'is-mobile' : ''}`} aria-label="Live agent orchestration diagram">
    <ReactFlow key={mobile ? 'mobile' : 'desktop'} nodes={shownNodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onNodeClick={(_, node) => onSelect(node.id as LiveNode)} nodesConnectable={false} deleteKeyCode={null} minZoom={.3} maxZoom={1.6} colorMode="dark" preventScrolling={false}>
      <InitialFit mobile={mobile} compact={compact}/><Background gap={24} color="#394131" size={1}/>
    </ReactFlow>
  </div>{(mobile || compact) && <ol className={`live-flow-legend ${compact ? 'compact' : ''}`} aria-label="Numbered diagram handoffs">{mobileHandoffs.map((handoff, index) => <li key={handoff}><span>{index + 1}</span>{handoff}</li>)}</ol>}</>;
}
