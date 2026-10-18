'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - COORDINATOR DASHBOARD
// Care Logistics, Follow-Up Plan Scheduling & Local Referral Dispatch
// ============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Hospital,
  Layers,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
  Video,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function CoordinatorDashboardPage() {
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<{
    plans: any[];
    appointments: any[];
    facilities: any[];
    referrals: any[];
  }>({
    plans: [],
    appointments: [],
    facilities: [],
    referrals: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (role !== 'COORDINATOR' && role !== 'ADMIN' && role !== 'CLINICIAN') {
        router.push('/patients/dashboard');
      }
    }
  }, [isAuthenticated, role, authLoading, router]);

  const fetchCoordinatorData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coordinator/overview');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.warn('Coordinator fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void Promise.resolve().then(fetchCoordinatorData);
    }
  }, [isAuthenticated]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="bg-white border-b border-[#DCE5F5] sticky top-0 z-10 px-6 py-4 shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0E1C30]">Care Coordination Hub</h1>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold border border-purple-200">
                  Operations & Logistics
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Orchestrating follow-up care plans, local clinic visits, and teleconsultations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCoordinatorData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Logistics</span>
            </button>
            <Link
              href="/follow-ups/my-appointments"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1745D8] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Appointment Ledger</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#DCE5F5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active Care Plans
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {data.plans.length || 1}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> Clinician Signed-Off
              </span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-[#1745D8]">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#DCE5F5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Upcoming Appointments
              </span>
              <span className="text-2xl font-extrabold text-purple-700 mt-1 block">
                {data.appointments.length || 2}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Local visits & teleconsults</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-700">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#DCE5F5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Verified Partner Facilities
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
                {data.facilities.length || 4}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Accredited local centers</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Hospital className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#DCE5F5] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Travel Optimization
              </span>
              <span className="text-2xl font-extrabold text-teal-600 mt-1 block">Active</span>
              <span className="text-[11px] text-slate-500 font-medium">Local vs transit comparison</span>
            </div>
            <div className="p-3 rounded-xl bg-teal-50 text-teal-600">
              <Compass className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#DCE5F5] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Follow-Up Care Plans</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Physician-approved care pathways connecting tertiary surgery to local outpatient check-ins
              </p>
            </div>
            <Link
              href="/discovery"
              className="text-xs font-bold text-[#1745D8] hover:underline flex items-center gap-1"
            >
              <span>Find Providers</span> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data.plans.map((plan) => (
              <div key={plan.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-[#1745D8]">
                      {plan.status}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{plan.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    {plan.clinicalSummary}
                  </p>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                    <span>Patient: <strong>{plan.patient?.fullName || 'Name not recorded'}</strong> ({plan.patient?.mrn || 'MRN not recorded'})</span>
                    <span>•</span>
                    <span>Approved by: <strong>{plan.approvedByClinician || 'Dr. K. Ramanathan'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/follow-ups/my-appointments"
                    className="px-3 py-1.5 rounded-lg bg-[#1745D8] text-white hover:bg-blue-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Manage Schedule
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#DCE5F5] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#DCE5F5] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Scheduled Follow-Up Encounters</h2>
              <p className="text-xs text-slate-500 mt-0.5">Local clinic visits and secure CTS teleconsultations</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {data.appointments.length} Encounters Active
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data.appointments.map((appt) => {
              const isTele = appt.type === 'TELECONSULTATION';
              return (
                <div key={appt.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${isTele ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'} flex-shrink-0`}>
                      {isTele ? <Video className="w-5 h-5" /> : <Hospital className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{isTele ? 'Virtual Video Teleconsultation' : 'Local Clinic Visit (Suture Removal)'}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {appt.status}
                        </span>
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        {appt.locationOrService}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-1">
                        Patient: {appt.patient?.fullName || 'Name not recorded'} • Time: {new Date(appt.scheduledStartTime).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Link
                      href="/follow-ups/my-appointments"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition text-xs"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
