import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@/styles/globals.css';
import '@/styles/workspace.css';
import '@/styles/orchestration.css';
import '@/styles/live-orchestration.css';
const publicSans = localFont({ src: '../assets/fonts/PublicSans-Variable.ttf', display: 'swap', variable: '--font-public' });
export const metadata: Metadata = { title: 'ProofPatch — Japanese advisory to reviewed repair', description: 'Japanese supply-chain advisories, real Groq agents, observed checks and a draft pull request for human review.' };
const contract = '<!-- THESIS: A patch moves only when its proof aligns. OWN-WORLD: charcoal engineering workspace, warm white type, restrained lime, precise instrument geometry. STORY: scope upstream or local risk, freeze baseline checks, propose repair, replay, human review. FIRST VIEWPORT: fixed narrow navigation, scope controls and a legible three-agent React Flow diagram; mobile shows the three roles and handoff before the detailed graph. Overview retains the selected case beside the large Anatomy interlock. FORM: user-pinned engineering instrument, seed 7e7cad5f overridden by confirmed direction. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={'dark '+publicSans.variable}><body><div hidden dangerouslySetInnerHTML={{__html:contract}}/>{children}</body></html>;
}
