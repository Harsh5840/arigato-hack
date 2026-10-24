export type View = 'Agents' | 'Overview' | 'Findings' | 'Evidence' | 'Roadmap';
export type Severity = 'Critical' | 'High' | 'Medium';
export type Stage = 0 | 1 | 2 | 3 | 4;
export type Scenario = 'pass' | 'regression';
export interface Finding { id: string; title: string; severity: Severity; repo: string; area: string; summary: string; before: string; after: string; diff: string[]; checks: string[]; }
export interface Verification { baselineFailed: boolean; patchedPassed: boolean; regressionPassed: boolean; testHashMatches: boolean; commitMatches: boolean; }
