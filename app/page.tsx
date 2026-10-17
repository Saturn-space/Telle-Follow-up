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
    </div>
  );
}
