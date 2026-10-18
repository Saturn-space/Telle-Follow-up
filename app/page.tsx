'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  FileText,
  Heart,
  HeartPulse,
  Hospital,
  Loader2,
  Lock,
  Phone,
  PhoneCall,
  Pill,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Users,
  Video,
  Zap,
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
        // Handled silently
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
      <div className="min-h-screen bg-[#F6F8FF] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-[#1745D8] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#0E1C30]">
          Loading Tele-Follow-Up Orchestrator...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FF] text-[#0E1C30] flex flex-col">
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

      {/* 1. HERO SECTION (Mirroring Reference Design Layout) */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#F0F3FF]/70 via-[#F6F8FF] to-[#F6F8FF] pt-8 pb-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Hero Content Column */}
            <div className="lg:col-span-6 flex flex-col items-start gap-4 z-10">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#DCE1FF]/60 text-[#001550] text-[11px] font-semibold tracking-wider uppercase shadow-2xs border border-[#CBD9F2]">
                <Heart className="w-3.5 h-3.5 text-[#1745D8] fill-[#1745D8]" />
                <span>Connected Care, Thoughtfully Designed</span>
              </div>

              {/* Main Hero Typography */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0E1C30] tracking-tight leading-[1.12]">
                Better Recovery.<br />
                <span className="text-[#1745D8]">Connected Care.</span><br />
                Follow-Up That Matters.
              </h1>

              {/* Descriptive Body */}
              <p className="text-base text-[#536078] max-w-[530px] leading-relaxed">
                Coordinate post-discharge recovery updates, automated clinical reviews, risk escalations, and telehealth appointments through one unified medical follow-up ecosystem.
              </p>

              {/* Dual Call to Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('orchestrator-workspace');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1745D8] text-white font-semibold text-sm shadow-md hover:bg-[#1238B5] transition-all cursor-pointer group"
                >
                  <span>Explore Platform</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#0E1C30] font-semibold text-sm shadow-2xs border border-[#DCE5F5] hover:bg-[#F0F3FF] transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#1745D8]" />
                  <span>View Appointments</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-4 pt-3 text-[#536078] text-xs">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0D9488]" /> HIPAA Compliant
                </span>
                <span className="w-1 h-1 rounded-full bg-[#C4C5D8]"></span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#0D9488]" /> 256-bit Encrypted
                </span>
                <span className="w-1 h-1 rounded-full bg-[#C4C5D8]"></span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#0D9488]" /> Instant Triage
                </span>
              </div>
            </div>

            {/* Right Hero Visual Column */}
            <div className="lg:col-span-6 relative mt-6 lg:mt-0">
              <div className="absolute -top-10 -right-10 w-96 h-96 bg-[#DDE1FF]/50 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white border border-[#DCE5F5]">
                {/* Visual Image */}
                <img
                  className="w-full h-[420px] object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyvjlybSFB_MYpbsWw8ScQvNlxMCJuRJ8m9YdEVWXdvbGyn79RLpyqXlAcRrJO6YJHhWjlc3UOCm-Sf8YMu7QQL9fEQ74AnkPqRtDYYfsMTLBnUOoRvkw89wyeiijO1amr2bBvZQKVS-NyPl05llj8YX4Wgm4F2iE5N4J5JHYw58WmQXkM-ff4WeXRhBaY9B30t8AWzwBpaJcBPytZvTndngptRPPy-GmwILESwTcOx__5w-xE-nJl"
                  alt="Doctor with recovering patient"
                />

                {/* Floating Capability Pill Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-[#DCE5F5] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#EDF3FF] flex items-center justify-center text-[#1745D8] shrink-0">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-[#8B97B0] uppercase tracking-wider">
                        Active Care Pathway
                      </div>
                      <div className="text-sm font-bold text-[#0E1C30]">
                        {activePatient?.surgeryProcedure || 'Post-Op Cardiology Follow-Up'} (#{activePatient?.id || '9412'})
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isEscalated
                      ? 'bg-[#FEECEB] text-[#B91C1C]'
                      : 'bg-[#E6F8F2] text-[#047857]'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isEscalated ? 'bg-[#EF4444]' : 'bg-[#10B981]'}`}></span>
                    {isEscalated ? 'Escalated Triage' : 'Vitals Stable'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FLOATING OVERLAPPING METRICS PANEL */}
      <section className="relative w-full z-20 -mt-8 mb-8">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl shadow-xl border border-[#DCE5F5] p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#DDE1FF] flex items-center justify-center text-[#1745D8] shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-[#0E1C30] leading-tight tnum">99.4%</span>
                <span className="text-xs text-[#536078]">48h Check-In Rate</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#DCE1FF] flex items-center justify-center text-[#465AA2] shrink-0">
                <Heart className="w-6 h-6 fill-[#465AA2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-[#0E1C30] leading-tight tnum">15,000+</span>
                <span className="text-xs text-[#536078]">Recoveries Managed</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#DDE1FF] flex items-center justify-center text-[#1745D8] shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-[#0E1C30] leading-tight tnum">{providers.length || 320}+</span>
                <span className="text-xs text-[#536078]">Active Specialists</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#89F5E7]/50 flex items-center justify-center text-[#004842] shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-[#0E1C30] leading-tight tnum">98.8%</span>
                <span className="text-xs text-[#536078]">Clinical Adherence</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE ORCHESTRATOR WORKSPACE (Connected live with existing logic) */}
      <section id="orchestrator-workspace" className="w-full py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Active Patient Telemetry Bar */}
          <div className="bg-white rounded-2xl p-5 border border-[#DCE5F5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#EDF3FF] text-[#1745D8] flex items-center justify-center font-bold text-sm">
                {activePatient?.name ? activePatient.name.charAt(0) : 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#0E1C30]">{activePatient?.name}</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F0F3FF] text-[#536078] border border-[#DCE5F5]">
                    {activePatient?.age}y • {activePatient?.gender}
                  </span>
                </div>
                <p className="text-xs text-[#536078]">
                  Discharged: {activePatient?.dischargeDate ? new Date(activePatient.dischargeDate).toLocaleDateString() : 'Recent'} • {activePatient?.operatingHospital} ({activePatient?.homeCity})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[11px] text-[#8B97B0] uppercase block font-semibold">CDS AI Assessment</span>
                <span className={`text-xs font-bold ${
                  riskAssessment?.riskTier === 'HIGH' ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {riskAssessment?.riskTier || 'LOW'} Risk Tier ({riskAssessment?.riskScore ?? 15}/100)
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="px-3.5 py-1.5 rounded-lg border border-[#DCE5F5] text-xs font-semibold text-[#1745D8] bg-[#F0F3FF] hover:bg-[#E7EEFF] transition cursor-pointer"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {/* Active Tab View Rendering */}
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
        </div>
      </section>

      {/* 4. CARE COORDINATION OVERVIEW & SPECIALIZED SERVICES */}
      <section className="w-full py-16 bg-[#F0F3FF]/40 border-t border-[#DCE5F5]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-[11px] font-semibold text-[#1745D8] uppercase tracking-wider">
                Comprehensive Care Modules
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0E1C30] mt-1">
                Specialized Follow-Up Services
              </h2>
            </div>
            <Link
              href="/discovery"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1745D8] hover:underline"
            >
              <span>Explore Provider Directory</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 6-Card Service Grid matching Reference Design */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xs border border-[#DCE5F5] hover:shadow-md transition-all group">
              <div className="h-32 w-full overflow-hidden bg-[#EDF3FF]">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuEuFWGpdRoMVMtDpgQVBwagRvI_nkS_laU-NF2grTVjs-4X_ritSj1CTZ4FXXXwd8L-bnuGV3FQ7Sxipdz5kkKkY91gbidtcsgMFXH1OmFe-QrT1wgNl67SRLCWdgzrp9tVmcYL1GpFeXpjIhCYayQ5izOFFSlVagiten8ciQf2m51Qwh-jOArz0XpT8e_MlOt8IqHkOPbJVX8k-yYwMTE6zqVc5_BvVX9ZSBSxU5Iadwu4suoOqj"
                  alt="Patient Recovery"
                />
              </div>
              <div className="p-4 flex flex-col items-center text-center -mt-6">
                <div className="w-10 h-10 rounded-full bg-[#1745D8] text-white flex items-center justify-center shadow-md mb-2">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0E1C30]">Patient Recovery</h3>
                <p className="text-xs text-[#536078] mt-1 line-clamp-2">Symptom journals & wearable biometric streams.</p>
              </div>
            </div>

            <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xs border border-[#DCE5F5] hover:shadow-md transition-all group">
              <div className="h-32 w-full overflow-hidden bg-[#EDF3FF]">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZwkXx1jMC-YeEHcxiPBjZRXgS-MUwOFnGVnl37HegQuWF8w8brg5GPowkMXQeQ-1WWz8b2ehGWba2in2R2mRNQpSJecdxhrIyoclxtlqgmBhOtx6KfqjrBZjWplYSd7Vz59m6TnXU1smTgoUX9uUufCvxFROzLjNKss-UInCjM7qfaplp72j9cUyjYGlltc4KmE4EqJaFGOXSVGEREP-A2aoX6klKY0O2SZhr46yhijo4lwsQkb9R"
                  alt="Clinical Risk Review"
                />
              </div>
              <div className="p-4 flex flex-col items-center text-center -mt-6">
                <div className="w-10 h-10 rounded-full bg-[#465AA2] text-white flex items-center justify-center shadow-md mb-2">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0E1C30]">Clinical Risk Review</h3>
                <p className="text-xs text-[#536078] mt-1 line-clamp-2">Stratified triage scores & automated alerts.</p>
              </div>
            </div>

            <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xs border border-[#DCE5F5] hover:shadow-md transition-all group">
              <div className="h-32 w-full overflow-hidden bg-[#EDF3FF]">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEiAacXM-gnFxbpsWMl0n2OQlnxnyuetUOb-9EW7qsxdEsDXTlt2UMZYJ0uJUAhqpM7x0dLtvSaeAoF0K91IBYN38Ykaqd_-A2h91uLchmnpnC_WoNg6HUPKl6WcG_GJYYQmLpRSEAzAQIUgxBmaMYQf54QXoNHakVNZziK5JRi7IJyRN_2j-LBRV5C7JQfaVVDiS_K6jPlyYMzdgXBUBZjVRKTGVa3efP8FXqguBPuQxCiIw1iSmc"
                  alt="24/7 Triage Desk"
                />
              </div>
              <div className="p-4 flex flex-col items-center text-center -mt-6">
                <div className="w-10 h-10 rounded-full bg-[#1745D8] text-white flex items-center justify-center shadow-md mb-2">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0E1C30]">24/7 Triage Desk</h3>
                <p className="text-xs text-[#536078] mt-1 line-clamp-2">Direct escalation to on-call attending clinicians.</p>
              </div>
            </div>

            <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xs border border-[#DCE5F5] hover:shadow-md transition-all group">
              <div className="h-32 w-full overflow-hidden bg-[#EDF3FF]">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAIaNdR16gZFMt0jop21owr7MehazmYGu2FenMZC_nGNRK8C1l3vVNFcNh7DkZ5H1DuVWgL0ufdS6aeK4U53-8wgXF7sumAl_0Cg_f3oEHvEJDDXEKBrdFNdQ20T6mKbV06Q_e0H9WWb7NBmD68fqBOuwSmPOQJxFCLXhNOKPSEbiEttW2De4qv-8WAS3DbHJjIgEZnYyLm1vAjkkBzij8KTQOfWybaiTJAF-bGF6B1fBOCGu5qPKv-"
                  alt="Tele-Radiology"
                />
              </div>
              <div className="p-4 flex flex-col items-center text-center -mt-6">
                <div className="w-10 h-10 rounded-full bg-[#004842] text-white flex items-center justify-center shadow-md mb-2">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0E1C30]">Tele-Radiology</h3>
                <p className="text-xs text-[#536078] mt-1 line-clamp-2">Post-op imaging review and surgical evaluation.</p>
              </div>
            </div>

            <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xs border border-[#DCE5F5] hover:shadow-md transition-all group">
              <div className="h-32 w-full overflow-hidden bg-[#EDF3FF]">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqD0sMKkA-Dbt3yFZEqigNdLVofJcVZv-hPzY1f1B32wYk-aiuEyysdviygCSXBrdQ6SEGtnWnS8z1K3kC-oJGd36tGwdhVjS3ZLoujpwux_r8fSgMLpSHWf5b1Ii_NBOcrLwJYS_tf8ON4m3jDFPDRQEy4kvrgHJHFfbYyNQz3EHl0ffm7xHGIW7I7VyAl0RRmwutiZR7LpLHzZkuDf0PoRWAcrsyNl0IVRU55AHGsAwWpxe845cx"
                  alt="Lab Sync"
                />
              </div>
              <div className="p-4 flex flex-col items-center text-center -mt-6">
                <div className="w-10 h-10 rounded-full bg-[#465AA2] text-white flex items-center justify-center shadow-md mb-2">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0E1C30]">Lab Sync</h3>
                <p className="text-xs text-[#536078] mt-1 line-clamp-2">Automated blood biomarker trend tracking.</p>
              </div>
            </div>

            <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xs border border-[#DCE5F5] hover:shadow-md transition-all group">
              <div className="h-32 w-full overflow-hidden bg-[#EDF3FF]">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4Gsu-RwnqvrxjCoHeaMNXxDJVVCbmXqGFq-w70S1pzBQnNGqEVWETxwjqJ5QL0YQE79n63TEsjelpqizK69dAlYFMYZ0WntXlFpCU4aeLp-i6UIrT84AAbBspF9cFq1Foa6q6oGMPqF6NeXcLXxXBzxq_UFZHyEzEV2L_eP_ZVUT97mJri9GfboxTj0goWEgnzeEsCX38VRVt82wBNAjvQR0NMFsGrWEmKvb2MGApkDCoRnt_nOBb"
                  alt="Medication Track"
                />
              </div>
              <div className="p-4 flex flex-col items-center text-center -mt-6">
                <div className="w-10 h-10 rounded-full bg-[#1745D8] text-white flex items-center justify-center shadow-md mb-2">
                  <Pill className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0E1C30]">Medication Track</h3>
                <p className="text-xs text-[#536078] mt-1 line-clamp-2">Dosage verification & pharmacy refill routing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VIRTUAL RECOVERY INFRASTRUCTURE (Dark Section from Design) */}
      <section className="w-full py-16 bg-[#0E1C30] text-[#ECF0FF] relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-8 max-w-2xl">
            <span className="text-[11px] font-semibold text-[#89F5E7] uppercase tracking-wider">
              Tele-Coordination Infrastructure
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              High-Fidelity Virtual Recovery Infrastructure
            </h2>
            <p className="text-sm text-[#CDDAF7] mt-2">
              Hospital-grade monitoring suites and encrypted data channels supporting safe early discharges.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-[#243146]/80 hover:bg-[#243146] rounded-xl overflow-hidden transition-all shadow-md group">
              <div className="h-36 overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJWE5ymcqgNEmyDlODkyPrIb-erafxFACU1uxUIcXatjboYhyExBzu1so84Fg5kFAh7U0udRPcgEKJ7GuM05u-AMKxAGHCAr0E3zi3GaIdmwKe9Fi9nYvV9NlQ0BhHbKFXDJRg46PGg0EIX-dGY2KlPe99wvpKwHqB360reezYO66SrOWrcyrcI941uyGMryp65zgffH-t8iWLWrfiliZyCmsFc4DE-My97WsS9XvH7RtjSjv055xu"
                  alt="ICU Telemetry"
                />
              </div>
              <div className="p-4 text-center">
                <span className="text-sm font-semibold text-white block">Digital ICU Telemetry</span>
                <span className="text-xs text-[#CDDAF7] mt-0.5 block">Continuous Stream</span>
              </div>
            </div>

            <div className="bg-[#243146]/80 hover:bg-[#243146] rounded-xl overflow-hidden transition-all shadow-md group">
              <div className="h-36 overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOTl2DMZv7zxG4akEAyAKDXA83TXb_1GbZn18pVbx0Fui7U6xGeGm4yEhN72jLSsrz9vzERjP57oLziNWjqkBuV3IMAaQCgjv3vnO_ZpjgfoVSx5ufbNciVmKiH4v7S8QMunNaFdss8HsXtgy-lz0S3POSz3bAUznvukc3gOQArHOoJ9bUUGuGoit290fqVVFKlvWjVF-y0bku2Gjsfi6kGTpAMnPzQksbZh_6_9-ynZ5kt-SbVS3R"
                  alt="VIP Virtual Suites"
                />
              </div>
              <div className="p-4 text-center">
                <span className="text-sm font-semibold text-white block">VIP Virtual Suites</span>
                <span className="text-xs text-[#CDDAF7] mt-0.5 block">Private Concierge</span>
              </div>
            </div>

            <div className="bg-[#243146]/80 hover:bg-[#243146] rounded-xl overflow-hidden transition-all shadow-md group">
              <div className="h-36 overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWvyN6HuCCxYiEwAqR1h0Tq5_bRLknQD_8DnxZEjC_DF9Kb9m-4KquSVFu3IdnSMNBBITfQ3sUrzdQQNB5esgprKLmuzUtKn4PqCG1MlIZXBw2w7cQ9GpRjhqpmiPDDc2g88omgLo3Y8lvX6uF4Dc3tmRvZRddAavop9J1GR2pwL4GIejgycKycQcN4SvWMupyCUd9bmxD2b3d5zQNlvUGPava60-ERUDo-C1X6TPAgK8okS_WDKtb"
                  alt="Surgical Observation"
                />
              </div>
              <div className="p-4 text-center">
                <span className="text-sm font-semibold text-white block">Surgical Observation</span>
                <span className="text-xs text-[#CDDAF7] mt-0.5 block">Post-Op Wound Feed</span>
              </div>
            </div>

            <div className="bg-[#243146]/80 hover:bg-[#243146] rounded-xl overflow-hidden transition-all shadow-md group">
              <div className="h-36 overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAOrVXNoE2f_ob6228hwuVY95J4V1CsQP5YTKNPhPWQEFWZ2wZh6S4F-1rEPle6OcenD0Ey9ICXUuouT707NI7QsQWuxA_NeMlZKJT2GXhIKQ_SnUFDlAS3iz4zqeCdKJun40dBeBX-XXxuWEjQD0lFRaWxNBNh0cWlo8W8A64KGOuxiZFuIbE4oedfj0MxxByCVLJoQuIgQYoxHmKlGWYDbPCH4YGjdnKLceH7SxiE7NlvSJIpF30"
                  alt="EHR Data Interop"
                />
              </div>
              <div className="p-4 text-center">
                <span className="text-sm font-semibold text-white block">EHR Data Interop</span>
                <span className="text-xs text-[#CDDAF7] mt-0.5 block">FHIR & HL7 Certified</span>
              </div>
            </div>

            <div className="bg-[#243146]/80 hover:bg-[#243146] rounded-xl overflow-hidden transition-all shadow-md group">
              <div className="h-36 overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8XHZqF8HnCoYh5lNwyUpGPssWtW2dlFHb0S51SsI2Fi9mXZpi27QiMkwnkUiXOHawsOqDAYMVvvU44eRpGK8HUVAZnVpJxoM4N6MXZB0isjxidZ0qjXGLtBLiSWYMrd2AoTmPjgGKhpjMpJKAY7cRAFt6sZUv6a85i22p5Y9mrMnNyaWBl9H5Usp2VpvEi1l87pSYWKb8TDJXOHd5O0QtXoy_gIsuhDZYDnZd8odT3knOZ5pVbbE2"
                  alt="Rapid Transit"
                />
              </div>
              <div className="p-4 text-center">
                <span className="text-sm font-semibold text-white block">24/7 Rapid Transit</span>
                <span className="text-xs text-[#CDDAF7] mt-0.5 block">Instant Dispatch</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CLOSING CALL TO ACTION BANNER (Matching Reference) */}
      <section className="w-full py-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#1745D8] text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex flex-col gap-3 max-w-xl z-10">
              <span className="text-[11px] font-semibold text-[#89F5E7] uppercase tracking-wider">
                Hospital & Clinical Partners
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Ready to Transform Your Post-Op Recovery Care?
              </h2>
              <p className="text-sm text-[#C0CAFF]">
                Connect your clinical teams, reduce preventable 30-day readmissions, and deliver seamless outpatient reassurance.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur text-white text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#89F5E7]" />
                  <span>HIPAA & SOC-2 Certified</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur text-white text-xs">
                  <Activity className="w-4 h-4 text-[#89F5E7]" />
                  <span>FHIR / EHR Interop Ready</span>
                </div>
              </div>
            </div>

            {/* Right White Card */}
            <div className="bg-white text-[#0E1C30] rounded-2xl p-6 shadow-xl w-full lg:w-[380px] shrink-0 z-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#EDF3FF] flex items-center justify-center text-[#1745D8] mb-2">
                <PhoneCall className="w-6 h-6" />
              </div>
              <span className="text-xs text-[#536078] font-medium">Care Coordination Central</span>
              <span className="text-2xl font-bold text-[#1745D8] tracking-tight mt-0.5">(021) 1234-5678</span>
              <span className="text-[10px] text-[#0D9488] font-semibold uppercase mt-1">Direct Clinical Routing Active</span>
              <div className="w-full h-px bg-[#DCE5F5] my-4"></div>
              <Link
                href="/follow-ups/my-appointments"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1745D8] text-white font-semibold text-sm hover:bg-[#1238B5] transition-all shadow-sm"
              >
                <span>Access Follow-Up Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER WITH EMERGENCY CLINICAL NOTICE */}
      <footer className="w-full bg-[#F0F3FF] border-t border-[#DCE5F5] pt-12 pb-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Emergency Notice Banner */}
          <div className="bg-[#FFDAD6]/60 border border-[#FFDAD6] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#93000A]">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold">Emergency Notice: Immediate Clinical Assistance</span>
            </div>
            <p className="text-xs text-[#536078] max-w-2xl">
              This portal is for scheduled post-operative care and follow-up monitoring. If you are experiencing chest pain, acute respiratory distress, or severe hemorrhage, call emergency services immediately.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-[#DCE5F5] text-xs text-[#536078]">
            <span>© 2026 Tele-Follow-Up Orchestrator Systems Inc. All clinical and telemetry rights reserved.</span>
            <div className="flex items-center gap-4">
              <span className="hover:text-[#0E1C30] cursor-pointer">Privacy Policy</span>
              <span className="hover:text-[#0E1C30] cursor-pointer">Terms of Clinical Service</span>
              <span className="hover:text-[#0E1C30] cursor-pointer">HIPAA Attestation</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
