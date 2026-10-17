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
          </div>
        </div>
      </footer>

      {/* Registration Wizard Modal */}
      <PatientRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onPatientCreated={handlePatientCreated}
      />
    </div>
  );
}
