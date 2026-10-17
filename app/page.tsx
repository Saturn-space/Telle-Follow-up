'use client';

// app/page.tsx
// Tele-Follow-Up Orchestrator: Member 1 - Patient Registration & Recovery Monitoring
import React, { useState, useEffect, useCallback } from 'react';
import {
  Patient,
  Surgery,
  RecoveryEntry,
  MedicalDocument,
  TimelineItem,
  UserRole,
} from '@/lib/types/patient';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { PatientRegistrationModal } from '@/components/patient/PatientRegistrationModal';
import { SurgicalProfileView } from '@/components/patient/SurgicalProfileView';
import { RecoveryLoggingForm } from '@/components/patient/RecoveryLoggingForm';
import { RecoveryTimelineView } from '@/components/patient/RecoveryTimelineView';
import { DocumentOcrStation } from '@/components/patient/DocumentOcrStation';
import { Member2ContractView } from '@/components/patient/Member2ContractView';
import { DemoWalkthroughView } from '@/components/patient/DemoWalkthroughView';
import {
  Activity,
  Stethoscope,
  Clock,
  FileText,
  Code2,
  FileCode,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientId] = useState<string>('pat-001');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeSurgery, setActiveSurgery] = useState<Surgery | null>(null);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole>('CLINICIAN');

  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'LOG_RECOVERY' | 'TIMELINE' | 'DOCUMENTS' | 'MEMBER2_CONTRACT' | 'DEMO_GUIDE'
  >('OVERVIEW');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load patient directory
  const loadPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/patients');
      const json = await res.json();
      if (json.success && json.data.patients.length > 0) {
        setPatients(json.data.patients);
      }
    } catch (err) {
      console.error('Failed to load patients', err);
    }
  }, []);

  // Load details for selected patient
  const loadPatientData = useCallback(async (patientId: string) => {
    setLoading(true);
    try {
      // 1. Patient profile & surgery
      const pRes = await fetch(`/api/v1/patients/${patientId}`);
      const pJson = await pRes.json();
      if (pJson.success) {
        setActivePatient(pJson.data.patient);
        setActiveSurgery(pJson.data.surgery);
      }

      // 2. Documents
      const dRes = await fetch(`/api/v1/patients/${patientId}/documents`);
      const dJson = await dRes.json();
      if (dJson.success) {
        setDocuments(dJson.data.documents);
      }

      // 3. Timeline
      const tRes = await fetch(`/api/v1/patients/${patientId}/timeline`);
      const tJson = await tRes.json();
      if (tJson.success) {
        setTimeline(tJson.data.timeline);
      }
    } catch (err) {
      console.error('Failed to load patient data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (activePatientId) {
      loadPatientData(activePatientId);
    }
  }, [activePatientId, loadPatientData]);

  const handlePatientCreated = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
    setActivePatientId(newPatient.id);
  };

  const handleObservationAdded = (entry: RecoveryEntry) => {
    // Reload timeline & refresh data
    loadPatientData(activePatientId);
    setActiveTab('TIMELINE');
  };

  const handleDocumentAdded = (newDoc: MedicalDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);
    loadPatientData(activePatientId);
  };

  const handleOcrReviewed = (docId: string, verified: boolean) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              ocrExtraction: d.ocrExtraction
                ? { ...d.ocrExtraction, isVerified: verified, status: verified ? 'REVIEWED' : d.ocrExtraction.status }
                : null,
            }
          : d
      )
    );
    loadPatientData(activePatientId);
  };

  if (loading && !activePatient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">Loading Tele-Follow-Up Orchestrator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Patient Header & Quick Switcher */}
      {activePatient && (
        <PatientHeader
          patient={activePatient}
          surgery={activeSurgery}
          activeRole={activeRole}
          onRoleChange={setActiveRole}
          onOpenNewPatient={() => setIsRegisterOpen(true)}
          patients={patients}
          onSelectPatient={(id) => setActivePatientId(id)}
        />
      )}

      {/* Main Tab Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto scrollbar-none">
            <nav className="flex space-x-1 sm:space-x-4 py-2.5">
              {[
                {
                  id: 'OVERVIEW',
                  label: 'Surgical Profile',
                  icon: <Stethoscope className="w-4 h-4" />,
                },
                {
                  id: 'LOG_RECOVERY',
                  label: 'Log Observation & Vitals',
                  icon: <Activity className="w-4 h-4" />,
                },
                {
                  id: 'TIMELINE',
                  label: `Recovery Timeline (${timeline.length})`,
                  icon: <Clock className="w-4 h-4" />,
                },
                {
                  id: 'DOCUMENTS',
                  label: `Documents & OCR (${documents.length})`,
                  icon: <FileText className="w-4 h-4" />,
                },
                {
                  id: 'MEMBER2_CONTRACT',
                  label: 'Member 2 Risk Contract',
                  icon: <Code2 className="w-4 h-4" />,
                },
                {
                  id: 'DEMO_GUIDE',
                  label: 'Demo Guide & Release Suite',
                  icon: <Sparkles className="w-4 h-4 text-amber-400" />,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            <a
              href="/api/v1/openapi"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-500 hover:text-teal-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              OpenAPI 3.0 Spec
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activePatient && (
          <>
            {activeTab === 'OVERVIEW' && (
              <SurgicalProfileView
                patient={activePatient}
                surgery={activeSurgery}
                onSurgeryUpdated={(s) => setActiveSurgery(s)}
              />
            )}

            {activeTab === 'LOG_RECOVERY' && (
              <RecoveryLoggingForm
                patientId={activePatient.id}
                activeRole={activeRole}
                onObservationAdded={handleObservationAdded}
              />
            )}

            {activeTab === 'TIMELINE' && (
              <RecoveryTimelineView
                timeline={timeline}
                patientName={activePatient.fullName}
              />
            )}

            {activeTab === 'DOCUMENTS' && (
              <DocumentOcrStation
                patientId={activePatient.id}
                documents={documents}
                onDocumentAdded={handleDocumentAdded}
                onOcrReviewed={handleOcrReviewed}
                onDocumentDeleted={(docId) => {
                  setDocuments((prev) => prev.filter((d) => d.id !== docId));
                  loadPatientData(activePatient.id);
                }}
              />
            )}

            {activeTab === 'MEMBER2_CONTRACT' && (
              <Member2ContractView patientId={activePatient.id} />
            )}

            {activeTab === 'DEMO_GUIDE' && (
              <DemoWalkthroughView
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenNewPatient={() => setIsRegisterOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer System Boundaries */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <strong>Tele-Follow-Up Orchestrator</strong> • Member 1: Patient Registration, Surgery &amp; Recovery Module.
          </div>
          <div className="text-[11px] text-slate-400">
            Repository: <code className="font-mono">Saturn-space/Telle-Follow-up</code> • Branch: <code className="font-mono">feature/member-1-phase-5-maintenance</code>
import React from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Stethoscope, 
  BrainCircuit, 
  FileText, 
  Calendar, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import TravelOptimizationDashboard from '@/components/travel/TravelOptimizationDashboard';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header / Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Tele-Follow-Up Orchestrator</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Member 4 Active
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">An AI-Assisted Post-Surgical Follow-Up Coordination System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
              Branch: feature/member-4-phase-5-maintenance
            </span>
'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  FileCode,
  AlertTriangle,
  History,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { SEEDED_PATIENT_CASES } from '@/lib/risk/store';
import { PatientRecoveryInput, RiskAssessmentResult } from '@/lib/risk/types';
import { RiskStatusBanner } from '@/components/risk/RiskStatusBanner';
import { RiskFactorBreakdown } from '@/components/risk/RiskFactorBreakdown';
import { DataQualityAlerts } from '@/components/risk/DataQualityAlerts';
import { AiSynthesisCard } from '@/components/risk/AiSynthesisCard';
import { ClinicianReviewDialog } from '@/components/risk/ClinicianReviewDialog';
import { RiskHistoryTimeline } from '@/components/risk/RiskHistoryTimeline';
import { PatientCaseSelector } from '@/components/risk/PatientCaseSelector';

export default function Member2RiskDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat_chole_01');
  const [currentInput, setCurrentInput] = useState<PatientRecoveryInput>(
    SEEDED_PATIENT_CASES['pat_chole_01']
  );
  const [currentAssessment, setCurrentAssessment] = useState<RiskAssessmentResult | null>(null);
  const [historyList, setHistoryList] = useState<RiskAssessmentResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ASSESSMENT' | 'CONTRACTS'>('ASSESSMENT');

  // Sync patient history on patient change
  useEffect(() => {
    let isCancelled = false;

    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/patients/${selectedPatientId}/risk-assessments`);
        const json = await res.json();
        if (!isCancelled && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setHistoryList(json.data);
          setCurrentAssessment(json.data[0]);
        }
      } catch (err) {
        console.warn('Initial history fetch note:', err);
      }
    };

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [selectedPatientId]);

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    const input = SEEDED_PATIENT_CASES[patientId];
    if (input) {
      setCurrentInput({ ...input });
    }
  };

  const triggerEvaluation = async (inputToEvaluate?: PatientRecoveryInput) => {
    setIsLoading(true);
    const target = inputToEvaluate || currentInput;

    try {
      const res = await fetch('/api/risk-assessments/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveryInput: target,
          enableAiExplanation: true,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCurrentAssessment(json.data);
        setHistoryList((prev) => [json.data, ...prev.filter((p) => p.assessmentId !== json.data.assessmentId)]);
      }
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmitted = (updated: RiskAssessmentResult) => {
    setCurrentAssessment(updated);
    setHistoryList((prev) =>
      prev.map((item) => (item.assessmentId === updated.assessmentId ? updated : item))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Platform Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg leading-tight text-slate-900">
                  Tele-Follow-Up Orchestrator
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  Member 2: AI Risk &amp; CDS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                AI-Assisted Post-Surgical Risk Prediction &amp; Clinical Decision Support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ASSESSMENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'ASSESSMENT'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Risk Assessment
            </button>
            <button
              onClick={() => setActiveTab('CONTRACTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'CONTRACTS'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              API &amp; Integration Contracts
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Core Member 4 Vertical Slice */}
        <section id="member-4-travel-optimization">
          <TravelOptimizationDashboard />
        </section>

        {/* Five-Member Monorepo Architecture Overview */}
        <section className="pt-8 border-t border-slate-200">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              Shared Monorepo Architecture & Cross-Module Contracts
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Member 4 connects upstream patient recovery data (Member 1), clinical risk & escalation state (Member 2), and verified provider directories (Member 3) into follow-up care plans (Member 5).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Member 1 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">Member 1</span>
                <FileText className="w-4 h-4 text-teal-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">Patient & Recovery</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Supplies origin coordinates, days post-op, and surgical history.
              </p>
              <div className="mt-2 text-[10px] font-mono text-teal-700 bg-teal-50/50 p-1 rounded">
                Ingested in M4
              </div>
            </div>

            {/* Member 2 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">Member 2</span>
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">AI Risk & Escalation</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Supplies clinical urgency level & red flags. Triggers emergency override.
              </p>
              <div className="mt-2 text-[10px] font-mono text-indigo-700 bg-indigo-50/50 p-1 rounded">
                Active Safety Gate
              </div>
            </div>

            {/* Member 3 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded">Member 3</span>
                <Activity className="w-4 h-4 text-sky-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">Provider Directory</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Supplies verified clinic coordinates and surgical capability tags.
              </p>
              <div className="mt-2 text-[10px] font-mono text-sky-700 bg-sky-50/50 p-1 rounded">
                Reused Coordinates
              </div>
            </div>

            {/* Member 4 (Active) */}
            <div className="bg-amber-50/60 rounded-xl border-2 border-amber-400 p-4 shadow-sm ring-1 ring-amber-400/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Member 4 (Implemented)</span>
                <MapPin className="w-4 h-4 text-amber-700" />
              </div>
              <h4 className="font-bold text-amber-950 text-xs mb-1">Travel Optimization</h4>
              <p className="text-[11px] text-amber-800 leading-snug">
                Leaflet GIS, OSRM routing, transparent costs, and safety escalation.
              </p>
              <div className="mt-2 text-[10px] font-bold text-amber-900 bg-amber-200/50 p-1 rounded text-center">
                Phase 2 Core Complete
              </div>
            </div>

            {/* Member 5 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Member 5</span>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">Care Plans & Jitsi</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Consumes selected follow-up destination for appointment booking.
              </p>
              <div className="mt-2 text-[10px] font-mono text-emerald-700 bg-emerald-50/50 p-1 rounded">
                Ready for Handoff
              </div>
            </div>
          </div>
        </section>
      </main>
      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'ASSESSMENT' ? (
          <>
            {/* Step 1: Upstream Patient Recovery Input Selector */}
            <PatientCaseSelector
              selectedPatientId={selectedPatientId}
              onSelectPatient={handleSelectPatient}
              currentInput={currentInput}
              onUpdateInput={setCurrentInput}
              onEvaluate={() => triggerEvaluation()}
              isLoading={isLoading}
            />

            {/* Step 2: Live Assessment Results */}
            {currentAssessment && (
              <div className="space-y-6">
                {/* Risk Banner & Escalation Notice */}
                <RiskStatusBanner
                  assessment={currentAssessment}
                  onOpenReview={() => setIsReviewOpen(true)}
                />

                {/* 2-Column Clinical Evidence & AI Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column (Evidence & Factors) */}
                  <div className="lg:col-span-7 space-y-6">
                    <RiskFactorBreakdown factors={currentAssessment.contributingFactors} />
                    <DataQualityAlerts
                      alerts={currentAssessment.dataQualityAlerts}
                      missingFlags={currentAssessment.missingDataFlags}
                    />
                  </div>

                  {/* Right Column (AI CDS & History) */}
                  <div className="lg:col-span-5 space-y-6">
                    <AiSynthesisCard
                      synthesis={currentAssessment.aiSynthesis}
                      engine={currentAssessment.engine}
                    />
                    <RiskHistoryTimeline
                      assessments={historyList}
                      selectedId={currentAssessment.assessmentId}
                      onSelect={(item) => setCurrentAssessment(item)}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Integration Contracts & Downstream Handoff Documentation */
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-800 text-xs font-semibold mb-2">
                <FileCode className="w-3.5 h-3.5" />
                Inter-Module Data Contracts
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Member 2 Integration Interfaces
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Data exchange specifications between Member 2 (Risk/CDS), Member 1 (Recovery), Member 4 (Travel), and Member 5 (Follow-Up).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Member 1 Upstream Contract */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                  From Member 1 (Upstream)
                </span>
                <h3 className="font-semibold text-slate-900 text-sm">Recovery Data Ingestion</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Member 2 consumes <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">PatientRecoveryInput</code> containing vitals, pain score, post-op day, and surgical context. Unverified OCR document text is ingested tentatively without overriding direct vital measurements.
                </p>
              </div>

              {/* Member 4 Downstream Contract */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">
                  To Member 4 (Travel)
                </span>
                <h3 className="font-semibold text-slate-900 text-sm">Travel Constraints &amp; Escalation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Member 4 consumes <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">isEscalated</code> and <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">riskLevel</code>. If <code className="text-rose-700">isEscalated === true</code>, travel cost optimization is strictly disabled and emergency routing is enforced.
                </p>
              </div>

              {/* Member 5 Downstream Contract */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                  To Member 5 (Follow-Up)
                </span>
                <h3 className="font-semibold text-slate-900 text-sm">Care Modality &amp; Review Status</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Member 5 coordinates follow-ups based on <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">requiresInPerson</code> and <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">reviewStatus</code>. Virtual teleconsultations are scheduled only when risk is low and verified by a clinician.
                </p>
              </div>
            </div>

            {/* REST Endpoints Table */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-3">
                Exposed Member 2 REST API Endpoints
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                <div className="p-3 bg-slate-100/70 font-semibold grid grid-cols-12 text-slate-700">
                  <div className="col-span-2">Method</div>
                  <div className="col-span-5">Route</div>
                  <div className="col-span-5">Description</div>
                </div>
                <div className="p-3 grid grid-cols-12 items-center hover:bg-slate-50">
                  <div className="col-span-2"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold">POST</span></div>
                  <div className="col-span-5 font-mono text-slate-800">/api/risk-assessments/evaluate</div>
                  <div className="col-span-5 text-slate-600">Calculates deterministic physiological score, red flags, and runs Claude CDS.</div>
                </div>
                <div className="p-3 grid grid-cols-12 items-center hover:bg-slate-50">
                  <div className="col-span-2"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">GET</span></div>
                  <div className="col-span-5 font-mono text-slate-800">/api/risk-assessments/:assessmentId</div>
                  <div className="col-span-5 text-slate-600">Retrieves specific assessment with clinical summary, factors, and audit hash.</div>
                </div>
                <div className="p-3 grid grid-cols-12 items-center hover:bg-slate-50">
                  <div className="col-span-2"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold">POST</span></div>
                  <div className="col-span-5 font-mono text-slate-800">/api/risk-assessments/:id/review</div>
                  <div className="col-span-5 text-slate-600">Authorized clinician signs off, overrides risk score, or triggers formal escalation.</div>
                </div>
                <div className="p-3 grid grid-cols-12 items-center hover:bg-slate-50">
                  <div className="col-span-2"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">GET</span></div>
                  <div className="col-span-5 font-mono text-slate-800">/api/patients/:patientId/risk-assessments</div>
                  <div className="col-span-5 text-slate-600">Lists historical risk assessments and trajectory for the patient.</div>
                </div>
                <div className="p-3 grid grid-cols-12 items-center hover:bg-slate-50">
                  <div className="col-span-2"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">GET</span></div>
                  <div className="col-span-5 font-mono text-slate-800">/api/risk-assessments/openapi</div>
                  <div className="col-span-5 text-slate-600">Returns live OpenAPI 3.0 JSON specification.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mandatory Safety Notice Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Clinical Decision Support Prototype:</strong> Not an autonomous medical diagnostic device. Final medical orders require review by a licensed clinician.
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Tele-Follow-Up Orchestrator • Member 2 (Phase 2)
          </div>
        </div>
      </footer>

      {/* Registration Wizard Modal */}
      <PatientRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onPatientCreated={handlePatientCreated}
      />
      {/* Clinician Review Modal */}
      {currentAssessment && (
        <ClinicianReviewDialog
          assessment={currentAssessment}
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
}
