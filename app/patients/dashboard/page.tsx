'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - PATIENT POST-OP RECOVERY PORTAL
// Clinical Sanctuary Design System based on DESIGN.md
// ============================================================================

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { store } from '@/lib/server/store';
import {
  Activity,
  Calendar,
  CheckCircle,
  ClipboardList,
  Heart,
  HeartPulse,
  Hospital,
  ShieldCheck,
  Video,
  ArrowRight,
  Clock,
  MapPin,
} from 'lucide-react';

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const patientId = user?.role === 'PATIENT' ? user.id : 'pat-101';
  const patient = store.getPatient(patientId) || store.getPatient('pat-101');
  const plans = store.getAllPlans(patient?.id || 'pat-101');
  const appointments = store.getAppointmentsByPatient(patient?.id || 'pat-101');

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6">
      {/* Patient Welcome Header */}
      <div className="bg-gradient-to-r from-[#122A70] via-[#1745D8] to-[#254EE0] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[#89F5E7] text-xs font-semibold uppercase tracking-wider mb-3">
            <HeartPulse className="w-4 h-4 text-[#89F5E7]" />
            <span>Restorative Outpatient Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {patient?.name || 'Patient'}
          </h1>
          <p className="text-sm text-[#C0CAFF] mt-2 leading-relaxed">
            Recovery procedure: <strong className="text-white font-semibold">{patient?.surgeryProcedure}</strong> at {patient?.operatingHospital}.
            Your attending surgical team has active telemetry monitoring enabled.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-white/20 text-xs">
            <div className="flex items-center gap-1.5 text-[#EDF3FF]">
              <Clock className="w-4 h-4 text-[#89F5E7]" />
              <span>Discharged: <strong className="text-white">{patient?.dischargeDate ? new Date(patient.dischargeDate).toLocaleDateString() : 'Recent'}</strong></span>
            </div>
            <span className="w-1 h-1 rounded-full bg-white/40"></span>
            <div className="flex items-center gap-1.5 text-[#EDF3FF]">
              <MapPin className="w-4 h-4 text-[#89F5E7]" />
              <span>Home Region: <strong className="text-white">{patient?.homeCity || 'Springfield'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/patients/recovery-log"
          className="p-6 rounded-2xl bg-white border border-[#DCE5F5] shadow-xs hover:border-[#1745D8] hover:shadow-lg transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="h-12 w-12 rounded-xl bg-[#EDF3FF] text-[#1745D8] flex items-center justify-center mb-4 group-hover:bg-[#1745D8] group-hover:text-white transition-all shadow-2xs">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-[#0E1C30] group-hover:text-[#1745D8] transition-colors">
              Daily Recovery Log
            </h2>
            <p className="text-xs text-[#536078] mt-1.5 leading-relaxed">
              Record biometric vitals, pain level score, and surgical wound status for AI CDS risk monitoring.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#1745D8] mt-4 pt-3 border-t border-[#F0F3FF]">
            <span>Log Symptoms Today</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/follow-ups/my-appointments"
          className="p-6 rounded-2xl bg-white border border-[#DCE5F5] shadow-xs hover:border-[#1745D8] hover:shadow-lg transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="h-12 w-12 rounded-xl bg-[#EDF3FF] text-[#1745D8] flex items-center justify-center mb-4 group-hover:bg-[#1745D8] group-hover:text-white transition-all shadow-2xs">
              <Calendar className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-[#0E1C30] group-hover:text-[#1745D8] transition-colors">
              My Appointments &amp; Video
            </h2>
            <p className="text-xs text-[#536078] mt-1.5 leading-relaxed">
              Launch secure teleconsultations with attending specialists or view accredited local clinic visits.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#1745D8] mt-4 pt-3 border-t border-[#F0F3FF]">
            <span>View Scheduled Visits</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/discovery"
          className="p-6 rounded-2xl bg-white border border-[#DCE5F5] shadow-xs hover:border-[#1745D8] hover:shadow-lg transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="h-12 w-12 rounded-xl bg-[#EDF3FF] text-[#1745D8] flex items-center justify-center mb-4 group-hover:bg-[#1745D8] group-hover:text-white transition-all shadow-2xs">
              <Hospital className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-[#0E1C30] group-hover:text-[#1745D8] transition-colors">
              Nearby Verified Clinics
            </h2>
            <p className="text-xs text-[#536078] mt-1.5 leading-relaxed">
              Find accredited local facilities in {patient?.homeCity || 'your city'} for dressing changes and suture care.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#1745D8] mt-4 pt-3 border-t border-[#F0F3FF]">
            <span>Search Healthcare Directory</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Active Care Plan Summary */}
      {plans.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#DCE5F5] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F0F3FF] pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#1745D8] uppercase tracking-wider">
                  Care Pathway Protocol
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#0E1C30] flex items-center gap-2 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
                {plans[0].title}
              </h2>
              <p className="text-xs text-[#536078] mt-0.5">
                Attending Reviewer: <span className="font-semibold text-[#0E1C30]">{plans[0].approvedByClinician}</span>
              </p>
            </div>
            <span className="self-start sm:self-auto px-3.5 py-1 rounded-full text-xs font-semibold bg-[#E6F8F2] text-[#047857] border border-[#A7F3D0]">
              {plans[0].status}
            </span>
          </div>

          <p className="text-sm text-[#536078] leading-relaxed bg-[#F0F3FF]/40 p-4 rounded-xl border border-[#DCE5F5]">
            {plans[0].clinicalSummary}
          </p>

          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase text-[#8B97B0] tracking-wider mb-3">
              Scheduled Care Touchpoints ({appointments.length})
            </h3>
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[#F6F8FF] border border-[#DCE5F5] text-xs hover:border-[#1745D8] transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#DCE5F5] flex items-center justify-center text-[#1745D8] shrink-0 shadow-2xs">
                      {appt.type === 'TELECONSULTATION' ? (
                        <Video className="w-5 h-5 text-[#1745D8]" />
                      ) : (
                        <Hospital className="w-5 h-5 text-[#0D9488]" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#0E1C30]">{appt.locationOrService}</div>
                      <div className="text-xs text-[#536078] mt-0.5">
                        {new Date(appt.scheduledStartTime).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      appt.status === 'CONFIRMED'
                        ? 'bg-[#E6F8F2] text-[#047857]'
                        : 'bg-[#FFF7E6] text-[#B45309]'
                    }`}>
                      {appt.status}
                    </span>
                    {appt.type === 'TELECONSULTATION' && (
                      <Link
                        href={`/?tab=teleconsult`}
                        className="px-3 py-1 rounded-lg bg-[#1745D8] text-white font-medium text-xs hover:bg-[#1238B5] transition shadow-2xs"
                      >
                        Launch Room
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
