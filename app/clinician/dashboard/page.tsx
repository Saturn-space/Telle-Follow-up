'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - CLINICIAN DASHBOARD
// Authoritative Clinical Rounds, Patient Care Queue, and CDS Triage
// ============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Hospital,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  UserCheck,
  Video,
  FileText,
  Clock,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export default function ClinicianDashboardPage() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (role !== 'CLINICIAN') {
        router.push(role === 'ADMIN' ? '/admin/dashboard' : role === 'COORDINATOR' ? '/coordinator/dashboard' : '/patients/dashboard');
      }
    }
  }, [isAuthenticated, role, authLoading, router]);

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clinician/patients');
      const data = await res.json();
      if (data.success && data.data?.patients) {
        setPatients(data.data.patients);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load clinician patient queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void Promise.resolve().then(fetchPatients);
    }
  }, [isAuthenticated]);

  const assessments = patients.flatMap((patient) => patient.riskAssessments || []);
  const teleconsultCount = patients.flatMap((patient) => patient.appointments || []).filter((appointment) => appointment.type === 'TELECONSULTATION').length;
  const pendingReviews = assessments.filter((assessment) => assessment.reviewStatus === 'PENDING_REVIEW').length;
  const escalations = assessments.filter((assessment) => assessment.isEscalated || ['HIGH', 'CRITICAL'].includes(assessment.riskLevel)).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="bg-white border-b border-[#DCE5F5] sticky top-0 z-10 px-6 py-4 shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1745D8] border border-blue-100">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0E1C30]">
                  Clinician Care Portal
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#1745D8] text-[11px] font-bold border border-blue-200">
                  Attending CTS Rounds
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Supervising post-operative cardiac & surgical recovery queues
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchPatients}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
            <Link
              href="/risk-assessment/triage"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1745D8] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Open CDS Triage</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#DCE5F5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active In-Care Patients
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {patients.length}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> Assigned records only
              </span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-[#1745D8]">
              <HeartPulse className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#DCE5F5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Pending CDS Reviews
              </span>
              <span className="text-2xl font-extrabold text-amber-600 mt-1 block">{pendingReviews}</span>
              <span className="text-[11px] text-amber-700 font-medium">
                Rule engine + Claude analysis
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#DCE5F5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Scheduled Teleconsults
              </span>
              <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">{teleconsultCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Scheduled for assigned patients</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Video className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#DCE5F5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Clinical Escalations
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">{escalations} Active</span>
              <span className="text-[11px] text-emerald-700 font-medium">Based on saved risk assessments</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#DCE5F5] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#DCE5F5] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assigned Patient Care Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Post-discharge surgical recovery telemetry, vitals trajectory, and care pathways
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {patients.length} Patient{patients.length === 1 ? '' : 's'} Monitored
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {patients.map((pat) => {
              const surgery = pat.surgeries?.[0];
              const latestLog = pat.recoveryLogs?.[0];

              return (
                <div key={pat.id} className="p-5 hover:bg-slate-50/60 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{pat.fullName}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold">
                        {pat.mrn}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {pat.age} yrs • {pat.gender} • {pat.homeCity || 'Madurai'}, {pat.homeState || 'Tamil Nadu'}
                    </div>
                    <div className="text-xs text-blue-700 font-medium">
                      {surgery?.procedureName || 'Procedure not recorded'}
                    </div>
                  </div>

                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Blood Pressure</span>
                      <span className="font-bold text-slate-900 font-tabular">
                        {latestLog?.systolicBP ?? '—'}/{latestLog?.diastolicBP ?? '—'} <span className="text-[10px] text-slate-500 font-sans">mmHg</span>
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-3">
                      <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Heart Rate</span>
                      <span className="font-bold text-slate-900 font-tabular">
                        {latestLog?.heartRate ?? '—'} <span className="text-[10px] text-slate-500 font-sans">bpm</span>
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-3">
                      <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Temp</span>
                      <span className="font-bold text-slate-900 font-tabular">
                        {latestLog?.temperatureC ?? '—'} <span className="text-[10px] text-slate-500 font-sans">°C</span>
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-3">
                      <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Pain (0-10)</span>
                      <span className="font-bold text-emerald-600 font-tabular">
                        {latestLog?.painScore ?? 2}/10
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {pat.riskAssessments?.[0]?.riskLevel || 'NO ASSESSMENT'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href="/risk-assessment/triage"
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#1745D8] hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" /> Review CDS
                      </Link>
                      <Link
                        href={`/patients/dashboard?patientId=${encodeURIComponent(pat.id)}`}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
                      >
                        Chart
                      </Link>
                      <Link
                        href="/follow-ups/my-appointments"
                        className="px-3 py-1.5 rounded-lg bg-[#1745D8] text-white hover:bg-blue-700 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Video className="w-3.5 h-3.5" /> Consult
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Clinical Decision Support (CDS) Invariant:</span> AI-assisted evaluations generated by Claude and the physiological rule engine are advisory recommendations. Clinicians must independently confirm surgical incision integrity, anticoagulant INR levels, and vital stability prior to approving local care referrals.
          </div>
        </div>
      </div>
    </div>
  );
}
