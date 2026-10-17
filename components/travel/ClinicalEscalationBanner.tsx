'use client';

import React from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, Navigation } from 'lucide-react';
import { ClinicalRiskContext } from '@/lib/travel/types';

interface ClinicalEscalationBannerProps {
  clinicalRisk: ClinicalRiskContext;
  escalationReason?: string;
  emergencyActionRequired?: string;
}

export default function ClinicalEscalationBanner({
  clinicalRisk,
  escalationReason,
  emergencyActionRequired,
}: ClinicalEscalationBannerProps) {
  return (
    <div className="rounded-xl border-2 border-red-500 bg-red-50 p-5 sm:p-6 shadow-md text-red-950 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="p-3 bg-red-600 text-white rounded-xl shadow-sm shrink-0">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white">
              Emergency Escalation Active
            </span>
            <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
              Status: {clinicalRisk.urgencyLevel}
            </span>
            {clinicalRisk.assessmentTimestamp && (
              <span className="text-xs text-red-600">
                Assessed: {new Date(clinicalRisk.assessmentTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-red-900 tracking-tight mb-2">
            Clinical Priority Override: Travel Optimization Suspended
          </h3>

          <p className="text-sm text-red-800 leading-relaxed mb-3">
            {escalationReason ||
              'High-risk clinical symptoms or acute surgical complications detected. Travel cost comparison and routine outpatient substitution are suspended to avoid hazardous delays in emergency care.'}
          </p>

          {/* Red Flag Symptoms Display */}
          {clinicalRisk.redFlags && clinicalRisk.redFlags.length > 0 && (
            <div className="bg-white/80 border border-red-200 rounded-lg p-3.5 mb-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-900 uppercase tracking-wider mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Detected Post-Surgical Red Flags (Member 2 AI Risk Ingestion)
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-900 font-medium">
                {clinicalRisk.redFlags.map((flag, idx) => (
                  <li key={idx} className="leading-snug">{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Box */}
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-xs sm:text-sm text-red-900 font-semibold mb-4 flex items-start gap-2">
            <Navigation className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold underline">Mandatory Action:</span>{' '}
              {emergencyActionRequired ||
                'Patient should be accompanied to the nearest 24/7 surgical emergency trauma center or contact the primary surgical team immediately. Do not attempt long-distance transit.'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="tel:112"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              Call Emergency Medical Helpline (112)
            </a>
            <span className="text-xs text-red-700 font-medium">
              Nearest trauma center coordinates highlighted in red on route map.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
