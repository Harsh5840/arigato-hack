import { ShieldCheck, LayoutDashboard, FileSearch, Database, Route, ChevronDown, Github, FlaskConical, Workflow } from 'lucide-react';
import type { View } from '@/types/security';
const icons = { Agents: Workflow, Overview: LayoutDashboard, Findings: FileSearch, Evidence: Database, Roadmap: Route };
export default function Sidebar({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-symbol"><ShieldCheck size={25} strokeWidth={1.7}/></span><span>ProofPatch</span></div>
    <div className="workspace-switch"><span className="workspace-avatar">A</span><div><strong>Acme Engineering</strong><span>Demo workspace</span></div><ChevronDown size={13}/></div>
    <nav aria-label="Main navigation">{(Object.keys(icons) as View[]).map(item => { const Icon = icons[item]; return <button key={item} onClick={() => onChange(item)} className={view === item ? 'nav-item active' : 'nav-item'} aria-current={view === item ? 'page' : undefined}><Icon size={18}/><span>{item}</span>{item==='Findings' && <small>3</small>}</button>; })}</nav>
    <div className="sidebar-context"><GitBranchIcon/><div><strong>2 repositories</strong><span>Synthetic fixtures</span></div></div>
    <div className="sidebar-foot"><div><FlaskConical size={16}/><strong>Checkpoint 1</strong></div><p>Explore the workflow.<br/>Every result is simulated.</p><span className="team-avatars" aria-label="Four-member team"><b>A</b><b>B</b><b>C</b><b>D</b><small>Team of 4</small></span></div>
  </aside>;
}
function GitBranchIcon(){return <Github size={17}/>;}
