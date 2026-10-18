'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - PATIENT APPOINTMENTS & TELECONSULTATION
// Clinical Sanctuary Design System based on DESIGN.md
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
  ArrowRight,
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
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6">
      <div className="bg-gradient-to-r from-[#122A70] via-[#1745D8] to-[#254EE0] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[#89F5E7] text-xs font-semibold uppercase tracking-wider mb-3">
            <Calendar className="w-4 h-4 text-[#89F5E7]" />
            <span>Care Coordination &amp; Visits</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Follow-Up Appointments</h1>
          <p className="text-sm text-[#C0CAFF] mt-2 max-w-2xl leading-relaxed">
            Scheduled teleconsultations with your operating hospital specialists and local in-person clinic visits for dressing and lab work.
          </p>
        </div>
      </div>

      {activeSession ? (
        <div className="bg-white rounded-3xl border border-[#DCE5F5] p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#F0F3FF]">
            <div>
              <h2 className="text-base font-bold text-[#0E1C30] flex items-center gap-2">
                <Video className="w-5 h-5 text-[#1745D8]" />
                Active Teleconsultation Video Room
              </h2>
              <p className="text-xs text-[#536078] font-mono mt-0.5">
                Encrypted Room ID: {activeSession.roomName} (Zero-PII compliant)
              </p>
            </div>
            <button
              onClick={() => setActiveSession(null)}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#F0F3FF] hover:bg-[#E7EEFF] text-[#0E1C30] transition cursor-pointer border border-[#DCE5F5]"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {appointments.map((appt) => {
            const isTele = appt.type === 'TELECONSULTATION';

            return (
              <div
                key={appt.id}
                className="bg-white rounded-3xl border border-[#DCE5F5] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#1745D8] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        isTele
                          ? 'bg-[#EDF3FF] text-[#1745D8] border border-[#CBD9F2]'
                          : 'bg-[#E6F8F2] text-[#047857] border border-[#A7F3D0]'
                      }`}
                    >
                      {isTele ? <Video className="w-3.5 h-3.5" /> : <Hospital className="w-3.5 h-3.5" />}
                      {isTele ? 'Video Teleconsultation' : 'In-Person Local Clinic'}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F0F3FF] text-[#536078]">
                      {appt.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0E1C30]">{appt.locationOrService}</h3>
                  <div className="space-y-1.5 mt-3 text-xs text-[#536078]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#8B97B0]" />
                      <span className="tnum">
                        {new Date(appt.scheduledStartTime).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#8B97B0]" />
                      <span>{appt.locationOrService}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#F0F3FF] flex items-center justify-between">
                  {isTele ? (
                    <button
                      onClick={() => handleLaunchTeleconsult(appt)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1745D8] text-white text-xs font-semibold hover:bg-[#1238B5] transition shadow-xs cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Join Teleconsult Room</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#047857]">
                      <ShieldCheck className="w-4 h-4 text-[#047857]" />
                      <span>Local Check-In Ready</span>
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-[#8B97B0]">
                    Ref #{appt.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
