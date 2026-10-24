import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@/styles/globals.css';
import '@/styles/workspace.css';
import '@/styles/orchestration.css';
import '@/styles/live-orchestration.css';
import '@/styles/operations.css';
import '@/styles/monitoring.css';
const publicSans = localFont({ src: '../assets/fonts/PublicSans-Variable.ttf', display: 'swap', variable: '--font-public' });
export const metadata: Metadata = { title: 'ProofPatch — Repository security watch', description: 'Connect GitHub repositories, watch security advisories and forum leads, and follow Groq agents from an affected dependency to a tested draft PR for human review.' };
const contract = '<!-- THESIS: A beginner can follow a security alert from connected repository to human-reviewed repair. OWN-WORLD: charcoal engineering workspace, Public Sans, warm white type, restrained lime and precise React Flow geometry. STORY: connect a real repository, watch official news and unconfirmed leads, match an affected dependency, prepare a supported fix, verify it and inspect the draft before deciding to merge. FIRST VIEWPORT: sticky repository/action header, measured repository metrics and six connected plain-language steps; inventory, source health and findings follow. Actual agent graph and event rail live under technical details. Mobile reflows the six steps and retains the three agent roles before the graph. FORM: user-requested beginner-oriented single console inside the pinned engineering world; seed 7e7cad5f identity retained. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={'dark '+publicSans.variable}><body><div hidden dangerouslySetInnerHTML={{__html:contract}}/>{children}</body></html>;
}
