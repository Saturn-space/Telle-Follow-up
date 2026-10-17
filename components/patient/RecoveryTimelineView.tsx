'use client';

// components/patient/RecoveryTimelineView.tsx
import React, { useState } from 'react';
import { TimelineItem } from '@/lib/types/patient';
import { Clock, Activity, FileText, Stethoscope, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface Props {
  timeline: TimelineItem[];
  patientName: string;
}

export function RecoveryTimelineView({ timeline, patientName }: Props) {
  const [filter, setFilter] = useState<'ALL' | 'SURGERY' | 'RECOVERY_LOG' | 'DOCUMENT'>('ALL');

  const filtered = timeline.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'SURGERY') return item.type === 'SURGERY' || item.type === 'DISCHARGE';
    if (filter === 'RECOVERY_LOG') return item.type === 'RECOVERY_LOG' || item.type === 'VITALS';
    if (filter === 'DOCUMENT') return item.type === 'DOCUMENT' || item.type === 'OCR_VERIFIED';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'SURGERY':
      case 'DISCHARGE':
        return <Stethoscope className="w-4 h-4 text-indigo-600" />;
      case 'RECOVERY_LOG':
      case 'VITALS':
        return <Activity className="w-4 h-4 text-teal-600" />;
      case 'DOCUMENT':
      case 'OCR_VERIFIED':
        return <FileText className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-6">
      {/* Header and Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            Longitudinal Recovery Timeline
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Chronological audit stream of surgical milestones, interval recovery entries, and diagnostic documents for {patientName}.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center bg-slate-100 p-1 rounded-xl">
          {(
            [
              { id: 'ALL', label: 'All Events' },
              { id: 'SURGERY', label: 'Operative' },
              { id: 'RECOVERY_LOG', label: 'Observations' },
              { id: 'DOCUMENT', label: 'Documents' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Safety Notice Regarding Normalcy Assessment */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2.5">
        <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
        <span>
          <strong>Data Recording Protocol:</strong> Timeline events display patient-reported metrics and clinician entries. The system does not assert normal clinical recovery without qualified clinician evaluation.
        </span>
      </div>

      {/* Timeline Stream */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
          <Clock className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 mt-2 font-medium">No timeline events match the selected filter.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {filtered.map((item) => {
            const dateObj = new Date(item.timestamp);
            const formattedDate = dateObj.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const isWarning = item.badgeVariant === 'warning';
            const isSuccess = item.badgeVariant === 'success';

            return (
              <div key={item.id} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-[27px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white shadow-xs ${
                    isWarning
                      ? 'border-amber-500'
                      : isSuccess
                      ? 'border-teal-500'
                      : 'border-slate-300'
                  }`}
                >
                  {getIcon(item.type)}
                </div>

                {/* Event Card */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-all hover:bg-white hover:border-slate-300 hover:shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {formattedDate} at {formattedTime}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Embedded details for recovery logs */}
                  {item.type === 'RECOVERY_LOG' && item.details && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-[11px]">
                      {item.details.painScore !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded font-medium border ${
                            Number(item.details.painScore) >= 7
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-teal-50 border-teal-200 text-teal-700'
                          }`}
                        >
                          Pain Score: {String(item.details.painScore)}/10
                        </span>
                      )}
                      {Boolean(item.details.mobilityStatus) && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Mobility: {String(item.details.mobilityStatus)}
                        </span>
                      )}
                      {Boolean(item.details.woundCondition) && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Wound: {String(item.details.woundCondition)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Document badge */}
                  {item.type === 'OCR_VERIFIED' && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Clinically Verified by Care Team
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
