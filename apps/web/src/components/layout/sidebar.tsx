import { ShieldCheck, LayoutDashboard, FileSearch, Database, Route, ChevronDown, Github, FlaskConical, Workflow } from 'lucide-react';
import type { View } from '@/types/security';
const icons = { Agents: Workflow, Overview: LayoutDashboard, Findings: FileSearch, Evidence: Database, Roadmap: Route };
export default function Sidebar({ view, onChange, live=false }: { view: View; onChange: (view: View) => void; live?:boolean }) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-symbol"><ShieldCheck size={25} strokeWidth={1.7}/></span><span>ProofPatch</span></div>
    <div className="workspace-switch"><span className="workspace-avatar">S</span><div><strong>SakuraShop</strong><span>{live?'PHP remediation workspace':'Synthetic demo workspace'}</span></div><ChevronDown size={13}/></div>
    <nav aria-label="Main navigation">{(Object.keys(icons) as View[]).map(item => { const Icon = icons[item]; return <button key={item} onClick={() => onChange(item)} className={view === item ? 'nav-item active' : 'nav-item'} aria-current={view === item ? 'page' : undefined}><Icon size={18}/><span>{item}</span>{item==='Findings' && <small>3</small>}</button>; })}</nav>
    <div className="sidebar-context"><GitBranchIcon/><div><strong>{live?'1 connected target':'2 sample repositories'}</strong><span>{live?'arigato-php-demo':'Synthetic fixtures'}</span></div></div>
    <div className="sidebar-foot"><div><FlaskConical size={16}/><strong>{live?'Open Innovation':'Checkpoint 1 simulation'}</strong></div><p>{live?'Japanese advisory → draft PR.':'Explore the seeded workflow.'}<br/>{live?'A human owns the merge.':'Every result is simulated.'}</p><span className="team-avatars" aria-label="Four-member team"><b>A</b><b>B</b><b>C</b><b>D</b><small>Team of 4</small></span></div>
  </aside>;
}
function GitBranchIcon(){return <Github size={17}/>;}
