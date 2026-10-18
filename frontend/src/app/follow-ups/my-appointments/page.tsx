'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - PATIENT APPOINTMENTS & TELECONSULTATION (MODULE 5)
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { store } from '@/lib/server/store';
import { TeleconsultSuite } from '@/components/teleconsult/TeleconsultSuite';
import {
  Calendar,
  Clock,
  Hospital,
  MapPin,
  ShieldCheck,
  Video,
} from 'lucide-react';

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const patientId = user?.role === 'PATIENT' ? user.id : 'pat-101';
  const appointments = store.getAppointmentsByPatient(patientId);

  const [activeSession, setActiveSession] = useState<any | null>(null);

  const handleLaunchTeleconsult = (appt: any) => {
    if (appt.teleSession) {
      setActiveSession({
        ...appt.teleSession,
        appointment: appt,
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1">
          <Calendar className="w-4 h-4" />
          <span>Care Coordination • Appointments & Teleconsultation</span>
          <span>•</span>
          <span>Appointments &amp; Teleconsultation</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">My Follow-Up Appointments</h1>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
          Scheduled teleconsultations with your operating hospital specialists and local in-person clinic visits for dressing and lab work.
        </p>
      </div>

      {activeSession ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                Active Teleconsultation Video Room
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Encrypted Room ID: {activeSession.roomName} (Zero-PII compliant)
              </p>
            </div>
            <button
              onClick={() => setActiveSession(null)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Exit Call
            </button>
          </div>

          <TeleconsultSuite
            activeSession={activeSession}
            activeAppointment={activeSession.appointment}
            userRole={user?.role || 'PATIENT'}
            onOutcomeSubmitted={() => {
              setActiveSession(null);
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((appt) => {
            const isTele = appt.type === 'TELECONSULTATION';

            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                        isTele
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-teal-100 text-teal-800 border border-teal-200'
                      }`}
                    >
                      {isTele ? <Video className="w-3.5 h-3.5" /> : <Hospital className="w-3.5 h-3.5" />}
                      {isTele ? 'Video Teleconsultation' : 'In-Person Local Clinic'}
                    </span>

                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {appt.status}
                    </span>
                  </div>

                  <h2 className="text-sm font-bold text-slate-900">{appt.locationOrService}</h2>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(appt.scheduledStartTime).toLocaleString()}</span>
                  </div>

                  {appt.clinicalNotes && (
                    <p className="text-xs text-slate-600 mt-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <strong>Clinical Instructions:</strong> {appt.clinicalNotes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Appointment ID: {appt.id}</span>

                  {isTele ? (
                    <button
                      onClick={() => handleLaunchTeleconsult(appt)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Launch Video Call</span>
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                      Confirmed In-Person
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
