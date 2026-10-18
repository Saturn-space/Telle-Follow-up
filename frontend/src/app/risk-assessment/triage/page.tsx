'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - CLINICIAN RISK TRIAGE DASHBOARD (MODULE 2)
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1">
          <ShieldAlert className="w-4 h-4" />
          <span>Clinical Decision Support • Risk Stratification</span>
          <span>•</span>
          <span>AI Risk Triage Queue</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Post-Surgical Risk Stratification &amp; CDS Engine
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-3xl">
          Deterministic physiological rules combined with Claude CDS synthesis to stratify recovery risk, flag acute surgical complications, and trigger safety escalations.
        </p>
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
