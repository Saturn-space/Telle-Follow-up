'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, RefreshCw, UserPlus, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Application = {
  id: string;
  fullName: string;
  email: string;
  medicalLicenseNumber: string;
  specialty: string;
  institution: string;
  phone: string | null;
  city: string | null;
  status: 'PENDING' | 'ON_HOLD' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

export default function ClinicianApplicationsPage() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/clinician-applications', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Applications could not be loaded.');
      setApplications(result.data.applications);
      setFeedback(null);
    } catch (cause) {
      setFeedback({ message: cause instanceof Error ? cause.message : 'Applications could not be loaded.', success: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
    else if (!authLoading && role !== 'ADMIN') router.replace(role === 'CLINICIAN' ? '/clinician/dashboard' : role === 'COORDINATOR' ? '/coordinator/dashboard' : '/patients/dashboard');
    else if (isAuthenticated && role === 'ADMIN') void Promise.resolve().then(loadApplications);
  }, [authLoading, isAuthenticated, role, router, loadApplications]);

  const review = async (application: Application, decision: 'APPROVE' | 'REJECT' | 'HOLD' | 'RESUME') => {
    const confirmation = {
      APPROVE: `Approve ${application.fullName} as a clinician? Confirm you have reviewed their license details.`,
      REJECT: `Reject the clinician application from ${application.fullName}?`,
      HOLD: `Put ${application.fullName}'s application on hold?`,
      RESUME: `Return ${application.fullName}'s application to the pending review queue?`,
    }[decision];
    if (!window.confirm(confirmation)) return;
    setWorkingId(application.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/clinician-applications/${application.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Application review failed.');
      await loadApplications();
      setFeedback({ message: result.message, success: true });
    } catch (cause) {
      setFeedback({ message: cause instanceof Error ? cause.message : 'Application review failed.', success: false });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE5F5] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-[#1745D8]"><UserPlus className="h-6 w-6" /></div>
          <div>
            <h1 className="text-lg font-bold text-[#0E1C30]">Clinician applications</h1>
            <p className="text-xs text-slate-500">{applications.filter((item) => item.status === 'PENDING').length} pending · {applications.filter((item) => item.status === 'ON_HOLD').length} on hold · full application history</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadApplications()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <p>Approval creates a clinician login. Verify the professional license through your organization’s trusted registry before approving; this application form does not validate licenses externally.</p>
      </div>

      {feedback && <div role="status" className={`rounded-xl border p-4 text-sm ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>{feedback.message}</div>}
      {loading ? <div className="rounded-xl border border-[#DCE5F5] bg-white p-6 text-sm text-slate-600">Loading applications…</div>
        : applications.length === 0 ? <div className="rounded-xl border border-[#DCE5F5] bg-white p-8 text-center text-sm text-slate-600">There are no clinician applications.</div>
          : <div className="grid gap-4">
            {applications.map((application) => (
              <article key={application.id} className="rounded-2xl border border-[#DCE5F5] bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-slate-900">{application.fullName}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          application.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            application.status === 'ON_HOLD' ? 'bg-amber-100 text-amber-800' :
                              application.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>{application.status.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm text-slate-600">{application.email}{application.phone ? ` · ${application.phone}` : ''}</p>
                    </div>
                    <dl className="grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
                      <div><dt className="font-semibold text-slate-500">Medical license</dt><dd className="text-slate-900">{application.medicalLicenseNumber}</dd></div>
                      <div><dt className="font-semibold text-slate-500">Specialty</dt><dd className="text-slate-900">{application.specialty}</dd></div>
                      <div><dt className="font-semibold text-slate-500">Institution</dt><dd className="text-slate-900">{application.institution}</dd></div>
                      <div><dt className="font-semibold text-slate-500">City / submitted</dt><dd className="text-slate-900">{application.city || 'Not provided'} · {new Date(application.createdAt).toLocaleDateString()}</dd></div>
                    </dl>
                  </div>
                  {(application.status === 'PENDING' || application.status === 'ON_HOLD') && <div className="flex flex-wrap gap-2">
                    {application.status === 'PENDING' ? <button type="button" disabled={workingId === application.id} onClick={() => void review(application, 'HOLD')} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">Hold application</button>
                      : <button type="button" disabled={workingId === application.id} onClick={() => void review(application, 'RESUME')} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50">Resume review</button>}
                    <button type="button" disabled={workingId === application.id} onClick={() => void review(application, 'REJECT')} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <button type="button" disabled={workingId === application.id} onClick={() => void review(application, 'APPROVE')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                      <CheckCircle2 className="h-4 w-4" /> {workingId === application.id ? 'Saving…' : 'Approve clinician'}
                    </button>
                  </div>}
                </div>
              </article>
            ))}
          </div>}
    </div>
  );
}
