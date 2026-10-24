export interface RepairTarget { ecosystem: string; packageName: string; installedVersion: string; fixedVersion: string; manifestPath: string; imageRef?:string; fixedImageRef?:string; fixedDigest?:string }
export interface RepairPolicy { version: string; kind: 'python'|'npm'|'composer'|'container'; root: string; manifestPath: string; allowedPaths: string[]; testPaths: string[]; testCommand: string[]; runnerImage: string }
export const repairPolicyVersion: string;
export const requiredRepairChecks: string[];
export const runnerImages: Record<'python'|'npm'|'composer'|'trivy',string>;
export function safeRepairPath(path: string): boolean;
export function isRepairTestPath(path: string): boolean;
export function discoverRepairPolicy(files: Record<string,string>, target: RepairTarget, paths?:readonly string[]): RepairPolicy;
export function validateGenericRepair(policy: RepairPolicy, target: RepairTarget, baseFiles: Record<string,string>, edits: {path:string;content:string}[], options?:{allowUnresolvedLock?:boolean}): Record<string,string>;
export function frozenRepairDigest(policy: RepairPolicy, baselineFiles: Record<string,string>): string;
export function requirements(content:string): {name:string;version:string}[];
export function validateRequirements(content:string): {name:string;version:string}[];
export function imageReferences(content:string): string[];
export function imageMatches(image:string,target:RepairTarget):boolean;
export function replacementImage(image:string,target:RepairTarget):string;
