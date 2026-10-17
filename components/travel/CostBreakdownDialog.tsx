'use client';

import React from 'react';
import { TravelCostEstimate } from '@/lib/travel/types';
import { X, HelpCircle, Info, Calculator } from 'lucide-react';

interface CostBreakdownDialogProps {
  costEstimate: TravelCostEstimate | null;
  providerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CostBreakdownDialog({
  costEstimate,
  providerName,
  isOpen,
  onClose,
}: CostBreakdownDialogProps) {
  if (!isOpen || !costEstimate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Travel Expense Estimation Breakdown
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-500">
            Destination: <strong className="text-slate-800">{providerName}</strong>
          </div>

          {/* Big number */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                Total Scenario Estimate
              </div>
              <div className="text-2xl font-extrabold text-teal-950">
                {costEstimate.currency} {costEstimate.estimatedCost.toLocaleString()}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-teal-200/60 text-teal-900 font-bold text-xs uppercase">
              {costEstimate.transportMode.replace('_', ' ')}
            </span>
          </div>

          {/* Formula calculation details */}
          <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-600" />
              Formula & Variable Breakdown
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>One-way route distance:</span>
              <span className="font-medium">{(costEstimate.roundtripDistanceKm / 2).toFixed(1)} km</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>Round-trip travel factor:</span>
              <span className="font-medium">2.0x ({costEstimate.roundtripDistanceKm} km)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>Base cost per km:</span>
              <span className="font-medium">
                {costEstimate.currency} {costEstimate.ratePerKm.toFixed(2)} / km
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>Calculated transit cost:</span>
              <span className="font-medium">
                {costEstimate.currency}{' '}
                {(costEstimate.estimatedCost - costEstimate.incidentalLodgingCost).toLocaleString()}
              </span>
            </div>
            {costEstimate.incidentalLodgingCost > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200 text-amber-900">
                <span>Overnight stay allowance (&gt;250 km):</span>
                <span className="font-bold">
                  +{costEstimate.currency} {costEstimate.incidentalLodgingCost.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Documented Assumptions */}
          <div>
            <div className="text-xs font-semibold text-slate-900 mb-1.5">Documented Assumptions:</div>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
              {costEstimate.assumptions.map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          {/* Legal / Clinical Disclaimer */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Compliance Notice:</strong> This projection is generated for financial transparency only.
              It does not represent an actual transport ticket or fare quote. In clinical follow-up planning,
              medical necessity and patient safety always supersede cost considerations.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
