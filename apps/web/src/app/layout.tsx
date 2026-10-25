import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@/styles/globals.css';
import '@/styles/workspace.css';
import '@/styles/orchestration.css';
import '@/styles/live-orchestration.css';
import '@/styles/operations.css';
import '@/styles/monitoring.css';
import '@/styles/command-center.css';
import '@/styles/pipeline-visual.css';
const publicSans = localFont({ src: '../assets/fonts/PublicSans-Variable.ttf', display: 'swap', variable: '--font-public' });
export const metadata: Metadata = { title: 'ProofPatch — Repository security watch', description: 'Connect GitHub repositories, watch security advisories and forum leads, and follow Groq agents from an affected dependency to a tested draft PR for human review.' };
const contract = '<!-- THESIS: A beginner can follow a security alert from connected repository to human-reviewed repair. OWN-WORLD: charcoal engineering workspace, Public Sans, warm white type, restrained lime and precise React Flow geometry. STORY: connect a real repository, watch official news and unconfirmed leads, match an affected dependency, prepare a supported fix, verify it and inspect the draft before deciding to merge. FIRST VIEWPORT: five tabs separate Services, Findings, Pipeline, Results, and PRs. Services is the only repository selection point, with Select all and individual checkboxes, a saved Step by step / Complete pipeline switch, and a scan action. The full six-step React Flow chart and event rail live in Pipeline; observed checks, model timing and tokens, and diff live in Results; recorded draft PRs live in PRs. FORM: user-requested beginner-oriented compact console inside the pinned engineering world; seed 7e7cad5f identity retained. FINISH: keep documented product behavior, clear status, and keyboard-accessible actions aligned with the current build -->';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={'dark '+publicSans.variable}><body><div hidden dangerouslySetInnerHTML={{__html:contract}}/>{children}</body></html>;
}
