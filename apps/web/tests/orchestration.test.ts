import test from 'node:test';
import assert from 'node:assert/strict';
import {draftEligible,gateChecks,idleRun,orchestrationReducer,sequenceFor} from '../src/lib/orchestration.ts';
import type {CandidateOutcome,DemoCase} from '../src/lib/orchestration.ts';

function finish(scenario:DemoCase,outcome:CandidateOutcome) {
  let run=orchestrationReducer(idleRun(),{type:'start',scenario,outcome});
  for(const _ of sequenceFor(scenario))run=orchestrationReducer(run,{type:'advance'});
  return run;
}
test('a legitimate-use regression blocks the draft even when security replay passes',()=>{
  const run=finish('dependency','regression');
  assert.equal(run.status,'blocked');
  assert.equal(gateChecks(run)[1].pass,true);
  assert.equal(gateChecks(run)[2].pass,false);
  assert.equal(draftEligible(run),false);
});
test('a simulated local change returns to DevSec after remediation',()=>{
  const run=finish('local-change','pass');
  assert.deepEqual(run.events.map(event=>event.node),['controller','devsec','remediation','devsec','gate']);
  assert.equal(draftEligible(run),true);
});
test('upstream risk records a DevSec baseline before the candidate repair',()=>{
  const run=finish('dependency','pass');
  assert.deepEqual(run.events.map(event=>event.node),['controller','supply-chain','devsec','remediation','devsec','gate']);
  assert.equal(draftEligible(run),true);
});
test('package compromise and PHP follow-up require human incident/configuration review',()=>{
  for(const scenario of ['php-runtime','package-compromise'] as const){
    const run=finish(scenario,'pass');
    assert.equal(gateChecks(run).every(check=>check.pass),true);
    assert.equal(run.status,'needs-review');
    assert.equal(draftEligible(run),false);
  }
});
test('cancelled and unfinished runs cannot advance into an eligible draft',()=>{
  let run=orchestrationReducer(idleRun(),{type:'start',scenario:'dependency',outcome:'pass'});
  assert.equal(draftEligible(run),false);
  run=orchestrationReducer(run,{type:'cancel'});
  assert.deepEqual(orchestrationReducer(run,{type:'advance'}),run);
  assert.equal(draftEligible(run),false);
});
