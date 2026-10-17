'use client';

import React, { useState } from 'react';
import { DestinationComparisonOption } from '@/lib/travel/types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  BadgeCheck, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  Info,
  Building2,
  Stethoscope
} from 'lucide-react';
import CostBreakdownDialog from './CostBreakdownDialog';

interface ComparisonMatrixProps {
  candidates: DestinationComparisonOption[];
  selectedCandidateId?: string;
  onSelectCandidate: (candidateId: string) => void;
  requiredService: string;
  onProceedToFollowUpPlan?: (selectedCandidate: DestinationComparisonOption) => void;
}

export default function ComparisonMatrix({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  requiredService,
  onProceedToFollowUpPlan,
}: ComparisonMatrixProps) {
  const [costDialogOption, setCostDialogOption] = useState<DestinationComparisonOption | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            Evaluated Healthcare Destinations
          </h3>
          <p className="text-xs text-slate-500">
            Comparing candidate facilities matching post-surgical requirement: <strong className="text-slate-800">{requiredService.replace(/_/g, ' ')}</strong>
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          Showing {candidates.length} options (sorted by safety, capability & distance)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {candidates.map((option) => {
          const isSelected = selectedCandidateId ? option.providerId === selectedCandidateId : option.isRecommended;

          return (
            <div
              key={option.providerId}
              onClick={() => onSelectCandidate(option.providerId)}
              className={`relative rounded-xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                option.isRecommended
                  ? 'border-emerald-500 bg-emerald-50/30 shadow-md ring-2 ring-emerald-400/20'
                  : !option.isEligible
                  ? 'border-slate-200 bg-slate-50/60 opacity-80'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50/20 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
              }`}
            >
              <div>
                {/* Header Badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {option.isRecommended && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" /> Recommended Local
                      </span>
                    )}
                    {option.isOriginalHospital && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                        Primary Surgical Center
                      </span>
                    )}
                    {!option.isEligible && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                        Ineligible
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Rank #{option.rankOrder}
                  </span>
                </div>

                {/* Facility Name & Location */}
                <h4 className="font-bold text-slate-900 text-base leading-snug mb-1">
                  {option.providerName}
                </h4>
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{option.location.label}</span>
                </div>

                {/* Verification Badge */}
                <div className="mb-4">
                  {option.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified: {option.verificationBadge.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100/60 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Unverified Directory Entry
                    </span>
                  )}
                </div>

                {/* Key Metrics: Distance & Duration */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs mb-4">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">One-Way Distance</span>
                    <span className="text-base font-extrabold text-slate-900">{option.route.distanceKm} km</span>
                    <span className="block text-[10px] text-slate-500">
                      {option.route.routeSource === 'OSRM_LIVE' ? 'OSRM Live Route' : 'Haversine Est.'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Est. Duration</span>
                    <span className="text-base font-extrabold text-slate-900 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-slate-500" />
                      {Math.floor(option.route.durationMins / 60)}h {option.route.durationMins % 60}m
                    </span>
                    <span className="block text-[10px] text-slate-500">Cautious post-op transit</span>
                  </div>
                </div>

                {/* Cost Estimation Preview */}
                <div className="mb-4">
                  {option.costEstimate ? (
                    <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-teal-50/60 border border-teal-100 text-teal-900">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-teal-700 block">Scenario Cost Est.</span>
                        <span className="font-extrabold text-sm text-teal-950">
                          {option.costEstimate.currency} {option.costEstimate.estimatedCost.toLocaleString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCostDialogOption(option);
                        }}
                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 underline flex items-center gap-1"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Assumptions
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic p-2 rounded bg-slate-50 border border-slate-100">
                      {option.costMissingReason || 'Cost estimate unavailable for this destination.'}
                    </div>
                  )}
                </div>

                {/* Clinical Service Match Status */}
                <div className="mb-4">
                  {option.isEligible ? (
                    <div className="flex items-start gap-1.5 text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Offers verified <strong>{requiredService.replace(/_/g, ' ')}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-xs text-red-800 bg-red-50 p-2 rounded border border-red-200">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">Ineligible Destination:</strong>
                        <span>{option.ineligibilityReason}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {isSelected ? 'Currently Selected' : 'Click to preview on map'}
                </span>

                {option.isEligible && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onProceedToFollowUpPlan) onProceedToFollowUpPlan(option);
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      option.isRecommended
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    <span>Coordinate Plan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assumptions modal */}
      <CostBreakdownDialog
        costEstimate={costDialogOption?.costEstimate ?? null}
        providerName={costDialogOption?.providerName ?? ''}
        isOpen={Boolean(costDialogOption)}
        onClose={() => setCostDialogOption(null)}
      />
    </div>
  );
}
