'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, FileText, RefreshCw, Search, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type AdminPatient = {
  id: string;
  mrn: string;
  fullName: string;
  age: number | null;
  gender: string;
  contactPhone: string | null;
  homeCity: string | null;
  homeState: string | null;
  homePincode: string | null;
  user: { email: string; paymentOrders: any[] } | null;
  surgeries: any[];
  recoveryLogs: any[];
  riskAssessments: any[];
  travelComparisons: any[];
  followUpPlans: any[];
  careReferrals: any[];
  documents: any[];
};

const dateTime = (value?: string | Date | null) => value ? new Date(value).toLocaleString() : 'Not recorded';

export default function AdminPatientsPage() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const readPatients = async () => {
    const response = await fetch('/api/admin/patients', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error?.message || 'Patient records could not be loaded.');
    return result.data.patients || [];
  };

  useEffect(() => {
    let active = true;
    if (!authLoading && !isAuthenticated) router.replace('/login');
    else if (!authLoading && role !== 'ADMIN') router.replace(role === 'CLINICIAN' ? '/clinician/dashboard' : role === 'COORDINATOR' ? '/coordinator/dashboard' : '/patients/dashboard');
    else if (isAuthenticated && role === 'ADMIN') {
      readPatients()
        .then((items) => { if (active) setPatients(items); })
        .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Patient records could not be loaded.'); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [authLoading, isAuthenticated, role, router]);

  const loadPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      setPatients(await readPatients());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Patient records could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const visiblePatients = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return patients;
    return patients.filter((patient) => [patient.fullName, patient.mrn, patient.user?.email, patient.contactPhone]
      .some((entry) => entry?.toLowerCase().includes(value)));
  }, [patients, query]);

  if (authLoading || (isAuthenticated && role !== 'ADMIN')) return <div className="p-8 text-sm text-slate-600">Checking administrator access…</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE5F5] bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Users className="h-6 w-6" /></div>
          <div><h1 className="text-lg font-bold text-[#0E1C30]">All patient records</h1><p className="text-xs text-slate-500">Administrator read access across registered patient records and linked modules.</p></div>
        </div>
        <button type="button" onClick={() => { setLoading(true); setError(null); void loadPatients(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh records</button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#DCE5F5] bg-white p-4"><div className="text-[10px] font-bold uppercase text-slate-500">Patient accounts</div><div className="mt-1 text-2xl font-extrabold text-slate-900">{patients.length}</div></div>
        <div className="rounded-xl border border-[#DCE5F5] bg-white p-4"><div className="text-[10px] font-bold uppercase text-slate-500">Recovery logs</div><div className="mt-1 text-2xl font-extrabold text-slate-900">{patients.reduce((sum, patient) => sum + patient.recoveryLogs.length, 0)}</div></div>
        <div className="rounded-xl border border-[#DCE5F5] bg-white p-4"><div className="text-[10px] font-bold uppercase text-slate-500">Linked documents</div><div className="mt-1 text-2xl font-extrabold text-slate-900">{patients.reduce((sum, patient) => sum + patient.documents.length, 0)}</div></div>
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-[#DCE5F5] bg-white px-4 py-3 text-sm text-slate-500">
        <Search className="h-4 w-4" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, MRN, email, or phone" className="w-full bg-transparent text-slate-900 outline-none" />
      </label>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {loading ? <div className="rounded-xl border border-[#DCE5F5] bg-white p-6 text-sm text-slate-600">Loading patient records…</div>
        : visiblePatients.length === 0 ? <div className="rounded-xl border border-[#DCE5F5] bg-white p-8 text-center text-sm text-slate-600">No matching patient records.</div>
          : <div className="space-y-4">{visiblePatients.map((patient) => (
            <article key={patient.id} className="overflow-hidden rounded-2xl border border-[#DCE5F5] bg-white">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                <div><h2 className="font-bold text-slate-900">{patient.fullName}</h2><p className="mt-1 text-xs text-slate-600">MRN {patient.mrn} · {patient.user?.email || 'No linked sign-in'} · {patient.contactPhone || 'No phone recorded'}</p><p className="mt-1 text-xs text-slate-500">{[patient.homeCity, patient.homeState, patient.homePincode].filter(Boolean).join(', ') || 'Address not recorded'}</p></div>
                <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-700">
                  <span className="rounded-full bg-blue-50 px-3 py-1">{patient.riskAssessments.length} assessments</span><span className="rounded-full bg-emerald-50 px-3 py-1">{patient.followUpPlans.length} plans</span><span className="rounded-full bg-slate-100 px-3 py-1">{patient.documents.length} documents</span>
                </div>
              </header>

              <details className="group">
                <summary className="cursor-pointer list-none px-5 py-3 text-xs font-bold text-blue-700 hover:bg-blue-50">Open full patient history</summary>
                <div className="grid gap-4 border-t border-slate-100 p-5 xl:grid-cols-2">
                  <section className="rounded-xl bg-slate-50 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4" /> Surgery and recovery</h3>
                    {patient.surgeries.map((surgery: any) => <div key={surgery.id} className="mb-3 border-b border-slate-200 pb-3 text-xs"><p className="font-semibold">{surgery.procedureName}</p><p>{surgery.operatingHospital || 'Hospital not recorded'} · {dateTime(surgery.surgeryDate)}</p><p>{surgery.dischargeSummary || 'No discharge summary recorded.'}</p></div>)}
                    {patient.recoveryLogs.map((log: any) => <div key={log.id} className="mb-2 rounded-lg bg-white p-3 text-xs"><div className="font-semibold">Post-op day {log.postOpDay} · {dateTime(log.logTimestamp)}</div><div>BP {log.systolicBP ?? '—'}/{log.diastolicBP ?? '—'} · HR {log.heartRate ?? '—'} · SpO₂ {log.oxygenSat ?? '—'}% · Temp {log.temperatureC ?? '—'}°C · Pain {log.painScore}/10</div><div>{log.symptoms?.join(', ') || 'No symptoms recorded'} · Wound: {log.woundDescription || 'Not recorded'}</div></div>)}
                    {!patient.surgeries.length && !patient.recoveryLogs.length && <p className="text-xs text-slate-500">No surgery or recovery records.</p>}
                  </section>

                  <section className="rounded-xl bg-slate-50 p-4"><h3 className="mb-3 text-sm font-bold">Risk assessments and clinician reviews</h3>
                    {patient.riskAssessments.map((assessment: any) => <div key={assessment.id} className="mb-2 rounded-lg bg-white p-3 text-xs"><div className="font-semibold">{assessment.riskLevel} · {assessment.reviewStatus} · {dateTime(assessment.createdAt)}</div><p className="mt-1">{assessment.clinicalSummary}</p>{assessment.reviews?.map((review: any) => <p key={review.id} className="mt-1 text-slate-600">Review: {review.decision} · {review.notes || 'No note'} · {dateTime(review.reviewedAt)}</p>)}</div>)}
                    {!patient.riskAssessments.length && <p className="text-xs text-slate-500">No risk assessments.</p>}
                  </section>

                  <section className="rounded-xl bg-slate-50 p-4"><h3 className="mb-3 text-sm font-bold">Care plans and appointments</h3>
                    {patient.followUpPlans.map((plan: any) => <div key={plan.id} className="mb-3 rounded-lg bg-white p-3 text-xs"><div className="font-semibold">{plan.title} · {plan.status}</div><p>{plan.clinicalSummary}</p>{plan.appointments.map((appointment: any) => <div key={appointment.id} className="mt-2 border-t border-slate-100 pt-2"><div>{appointment.type.replaceAll('_', ' ')} · {appointment.status} · {dateTime(appointment.scheduledStartTime)}</div><div>{appointment.locationOrService} · Room status {appointment.teleSession?.status || 'not created'} · Outcome {appointment.outcomeRecord ? 'recorded' : 'not recorded'}</div>{appointment.outcomeRecord?.assessmentPlan && <p>Outcome: {appointment.outcomeRecord.assessmentPlan}</p>}</div>)}</div>)}
                    {!patient.followUpPlans.length && <p className="text-xs text-slate-500">No follow-up plans.</p>}
                  </section>

                  <section className="rounded-xl bg-slate-50 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4" /> Documents, referrals, travel, and billing</h3>
                    {patient.documents.map((document: any) => <details key={document.id} className="mb-2 rounded-lg bg-white p-3 text-xs"><summary className="cursor-pointer font-semibold">{document.originalName} · {document.documentType} · {document.ocrStatus} · {document.isVerified ? 'Verified' : 'Unverified'}</summary><p className="mt-2 whitespace-pre-wrap">{document.clinicalNotes || 'No clinician note'}{document.ocrText ? `\n${document.ocrText}` : ''}</p></details>)}
                    {patient.careReferrals.map((referral: any) => <p key={referral.id} className="mb-2 rounded-lg bg-white p-3 text-xs">Referral · {referral.referralStatus} · {referral.urgencyLevel} · {referral.clinicalSummary}</p>)}
                    {patient.travelComparisons.map((travel: any) => <p key={travel.id} className="mb-2 rounded-lg bg-white p-3 text-xs">Travel · {travel.originCity} to {travel.destinationHospital} · {travel.roundTripDistanceKm} km · {travel.recommendedOption} · {travel.recommendationRationale}</p>)}
                    {patient.user?.paymentOrders?.map((payment: any) => <p key={payment.id} className="mb-2 rounded-lg bg-white p-3 text-xs">Payment · ₹{(payment.amount / 100).toFixed(2)} · {payment.currency} · {payment.status} · {dateTime(payment.createdAt)}</p>)}
                    {!patient.documents.length && !patient.careReferrals.length && !patient.travelComparisons.length && !patient.user?.paymentOrders?.length && <p className="text-xs text-slate-500">No documents, referrals, travel comparisons, or payments.</p>}
                  </section>
                </div>
              </details>
            </article>
          ))}</div>}
    </div>
  );
}
