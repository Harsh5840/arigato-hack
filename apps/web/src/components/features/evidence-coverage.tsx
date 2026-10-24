'use client';
import dynamic from 'next/dynamic';
const Gauge = dynamic(() => import('@/components/charts/gauge').then(module => module.Gauge), {ssr:false});
export default function EvidenceCoverage({stage, blocked}:{stage:number;blocked:boolean}) {
  const checks = [stage>=1,stage>=3,stage>=3&&!blocked,stage>=3,stage>=3];
  const passed = checks.filter(Boolean).length;
  return <section className="coverage-panel" aria-label={`${passed} of 5 evidence gates satisfied in the synthetic demo`}><div><h2>Evidence gate</h2><p>{blocked ? 'Benign regression blocks the draft.' : 'Five conditions. Every one required.'}</p><strong>{passed} / 5 satisfied</strong></div><div className="coverage-chart"><Gauge value={passed*20} totalNotches={5} width={95} height={70} notchLengthPercent={70} spacing={18} uniformWidth useGradient={false} activeFill="var(--chart-1)" inactiveFill="var(--border)" activeFillOpacity={1} inactiveFillOpacity={1}/></div></section>;
}
