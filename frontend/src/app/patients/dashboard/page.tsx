'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - PATIENT DASHBOARD (MODULE 1 & 5)
// ============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { store } from '@/lib/server/store';
import {
  Activity,
  Calendar,
  CheckCircle,
  ClipboardList,
  HeartPulse,
  Hospital,
  ShieldCheck,
  Video,
} from 'lucide-react';

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const patientId = user?.role === 'PATIENT' ? user.id : 'pat-101';
  const patient = store.getPatient(patientId) || store.getPatient('pat-101');
  const plans = store.getAllPlans(patient?.id || 'pat-101');
  const appointments = store.getAppointmentsByPatient(patient?.id || 'pat-101');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Patient Welcome Header */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-teal-900">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300 mb-1">
          <HeartPulse className="w-4 h-4" />
          <span>Patient Post-Op Recovery Portal</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {patient?.name || 'Patient'}
        </h1>
        <p className="text-sm text-teal-100 mt-1 max-w-2xl">
          Recovery procedure: <strong>{patient?.surgeryProcedure}</strong> at {patient?.operatingHospital}.
          Your doctor-approved follow-up care plan is active.
        </p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/patients/recovery-log"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-teal-500 hover:shadow-md transition group"
        >
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:bg-teal-600 group-hover:text-white transition">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Submit Daily Recovery Log</h2>
          <p className="text-xs text-slate-500 mt-1">
            Record vitals, pain score, and surgical wound status for AI risk monitoring.
          </p>
        </Link>

        <Link
          href="/follow-ups/my-appointments"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition group"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
            <Calendar className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">My Appointments &amp; Video</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access secure zero-PII teleconsultation rooms and verified local clinic visits.
          </p>
        </Link>

        <Link
          href="/providers/directory"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition group"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
            <Hospital className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Nearby Verified Clinics</h2>
          <p className="text-xs text-slate-500 mt-1">
            Find accredited facilities in {patient?.homeCity || 'your city'} for dressing and blood tests.
          </p>
        </Link>
      </div>

      {/* Active Care Plan Summary */}
      {plans.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                Active Care Plan: {plans[0].title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Approved by {plans[0].approvedByClinician}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
              {plans[0].status}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{plans[0].clinicalSummary}</p>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
              Scheduled Care Touchpoints
            </h3>
            <div className="space-y-2">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                >
                  <div className="flex items-center gap-3">
                    {appt.type === 'TELECONSULTATION' ? (
                      <Video className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Hospital className="w-4 h-4 text-teal-600" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-900">{appt.locationOrService}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(appt.scheduledStartTime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
