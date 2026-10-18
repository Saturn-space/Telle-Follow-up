'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  ClinicalUrgencyLevel,
  DestinationComparisonOption,
  TransportMode,
  TravelComparisonResult,
} from '@/lib/travel/types';
import JourneySelector from './JourneySelector';
import ComparisonMatrix from './ComparisonMatrix';
import ClinicalEscalationBanner from './ClinicalEscalationBanner';
import SystemReliabilityPanel from './SystemReliabilityPanel';
import {
  TrendingDown,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  PlayCircle,
  FileCode,
} from 'lucide-react';

// SSR-safe dynamic import of Leaflet map
const LeafletMapContainer = dynamic(() => import('./LeafletMapContainer'), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] sm:h-[440px] rounded-xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2">
      <div className="h-7 w-7 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-medium">Loading interactive routing map...</span>
    </div>
  ),
});

export default function TravelOptimizationDashboard({ initialPatientId }: { initialPatientId?: string } = {}) {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || 'pt-101');
  const [requiredService, setRequiredService] = useState<string>('POST_OP_WOUND_CARE');
  const [transportMode, setTransportMode] = useState<TransportMode>('DRIVING');
  const [clinicalUrgency, setClinicalUrgency] = useState<ClinicalUrgencyLevel>('LOW');
  const [comparisonResult, setComparisonResult] = useState<TravelComparisonResult | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [handoffToast, setHandoffToast] = useState<string | null>(null);

  const triggerComparison = useCallback(
    async (
      patientId: string,
      originOverride?: any,
      serviceOverride?: string,
      modeOverride?: TransportMode,
      urgencyOverride?: ClinicalUrgencyLevel
    ) => {
      setIsLoading(true);
      setError(null);

      const pt = patients.find((p) => p.patientId === patientId);
      const origin = originOverride || pt?.origin || {
        latitude: 26.9124,
        longitude: 75.7873,
        label: 'Jaipur, Rajasthan',
        district: 'Jaipur',
        state: 'Rajasthan',
      };

      try {
        const res = await fetch('/api/travel/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            origin,
            requiredService: serviceOverride || requiredService,
            transportMode: modeOverride || transportMode,
            simulateClinicalUrgency: urgencyOverride || clinicalUrgency,
          }),
        });

        const body = await res.json();
        if (body.success) {
          setComparisonResult(body.data);
          setSelectedCandidateId(body.data.recommendedProviderId);
        } else {
          setError(body.error?.message || 'Comparison request failed.');
        }
      } catch (err: any) {
        setError(err?.message || 'Network error executing travel comparison.');
      } finally {
        setIsLoading(false);
      }
    },
    [patients, requiredService, transportMode, clinicalUrgency]
  );

  // Fetch initial patient data once on mount
  useEffect(() => {
    let active = true;

    async function initData() {
      try {
        const res = await fetch('/api/travel/patients');
        if (res.ok && active) {
          const body = await res.json();
          if (body.success && body.data.patients.length > 0) {
            const defaultPt = body.data.patients[0];
            setPatients(body.data.patients);
            setSelectedPatientId(defaultPt.patientId);
            setClinicalUrgency(defaultPt.clinicalRisk.urgencyLevel);

            const compareRes = await fetch('/api/travel/compare', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientId: defaultPt.patientId,
                origin: defaultPt.origin,
                requiredService: 'POST_OP_WOUND_CARE',
                transportMode: 'DRIVING',
                simulateClinicalUrgency: defaultPt.clinicalRisk.urgencyLevel,
              }),
            });

            if (compareRes.ok && active) {
              const compareBody = await compareRes.json();
              if (compareBody.success) {
                setComparisonResult(compareBody.data);
                setSelectedCandidateId(compareBody.data.recommendedProviderId);
              }
            }
          }
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Failed to initialize patient travel context.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    initData();

    return () => {
      active = false;
    };
  }, []);

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    const pt = patients.find((p) => p.patientId === patientId);
    if (pt) {
      setClinicalUrgency(pt.clinicalRisk.urgencyLevel);
      triggerComparison(patientId, pt.origin, requiredService, transportMode, pt.clinicalRisk.urgencyLevel);
    }
  };

  const handleRunComparison = () => {
    const pt = patients.find((p) => p.patientId === selectedPatientId);
    triggerComparison(selectedPatientId, pt?.origin, requiredService, transportMode, clinicalUrgency);
  };

  const handleProceedToFollowUpPlan = (option: DestinationComparisonOption) => {
    setHandoffToast(
      `Coordinating Follow-Up Plan: Destination "${option.providerName}" (${option.route.distanceKm} km) queued for care coordination and scheduling.`
    );
    setTimeout(() => setHandoffToast(null), 6000);
  };

  // Demonstration Presets
  const applyScenarioPreset = (scenario: 'SAVINGS' | 'ESCALATION' | 'UNASSESSED' | 'MISMATCH') => {
    if (scenario === 'SAVINGS') {
      setSelectedPatientId('pt-101');
      setRequiredService('POST_OP_WOUND_CARE');
      setTransportMode('DRIVING');
      setClinicalUrgency('LOW');
      const pt = patients.find((p) => p.patientId === 'pt-101');
      triggerComparison('pt-101', pt?.origin, 'POST_OP_WOUND_CARE', 'DRIVING', 'LOW');
    } else if (scenario === 'ESCALATION') {
      setSelectedPatientId('pt-103');
      setRequiredService('POST_OP_WOUND_CARE');
      setTransportMode('DRIVING');
      setClinicalUrgency('CRITICAL');
      const pt = patients.find((p) => p.patientId === 'pt-103');
      triggerComparison('pt-103', pt?.origin, 'POST_OP_WOUND_CARE', 'DRIVING', 'CRITICAL');
    } else if (scenario === 'UNASSESSED') {
      setSelectedPatientId('pt-101');
      setRequiredService('POST_OP_WOUND_CARE');
      setTransportMode('DRIVING');
      setClinicalUrgency('UNASSESSED_OR_MISSING');
      const pt = patients.find((p) => p.patientId === 'pt-101');
      triggerComparison('pt-101', pt?.origin, 'POST_OP_WOUND_CARE', 'DRIVING', 'UNASSESSED_OR_MISSING');
    } else if (scenario === 'MISMATCH') {
      setSelectedPatientId('pt-101');
      setRequiredService('DRAIN_REMOVAL'); // Specialized drain removal
      setTransportMode('DRIVING');
      setClinicalUrgency('LOW');
      const pt = patients.find((p) => p.patientId === 'pt-101');
      triggerComparison('pt-101', pt?.origin, 'DRAIN_REMOVAL', 'DRIVING', 'LOW');
    }
  };

  return (
    <div className="space-y-8">
      {/* Module Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
              Travel Options • Transit Optimization
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Travel Comparison & Route Planning Module
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Safety-Aware Travel & Care Coordination
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Comparing long-distance return travel against verified local healthcare options to minimize physical recovery strain while prioritizing clinical safety.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              Integrated & Verified
            </span>
          </div>
        </div>
      </div>

      {/* Demonstration Quick-Select Preset Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-teal-400" />
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Evaluation & Demonstration Presets</span>
              <p className="text-[11px] text-slate-400">1-click automated setup of the 4 core clinical demonstration scenarios</p>
            </div>
          </div>
          <span className="text-[10px] text-teal-300 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            System Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={() => applyScenarioPreset('SAVINGS')}
            disabled={isLoading}
            className="text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs transition-colors"
          >
            <div className="font-bold text-teal-300 mb-0.5">Scenario 1: Stable Care Plan</div>
            <div className="text-[10px] text-slate-400 leading-tight">Patient 101: 572 km round-trip saved via local clinic</div>
          </button>

          <button
            onClick={() => applyScenarioPreset('ESCALATION')}
            disabled={isLoading}
            className="text-left p-2.5 rounded-lg bg-red-950/40 hover:bg-red-950/60 border border-red-800/60 text-xs transition-colors"
          >
            <div className="font-bold text-red-400 mb-0.5">Scenario 2: Emergency Takeover</div>
            <div className="text-[10px] text-slate-400 leading-tight">Patient 103: Red-flags trigger immediate ER escalation</div>
          </button>

          <button
            onClick={() => applyScenarioPreset('UNASSESSED')}
            disabled={isLoading}
            className="text-left p-2.5 rounded-lg bg-purple-950/40 hover:bg-purple-950/60 border border-purple-800/60 text-xs transition-colors"
          >
            <div className="font-bold text-purple-300 mb-0.5">Scenario 3: Missing Risk Gate</div>
            <div className="text-[10px] text-slate-400 leading-tight">Missing assessment never assumed low risk</div>
          </button>

          <button
            onClick={() => applyScenarioPreset('MISMATCH')}
            disabled={isLoading}
            className="text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs transition-colors"
          >
            <div className="font-bold text-amber-300 mb-0.5">Scenario 4: Service Mismatch</div>
            <div className="text-[10px] text-slate-400 leading-tight">Filters out facilities lacking required surgical care</div>
          </button>
        </div>
      </div>

      {/* Handoff Toast Notification */}
      {handoffToast && (
        <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{handoffToast}</span>
          </div>
          <button
            onClick={() => setHandoffToast(null)}
            className="text-white/80 hover:text-white font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Configuration & Input Selector */}
      <JourneySelector
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelectPatient={handlePatientChange}
        requiredService={requiredService}
        onChangeService={(s) => setRequiredService(s)}
        transportMode={transportMode}
        onChangeTransportMode={(m) => setTransportMode(m)}
        clinicalUrgencySimulation={clinicalUrgency}
        onChangeClinicalUrgencySimulation={(u) => setClinicalUrgency(u)}
        isLoading={isLoading}
        onRunComparison={handleRunComparison}
      />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* MISSING OR UNASSESSED CLINICAL RISK WARNING BANNER */}
      {(comparisonResult?.clinicalRisk.isMissing ||
        comparisonResult?.clinicalRisk.urgencyLevel === 'UNASSESSED_OR_MISSING') && (
        <div className="rounded-xl border-2 border-purple-400 bg-purple-50 p-5 shadow-sm text-purple-950 flex items-start gap-3.5">
          <ShieldAlert className="w-6 h-6 text-purple-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <div className="font-bold text-purple-900 flex items-center gap-2 mb-1">
              <span>Safety Advisory: Clinical Risk Assessment Unavailable</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-200 text-purple-900">
                Action Required
              </span>
            </div>
            <p className="text-purple-800 leading-relaxed">
              No verified post-surgical assessment is on file for this patient. The system has <strong>not</strong> assumed low risk. While geographical and financial estimates are shown below for coordination planning, <strong>the patient is not medically cleared for travel</strong> until reviewed by a qualified clinician.
            </p>
          </div>
        </div>
      )}

      {/* STALE RISK WARNING BANNER */}
      {comparisonResult?.clinicalRisk.isStale && !comparisonResult?.clinicalRisk.isMissing && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Assessment Staleness Notice:</span> The patient&apos;s risk assessment record is over 48 hours old. Clinical re-evaluation is advised before finalizing in-person local or remote follow-up.
          </div>
        </div>
      )}

      {/* EMERGENCY ESCALATION BANNER (If Active) */}
      {comparisonResult?.isEscalated && (
        <ClinicalEscalationBanner
          clinicalRisk={comparisonResult.clinicalRisk}
          escalationReason={comparisonResult.escalationReason}
          emergencyActionRequired={comparisonResult.emergencyActionRequired}
        />
      )}

      {/* Transparent Savings & Recommendation Summary Card */}
      {comparisonResult && !comparisonResult.isEscalated && (
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Recommendation Rationale
                </span>
                <span className="text-xs text-slate-400">
                  Patient: {comparisonResult.patientName} • {comparisonResult.surgeryType}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {comparisonResult.recommendedCategory === 'LOCAL_VERIFIED_CLINIC'
                  ? 'Local Surgical Follow-Up Approved'
                  : comparisonResult.recommendedCategory === 'ORIGINAL_SURGICAL_HOSPITAL'
                  ? 'Return to Primary Surgical Center Recommended'
                  : 'Teleconsultation Hybrid Recommended'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {comparisonResult.recommendationRationale}
              </p>
            </div>

            {/* Savings Metrics Pills */}
            {comparisonResult.potentialTravelSavingsKm !== undefined && (
              <div className="flex sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
                <div className="flex-1 lg:w-56 bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-teal-300 font-semibold mb-1">
                    <span>Round-trip Distance Saved</span>
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    {comparisonResult.potentialTravelSavingsKm} km
                  </div>
                  <span className="text-[10px] text-slate-400">Compared to traveling to original hospital</span>
                </div>

                <div className="flex-1 lg:w-56 bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-teal-300 font-semibold mb-1">
                    <span>Transit Time Saved</span>
                    <Clock className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    ~{Math.round((comparisonResult.potentialDurationSavingsMins || 0) / 60)} Hours
                  </div>
                  <span className="text-[10px] text-slate-400">Reduced physical strain during recovery</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Geospatial Map Visualization */}
      {comparisonResult && (
        <div className="space-y-2">
          <LeafletMapContainer
            origin={comparisonResult.origin}
            candidates={comparisonResult.candidates}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={(id) => setSelectedCandidateId(id)}
            isEscalated={comparisonResult.isEscalated}
          />
        </div>
      )}

      {/* Candidate Destinations Comparison Matrix */}
      {comparisonResult && (
        <ComparisonMatrix
          candidates={comparisonResult.candidates}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={(id) => setSelectedCandidateId(id)}
          requiredService={comparisonResult.requiredService}
          onProceedToFollowUpPlan={handleProceedToFollowUpPlan}
        />
      )}

      {/* Phase 5: Production Reliability & Zero-PHI Telemetry Panel */}
      <SystemReliabilityPanel />

      {/* Technical Metadata & Transparency Drawer */}
      {comparisonResult && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <strong className="text-slate-700">Audit & Calculation Transparency:</strong> Comparison ID{' '}
            <code className="text-slate-800 font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
              {comparisonResult.comparisonId}
            </code>{' '}
            • Routing Engine: <span className="font-semibold text-slate-700">{comparisonResult.meta.routingServiceStatus}</span>
          </div>
          <div className="text-[11px] italic text-slate-400 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" />
            {comparisonResult.meta.notice}
          </div>
        </div>
      )}
    </div>
  );
}
