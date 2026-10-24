import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@/styles/globals.css';
import '@/styles/console.css';
const publicSans = localFont({ src: '../assets/fonts/PublicSans-Variable.ttf', display: 'swap', variable: '--font-public' });
export const metadata: Metadata = { title: 'ProofPatch — Repository security watch', description: 'Connect GitHub repositories, watch security advisories and forum leads, and follow Groq agents from an affected dependency to a tested draft PR for human review.' };
const contract = '<!-- THESIS: A beginner can follow a security alert from connected repository to human-reviewed repair. OWN-WORLD: light engineering workspace, Public Sans, green-tinted neutrals, one deep-green action colour, brand lime for the subject and progress, precise React Flow and Anatomy geometry. STORY: connect a real repository, watch official news and unconfirmed leads, match an affected dependency, prepare a supported fix, verify it and inspect the draft before deciding to merge. FIRST VIEWPORT: sticky repository/action header, the live run card and the repair-line figure posed from stored run state; metrics, the six-step explainer and the run timeline follow, then inventory, source health and findings. The agent graph and event rail live under technical details. Mobile reflows the six steps and retains the three agent roles before the graph. FORM: user-requested beginner-oriented single console inside the pinned engineering world; seed 7e7cad5f identity retained. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={publicSans.variable}><body><a className="skip-link" href="#main">Skip to content</a><div hidden dangerouslySetInnerHTML={{__html:contract}}/>{children}</body></html>;
}
