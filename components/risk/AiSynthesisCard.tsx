'use client';

import React from 'react';
import { AiExplanationPayload } from '@/lib/risk/types';
import { Sparkles, HelpCircle, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

interface Props {
  synthesis: AiExplanationPayload;
  engine: string;
}

export function AiSynthesisCard({ synthesis, engine }: Props) {
  const isSuccess = synthesis.aiStatus === 'SUCCESS';
  const isUnconfigured = synthesis.aiStatus === 'UNCONFIGURED';
  const isFailed = synthesis.aiStatus === 'FAILED';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              AI Clinical Decision Support Synthesis
            </h3>
            <p className="text-[11px] text-slate-500">
              Anthropic Claude server-side clinical interpretation &amp; review assistance.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isSuccess && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Claude Synthesis Active
            </span>
          )}
          {isUnconfigured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              AI Unconfigured (Deterministic Active)
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              AI Service Fallback
            </span>
          )}
        </div>
      </div>

      {/* Synthesis Content */}
      <div className="space-y-3 text-sm">
        <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Clinical Narrative
          </span>
          <p className="text-slate-800 leading-relaxed text-xs sm:text-sm">
            {synthesis.summaryText || 'No clinical synthesis available.'}
          </p>
        </div>

        {/* Clinical Questions for the Reviewing Doctor */}
        {synthesis.clinicalQuestionsForClinician && synthesis.clinicalQuestionsForClinician.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              Recommended Inquiries for Patient Consultation:
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              {synthesis.clinicalQuestionsForClinician.map((q, idx) => (
                <li key={idx} className="leading-relaxed">{q}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Focus Inspection Areas */}
        {synthesis.recommendedFocusAreas && synthesis.recommendedFocusAreas.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5">
              Target Inspection Areas:
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {synthesis.recommendedFocusAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded text-xs font-medium"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Engine: {engine}</span>
          <span>Model: {synthesis.modelName || 'Claude 3.5 Sonnet'}</span>
          {synthesis.responseTimeMs ? <span>Latency: {synthesis.responseTimeMs}ms</span> : null}
        </div>
      </div>
    </div>
  );
}
