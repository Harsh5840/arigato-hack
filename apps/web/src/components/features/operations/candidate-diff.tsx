'use client';

import {useEffect, useState} from 'react';
import {ArrowUpRight, FileCode2, RefreshCw} from 'lucide-react';
import {getCandidateDiff} from '@/services/orchestration-api';
import type {CandidateDiff, LiveRun} from '@/types/live-orchestration';

export default function CandidateDiffPanel({run}: {run: LiveRun | null}) {
  const [diff, setDiff] = useState<CandidateDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const id = run?.id;
  const sha = run?.repo.candidateSha;
  useEffect(() => {
    let ignore = false; setDiff(null); setError(null);
    if (!id || !sha) return;
    setLoading(true);
    void getCandidateDiff(id).then(result => {if (!ignore) setDiff(result);}).catch(cause => {if (!ignore) setError(cause instanceof Error ? cause.message : 'Unable to retrieve candidate diff.');}).finally(() => {if (!ignore) setLoading(false);});
    return () => {ignore = true;};
  }, [id, sha, retry]);
  if (!sha) return <div className="ops-empty"><FileCode2 size={23}/><div><strong>No candidate commit yet</strong><p>The worker will attach an actual GitHub diff after the Remediation Agent creates a candidate.</p></div></div>;
  if (loading) return <p className="ops-loading" role="status">Retrieving the candidate diff from GitHub…</p>;
  if (error) return <div className="ops-inline-error" role="alert"><p>{error}</p><button className="button subtle" onClick={() => setRetry(value => value + 1)}><RefreshCw size={13}/>Retry diff</button></div>;
  if (!diff) return null;
  return <div className="ops-diff"><div className="ops-diff-summary"><span>{diff.files.length} changed files · <code>{diff.baseSha.slice(0, 7)} → {diff.candidateSha.slice(0, 7)}</code></span><a href={diff.compareUrl} target="_blank" rel="noreferrer">GitHub comparison<ArrowUpRight size={13}/></a></div>{diff.files.map((file, index) => <details key={file.path} className="ops-diff-file" open={index === 0}><summary><FileCode2 size={14}/><strong>{file.path}</strong><span className="ops-additions">+{file.additions}</span><span className="ops-deletions">−{file.deletions}</span></summary><pre aria-label={`Git diff for ${file.path}`}>{file.patch ? file.patch.split('\n').map((line, lineIndex) => <span key={lineIndex} className={line.startsWith('+') && !line.startsWith('+++') ? 'added' : line.startsWith('-') && !line.startsWith('---') ? 'deleted' : line.startsWith('@@') ? 'hunk' : ''}>{line || ' '}{'\n'}</span>) : 'GitHub did not return inline patch text. Inspect the linked comparison.'}</pre></details>)}{diff.truncated && <p className="ops-muted">The inline diff is bounded. Inspect the complete comparison on GitHub.</p>}</div>;
}
