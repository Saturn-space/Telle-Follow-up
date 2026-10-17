'use client';

import React from 'react';
import { RiskAssessmentResult } from '@/lib/risk/types';
import { Clock, ShieldCheck, AlertCircle, AlertTriangle, CheckCircle2, User } from 'lucide-react';

interface Props {
  assessments: RiskAssessmentResult[];
  selectedId?: string;
  onSelect: (assessment: RiskAssessmentResult) => void;
}

export function RiskHistoryTimeline({ assessments, selectedId, onSelect }: Props) {
  if (!assessments || assessments.length === 0) {
    return (
      <div className="p-5 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
        No prior assessment history for this patient.
      </div>
    );
  }

  const getBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">LOW</span>;
      case 'MODERATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">MODERATE</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">HIGH</span>;
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">CRITICAL</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">INDET</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Longitudinal Assessment History</h3>
          <p className="text-[11px] text-slate-500">
            Audit trail of prior evaluations, timestamps, and clinician decisions.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          {assessments.length} Records
        </span>
      </div>

      <div className="space-y-2.5">
        {assessments.map((item) => {
          const isSelected = item.assessmentId === selectedId;
          const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={item.assessmentId}
              onClick={() => onSelect(item)}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-blue-50/60 border-blue-400 ring-1 ring-blue-400'
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
                  <Clock className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {getBadge(item.riskLevel)}
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      Index {item.heuristicScore}/100
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • {formattedDate}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                    {item.clinicalSummary}
                  </p>
                </div>
              </div>

              {/* Review status badge */}
              <div className="text-right shrink-0">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  item.reviewStatus === 'ACCEPTED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.reviewStatus === 'OVERRIDDEN'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.reviewStatus === 'ACCEPTED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                  {item.reviewStatus === 'OVERRIDDEN' && <User className="w-2.5 h-2.5" />}
                  {item.reviewStatus === 'PENDING_REVIEW' && <AlertCircle className="w-2.5 h-2.5" />}
                  {item.reviewStatus}
                </span>
                <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                  ID: {item.assessmentId.substring(0, 10)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
