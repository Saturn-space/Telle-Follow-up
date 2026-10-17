'use client';

import React, { useState } from 'react';
import { RiskAssessmentResult, RiskLevel, ReviewStatus } from '@/lib/risk/types';
import { X, CheckCircle, ShieldAlert, FileText, UserCheck } from 'lucide-react';

interface Props {
  assessment: RiskAssessmentResult;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: (updated: RiskAssessmentResult) => void;
}

export function ClinicianReviewDialog({ assessment, isOpen, onClose, onReviewSubmitted }: Props) {
  const [decision, setDecision] = useState<ReviewStatus>('ACCEPTED');
  const [reviewerName, setReviewerName] = useState('Dr. Priya Sundaram');
  const [reviewerRole, setReviewerRole] = useState<'SURGEON' | 'LOCAL_DOCTOR' | 'COORDINATOR'>('SURGEON');
  const [overrideLevel, setOverrideLevel] = useState<RiskLevel>(assessment.riskLevel);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [escalateToOperatingSurgeon, setEscalateToOperatingSurgeon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/risk-assessments/${assessment.assessmentId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reviewerId: 'rev_doc_user_01',
          reviewerName,
          reviewerRole,
          overrideLevel: decision === 'OVERRIDDEN' ? overrideLevel : undefined,
          clinicalNotes: clinicalNotes || 'Standard clinical sign-off verified.',
          escalateToOperatingSurgeon,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit review.');
      }

      onReviewSubmitted(json.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-lg">Clinician Decision &amp; Sign-Off</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Current Assessment Context */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between font-mono text-slate-500">
              <span>Assessment ID: {assessment.assessmentId}</span>
              <span>Patient ID: {assessment.patientId}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="font-semibold text-slate-700">Calculated Risk:</span>
              <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-slate-200 text-slate-800">
                {assessment.riskLevel} (Score {assessment.heuristicScore}/100)
              </span>
            </div>
          </div>

          {/* Reviewer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reviewer Full Name
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Role
              </label>
              <select
                value={reviewerRole}
                onChange={(e) => setReviewerRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="SURGEON">Operating Surgeon</option>
                <option value="LOCAL_DOCTOR">Local Accredited Doctor</option>
                <option value="COORDINATOR">Clinical Care Coordinator</option>
              </select>
            </div>
          </div>

          {/* Decision Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Review Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision('ACCEPTED')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  decision === 'ACCEPTED'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Accept Score
              </button>
              <button
                type="button"
                onClick={() => setDecision('OVERRIDDEN')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  decision === 'OVERRIDDEN'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Override Score
              </button>
              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  decision === 'REJECTED'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                Reject Assessment
              </button>
            </div>
          </div>

          {/* Override Selector (Only if OVERRIDDEN selected) */}
          {decision === 'OVERRIDDEN' && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                New Clinician-Assigned Risk Category
              </label>
              <select
                value={overrideLevel}
                onChange={(e) => setOverrideLevel(e.target.value as RiskLevel)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">LOW — Routine Remote Follow-Up</option>
                <option value="MODERATE">MODERATE — Local Clinic Inspection</option>
                <option value="HIGH">HIGH — Return to Surgical Center</option>
                <option value="CRITICAL">CRITICAL — Emergency Escalation</option>
              </select>
            </div>
          )}

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Rationale &amp; Orders (Required for Audit Trail)
            </label>
            <textarea
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Incision erythema localized, afebrile, safe for virtual check with local wound dressing change."
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Escalation to Operating Surgeon Checkbox */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="escalateSurgeon"
              checked={escalateToOperatingSurgeon}
              onChange={(e) => setEscalateToOperatingSurgeon(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="escalateSurgeon" className="text-xs text-slate-700 leading-tight">
              <span className="font-semibold text-rose-700 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Raise Urgent Surgical Escalation Alert
              </span>
              Notify operating surgeon team and disable non-urgent travel optimization.
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow transition flex items-center gap-2"
            >
              {isSubmitting ? 'Recording...' : 'Commit Clinical Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
