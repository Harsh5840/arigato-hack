import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@/styles/globals.css';
import '@/styles/workspace.css';
import '@/styles/orchestration.css';
import '@/styles/live-orchestration.css';
import '@/styles/operations.css';
const publicSans = localFont({ src: '../assets/fonts/PublicSans-Variable.ttf', display: 'swap', variable: '--font-public' });
export const metadata: Metadata = { title: 'ProofPatch — Supply-chain operations', description: 'One developer console for Japanese advisory intake, Groq agents, verified candidate diffs, observed execution analytics and human-reviewed draft PRs.' };
const contract = '<!-- THESIS: One operational console connects a supply-chain alert to a reviewable repair. OWN-WORLD: charcoal engineering workspace, Public Sans, warm white type, restrained lime and precise React Flow geometry. STORY: run the real pipeline, follow agents and events, inspect checks and the actual diff, then review the draft with its open owner tasks. FIRST VIEWPORT: sticky repository and execution header, four measured run metrics, current advisory and three-agent flow beside a compact event rail; mobile names the three roles and handoff before an expandable graph. FORM: user-requested single developer dashboard inside the pinned engineering world; prior seed 7e7cad5f identity retained. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={'dark '+publicSans.variable}><body><div hidden dangerouslySetInnerHTML={{__html:contract}}/>{children}</body></html>;
}
