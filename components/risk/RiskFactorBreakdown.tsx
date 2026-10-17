'use client';

import React from 'react';
import { SupportingFactor, FactorImpact } from '@/lib/risk/types';
import { Activity, Thermometer, ShieldAlert, Heart, Bandage } from 'lucide-react';

interface Props {
  factors: SupportingFactor[];
}

export function RiskFactorBreakdown({ factors }: Props) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'VITALS':
        return <Activity className="w-4 h-4 text-blue-600" />;
      case 'WOUND':
        return <Bandage className="w-4 h-4 text-purple-600" />;
      case 'PAIN':
        return <Heart className="w-4 h-4 text-rose-600" />;
      case 'SYSTEMIC':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Thermometer className="w-4 h-4 text-slate-600" />;
    }
  };

  const getImpactBadge = (impact: FactorImpact) => {
    switch (impact) {
      case 'CRITICAL_TRIGGER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">CRITICAL TRIGGER</span>;
      case 'HIGH_RISK_FACTOR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">HIGH RISK FACTOR</span>;
      case 'MODERATE_ELEVATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300">MODERATE ELEVATION</span>;
      case 'NORMAL_BASELINE':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">NORMAL BASELINE</span>;
    }
  };

  if (!factors || factors.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No specific contributing factors recorded for this assessment.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-base">Contributing Clinical Factors</h3>
          <p className="text-xs text-slate-500">
            Observed clinical evidence categorized by physiological system and impact severity.
          </p>
        </div>
        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
          {factors.length} Evidence Records
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {factors.map((factor) => (
          <div key={factor.factorId} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg shrink-0 mt-0.5">
                {getCategoryIcon(factor.category)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-slate-900 text-sm">{factor.factorTitle}</h4>
                  {getImpactBadge(factor.impact)}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {factor.description}
                </p>
                <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                  <span>Source: {factor.sourceFieldRef}</span>
                  {factor.referenceRange && <span>Ref Range: {factor.referenceRange}</span>}
                </div>
              </div>
            </div>

            {factor.observedValue && (
              <div className="sm:text-right shrink-0">
                <span className="text-xs font-mono font-semibold px-2 py-1 bg-slate-100 text-slate-800 rounded">
                  {factor.observedValue}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
