'use client';

// components/patient/Member2ContractView.tsx
import React, { useState, useEffect } from 'react';
import { RecoveryObservationDataContract } from '@/lib/contracts/member2-risk-contract';
import { ShieldCheck, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface Props {
  patientId: string;
}

export function Member2ContractView({ patientId }: Props) {
  const [contract, setContract] = useState<RecoveryObservationDataContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchContract() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/patients/${patientId}/member2-contract`);
        const json = await res.json();
        if (isMounted && json.success) {
          setContract(json.data);
        }
      } catch (err) {
        console.error('Failed to load contract', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchContract();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const copyToClipboard = () => {
    if (!contract) return;
    navigator.clipboard.writeText(JSON.stringify(contract, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            Member 2 Integration Contract Inspector (AI Risk Prediction)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data contract published by Member 1 for Member 2&apos;s AI Risk Prediction and Clinical Decision Support engine.
          </p>
        </div>

        <button
          onClick={copyToClipboard}
          disabled={!contract}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 self-start sm:self-center"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied Contract JSON' : 'Copy Contract JSON'}
        </button>
      </div>

      {/* Contract Boundaries & Guarantees */}
      {/* Data Quality & Staleness Status */}
      {contract && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Observation Freshness &amp; Staleness Indicator
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                contract.dataQuality.isStale
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              Status: {contract.dataQuality.observationFreshnessStatus}
              {contract.dataQuality.hoursSinceLastObservation !== null &&
                ` (${contract.dataQuality.hoursSinceLastObservation}h old)`}
            </span>
          </div>

          {contract.dataQuality.dataQualityWarnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {contract.dataQuality.dataQualityWarnings.map((warning, idx) => (
                <div key={idx} className="text-xs text-amber-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contract Boundaries & Guarantees */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs space-y-2 text-indigo-950">
        <div className="flex items-center gap-2 font-bold text-indigo-900">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Member 1 Boundary Guarantees:
        </div>
        <ul className="list-disc list-inside space-y-1 text-indigo-900/90 ml-1">
          <li>
            <strong>No Fabricated Normalcy:</strong> Member 1 does not label observations as &ldquo;clinically normal&rdquo; or assign risk scores.
          </li>
          <li>
            <strong>Explicit Units &amp; Nulls:</strong> Physiological units are strictly preserved (celsius, bpm, mmHg, percent, ml). Missing fields are represented as <code>null</code>.
          </li>
          <li>
            <strong>Surgical Context Injected:</strong> Surgery type, surgical specialty, operative hospital, and days post-op are linked to each observation.
          </li>
          <li>
            <strong>Review Status Transparency:</strong> Unverified OCR documents are explicitly flagged to prevent AI over-reliance on unreviewed reports.
          </li>
        </ul>
      </div>

      {/* Live JSON Payload Viewer */}
      <div className="bg-slate-900 rounded-xl p-4 text-slate-200 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-slate-400 text-[11px]">
          <span>GET /api/v1/patients/{patientId}/member2-contract</span>
          <span>Status: 200 OK • Contract Version 1.0.0</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading contract payload...</div>
        ) : contract ? (
          <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(contract, null, 2)}
          </pre>
        ) : (
          <div className="p-4 text-slate-500">No contract data available for this patient.</div>
        )}
      </div>
    </div>
  );
}
