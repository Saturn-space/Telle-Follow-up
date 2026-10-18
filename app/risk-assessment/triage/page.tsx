'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PatientCaseSelector } from '@/components/risk/PatientCaseSelector';
import { RiskStatusBanner } from '@/components/risk/RiskStatusBanner';
import { RiskFactorBreakdown } from '@/components/risk/RiskFactorBreakdown';
import { DataQualityAlerts } from '@/components/risk/DataQualityAlerts';
import { AiSynthesisCard } from '@/components/risk/AiSynthesisCard';
import { ClinicianReviewDialog } from '@/components/risk/ClinicianReviewDialog';
import { ShieldAlert } from 'lucide-react';
import type { RiskAssessmentResult } from '@/lib/risk/types';

export default function ClinicianRiskTriagePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [currentAssessment, setCurrentAssessment] = useState<RiskAssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEvaluate = ['CLINICIAN', 'COORDINATOR', 'ADMIN'].includes(user?.role || '');

  const loadHistory = useCallback(async (patientId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/risk-assessments?limit=20`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Assessment history could not be loaded.');
      setCurrentAssessment(result.data?.[0] || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assessment history could not be loaded.');
      setCurrentAssessment(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    fetch('/api/travel/patients', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || 'Patient records could not be loaded.');
        if (!active) return;
        const options = result.data?.patients || [];
        setPatients(options);
        if (options[0]) {
          setSelectedPatientId(options[0].patientId);
          await loadHistory(options[0].patientId);
        }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Patient records could not be loaded.'); });
    return () => { active = false; };
  }, [authLoading, loadHistory]);

  const runEvaluation = async () => {
    if (!selectedPatientId || !canEvaluate) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/risk-assessments/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatientId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Assessment could not be completed.');
      setCurrentAssessment(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assessment could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (patientId) void loadHistory(patientId);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6">
      <div className="bg-gradient-to-r from-[#122A70] via-[#1745D8] to-[#254EE0] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 text-[#89F5E7] text-xs font-semibold uppercase tracking-wider mb-3"><ShieldAlert className="w-4 h-4" />Clinical Risk Review</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Post-Surgical Risk Assessment</h1>
          <p className="text-sm text-[#C0CAFF] mt-2 leading-relaxed">Review persisted recovery records. Assessment output supports clinician judgment and does not replace clinical evaluation.</p>
        </div>
      </div>

      <PatientCaseSelector patients={patients} selectedPatientId={selectedPatientId} onSelectPatient={handleSelectPatient} onEvaluate={runEvaluation} isLoading={isLoading || authLoading} canEvaluate={canEvaluate} />

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      {!error && !isLoading && !currentAssessment && selectedPatientId && <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No saved risk assessment is available. Authorized clinical staff can assess the latest saved recovery entry.</div>}
      {currentAssessment && <div className="space-y-6">
        <RiskStatusBanner assessment={currentAssessment} onOpenReview={() => setIsReviewOpen(true)} canReview={user?.role === 'CLINICIAN'} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6"><RiskFactorBreakdown factors={currentAssessment.contributingFactors} /><DataQualityAlerts alerts={currentAssessment.dataQualityAlerts} missingFlags={currentAssessment.missingDataFlags || []} /></div>
          <div className="lg:col-span-5"><AiSynthesisCard synthesis={currentAssessment.aiSynthesis} engine={currentAssessment.engine || 'DETERMINISTIC_RULES_V1'} /></div>
        </div>
        {user?.role === 'CLINICIAN' && <ClinicianReviewDialog isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} assessment={currentAssessment} onReviewSubmitted={(updated) => { setCurrentAssessment(updated); setIsReviewOpen(false); }} />}
      </div>}
    </div>
  );
}
