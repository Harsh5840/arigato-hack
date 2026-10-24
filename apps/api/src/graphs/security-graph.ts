import { END, START, StateGraph, StateSchema, type BaseCheckpointSaver } from '@langchain/langgraph';
import { z } from 'zod/v4';

/** Shared workflow: the ecosystem-specific strategy supplies work, never edges. */
export const SecurityState = new StateSchema({
  runId: z.string(),
  attempt: z.number().int().min(0).max(2).default(0),
  feedback: z.string().optional(),
  decision: z.enum(['continue', 'retry', 'publish', 'block']).default('continue'),
  data: z.record(z.string(), z.unknown()).default(() => ({})),
});

export type SecurityGraphState = typeof SecurityState.State;
export type SecurityGraphUpdate = typeof SecurityState.Update;
export const securityNodeNames = ['source', 'inventory', 'triage', 'baseline', 'repair', 'verify', 'review', 'gate', 'publish', 'blocked'] as const;
export type SecurityGraphNodeName = typeof securityNodeNames[number];
export type SecurityNode = (state: SecurityGraphState) => Promise<SecurityGraphUpdate> | SecurityGraphUpdate;
export type SecurityNodes = Record<SecurityGraphNodeName, SecurityNode>;

export interface SecurityGraphOptions {
  checkpointer?: BaseCheckpointSaver;
  beforeNode?: (name: SecurityGraphNodeName, state: SecurityGraphState) => void | Promise<void>;
  afterNode?: (name: SecurityGraphNodeName, state: SecurityGraphState, update: SecurityGraphUpdate) => void | Promise<void>;
}

/** Two repair candidates are allowed. The caller additionally enforces five model calls. */
export function buildSecurityGraph(nodes: SecurityNodes, options: SecurityGraphOptions = {}) {
  const wrap = (name: SecurityGraphNodeName): SecurityNode => async (state) => {
    await options.beforeNode?.(name, state);
    const input = name === 'repair' ? { ...state, attempt: state.attempt + 1, decision: 'continue' as const } : state;
    if (input.attempt > 2) throw new Error('The two-candidate LangGraph budget is exhausted.');
    const output = await nodes[name](input);
    // A strategy cannot accidentally reset the retry budget through its return value.
    const update = name === 'repair' ? { decision: 'continue' as const, ...output, attempt: input.attempt } : { ...output, attempt: state.attempt };
    await options.afterNode?.(name, input, update);
    return update;
  };
  const repairRoute = (state: SecurityGraphState) => state.decision === 'retry'
    ? state.attempt < 2 ? 'repair' : 'blocked'
    : state.decision === 'block' ? 'blocked' : 'verify';
  const gateRoute = (state: SecurityGraphState) => state.decision === 'publish'
    ? 'publish'
    : state.decision === 'retry' && state.attempt < 2 ? 'repair' : 'blocked';
  return new StateGraph(SecurityState)
    .addNode('source', wrap('source'))
    .addNode('inventory', wrap('inventory'))
    .addNode('triage', wrap('triage'))
    .addNode('baseline', wrap('baseline'))
    .addNode('repair', wrap('repair'))
    .addNode('verify', wrap('verify'))
    .addNode('review', wrap('review'))
    .addNode('gate', wrap('gate'))
    .addNode('publish', wrap('publish'))
    .addNode('blocked', wrap('blocked'))
    .addEdge(START, 'source')
    .addEdge('source', 'inventory')
    .addEdge('inventory', 'triage')
    .addConditionalEdges('triage', (state) => state.decision === 'block' ? 'blocked' : 'baseline', ['blocked', 'baseline'])
    .addEdge('baseline', 'repair')
    .addConditionalEdges('repair', repairRoute, ['repair', 'verify', 'blocked'])
    .addEdge('verify', 'review')
    .addEdge('review', 'gate')
    .addConditionalEdges('gate', gateRoute, ['repair', 'publish', 'blocked'])
    .addEdge('publish', END)
    .addEdge('blocked', END)
    .compile({ checkpointer: options.checkpointer });
}
