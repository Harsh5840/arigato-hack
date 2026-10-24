import { allowedPaths, fixedImage, type Repair } from '../adapters/types.js';

const lines = (text: string) => text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && !line.startsWith(';'));
export function validateCandidate(base: Record<string, string>, files: Repair['files']): Record<string, string> {
  if (files.length !== 3 || new Set(files.map((file) => file.path)).size !== 3 || files.some((file) => !(allowedPaths as readonly string[]).includes(file.path) || file.content.length > 30_000 || file.content.includes('\0'))) throw new Error('Candidate scope rejected: exactly three bounded allowed files are required.');
  const candidate = Object.fromEntries(files.map((file) => [file.path, file.content]));
  if (/^\s*#\s*(?:syntax|escape|check)\s*=/im.test(candidate.Dockerfile)) throw new Error('Docker policy rejected: model-controlled parser directives are not allowed.');
  const beforeDocker = lines(base.Dockerfile); const afterDocker = lines(candidate.Dockerfile);
  if (beforeDocker.filter((line) => /^FROM\s/i.test(line)).length !== 1 || afterDocker.filter((line) => /^FROM\s/i.test(line)).length !== 1 || !afterDocker.includes(`FROM ${fixedImage}`) || JSON.stringify(beforeDocker.filter((line) => !/^FROM\s/i.test(line))) !== JSON.stringify(afterDocker.filter((line) => !/^FROM\s/i.test(line)))) throw new Error('Docker policy rejected: only the reviewed FROM image may change.');
  const original = JSON.parse(base['composer.json']); const proposed = JSON.parse(candidate['composer.json']);
  if (proposed.require?.php !== '>=8.3.36 <8.4') throw new Error('Composer policy rejected: PHP floor must be >=8.3.36 <8.4.');
  const expected = structuredClone(original); expected.require.php = '>=8.3.36 <8.4';
  // Compare canonical values; object key order and indentation are not executable changes.
  const canonical = (value: unknown): string => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b))) : entry);
  if (canonical(expected) !== canonical(proposed)) throw new Error('Composer policy rejected: changes outside the PHP floor.');
  const oldIni = lines(base['config/security.ini']); const newIni = lines(candidate['config/security.ini']);
  const directive = /^session\.upload_progress\.enabled\s*=\s*/;
  if (oldIni.filter((line) => directive.test(line)).length !== 1 || newIni.filter((line) => directive.test(line)).length !== 1 || !newIni.some((line) => /^session\.upload_progress\.enabled\s*=\s*0$/.test(line)) || JSON.stringify(oldIni.filter((line) => !directive.test(line))) !== JSON.stringify(newIni.filter((line) => !directive.test(line)))) throw new Error('Startup policy rejected: only upload progress 1 → 0 is allowed.');
  return candidate;
}

export function inventory(base: Record<string, string>) {
  const version = base.Dockerfile.match(/^FROM php:(8\.3\.\d+)-cli-bookworm\s*$/m)?.[1];
  return { declaredVersion: version || 'unknown', affected: version === '8.3.35', observed: 'repository declaration only; affected runtime is not executed', fixedVersion: '8.3.36', phpConstraint: JSON.parse(base['composer.json']).require?.php };
}
