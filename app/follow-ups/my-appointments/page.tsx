'use client';

export const dynamic = 'force-dynamic';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - PATIENT APPOINTMENTS & TELECONSULTATION
// Clinical Sanctuary Design System based on DESIGN.md
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [demoJoinValue, setDemoJoinValue] = useState('');
  const [demoError, setDemoError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) router.replace('/login');
    else if (role === 'ADMIN') router.replace('/admin/dashboard');
  }, [isAuthLoading, isAuthenticated, role, router]);

  useEffect(() => {
    let active = true;
    if (isAuthLoading || !isAuthenticated || role === 'ADMIN') return () => { active = false; };
    fetch('/api/followup/appointments?limit=100', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || 'Appointments could not be loaded.');
        if (active) setAppointments(result.data || []);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Appointments could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthLoading, isAuthenticated, role]);

  const handleLaunchTeleconsult = (appt: any) => {
    if ((role === 'PATIENT' || role === 'CLINICIAN') && appt.teleSession) {
      setActiveSession({
        ...appt.teleSession,
        appointment: appt,
      });
    }
  };

  const createDemoRoom = () => {
    const roomCode = globalThis.crypto.randomUUID().replace(/-/g, '');
    router.push(`/teleconsult/demo/${roomCode.toLowerCase()}`);
  };

  const joinDemoRoom = () => {
    const entered = demoJoinValue.trim();
    let roomCode = entered;
    try {
      const invite = new URL(entered);
      const demoIndex = invite.pathname.split('/').indexOf('demo');
      if (demoIndex >= 0) roomCode = invite.pathname.split('/')[demoIndex + 1] || '';
    } catch {
      // A short room code is also accepted.
    }
    if (!/^[a-fA-F0-9]{32}$/.test(roomCode)) {
      setDemoError('Enter a valid demo room code or invitation link.');
      return;
    }
    setDemoError(null);
    router.push(`/teleconsult/demo/${roomCode}`);
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{role === 'CLINICIAN' ? 'My Assigned Consultations' : 'My Follow-Up Appointments'}</h1>
          <p className="text-sm text-[#C0CAFF] mt-2 max-w-2xl leading-relaxed">
            Your saved follow-up appointments and teleconsultation sessions.
          </p>
        </div>
      </div>

      {(role === 'PATIENT' || role === 'CLINICIAN') && (
        <section className="grid gap-5 rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-sm font-bold text-[#0E1C30]">Live video consultation demo</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Create a demo room, then share its invitation with the other signed-in account. Demo rooms are separate from appointments and do not save clinical notes.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={demoJoinValue}
                onChange={(event) => setDemoJoinValue(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') joinDemoRoom(); }}
                placeholder="Paste a demo invite link or 32-character room code"
                aria-label="Demo room invite or code"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button type="button" onClick={joinDemoRoom} className="rounded-lg border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50">Join demo room</button>
            </div>
            {demoError && <p role="alert" className="mt-2 text-xs text-red-700">{demoError}</p>}
          </div>
          <button type="button" onClick={createDemoRoom} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-800">
            <Video className="h-4 w-4" /> Create demo room
          </button>
        </section>
      )}

      {activeSession ? (
        <div className="bg-white rounded-3xl border border-[#DCE5F5] p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#F0F3FF]">
            <div>
              <h2 className="text-base font-bold text-[#0E1C30] flex items-center gap-2">
                <Video className="w-5 h-5 text-[#1745D8]" />
                Active Teleconsultation Video Room
              </h2>
              <p className="text-xs text-[#536078] font-mono mt-0.5">
                Session Room ID: {activeSession.roomName} (non-identifying)
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
        <>
        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
        {loading && <div className="rounded-xl border border-[#DCE5F5] bg-white p-6 text-sm text-[#536078]">Loading saved appointments…</div>}
        {!loading && !error && appointments.length === 0 && <div className="rounded-xl border border-[#DCE5F5] bg-white p-6 text-sm text-[#536078]">No appointments have been scheduled for this account.</div>}
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
                  {isTele && (role === 'PATIENT' || role === 'CLINICIAN') ? (
                    <button
                      onClick={() => handleLaunchTeleconsult(appt)}
                      disabled={!appt.teleSession || appt.status === 'CANCELLED' || appt.status === 'COMPLETED'}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1745D8] text-white text-xs font-semibold hover:bg-[#1238B5] transition shadow-xs cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>{appt.teleSession ? 'Join Teleconsult Room' : 'Room unavailable'}</span>
                    </button>
                  ) : isTele ? (
                    <span className="text-xs text-slate-500">Only the patient and assigned clinician can join this video room.</span>
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
        </>
      )}
    </div>
  );
}
