import { useState, useEffect } from 'react'
import { api, NeedCluster, EvidenceItem, FusionCandidate } from './api';
import { useClusters, useFusionCandidates } from './hooks'

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = 'overview' | 'fusion' | 'clusters' | 'cluster-detail' | 'report-status'

type VerifyState = 'pending' | 'confirmed' | 'rejected'

// ─── Data ─────────────────────────────────────────────────────────────────────

// ─── Small components ─────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'REVIEW' | 'VERIFIED' | 'MONITOR' | 'REJECTED' }) {
  if (status === 'REJECTED') return <span className={`inline-block w-2 h-2 rounded-full bg-gray-400 shrink-0 mt-0.5`} />;
  const map = { REVIEW: 'bg-red-500', VERIFIED: 'bg-emerald-500', MONITOR: 'bg-amber-400' }
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status]} shrink-0 mt-0.5`} />
}

function PriorityTag({ p }: { p: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const map = { HIGH: 'text-red-600 bg-red-50 border-red-200', MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200', LOW: 'text-gray-500 bg-gray-50 border-gray-200' }
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${map[p]}`}>{p}</span>
}

function Pill({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{children}</div>
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ onClose, onProcess }: { onClose: () => void; onProcess: () => void }) {
  const [step, setStep] = useState<'idle' | 'processing' | 'done'>('idle')
  const [paste, setPaste] = useState('')
  const steps = [
    'Extracting needs', 'Normalizing locations', 'Finding related observations',
    'Detecting possible duplicates', 'Checking conflicting evidence',
    'Building need clusters', 'Preparing review queue',
  ]
  const [progress, setProgress] = useState(0)

  function runProcess() {
    setStep('processing')
    let i = 0
    const t = setInterval(() => {
      i++; setProgress(i)
      if (i >= steps.length) { clearInterval(t); setTimeout(() => setStep('done'), 400) }
    }, 380)
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-7">
        {step === 'idle' ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="font-semibold text-gray-900 text-sm">Import observations</div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Upload existing data</div>
                <div className="flex gap-2">
                  <button className="flex-1 border border-[#E4E7EC] text-sm text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium">CSV</button>
                  <button className="flex-1 border border-[#E4E7EC] text-sm text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium">JSON</button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-300">
                <div className="flex-1 h-px bg-gray-100" />OR<div className="flex-1 h-px bg-gray-100" />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Paste observation</div>
                <textarea value={paste} onChange={e => setPaste(e.target.value)} placeholder="Paste field report text here…" rows={3} className="w-full border border-[#E4E7EC] rounded-lg text-sm px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-700 placeholder-gray-300" />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-300">
                <div className="flex-1 h-px bg-gray-100" />OR<div className="flex-1 h-px bg-gray-100" />
              </div>
              <button onClick={runProcess} className="w-full border border-dashed border-gray-300 text-gray-500 text-sm py-2.5 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors">
                Load demo dataset
              </button>
            </div>
            <div className="mt-5 pt-5 border-t border-[#E4E7EC]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">15 observations ready</span>
              </div>
              <button onClick={runProcess} className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                Process with Crisis Sync
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-gray-900 mb-5">
              {step === 'done' ? 'Processing complete' : 'Processing observations…'}
            </div>
            <div className="space-y-2.5 mb-6">
              {steps.map((s: string, i: number) => (
                <div key={s} className="flex items-center gap-2.5 text-sm">
                  {step === 'done' || i < progress
                    ? <span className="text-emerald-500 font-bold text-base leading-none">✓</span>
                    : i === progress && step === 'processing'
                    ? <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin inline-block" />
                    : <span className="w-3.5 h-3.5 rounded-full border border-gray-200 inline-block" />
                  }
                  <span className={i < progress || step === 'done' ? 'text-gray-700' : 'text-gray-400'}>{s}</span>
                </div>
              ))}
            </div>
            {step === 'done' && (
              <>
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 font-mono mb-5">
                  15 observations → 4 need clusters → 3 items requiring review
                </div>
                <button onClick={() => { onProcess(); onClose() }} className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                  View results
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({ setPage, setSelectedCluster, clusters, loading }: { setPage: (p: Page) => void; setSelectedCluster: (id: string) => void; clusters: NeedCluster[]; loading: boolean; }) {

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Situation Overview</h1>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {loading ? <div className="col-span-4 text-center py-10 text-gray-400">Loading metrics...</div> : [
          { value: clusters.reduce((acc, c) => acc + c.observations, 0).toString(), label: 'Observations', sub: 'Raw inputs received' },
          { value: clusters.length.toString(),  label: 'Need Clusters', sub: 'Consolidated situations' },
          { value: clusters.filter(c => c.status === 'REVIEW').length.toString(),  label: 'Need Review',   sub: 'Awaiting verification' },
          { value: clusters.reduce((acc, c) => acc + c.conflicts, 0).toString(),  label: 'Conflicts',     sub: 'Evidence disagrees' },
        ].map(m => (
          <div key={m.label} className="border border-[#E4E7EC] rounded-lg px-5 py-4 bg-white">
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{m.value}</div>
            <div className="text-sm font-medium text-gray-700 mt-0.5">{m.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: cluster cards (2/3 width) */}
        <div className="lg:col-span-2 space-y-3">
          <SectionLabel>What Crisis Sync Found</SectionLabel>
          {clusters.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedCluster(c.id); setPage('cluster-detail') }}
              className="w-full text-left border border-[#E4E7EC] bg-white rounded-xl px-5 py-4 hover:border-gray-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <StatusDot status={c.status} />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{c.need}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{c.location}</div>
                    {c.affected !== 'Unknown' && (
                      <div className="text-xs text-gray-500 mt-1">{c.affected}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <PriorityTag p={c.priority} />
                  <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-sm">→</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-400">
                <span>{c.observations} observations</span>
                <span>{c.sources} sources</span>
                {c.conflicts > 0
                  ? <span className="text-amber-600">⚠ {c.conflicts} conflict</span>
                  : <span className="text-emerald-600">✓ consistent</span>
                }
                {c.status === 'REVIEW' && <span className="text-red-500 font-medium">Needs verification</span>}
                {c.status === 'VERIFIED' && <span className="text-emerald-600 font-medium">Verified</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Right sidebar (1/3 width) */}
        <div className="space-y-5">
          {/* Status breakdown */}
          <div>
            <SectionLabel>Cluster status</SectionLabel>
            <div className="border border-[#E4E7EC] bg-white rounded-xl overflow-hidden divide-y divide-[#E4E7EC]">
              {[
                { label: 'Awaiting review', count: clusters.filter(c => c.status === 'REVIEW').length, color: 'bg-red-500' },
                { label: 'Verified', count: clusters.filter(c => c.status === 'VERIFIED').length, color: 'bg-emerald-500' },
                { label: 'Monitoring', count: clusters.filter(c => c.status === 'MONITOR').length, color: 'bg-amber-400' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <span className={`w-2 h-2 rounded-full ${row.color}`} />
                    {row.label}
                  </div>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence summary */}
          <div>
            <SectionLabel>AI confidence</SectionLabel>
            <div className="border border-[#E4E7EC] bg-white rounded-xl px-4 py-4 space-y-3">
              {clusters.length === 0 && !loading && <div className="text-sm text-gray-500 py-4 px-4 text-center border-t border-[#E4E7EC]">No clusters found.</div>}
              {clusters.slice(0, 5).map(c => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500 truncate pr-2">{c.need.split(' ').slice(0, 2).join(' ')}</span>
                    <span className="font-bold text-gray-700 shrink-0">{c.confidence}%</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-600 rounded-full" style={{ width: `${c.confidence}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Fusion Queue ─────────────────────────────────────────────────────────────

function FusionQueue({
  candidates,
  loading,
  error,
  onResolved
}: {
  candidates: FusionCandidate[];
  loading?: boolean;
  error?: string | null;
  onResolved: () => void;
}) {
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = async (id: string, action: 'MERGED' | 'KEPT_SEPARATE' | 'DISMISSED') => {
    try {
      setResolving(id);
      await api.resolveFusionCandidate(id, action);
      onResolved();
    } catch (e: any) {
      alert(e.message || 'Failed to resolve fusion candidate');
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fusion Queue</h1>
          <p className="text-sm text-gray-400 mt-1">Review relationships detected between observations.</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E4E7EC] p-16 text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mb-4" />
          <div className="text-gray-700 font-medium text-sm">Loading fusion queue...</div>
          <div className="text-xs text-gray-400 mt-1">Fetching duplicate and conflict candidates</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fusion Queue</h1>
          <p className="text-sm text-gray-400 mt-1">Review relationships detected between observations.</p>
        </div>

        <div className="p-6 rounded-xl border bg-red-50/80 border-red-200 text-red-900">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">Failed to Load Fusion Queue</h3>
              <p className="text-sm opacity-90 mb-3">{error}</p>
              <div className="text-xs font-mono bg-black/5 p-2.5 rounded-lg mb-4 overflow-x-auto text-gray-800">
                {error}
              </div>
              <button
                onClick={onResolved}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
              >
                Retry Fetch
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pending = (candidates || []).filter(c => c.status === 'PENDING');

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fusion Queue</h1>
          <p className="text-sm text-gray-400 mt-1">Review relationships detected between observations.</p>
        </div>
        <div className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
          {pending.length} {pending.length === 1 ? 'item' : 'items'} pending review
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <div className="text-3xl mb-2">✨</div>
          <div className="font-medium text-gray-700 text-sm">Queue Clear</div>
          <div className="text-xs text-gray-400 mt-1">No fusion candidates require review at this time.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:border-gray-300 transition-all">
              <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    c.type === 'POSSIBLE_DUPLICATE'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {c.type === 'POSSIBLE_DUPLICATE' ? 'Possible Duplicate' : 'Possible Conflict'}
                  </span>
                  <span className="text-sm font-medium text-gray-700">Cluster {c.cluster_id}</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">{c.id}</span>
              </div>
              
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Reason</h3>
                  <p className="text-sm text-gray-800 font-medium">{c.reason}</p>
                </div>

                {c.similarity !== undefined && c.similarity !== null && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Similarity Score</span>
                      <span className="font-bold text-gray-800">{(c.similarity * 100).toFixed(1)}% (Threshold: 60%)</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, c.similarity * 100)}%` }} />
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Linked Reports ({c.report_ids?.length || 0})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(c.report_ids || []).map((reportId) => (
                      <div key={reportId} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono">
                        {reportId}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                  <button 
                    onClick={() => handleResolve(c.id, 'MERGED')}
                    disabled={resolving === c.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {resolving === c.id ? 'Processing...' : 'Merge Reports'}
                  </button>
                  <button 
                    onClick={() => handleResolve(c.id, 'KEPT_SEPARATE')}
                    disabled={resolving === c.id}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors border border-gray-200"
                  >
                    Keep Separate
                  </button>
                  <button 
                    onClick={() => handleResolve(c.id, 'DISMISSED')}
                    disabled={resolving === c.id}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitReportModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<import('./api').Report>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successId, setSuccessId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    
    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!formData.original_text?.trim()) newErrors.original_text = 'Report text is required';
    if (!formData.reporter?.trim()) newErrors.reporter = 'Reporter name is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitReport(formData);
      setSuccessId(res.id || 'unknown');
    } catch (err: any) {
      if (err.message?.includes('422')) {
        setApiError('Validation failed. Please check the fields.');
      } else {
        setApiError(err.message || 'Failed to submit report');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Submit New Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {successId ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Report Submitted Successfully</h3>
              <p className="text-gray-500 mb-6">Report ID: <span className="font-mono font-bold text-gray-700">{successId}</span></p>
              <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {apiError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {apiError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reporter Name *</label>
                <input 
                  type="text" 
                  name="reporter" 
                  value={formData.reporter || ''} 
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${errors.reporter ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  placeholder="John Doe"
                />
                {errors.reporter && <p className="text-red-500 text-xs mt-1">{errors.reporter}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input 
                  type="text" 
                  name="location" 
                  value={formData.location || ''} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  placeholder="e.g. Ward 4, Main St"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Description *</label>
                <textarea 
                  name="original_text" 
                  value={formData.original_text || ''} 
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${errors.original_text ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  placeholder="Describe the situation..."
                />
                {errors.original_text && <p className="text-red-500 text-xs mt-1">{errors.original_text}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select 
                    name="severity" 
                    value={formData.severity || ''} 
                    onChange={handleChange as any}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="">Unknown</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Affected Pop.</label>
                  <input 
                    type="number" 
                    name="affected_population" 
                    value={formData.affected_population || ''} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">Cancel</button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportStatusPage() {
  const [reportId, setReportId] = useState('');
  const [report, setReport] = useState<import('./api').Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportId.trim()) return;
    
    setLoading(true);
    setError('');
    setReport(null);
    setSearched(true);
    
    try {
      const res = await api.getReportStatus(reportId.trim());
      setReport(res);
    } catch (err: any) {
      if (err.message?.includes('404')) {
        setError('Report not found. Please check the ID and try again.');
      } else {
        setError(err.message || 'Failed to fetch report status');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Report Status</h1>
        <p className="text-gray-500 mt-1">Look up a submitted report by its ID to check its current status.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={reportId}
          onChange={e => setReportId(e.target.value)}
          placeholder="Enter Report ID (e.g. REP-123)"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-mono shadow-sm"
        />
        <button 
          type="submit"
          disabled={loading || !reportId.trim()}
          className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <span className="text-xl leading-none">⚠</span>
          <div>
            <h3 className="font-semibold text-sm">Error fetching report</h3>
            <p className="text-sm mt-1 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {report && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <div className="text-xs text-gray-500 font-bold tracking-wider uppercase mb-1">Report Details</div>
              <div className="font-mono font-bold text-lg text-gray-900">{report.id || reportId}</div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${report.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : report.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              {report.status || 'PENDING'}
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Original Text</h3>
              <p className="text-gray-900 text-lg bg-gray-50 p-4 rounded-lg border border-gray-100">"{report.original_text}"</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">Reporter</div>
                <div className="font-medium text-gray-900">{report.reporter || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Location</div>
                <div className="font-medium text-gray-900">{report.location || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Severity</div>
                <div className="font-medium text-gray-900">{report.severity || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Affected Population</div>
                <div className="font-medium text-gray-900">{report.affected_population || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Needs</div>
                <div className="font-medium text-gray-900">{(report.needs && report.needs.length > 0) ? report.needs.join(', ') : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Timestamp</div>
                <div className="font-medium text-gray-900">{report.timestamp || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!loading && !error && !report && searched && (
        <div className="text-center py-10 text-gray-500">
          No report found.
        </div>
      )}
    </div>
  );
}

// ─── Clusters page ────────────────────────────────────────────────────────────

function ClustersPage({ setPage, setSelectedCluster, clusters, loading }: { setPage: (p: Page) => void; setSelectedCluster: (id: string) => void; clusters: NeedCluster[]; loading: boolean; }) {

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Need Clusters</h1>
          <p className="text-sm text-gray-400 mt-1">Consolidated situations created from multiple observations. {clusters.length} clusters.</p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border border-[#E4E7EC] rounded-xl bg-white overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_160px_130px_110px] gap-4 px-5 py-3 border-b border-[#E4E7EC] bg-gray-50">
          {['Status', 'Need / Location', 'Population', 'Evidence', 'Confidence'].map(h => (
            <div key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</div>
          ))}
        </div>
        {loading ? <div className="py-20 text-center text-gray-400">Loading clusters...</div> : clusters.length === 0 ? <div className="py-20 text-center text-gray-400">No clusters found.</div> : clusters.map((c, idx) => (
          <button
            key={c.id}
            onClick={() => { setSelectedCluster(c.id); setPage('cluster-detail') }}
            className={`w-full text-left grid grid-cols-[100px_1fr_160px_130px_110px] gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group ${idx < clusters.length - 1 ? 'border-b border-[#E4E7EC]' : ''}`}
          >
            <div className="flex items-center gap-2">
              <StatusDot status={c.status} />
              <span className={`text-xs font-medium ${c.status === 'REVIEW' ? 'text-red-600' : c.status === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {c.status}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700">{c.need}</div>
              <div className="text-xs text-gray-400 mt-0.5">{c.location}</div>
            </div>
            <div className="text-sm text-gray-600 self-center">{c.affected}</div>
            <div className="self-center">
              <div className="text-xs text-gray-500">{c.observations} reports · {c.sources} sources</div>
              {c.photos > 0 && <div className="text-xs text-gray-400 mt-0.5">{c.photos} photo</div>}
              {c.conflicts > 0 && <div className="text-xs text-amber-600 mt-0.5">⚠ conflict</div>}
            </div>
            <div className="self-center">
              <div className="text-sm font-bold text-gray-800 tabular-nums">{c.confidence}%</div>
              <div className="mt-1 h-1 w-16 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-600 rounded-full" style={{ width: `${c.confidence}%` }} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {clusters.map(c => (
          <button
            key={c.id}
            onClick={() => { setSelectedCluster(c.id); setPage('cluster-detail') }}
            className="w-full text-left border border-[#E4E7EC] bg-white rounded-xl px-4 py-4 hover:border-gray-400 transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <StatusDot status={c.status} />
                <span className="font-semibold text-gray-900 text-sm">{c.need}</span>
              </div>
              <PriorityTag p={c.priority} />
            </div>
            <div className="text-xs text-gray-400">{c.location} · {c.affected}</div>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{c.observations} reports</span>
              <span>{c.confidence}% confidence</span>
              {c.conflicts > 0 && <span className="text-amber-600">⚠ conflict</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Cluster Detail ───────────────────────────────────────────────────────────

import { useClusterDetail } from './hooks';

function ClusterDetail({ clusterId, setPage }: { clusterId: string; setPage: (p: Page) => void }) {
  const { cluster, loading, error, refetch } = useClusterDetail(clusterId);
  const [verifyState, setVerifyState] = useState<VerifyState>('pending');

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-20 text-center max-w-[1400px] mx-auto">
        <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mb-4" />
        <div className="text-gray-700 font-medium text-sm">Loading cluster details...</div>
        <div className="text-xs text-gray-400 mt-1">Fetching cluster {clusterId}</div>
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="px-6 lg:px-10 py-12 max-w-[800px] mx-auto w-full">
        <button onClick={() => setPage('clusters')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors">
          ← Back to clusters
        </button>
        <div className="p-6 rounded-xl border bg-red-50/80 border-red-200 text-red-900">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">Failed to Load Cluster</h3>
              <p className="text-sm opacity-90 mb-3">
                {error || `Cluster "${clusterId}" could not be found.`}
              </p>
              {error && (
                <div className="text-xs font-mono bg-black/5 p-2.5 rounded-lg mb-4 overflow-x-auto text-gray-800">
                  {error}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Retry Fetch
                </button>
                <button
                  onClick={() => setPage('clusters')}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Return to Clusters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fusionReasons = cluster.fusionReasons || [];
  const evidence = cluster.evidence || [];
  const timeline = cluster.timeline || [];

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full">
      {/* Back */}
      <button onClick={() => setPage('clusters')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors font-medium">
        ← Back to clusters
      </button>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{(cluster.need || 'UNNAMED NEED').toUpperCase()}</h1>
          <div className="text-sm text-gray-500 mt-1">{cluster.location || 'Unknown location'}</div>
          <div className="text-xs font-mono text-gray-400 mt-0.5">Cluster {cluster.id}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PriorityTag p={cluster.priority || 'MEDIUM'} />
          {cluster.status === 'REVIEW' && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">⚠ Needs verification</span>
          )}
          {cluster.status === 'VERIFIED' && (
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">✓ Verified</span>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: main content (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Situation */}
          <div className="border border-[#E4E7EC] bg-white rounded-xl px-6 py-5">
            <SectionLabel>Situation</SectionLabel>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">{cluster.summary || 'No summary available.'}</p>
            <div className="grid grid-cols-3 gap-4 border-t border-[#E4E7EC] pt-4">
              {[
                { label: 'Estimated affected', value: cluster.affected || 'Unknown', note: 'AI estimate · unverified' },
                { label: 'First reported', value: cluster.firstSeen || 'N/A' },
                { label: 'Latest update', value: cluster.lastUpdate || 'N/A' },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-xs text-gray-400">{item.label}</div>
                  <div className="text-sm font-semibold text-gray-900 mt-0.5">{item.value}</div>
                  {item.note && <div className="text-xs text-gray-400 mt-0.5">{item.note}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Fusion reasoning */}
          <div className="border border-[#E4E7EC] bg-white rounded-xl px-6 py-5">
            <SectionLabel>Why Crisis Sync grouped these reports</SectionLabel>
            {fusionReasons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 mb-5">
                {fusionReasons.map(r => (
                  <div key={r} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span> {r}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic mb-5">No explicit fusion reasons provided.</div>
            )}
            <div className="border-t border-[#E4E7EC] pt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Model confidence</span>
                <span className="font-bold text-gray-700">{cluster.confidence || 0}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-700 rounded-full" style={{ width: `${cluster.confidence || 0}%` }} />
              </div>
            </div>
          </div>

          {/* Evidence */}
          <div className="border border-[#E4E7EC] bg-white rounded-xl px-6 py-5">
            <SectionLabel>{cluster.observations || 0} observations · {cluster.sources || 0} sources{cluster.photos ? ` · ${cluster.photos} photo` : ''}</SectionLabel>
            {evidence.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {evidence.map(e => (
                  <div key={e.id} className={`border rounded-xl px-4 py-3.5 ${e.role === 'conflicts' ? 'border-amber-200 bg-amber-50' : 'border-[#E4E7EC] bg-white'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold text-gray-400">{e.id}</span>
                      <span className="text-xs text-gray-400">{e.time}</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-1.5">{e.author}</div>
                    <div className="text-sm text-gray-700 italic leading-relaxed">{e.text}</div>
                    <div className={`mt-2 text-xs font-medium ${e.role === 'conflicts' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {e.role === 'conflicts' ? '⚠ Conflicts with cluster' : '✓ Supports cluster'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic">No evidence items available for this cluster.</div>
            )}
          </div>

          {/* Relationship diagram */}
          <div className="border border-[#E4E7EC] bg-white rounded-xl px-6 py-5">
            <SectionLabel>Evidence relationships</SectionLabel>
            <RelationshipDiagram evidence={evidence} need={cluster.need || 'Need'} />
          </div>
        </div>

        {/* Right column: timeline + conflict + verification (1/3) */}
        <div className="space-y-5">

          {/* Timeline */}
          <div className="border border-[#E4E7EC] bg-white rounded-xl px-5 py-5">
            <SectionLabel>Situation timeline</SectionLabel>
            {timeline.length > 0 ? (
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-[#E4E7EC]" />
                {timeline.map((item, i) => {
                  const color = item.level === 'high' ? 'bg-red-500' : item.level === 'conflict' ? 'bg-amber-500' : item.level === 'photo' ? 'bg-blue-400' : 'bg-orange-400'
                  return (
                    <div key={i} className="relative mb-5 last:mb-0">
                      <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${color}`} />
                      <div className="text-xs font-mono text-gray-400 mb-0.5">{item.time}</div>
                      <div className="text-sm text-gray-700 font-medium">{item.text}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.id}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic">No timeline items reported.</div>
            )}
          </div>

          {/* Conflict panel */}
          {cluster.conflict && (
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
                <span className="text-sm font-semibold text-amber-800">⚠ Conflicting information</span>
              </div>
              <div className="bg-white px-5 py-4 space-y-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Previous observations</div>
                  <div className="text-gray-700 italic">{cluster.conflict.prev}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Latest observation</div>
                  <div className="text-amber-800 italic">{cluster.conflict.latest}</div>
                </div>
              </div>
              <div className="px-5 py-3 bg-white border-t border-amber-200">
                <div className="text-xs text-amber-700 mb-2">Status: <span className="font-bold">UNRESOLVED</span></div>
                <button className="text-xs text-amber-700 border border-amber-300 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                  Review evidence
                </button>
              </div>
            </div>
          )}

          {/* Verification */}
          <div className="border border-[#E4E7EC] bg-white rounded-xl px-5 py-5">
            <SectionLabel>Responder review</SectionLabel>
            {verifyState === 'confirmed' ? (
              <div className="border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-5 text-center">
                <div className="text-emerald-700 font-semibold mb-1">✓ Verified by Responder</div>
                <div className="text-xs text-emerald-600">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-xs text-gray-500 mt-2">Cluster is now part of the verified operational picture.</div>
              </div>
            ) : verifyState === 'rejected' ? (
              <div className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-5 text-center">
                <div className="text-gray-600 font-semibold mb-1">✕ Cluster rejected</div>
                <div className="text-xs text-gray-400">Removed from operational picture.</div>
                <button onClick={() => setVerifyState('pending')} className="mt-3 text-xs text-gray-500 underline">Undo</button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Crisis Sync assessment: These observations likely represent the same underlying {(cluster.need || 'need').toLowerCase()}.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setVerifyState('confirmed')}
                    className="flex items-center justify-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    ✓ Confirm cluster
                  </button>
                  <button
                    onClick={() => setVerifyState('rejected')}
                    className="border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RelationshipDiagram({ evidence, need }: { evidence: EvidenceItem[]; need: string }) {
  const safeEvidence = evidence || [];
  const supporters = safeEvidence.filter(e => e.role === 'supports');
  const conflicts = safeEvidence.filter(e => e.role === 'conflicts');
  return (
    <div className="border border-[#E4E7EC] rounded-xl bg-[#FAFAFA] p-6 overflow-x-auto">
      <div className="flex flex-col items-center gap-5 min-w-[360px]">
        <div className="border-2 border-gray-700 rounded-xl px-6 py-3 bg-white text-center shadow-sm">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">{need.split(' ').slice(0, 2).join(' ')}</div>
          <div className="text-xs text-gray-400 mt-0.5">Need cluster</div>
        </div>
        <div className="flex flex-wrap items-start justify-center gap-3 w-full">
          {supporters.map(e => (
            <div key={e.id} className="flex flex-col items-center gap-1.5">
              <div className="text-xs text-emerald-600 font-semibold">supports ↑</div>
              <div className="border border-emerald-200 bg-emerald-50/70 rounded-lg px-3 py-2 text-center">
                <div className="text-xs font-mono font-bold text-emerald-700">{e.id}</div>
                <div className="text-xs text-gray-500 mt-0.5">{e.time}</div>
              </div>
            </div>
          ))}
          {conflicts.map(e => (
            <div key={e.id} className="flex flex-col items-center gap-1.5">
              <div className="text-xs text-amber-600 font-semibold">⚠ conflicts</div>
              <div className="border border-amber-300 bg-amber-50/70 rounded-lg px-3 py-2 text-center">
                <div className="text-xs font-mono font-bold text-amber-700">{e.id}</div>
                <div className="text-xs text-gray-500 mt-0.5">{e.time}</div>
              </div>
            </div>
          ))}
          {safeEvidence.length === 0 && (
            <div className="text-xs text-gray-400 italic">No linked evidence relationships available</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Shell ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { candidates: fusionCandidates, loading: fusionLoading, error: fusionError, refetch: refetchFusion } = useFusionCandidates();
  // Nexus Backend Integration (Ready for use when backend is live)
  const { clusters: apiClusters, loading } = useClusters();
  
  useEffect(() => {
    document.title = 'Red Cross Crisis Sync';
    if (apiClusters.length > 0) console.log('Crisis Sync API Clusters loaded:', apiClusters);
  }, [apiClusters]);

  const [page, setPage] = useState<Page>('overview')
  const [selectedCluster, setSelectedCluster] = useState('NEX-007')
  const [showImport, setShowImport] = useState(false)
  const [showSubmitReport, setShowSubmitReport] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const pendingFusion = (fusionCandidates || []).filter(c => c.status === "PENDING").length
  const clusterCount = apiClusters.length

  const navItems = [
    { id: 'overview' as Page, label: 'Overview' },
    { id: 'fusion' as Page, label: 'Fusion Queue', badge: pendingFusion },
    { id: 'clusters' as Page, label: 'Clusters', badge: clusterCount },
    { id: 'report-status' as Page, label: 'Report Status' },
  ]

  const isActive = (id: Page) => page === id || (page === 'cluster-detail' && id === 'clusters')

  return (
    <div className="min-h-screen bg-[#FAFAFA]" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      {/* Nav */}
      <header className="bg-white border-b border-[#E4E7EC] sticky top-0 z-40">
        <div className="px-6 lg:px-10 max-w-[1400px] mx-auto h-[52px] flex items-center justify-between gap-4">
          {/* Logo */}
          <button onClick={() => setPage('overview')} className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center shrink-0">
              <svg viewBox="0 0 16 16" fill="white" className="w-3.5 h-3.5">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 3.5H7v2.5H4.5v2H7V11.5h2V9h2.5V7H9V4.5z"/>
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-xs font-bold text-red-600 leading-none whitespace-nowrap">RED CROSS</div>
              <div className="text-xs font-bold text-gray-900 leading-none whitespace-nowrap">CRISIS SYNC</div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5 flex-1 mx-6">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${isActive(item.id) ? 'text-gray-900 font-semibold bg-gray-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
              >
                {item.label}
                {item.badge !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive(item.id) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowSubmitReport(true)}
              className="flex items-center gap-1.5 bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors font-medium whitespace-nowrap"
            >
              + Submit Report
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 border border-[#E4E7EC] text-sm text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
            >
              + Import
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileNavOpen(o => !o)}
              className="sm:hidden p-1.5 text-gray-600 hover:text-gray-900"
              aria-label="Menu"
            >
              {mobileNavOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {mobileNavOpen && (
          <div className="sm:hidden border-t border-[#E4E7EC] bg-[#FAFAFA] px-6 py-3 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setMobileNavOpen(false) }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.id) ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Page */}
      <main className="overflow-x-hidden">
        {page === 'overview' && <Overview setPage={setPage} setSelectedCluster={setSelectedCluster} clusters={apiClusters} loading={loading} />}
        {page === 'fusion' && <FusionQueue candidates={fusionCandidates} loading={fusionLoading} error={fusionError} onResolved={refetchFusion} />}
        {page === 'clusters' && <ClustersPage setPage={setPage} setSelectedCluster={setSelectedCluster} clusters={apiClusters} loading={loading} />}
        {page === 'cluster-detail' && <ClusterDetail clusterId={selectedCluster} setPage={setPage} />}
        {page === 'report-status' && <ReportStatusPage />}
      </main>

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onProcess={() => setPage('overview')} />
      )}
      {showSubmitReport && (
        <SubmitReportModal onClose={() => setShowSubmitReport(false)} />
      )}
    </div>
  )
}


