'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Calendar, FileText, Hospital, MapPin, Phone, ShieldCheck, User } from 'lucide-react';

type PatientProfile = {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  homeCity: string;
  homeState: string;
  homePincode: string;
  contactPhone: string;
  surgeryProcedure: string;
  operatingHospital: string;
  surgeonName: string;
  surgeryDate: string;
  dischargeDate: string;
  dischargeSummary: string;
};

export default function PatientProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user?.patientId) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/integration/cross-module?patientId=${encodeURIComponent(user.patientId)}`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || 'Patient profile could not be loaded.');
        if (active) setProfile(result.data.activePatient as PatientProfile);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Patient profile could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (!authLoading && isAuthenticated) void loadProfile();
    return () => { active = false; };
  }, [authLoading, isAuthenticated, user?.patientId]);

  const display = (value: string | null | undefined) => value?.trim() || 'Not recorded';
  const formattedDate = (value: string) => value ? new Date(value).toLocaleDateString() : 'Not recorded';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <header className="sticky top-0 z-10 rounded-2xl border-b border-[#DCE5F5] bg-white px-6 py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-[#1745D8]"><User className="h-6 w-6" /></div>
          <div>
            <h1 className="text-lg font-bold text-[#0E1C30]">Patient Profile &amp; Clinical Summary</h1>
            <p className="text-xs text-slate-500">Profile details and surgical records saved to your account</p>
          </div>
        </div>
      </header>

      {loading ? <div className="rounded-2xl border border-[#DCE5F5] bg-white p-6 text-sm text-slate-600">Loading your saved profile…</div>
        : error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
          : !user?.patientId ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This account does not have a linked patient profile.</div>
            : !profile ? <div className="rounded-xl border border-[#DCE5F5] bg-white p-6 text-sm text-slate-600">No patient profile was returned for this account.</div>
              : <div className="space-y-6">
                <section className="space-y-4 rounded-2xl border border-[#DCE5F5] bg-white p-6 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1745D8] text-lg font-bold text-white">{profile.name.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">{profile.name}</h2>
                        <p className="font-mono text-xs text-slate-500">MRN: {display(profile.mrn)}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                      <ShieldCheck className="h-4 w-4 text-blue-700" /> Linked to signed-in account
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
                    <InfoCard label="Demographics">{profile.age > 0 ? `${profile.age} years` : 'Age not recorded'} · {display(profile.gender)}</InfoCard>
                    <InfoCard label="Contact information"><span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-blue-600" />{display(profile.contactPhone)}</span><span className="block pt-1">{user.email}</span></InfoCard>
                    <InfoCard label="Primary residence"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-rose-600" />{[profile.homeCity, profile.homeState].filter(Boolean).join(', ') || 'Not recorded'}</span><span className="block pt-1">Pincode: {display(profile.homePincode)}</span></InfoCard>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-[#DCE5F5] bg-white p-6 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2"><Hospital className="h-5 w-5 text-[#1745D8]" /><h3 className="text-sm font-bold text-slate-900">Surgical procedure history</h3></div>
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"><Calendar className="h-3.5 w-3.5" />Surgery date: {formattedDate(profile.surgeryDate)}</span>
                  </div>
                  {profile.surgeryProcedure === 'Procedure not recorded' ? <p className="text-sm text-slate-600">No surgical procedure has been recorded for this profile.</p>
                    : <div className="grid grid-cols-1 gap-5 text-sm md:grid-cols-2">
                      <div className="space-y-3">
                        <InfoCard label="Procedure">{profile.surgeryProcedure}</InfoCard>
                        <InfoCard label="Operating hospital">{display(profile.operatingHospital)}</InfoCard>
                        <InfoCard label="Attending surgeon">{display(profile.surgeonName)}</InfoCard>
                        <InfoCard label="Discharge date">{formattedDate(profile.dischargeDate)}</InfoCard>
                      </div>
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><FileText className="h-4 w-4" />Discharge summary</div>
                        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{display(profile.dischargeSummary)}</p>
                      </div>
                    </div>}
                </section>
              </div>}
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5"><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span><div className="text-sm font-semibold text-slate-800">{children}</div></div>;
}
