'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - CLINICIAN RISK TRIAGE DASHBOARD
// Clinical Decision Support & Recovery Assessment based on DESIGN.md
// ============================================================================

import React, { useState, useEffect } from 'react';
import { SEEDED_PATIENT_CASES } from '@/lib/risk/store';
import { PatientRecoveryInput, RiskAssessmentResult } from '@/lib/risk/types';
import { PatientCaseSelector } from '@/components/risk/PatientCaseSelector';
import { RiskStatusBanner } from '@/components/risk/RiskStatusBanner';
import { RiskFactorBreakdown } from '@/components/risk/RiskFactorBreakdown';
import { DataQualityAlerts } from '@/components/risk/DataQualityAlerts';
import { AiSynthesisCard } from '@/components/risk/AiSynthesisCard';
import { ClinicianReviewDialog } from '@/components/risk/ClinicianReviewDialog';
import { ShieldAlert, Activity, RefreshCw } from 'lucide-react';

export default function ClinicianRiskTriagePage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat_cabg_03');
  const [currentInput, setCurrentInput] = useState<PatientRecoveryInput>(
    SEEDED_PATIENT_CASES['pat_cabg_03']
  );
  const [currentAssessment, setCurrentAssessment] = useState<RiskAssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);

  const runEvaluation = async (inputToEvaluate?: PatientRecoveryInput) => {
    setIsLoading(true);
    try {
      const target = inputToEvaluate || currentInput;
      const res = await fetch('/api/risk-assessments/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryInput: target, enableAiExplanation: true }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentAssessment(data.data);
      }
    } catch (err) {
      console.error('[RiskTriage] Evaluation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const defaultInput = SEEDED_PATIENT_CASES[selectedPatientId] || SEEDED_PATIENT_CASES['pat_cabg_03'];
    setCurrentInput(defaultInput);
    runEvaluation(defaultInput);
  }, [selectedPatientId]);

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#122A70] via-[#1745D8] to-[#254EE0] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[#89F5E7] text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-4 h-4 text-[#89F5E7]" />
            <span>Clinical Decision Support Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Post-Surgical Risk Stratification &amp; CDS Engine
          </h1>
          <p className="text-sm text-[#C0CAFF] mt-2 leading-relaxed">
            Deterministic physiological rules combined with clinical decision support synthesis to stratify recovery risk, flag acute surgical complications, and trigger safety escalations.
          </p>
        </div>
      </div>

      {/* Patient Recovery Case Selector & Physiological Boundary Controls */}
      <PatientCaseSelector
        selectedPatientId={selectedPatientId}
        onSelectPatient={(id) => setSelectedPatientId(id)}
        currentInput={currentInput}
        onUpdateInput={setCurrentInput}
        onEvaluate={() => runEvaluation()}
        isLoading={isLoading}
      />

      {/* Live Risk Assessment Display */}
      {currentAssessment && (
        <div className="space-y-6">
          <RiskStatusBanner
            assessment={currentAssessment}
            onOpenReview={() => setIsReviewOpen(true)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <RiskFactorBreakdown factors={currentAssessment.contributingFactors} />
              <DataQualityAlerts
                alerts={currentAssessment.dataQualityAlerts}
                missingFlags={currentAssessment.missingDataFlags || []}
              />
            </div>

            <div className="lg:col-span-5 space-y-6">
              <AiSynthesisCard
                synthesis={currentAssessment.aiSynthesis}
                engine={currentAssessment.engine || 'DETERMINISTIC_RULES_V1'}
              />
            </div>
          </div>

          <ClinicianReviewDialog
            isOpen={isReviewOpen}
            onClose={() => setIsReviewOpen(false)}
            assessment={currentAssessment}
            onReviewSubmitted={(updated) => {
              setCurrentAssessment(updated);
              setIsReviewOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
