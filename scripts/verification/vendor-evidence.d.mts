import type { RepairTarget } from './repair-policy.mjs';
export interface VendorNginxAdvisory { id:string;fixes:string[];affected:string }
export function parseVendorNginx(html:string):VendorNginxAdvisory[];
export function vendorNginxAffected(value:string,advisory:VendorNginxAdvisory):boolean;
export function evaluateImageAdvisoryEvidence(selectedIds:string[],baselineFindings:{VulnerabilityID:string}[],candidateFindings:{VulnerabilityID:string}[]):{pass:boolean;baselineSelectedCount:number;candidateSelectedCount:number;coverageGap:string[]};
export function corroborateVendorRepair(target:RepairTarget,selectedIds:string[]):Promise<{vendor:string;baselineAffectedIds:string[];candidateAffectedIds:string[];selectedIds:string[];sources:{url:string;sha256:string}[];followUp?:string}>;
