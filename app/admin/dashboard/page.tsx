'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - ADMINISTRATOR GOVERNANCE DASHBOARD
// Platform Administration, User Role Management & Audit Trail
// ============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  Users,
  Activity,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  UserPlus,
  ArrowUpRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit'>('overview');
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (role !== 'ADMIN') {
        router.push(role === 'CLINICIAN' ? '/clinician/dashboard' : role === 'COORDINATOR' ? '/coordinator/dashboard' : '/patients/dashboard');
      }
    }
  }, [isAuthenticated, role, authLoading, router]);

  const loadAdminData = async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const [usersRes, statusRes, auditRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/system-status'),
        fetch('/api/admin/audit-logs?limit=30'),
      ]);

      const [usersData, statusData, auditData] = await Promise.all([
        usersRes.json(),
        statusRes.json(),
        auditRes.json(),
      ]);

      if (usersData.success && usersData.data?.users) {
        setUsers(usersData.data.users);
      }
      if (statusData.success && statusData.data?.metrics) {
        setOverview(statusData.data.metrics);
      }
      if (auditData.success && auditData.data?.logs) {
        setAuditLogs(auditData.data.logs);
      }
    } catch (e: any) {
      setFeedbackMsg({ text: e.message || 'Failed to load administrator data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void Promise.resolve().then(loadAdminData);
    }
  }, [isAuthenticated]);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    setRoleUpdatingUserId(targetUserId);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Role change failed.');
      }
      setFeedbackMsg({ text: `Successfully updated user role to ${newRole}.`, type: 'success' });
      await loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Role update failed.', type: 'error' });
    } finally {
      setRoleUpdatingUserId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="bg-white border-b border-[#DCE5F5] sticky top-0 z-10 px-6 py-4 shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0E1C30]">Administrator Dashboard</h1>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200">
                  Administrator
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage accounts, clinician applications, patient records, and audit activity
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAdminData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh overview</span>
          </button>
        </div>

        <div className="flex gap-2 max-w-7xl mx-auto mt-4 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-[#1745D8] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-[#1745D8] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> User accounts ({users.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-[#1745D8] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Audit log ({auditLogs.length})
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {overview ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  { label: 'Accounts', value: overview.totalUsers, tone: 'text-slate-900' },
                  { label: 'Patients', value: overview.registeredPatients, tone: 'text-blue-700' },
                  { label: 'Appointments', value: overview.activeAppointments, tone: 'text-violet-700' },
                  { label: 'Facilities', value: overview.verifiedFacilities, tone: 'text-emerald-700' },
                  { label: 'Payment orders', value: overview.totalPaymentOrders, tone: 'text-indigo-700' },
                  { label: 'Pending applications', value: overview.pendingClinicianApplications, tone: 'text-amber-700' },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-[#DCE5F5] bg-white p-4 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</span>
                    <span className={`mt-1 block text-2xl font-extrabold ${metric.tone}`}>{metric.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#DCE5F5] bg-white p-6 text-sm text-slate-600">Loading the administration overview…</div>
            )}

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Quick access</h2>
                <p className="mt-0.5 text-xs text-slate-500">Review the main areas of platform administration.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Link href="/admin/clinician-applications" className="group flex items-center justify-between rounded-2xl border border-[#DCE5F5] bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><UserPlus className="h-5 w-5" /></span>
                    <span><span className="block text-sm font-bold text-slate-900">Clinician applications</span><span className="mt-1 block text-xs text-slate-500">{overview?.pendingClinicianApplications ?? '—'} awaiting review</span></span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-indigo-700" />
                </Link>
                <Link href="/admin/patients" className="group flex items-center justify-between rounded-2xl border border-[#DCE5F5] bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Users className="h-5 w-5" /></span>
                    <span><span className="block text-sm font-bold text-slate-900">Patient records</span><span className="mt-1 block text-xs text-slate-500">System-wide patient history</span></span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-indigo-700" />
                </Link>
                <Link href="/admin/appointments" className="group flex items-center justify-between rounded-2xl border border-[#DCE5F5] bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><CalendarDays className="h-5 w-5" /></span>
                    <span><span className="block text-sm font-bold text-slate-900">Appointment records</span><span className="mt-1 block text-xs text-slate-500">System-wide appointment status</span></span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-indigo-700" />
                </Link>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-[#DCE5F5] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#DCE5F5] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Authoritative User Accounts</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Strict server-side role assignment for Patients, Clinicians, Coordinators, and Administrators
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {users.length} Users Enrolled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Profile / MRN</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4">Change Role</th>
                    <th className="py-3 px-4">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{u.email}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {u.patientProfile ? (
                          <div>
                            <span className="font-bold">{u.patientProfile.fullName}</span>{' '}
                            <span className="text-[10px] text-slate-500 font-mono">({u.patientProfile.mrn})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Platform Staff</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-rose-100 text-rose-800'
                              : u.role === 'CLINICIAN'
                              ? 'bg-blue-100 text-[#1745D8]'
                              : u.role === 'COORDINATOR'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          disabled={roleUpdatingUserId === u.id}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="py-1 px-2 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700 focus:ring-2 focus:ring-[#1745D8] outline-none disabled:opacity-50 cursor-pointer"
                        >
                          <option value="PATIENT">PATIENT</option>
                          <option value="CLINICIAN">CLINICIAN</option>
                          <option value="COORDINATOR">COORDINATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-[#DCE5F5] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#DCE5F5] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Immutable Security & Clinical Audit Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological audit trails for logins, role mutations, medical uploads, and assessments
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {auditLogs.length} Events Logged
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {log.entityType}
                      </span>
                      {log.userRole && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#1745D8]">
                          {log.userRole}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-700">{log.details}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      User: {log.userEmail || log.userId || 'System'} • IP: {log.ipAddress || '127.0.0.1'}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
