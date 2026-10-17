'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle, Info, Stethoscope, Video, MapPin } from 'lucide-react';
import { RiskAssessmentResult, RiskLevel } from '@/lib/risk/types';

interface Props {
  assessment: RiskAssessmentResult;
  onOpenReview: () => void;
}

export function RiskStatusBanner({ assessment, onOpenReview }: Props) {
  const { riskLevel, heuristicScore, requiresInPerson, isEscalated, escalationReason, reviewStatus, latestReview } = assessment;

  const getRiskStyles = (level: RiskLevel) => {
    switch (level) {
      case 'LOW':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
          label: 'Low Risk — Expected Healing',
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-900',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <AlertCircle className="w-6 h-6 text-amber-600" />,
          label: 'Moderate Risk — Follow-Up Indicated',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50 border-orange-200 text-orange-900',
          badge: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: <AlertTriangle className="w-6 h-6 text-orange-600" />,
          label: 'High Risk — In-Person Assessment Required',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-950',
          badge: 'bg-rose-600 text-white border-rose-700 animate-pulse',
          icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
          label: 'CRITICAL — EMERGENCY ESCALATION',
        };
      case 'INDETERMINATE':
      default:
        return {
          bg: 'bg-slate-50 border-slate-300 text-slate-800',
          badge: 'bg-slate-200 text-slate-800 border-slate-300',
          icon: <Info className="w-6 h-6 text-slate-600" />,
          label: 'Indeterminate — Missing Essential Vitals',
        };
    }
  };

  const style = getRiskStyles(riskLevel);

  return (
    <div className="space-y-4">
      {/* Critical Red-Flag Emergency Banner (Overrides all travel/convenience optimization) */}
      {isEscalated && (
        <div className="p-5 rounded-xl bg-rose-600 text-white shadow-md border-2 border-rose-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-wide text-xs uppercase px-2 py-0.5 bg-white text-rose-700 rounded font-mono">
                  EMERGENCY PROTOCOL ACTIVATED
                </span>
                <span className="text-xs text-rose-100">Travel Optimization Disabled</span>
              </div>
              <h3 className="text-lg font-bold mt-1">Immediate In-Person Hospital Care Required</h3>
              <p className="text-sm text-rose-100 mt-1 leading-relaxed max-w-3xl">
                {escalationReason || 'Severe hemodynamic instability or critical surgical complication detected.'}
              </p>
              <div className="mt-2 text-xs text-rose-200 font-medium">
                Recommendation: Call Emergency Services (112 / 911) or proceed immediately to the nearest Emergency Department. Do not delay evaluation.
              </div>
            </div>
          </div>
          <button
            onClick={onOpenReview}
            className="shrink-0 px-4 py-2 bg-white text-rose-800 font-semibold rounded-lg hover:bg-rose-50 text-sm shadow transition"
          >
            Clinician Action / Override
          </button>
        </div>
      )}

      {/* Primary Risk Status Card */}
      <div className={`p-6 rounded-2xl border ${style.bg} transition-all`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-black/5">
              {style.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${style.badge}`}>
                  {style.label}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ID: {assessment.assessmentId}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-slate-900">
                Post-Surgical Risk Assessment
              </h2>
            </div>
          </div>

          {/* Clinician Review Badge & Action */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                reviewStatus === 'ACCEPTED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : reviewStatus === 'OVERRIDDEN'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {reviewStatus === 'ACCEPTED' && 'Clinician Verified'}
                {reviewStatus === 'OVERRIDDEN' && 'Clinician Overridden'}
                {reviewStatus === 'PENDING_REVIEW' && 'Pending Clinician Review'}
              </span>
              {latestReview && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  by {latestReview.reviewerName} ({latestReview.reviewerRole})
                </p>
              )}
            </div>
            <button
              onClick={onOpenReview}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Review / Sign-Off
            </button>
          </div>
        </div>

        {/* Clinical Summary & Metrics Row */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Clinical Synthesis
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {assessment.clinicalSummary}
            </p>
          </div>

          <div className="bg-white/80 rounded-xl p-3.5 border border-black/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-medium">Triage Index</span>
                <span className="font-bold text-slate-900">{heuristicScore}/100</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    heuristicScore > 50 ? 'bg-rose-500' : heuristicScore > 20 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, heuristicScore))}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Additive sorting heuristic. Not a clinical probability.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1">
                {requiresInPerson ? <MapPin className="w-3.5 h-3.5 text-amber-600" /> : <Video className="w-3.5 h-3.5 text-blue-600" />}
                Care Modality:
              </span>
              <span className="font-semibold text-slate-900">
                {requiresInPerson ? 'In-Person Evaluation' : 'Teleconsultation Suitable'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
