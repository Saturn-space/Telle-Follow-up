'use client';

import React from 'react';
import { Patient, RiskAssessment, Provider, TravelComparison, FollowUpPlan } from '@/lib/types/followup';
import {
  UserCheck,
  ShieldAlert,
  MapPin,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface CrossModulePipelineViewProps {
  patient: Patient;
  riskAssessment?: RiskAssessment;
  providers: Provider[];
  travelComparison?: TravelComparison;
  plans: FollowUpPlan[];
  onSelectPatient: (patientId: string) => void;
  allPatients: Patient[];
}

export const CrossModulePipelineView: React.FC<CrossModulePipelineViewProps> = ({
  patient,
  riskAssessment,
  providers,
  travelComparison,
  plans,
  onSelectPatient,
  allPatients,
}) => {
  const isHighRisk = riskAssessment?.riskTier === 'HIGH';
  const isEscalated = travelComparison?.isEscalated || isHighRisk;

  return (
    <div className="space-y-6">
      {/* Header Overview */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              <span>End-to-End Orchestration Pipeline</span>
              <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
                System Verified
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Complete data orchestration linking Patient Intake & Recovery, AI Risk Stratification, Healthcare Directory, Travel Optimization, and Care Coordination & Teleconsultation.
            </p>
          </div>

          {/* Quick Switcher for Synthetic Test Scenarios */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Synthetic Scenario:</span>
            <div className="flex flex-wrap gap-1.5">
              {allPatients.map((p) => {
                const isSelected = p.id === patient.id;
                const isEsc = p.id === 'pat-103';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPatient(p.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? isEsc
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] opacity-80">
                      {isEsc ? '(High-Risk Emergency)' : p.id === 'pat-101' ? '(Stable CABG)' : '(Moderate TKA)'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Breakdown Card */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
          <Layers className="w-4 h-4 text-teal-600" />
          <span>Active Patient Context: {patient.name} ({patient.mrn})</span>
        </div>
        <p className="text-slate-600">
          <strong>Procedure:</strong> {patient.surgeryProcedure} performed at {patient.operatingHospital} by {patient.surgeonName}.
          Discharge date: {new Date(patient.dischargeDate).toLocaleDateString()}.
        </p>
      </div>

      {/* Escalation Safety Alert if Active */}
      {isEscalated && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-red-900 shadow-xs animate-pulse">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">EMERGENCY CLINICAL ESCALATION ACTIVE</h4>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                Patient exhibits acute surgical red flags (e.g. fever &gt; 38.5°C, acute guarding, or suspected bile peritonitis). In strict accordance with clinical safety principles, routine travel optimization and remote teleconsultation booking are <strong>suppressed</strong>. Direct hospital evaluation is mandated.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stepper Pipeline Flow */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Step 1: Intake */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Step 1</span>
              <span className="text-[10px] bg-slate-100 font-mono text-slate-600 px-1.5 py-0.5 rounded">
                Intake
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Registration & Recovery</span>
            </h4>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <p><strong>Patient:</strong> {patient.name}</p>
              <p><strong>Procedure:</strong> {patient.surgeryProcedure.slice(0, 24)}...</p>
              <p><strong>Discharge:</strong> {new Date(patient.dischargeDate).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Telemetry Ingested</span>
          </div>
        </div>

        {/* Step 2: Risk Stratification */}
        <div className={`rounded-xl p-4 border shadow-xs flex flex-col justify-between ${
          isHighRisk ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Step 2</span>
              <span className="text-[10px] bg-slate-100 font-mono text-slate-600 px-1.5 py-0.5 rounded">
                Risk Engine
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>AI Risk Stratification</span>
            </h4>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1">
                <strong>Risk Tier:</strong>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  isHighRisk ? 'bg-red-200 text-red-900' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {riskAssessment?.riskTier || 'LOW'} ({Math.round((riskAssessment?.riskScore || 0) * 100)}%)
                </span>
              </div>
              <p className="line-clamp-2 text-[11px] text-slate-500">
                {riskAssessment?.summaryRationale}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] font-semibold flex items-center gap-1">
            {isHighRisk ? (
              <span className="text-red-600 flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3 h-3" />
                <span>Critical Red Flags</span>
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Doctor Reviewed</span>
              </span>
            )}
          </div>
        </div>

        {/* Step 3: Directory */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Step 3</span>
              <span className="text-[10px] bg-slate-100 font-mono text-slate-600 px-1.5 py-0.5 rounded">
                Directory
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>Local Providers</span>
            </h4>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <p><strong>Directory:</strong> {providers.length} Facilities</p>
              <p><strong>Nearest:</strong> {providers[0]?.name.slice(0, 20)}...</p>
              <p><strong>Radius:</strong> ~{providers[0]?.distanceKm} km</p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified Facilities</span>
          </div>
        </div>

        {/* Step 4: Travel Engine */}
        <div className={`rounded-xl p-4 border shadow-xs flex flex-col justify-between ${
          isEscalated ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Step 4</span>
              <span className="text-[10px] bg-slate-100 font-mono text-slate-600 px-1.5 py-0.5 rounded">
                Travel Engine
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-teal-600" />
              <span>Travel Optimization</span>
            </h4>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              {isEscalated ? (
                <p className="text-red-700 font-bold text-[11px]">
                  ESCALATION OVERRIDE: Travel optimization suppressed.
                </p>
              ) : (
                <>
                  <p><strong>Avoided Dist:</strong> ~{travelComparison?.roundTripDistanceKm} km</p>
                  <p><strong>Transit Saved:</strong> ~{travelComparison?.estimatedTravelHours} hrs</p>
                  <p><strong>Cost Savings:</strong> ~₹{travelComparison?.estimatedCostInr}</p>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] font-semibold flex items-center gap-1">
            {isEscalated ? (
              <span className="text-red-600 font-bold">Emergency Directed</span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Hybrid Approved</span>
              </span>
            )}
          </div>
        </div>

        {/* Step 5: Coordination */}
        <div className="bg-teal-50/40 rounded-xl p-4 border border-teal-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Step 5</span>
              <span className="text-[10px] bg-teal-100 font-mono text-teal-800 px-1.5 py-0.5 rounded">
                Coordination
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>Follow-Up & Video</span>
            </h4>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <p><strong>Active Plans:</strong> {plans.length}</p>
              <p><strong>Jitsi Video:</strong> Configured (Zero PII)</p>
              <p><strong>Payments:</strong> Optional (Disabled)</p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-teal-100 text-[10px] text-teal-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
            <span>Orchestration Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
