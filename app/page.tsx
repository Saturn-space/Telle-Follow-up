'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Patient,
  RiskAssessment,
  Provider,
  TravelComparison,
  FollowUpPlan,
  Appointment,
  NotificationItem,
  UserRole,
  TeleconsultationSession,
} from '@/lib/types/followup';
import { Header } from '@/components/navigation/Header';
import { FollowUpPlanView } from '@/components/followup/FollowUpPlanView';
import { AppointmentsView } from '@/components/followup/AppointmentsView';
import { TeleconsultSuite } from '@/components/teleconsult/TeleconsultSuite';
import { CrossModulePipelineView } from '@/components/integration/CrossModulePipelineView';
import { PaymentStatusView } from '@/components/billing/PaymentStatusView';
import {
  Activity,
  Video,
  Calendar,
  Compass,
  ShieldAlert,
  Loader2,
  CheckCircle,
} from 'lucide-react';

export default function TeleFollowUpApp() {
  const [currentRole, setCurrentRole] = useState<UserRole>('CLINICIAN');
  const [activeTab, setActiveTab] = useState<string>('plans');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat-101');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Data States
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | undefined>();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [travelComparison, setTravelComparison] = useState<TravelComparison | undefined>();
  const [plans, setPlans] = useState<FollowUpPlan[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Active Teleconsultation state for video room
  const [activeTeleSession, setActiveTeleSession] = useState<TeleconsultationSession | null>(null);
  const [activeTeleAppointment, setActiveTeleAppointment] = useState<Appointment | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let ignore = false;

    async function startFetching() {
      try {
        const res = await fetch(`/api/integration/cross-module?patientId=${selectedPatientId}`);
        const json = await res.json();

        if (!ignore && json.success && json.data) {
          setAllPatients(json.data.allPatients || []);
          setActivePatient(json.data.activePatient);
          setRiskAssessment(json.data.member2_risk?.assessment);
          setProviders(json.data.member3_providers?.localProviders || []);
          setTravelComparison(json.data.member4_travel?.comparison);
          setPlans(json.data.member5_orchestration?.plans || []);
          setAppointments(json.data.member5_orchestration?.appointments || []);

          const teleAppt = json.data.member5_orchestration?.appointments?.find(
            (a: Appointment) => a.type === 'TELECONSULTATION' && a.teleSession
          );
          if (teleAppt) {
            setActiveTeleAppointment(teleAppt);
            setActiveTeleSession(teleAppt.teleSession);
          }
        }

        const notifRes = await fetch(`/api/notifications?recipientUserId=${selectedPatientId}`);
        const notifJson = await notifRes.json();
        if (!ignore && notifJson.success && notifJson.data) {
          setNotifications(notifJson.data);
        }
      } catch {
        // Error handling
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    startFetching();

    return () => {
      ignore = true;
    };
  }, [selectedPatientId, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleMarkNotificationRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleJoinTeleconsult = (roomName: string, appointmentId: string) => {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (appt && appt.teleSession) {
      setActiveTeleAppointment(appt);
      setActiveTeleSession(appt.teleSession);
      setActiveTab('teleconsult');
    }
  };

  const isEscalated =
    riskAssessment?.riskTier === 'HIGH' || travelComparison?.isEscalated;

  if (isLoading && !activePatient) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Loading Tele-Follow-Up Orchestration Hub...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        activePatient={activePatient}
        allPatients={allPatients}
        onPatientChange={(id) => {
          setSelectedPatientId(id);
          setSelectedPlanId(null);
        }}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isEscalated={isEscalated}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Section Banner */}
        <section className="bg-gradient-to-r from-teal-900 via-slate-900 to-cyan-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-3 border border-teal-500/30">
              <Activity className="w-3.5 h-3.5" />
              <span>Post-Surgical Coordination Prototype</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
              Tele-Follow-Up Orchestrator
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Assisting post-surgical follow-up coordination across state lines. Combines recovery ingestion, AI risk stratification, local clinic discovery, travel optimization, and secure teleconsultations.
            </p>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/60 text-xs font-medium">
              <div>
                <span className="text-slate-400 block text-[11px]">Active Plans</span>
                <span className="text-base font-bold text-teal-300">{plans.length}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Scheduled Tasks</span>
                <span className="text-base font-bold text-cyan-300">{appointments.length}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Saved Travel Distance</span>
                <span className="text-base font-bold text-emerald-300">
                  {travelComparison && !travelComparison.isEscalated
                    ? `~${travelComparison.roundTripDistanceKm} km`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Clinical Safety Status</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  isEscalated ? 'bg-red-500 text-white' : 'bg-emerald-500/30 text-emerald-300'
                }`}>
                  {isEscalated ? 'ESCALATED EMERGENCY' : 'STABLE / MONITORED'}
                </span>
import React from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Compass,
  FileText,
  HeartPulse,
  Hospital,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">
                Tele-Follow-Up Orchestrator
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                AI-Assisted Post-Surgical Follow-Up Coordination System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Phase 4: Member 3 Release Verified & Hardened
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8 shadow-sm">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100 mb-4">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Patient-Centric Healthcare Coordination
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Coordinating Safe Post-Surgical Follow-Up Across Distances
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              When patients travel out-of-state for complex surgical procedures, repeated physical trips back to the surgical center introduce financial stress, recovery discomfort, and appointment attrition. 
              The Tele-Follow-Up Orchestrator integrates recovery monitoring, clinical risk stratification, local accredited care discovery, travel analysis, and teleconsultation into a unified, safety-first clinical workflow.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                <span>Prioritizes Clinical Urgency Over Travel Cost</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                <span>Human Clinician-in-the-Loop Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                <span>Traceable Audit History</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <Link
                href="/discovery"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Hospital className="w-4 h-4" />
                Launch Member 3: Local Healthcare Discovery Engine
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/api/docs/openapi"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                View OpenAPI 3.0 Contract
              </Link>
            </div>
          </div>
        </div>

        {/* 5-Member Module Grid */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Five Vertical Module Architecture</h3>
              <p className="text-sm text-slate-500">
                End-to-end full-stack slices developed collaboratively across the shared repository
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Member 1 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  M1
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  Patient & Intake
                </span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Patient Registration & Recovery Monitoring
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Patient profiles, surgical history, discharge summaries, vital sign logging, OCR-assisted document ingestion, and reviewable clinical extraction pipelines.
              </p>
            </div>

            {/* Member 2 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  M2
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  AI Decision Support
                </span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                AI Risk Prediction & Decision Support
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Post-operative recovery risk scoring, red flag symptom detection, explainable clinical rationale summaries, risk history, and mandatory human review workflows.
              </p>
            </div>

            {/* Member 3 */}
            <div className="bg-white rounded-xl border-2 border-teal-500/80 p-6 shadow-sm hover:border-teal-600 transition-colors ring-2 ring-teal-500/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  M3
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Phase 4 Release Ready & Verified
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Hospital className="w-4 h-4 text-emerald-600" />
                Local Healthcare Discovery & Coordination
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Local accredited clinic and hospital registry, specialty filtering, verified vs. seeded facility status flags, referral generation, and shared care coordination.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-700">Leaflet Map + REST APIs Active</span>
                <Link
                  href="/discovery"
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors inline-flex items-center gap-1"
                >
                  Open Module
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Member 4 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  M4
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  Travel & Safety
                </span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                Travel Optimization & Clinical Escalation
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Interactive mapping, geocoded transit distances, travel cost/burden evaluation, multi-modal option comparison, and immediate high-risk clinical escalation paths.
              </p>
            </div>

            {/* Member 5 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  M5
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  Telehealth & Platform
                </span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-600" />
                Follow-Up, Teleconsultation & Platform Integration
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Follow-up plan management, Jitsi Meet teleconsultation rooms, consultation documentation, notification alerts, optional payment processing, and end-to-end integration.
              </p>
            </div>

            {/* System Guardrails Card */}
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Clinical & Safety Invariants
                </div>
                <h4 className="text-base font-bold text-white mb-2">
                  Medical Decision Boundaries
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>AI outputs are decision-support only, never diagnostic.</li>
                  <li>Cost/travel savings never override clinical urgency.</li>
                  <li>All OCR and AI extractions require human clinician review.</li>
                  <li>High-risk red flags immediately trigger escalation.</li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                Awaiting individual member prompts to begin vertical slice execution.
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Compass className="w-5 h-5 text-teal-600" />
            End-to-End Orchestration Flow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 text-center">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 1</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Registration</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Patient & surgery intake</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 2</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Recovery Log</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Vitals & OCR reports</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 3</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Risk Stratification</p>
              <p className="text-[11px] text-slate-500 mt-0.5">AI decision support</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 4</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Local Discovery</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Nearby verified clinics</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 5</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Travel Comparison</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Safety & transit trade-off</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 6</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Coordination</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Teleconsult / local booking</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 7</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Audit History</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Immutable record of care</p>
            </div>
          </div>
        </div>
      </main>
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

        {/* Tab Views */}
        {activeTab === 'plans' && activePatient && (
          <FollowUpPlanView
            plans={plans}
            patient={activePatient}
            riskAssessment={riskAssessment}
            travelComparison={travelComparison}
            userRole={currentRole}
            onRefresh={handleRefresh}
            onSelectPlanForAppointments={(id) => {
              setSelectedPlanId(id);
              setActiveTab('appointments');
            }}
          />
        )}

        {activeTab === 'appointments' && activePatient && (
          <AppointmentsView
            appointments={appointments}
            plans={plans}
            providers={providers}
            patient={activePatient}
            userRole={currentRole}
            selectedPlanId={selectedPlanId}
            onRefresh={handleRefresh}
            onJoinTeleconsult={handleJoinTeleconsult}
          />
        )}

        {activeTab === 'teleconsult' && (
          <TeleconsultSuite
            activeSession={activeTeleSession}
            activeAppointment={activeTeleAppointment}
            userRole={currentRole}
            onOutcomeSubmitted={handleRefresh}
          />
        )}

        {activeTab === 'pipeline' && activePatient && (
          <CrossModulePipelineView
            patient={activePatient}
            riskAssessment={riskAssessment}
            providers={providers}
            travelComparison={travelComparison}
            plans={plans}
            onSelectPatient={(id) => {
              setSelectedPatientId(id);
              setSelectedPlanId(null);
            }}
            allPatients={allPatients}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentStatusView plan={plans[0]} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Tele-Follow-Up Orchestrator • Academic Clinical Decision Support Prototype</span>
          <span className="text-slate-400">
            Saturn-space/Telle-Follow-up • Feature Branch: <code className="text-slate-600">feature/member-5-follow-up-integration</code>
          </span>
        </div>
      </footer>
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
